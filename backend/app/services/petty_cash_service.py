from datetime import date
from decimal import Decimal
from typing import Dict, List, Optional

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.supabase import get_supabase_admin_client
from app.models.company import Company
from app.models.finance import Category, Expense
from app.models.petty_cash import PettyCashTopUp, PettyCashWallet
from app.schemas.petty_cash import (
    PettyCashLedgerEntry,
    PettyCashSummaryOut,
    PettyCashTopUpCreate,
    PettyCashTopUpOut,
)
from app.services.bills_service import _resolve_company


PETTY_CASH_METHOD = "petty cash"
DEFAULT_LOW_BALANCE_THRESHOLD = Decimal("1000.00")
ZERO = Decimal("0.00")


def is_petty_cash(payment_method: Optional[str]) -> bool:
    return (payment_method or "").strip().lower() == PETTY_CASH_METHOD


def _to_decimal(value) -> Decimal:
    return Decimal(str(value or 0)).quantize(Decimal("0.01"))


def _to_date(value) -> Optional[date]:
    if value is None or isinstance(value, date):
        return value
    return date.fromisoformat(str(value)[:10])


def _in_period(day: Optional[date], start: Optional[date], end: Optional[date]) -> bool:
    if day is None:
        return False
    if start and day < start:
        return False
    if end and day > end:
        return False
    return True


class PettyCashService:
    """
    Petty cash wallet per company.

    balance = sum(top-ups) - sum(amount of expenses paid with "Petty Cash")

    The balance is never stored, so editing or deleting a petty cash expense
    is reflected automatically.
    """

    def __init__(self, db: Session):
        self.db = db

    # ── Data sources ─────────────────────────────────────────────────────────

    def _petty_cash_expenses(self, company_id: Optional[int] = None) -> List[dict]:
        """Expenses paid from petty cash. Supabase first, local DB as fallback (same as expenses endpoint)."""
        try:
            client = get_supabase_admin_client()
            query = (
                client.table("expenses")
                .select("expense_id, company_id, category_id, expense_date, amount, description, reference_no")
                .ilike("payment_method", PETTY_CASH_METHOD)
            )
            if company_id:
                query = query.eq("company_id", company_id)
            rows = query.execute().data or []

            cat_map: Dict[int, str] = {}
            try:
                categories = client.table("category").select("category_id, name").execute().data or []
                cat_map = {c["category_id"]: c["name"] for c in categories}
            except Exception:
                pass

            return [
                {
                    "expense_id": row["expense_id"],
                    "company_id": row.get("company_id"),
                    "expense_date": _to_date(row.get("expense_date")),
                    "amount": _to_decimal(row.get("amount")),
                    "description": row.get("description") or "",
                    "category": cat_map.get(row.get("category_id")),
                    "reference_no": row.get("reference_no"),
                }
                for row in rows
            ]
        except Exception:
            query = (
                self.db.query(Expense, Category.name)
                .outerjoin(Category, Expense.category_id == Category.category_id)
                .filter(func.lower(func.trim(Expense.payment_method)) == PETTY_CASH_METHOD)
            )
            if company_id:
                query = query.filter(Expense.company_id == company_id)
            return [
                {
                    "expense_id": exp.expense_id,
                    "company_id": exp.company_id,
                    "expense_date": exp.expense_date,
                    "amount": _to_decimal(exp.amount),
                    "description": exp.description or "",
                    "category": cat_name,
                    "reference_no": exp.reference_no,
                }
                for exp, cat_name in query.all()
            ]

    def _topups(self, company_id: Optional[int] = None) -> List[PettyCashTopUp]:
        query = self.db.query(PettyCashTopUp)
        if company_id:
            query = query.filter(PettyCashTopUp.company_id == company_id)
        return query.all()

    def _threshold(self, company_id: int) -> Decimal:
        wallet = self.db.query(PettyCashWallet).filter(PettyCashWallet.company_id == company_id).first()
        return _to_decimal(wallet.low_balance_threshold) if wallet else DEFAULT_LOW_BALANCE_THRESHOLD

    # ── Balance & summaries ──────────────────────────────────────────────────

    def resolve_company(self, company_id: Optional[int], company_name: Optional[str]) -> Company:
        return _resolve_company(self.db, company_id, company_name)

    def get_balance(self, company_id: int, exclude_expense_id: Optional[int] = None) -> Decimal:
        topped_up = sum((_to_decimal(t.amount) for t in self._topups(company_id)), ZERO)
        spent = sum(
            (e["amount"] for e in self._petty_cash_expenses(company_id) if e["expense_id"] != exclude_expense_id),
            ZERO,
        )
        return topped_up - spent

    def ensure_sufficient_balance(
        self,
        company_id: Optional[int],
        payment_method: Optional[str],
        amount: Optional[Decimal],
        exclude_expense_id: Optional[int] = None,
    ) -> None:
        """Block an expense paid from petty cash when the wallet can't cover it."""
        if not company_id or not is_petty_cash(payment_method) or amount is None:
            return
        available = self.get_balance(company_id, exclude_expense_id=exclude_expense_id)
        if Decimal(str(amount)) > available:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient petty cash balance (₱{available:,.2f} available). Top up petty cash first.",
            )

    def _build_summary(
        self,
        company: Company,
        topups: List[PettyCashTopUp],
        expenses: List[dict],
        start: Optional[date],
        end: Optional[date],
    ) -> PettyCashSummaryOut:
        total_topups = sum((_to_decimal(t.amount) for t in topups), ZERO)
        total_spent = sum((e["amount"] for e in expenses), ZERO)
        period_topups = sum((_to_decimal(t.amount) for t in topups if _in_period(t.topup_date, start, end)), ZERO)
        period_spent = sum((e["amount"] for e in expenses if _in_period(e["expense_date"], start, end)), ZERO)
        balance = total_topups - total_spent
        threshold = self._threshold(company.company_id)
        return PettyCashSummaryOut(
            company_id=company.company_id,
            company_name=company.company_name,
            balance=balance,
            total_topups=total_topups,
            total_spent=total_spent,
            period_topups=period_topups,
            period_spent=period_spent,
            low_balance_threshold=threshold,
            is_low=balance < threshold,
        )

    def get_summary(self, company: Company, start: Optional[date] = None, end: Optional[date] = None) -> PettyCashSummaryOut:
        return self._build_summary(
            company,
            self._topups(company.company_id),
            self._petty_cash_expenses(company.company_id),
            start,
            end,
        )

    def list_summaries(self, start: Optional[date] = None, end: Optional[date] = None) -> List[PettyCashSummaryOut]:
        """One summary per company that has any petty cash activity."""
        topups = self._topups()
        expenses = self._petty_cash_expenses()
        company_ids = {t.company_id for t in topups} | {e["company_id"] for e in expenses if e["company_id"]}
        if not company_ids:
            return []
        companies = self.db.query(Company).filter(Company.company_id.in_(company_ids)).all()
        return [
            self._build_summary(
                company,
                [t for t in topups if t.company_id == company.company_id],
                [e for e in expenses if e["company_id"] == company.company_id],
                start,
                end,
            )
            for company in sorted(companies, key=lambda c: c.company_name)
        ]

    def list_ledger(self, company: Company, start: Optional[date] = None, end: Optional[date] = None) -> List[PettyCashLedgerEntry]:
        """Top-ups and petty cash expenses, newest first, each with the balance after it."""
        entries = [
            {
                "entry_id": f"topup-{t.topup_id}",
                "entry_type": "topup",
                "record_id": t.topup_id,
                "entry_date": t.topup_date,
                "description": t.description or "Top-up from sales",
                "category": None,
                "reference_no": t.reference_no,
                "amount_in": _to_decimal(t.amount),
                "amount_out": ZERO,
            }
            for t in self._topups(company.company_id)
        ] + [
            {
                "entry_id": f"expense-{e['expense_id']}",
                "entry_type": "expense",
                "record_id": e["expense_id"],
                "entry_date": e["expense_date"],
                "description": e["description"],
                "category": e["category"],
                "reference_no": e["reference_no"],
                "amount_in": ZERO,
                "amount_out": e["amount"],
            }
            for e in self._petty_cash_expenses(company.company_id)
            if e["expense_date"]
        ]

        # Running balance is computed over the full history, top-ups first on the same day
        entries.sort(key=lambda e: (e["entry_date"], 0 if e["entry_type"] == "topup" else 1, e["record_id"]))
        running = ZERO
        for entry in entries:
            running += entry["amount_in"] - entry["amount_out"]
            entry["running_balance"] = running

        return [
            PettyCashLedgerEntry(**entry)
            for entry in reversed(entries)
            if _in_period(entry["entry_date"], start, end)
        ]

    # ── Mutations ────────────────────────────────────────────────────────────

    def _topup_output(self, topup: PettyCashTopUp) -> PettyCashTopUpOut:
        output = PettyCashTopUpOut.model_validate(topup)
        output.company_name = topup.company.company_name if topup.company else None
        return output

    def create_topup(self, topup_in: PettyCashTopUpCreate) -> PettyCashTopUpOut:
        company = self.resolve_company(topup_in.company_id, topup_in.company)
        topup = PettyCashTopUp(
            company_id=company.company_id,
            amount=topup_in.amount,
            topup_date=topup_in.topup_date,
            reference_no=(topup_in.reference_no or "").strip() or None,
            description=(topup_in.description or "").strip() or None,
            created_by=topup_in.created_by,
        )
        self.db.add(topup)
        self.db.commit()
        self.db.refresh(topup)
        return self._topup_output(topup)

    def delete_topup(self, topup_id: int) -> PettyCashTopUp:
        topup = self.db.query(PettyCashTopUp).filter(PettyCashTopUp.topup_id == topup_id).first()
        if not topup:
            raise HTTPException(status_code=404, detail="Top-up not found.")
        # Removing the top-up must not leave already-recorded petty cash spending uncovered
        if self.get_balance(topup.company_id) - _to_decimal(topup.amount) < ZERO:
            raise HTTPException(
                status_code=400,
                detail="Cannot remove this top-up: petty cash expenses already use these funds.",
            )
        self.db.delete(topup)
        self.db.commit()
        return topup

    def update_threshold(self, company: Company, threshold: Decimal) -> PettyCashSummaryOut:
        wallet = self.db.query(PettyCashWallet).filter(PettyCashWallet.company_id == company.company_id).first()
        if not wallet:
            wallet = PettyCashWallet(company_id=company.company_id)
            self.db.add(wallet)
        wallet.low_balance_threshold = threshold
        self.db.commit()
        return self.get_summary(company)

    def topups_total_in_period(self, company_id: int, start: Optional[date], end: Optional[date]) -> Decimal:
        return sum(
            (_to_decimal(t.amount) for t in self._topups(company_id) if _in_period(t.topup_date, start, end)),
            ZERO,
        )
