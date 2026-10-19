from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from typing import List, Optional
from datetime import date
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.session import get_db
from app.db.supabase import get_supabase_admin_client
from app.models.finance import Expense, Category
from app.models.company import Company
from app.schemas.expense import ExpenseCreate, ExpenseOut, ExpenseUpdate
from app.services.audit_service import AuditAction, log_transaction
from app.services.petty_cash_service import PettyCashService

router = APIRouter()

CANONICAL_COMPANY_MAP = {
    1: "MCT Kitchen",
    2: "MCT Kitchen",
    3: "MCT Hotel",
    4: "JK Cafe",
    5: "JK Cafe",
    6: "Annex Nine",
    7: "Merillon",
    8: "JK Printing",
    9: "Speedbox",
    10: "JK Property and Ventures",
    11: "Golden Sunburst Ventures",
    12: "Southern Brew",
}

def get_supabase_mappings(client):
    company_map = dict(CANONICAL_COMPANY_MAP)
    try:
        companies = client.table("company").select("company_id, company_name").execute().data or []
        for c in companies:
            if c.get("company_id") and c.get("company_name"):
                company_map[c["company_id"]] = c["company_name"]
    except Exception:
        pass

    try:
        categories = client.table("category").select("category_id, name").execute().data or []
        cat_map = {c["category_id"]: c["name"] for c in categories}
    except Exception:
        cat_map = {}

    return company_map, cat_map

def _current_expense_row(db: Session, expense_id: int) -> Optional[dict]:
    """Company, payment method and amount of an existing expense (Supabase first, then local)."""
    try:
        client = get_supabase_admin_client()
        res = client.table("expenses").select("company_id, payment_method, amount").eq("expense_id", expense_id).execute()
        if res.data:
            return res.data[0]
    except Exception:
        pass
    exp = db.query(Expense).filter(Expense.expense_id == expense_id).first()
    if exp:
        return {"company_id": exp.company_id, "payment_method": exp.payment_method, "amount": exp.amount}
    return None

@router.get("", response_model=List[ExpenseOut], summary="List expense records")
def get_expenses(
    company_id: Optional[int] = Query(None, description="Filter by Company ID"),
    company_name: Optional[str] = Query(None, description="Filter by Company Name"),
    category_id: Optional[int] = Query(None, description="Filter by Category ID"),
    start_date: Optional[date] = Query(None, description="Filter from date"),
    end_date: Optional[date] = Query(None, description="Filter to date"),
    db: Session = Depends(get_db)
):
    try:
        client = get_supabase_admin_client()
        company_map, cat_map = get_supabase_mappings(client)

        sb_query = client.table("expenses").select("*")

        # Company filter
        resolved_company_id = company_id
        if not resolved_company_id and company_name and company_name.lower() != "all companies":
            for cid, cname in company_map.items():
                if cname.strip().lower() == company_name.strip().lower():
                    resolved_company_id = cid
                    break

        if resolved_company_id:
            sb_query = sb_query.eq("company_id", resolved_company_id)
        if category_id:
            sb_query = sb_query.eq("category_id", category_id)
        if start_date:
            sb_query = sb_query.gte("expense_date", start_date.isoformat())
        if end_date:
            sb_query = sb_query.lte("expense_date", end_date.isoformat())

        res = sb_query.order("expense_date", desc=True).order("expense_id", desc=True).execute()
        rows = res.data or []

        return [
            ExpenseOut(
                expense_id=row["expense_id"],
                company_id=row.get("company_id"),
                company_name=company_map.get(row.get("company_id")) or "Unknown Company",
                category_id=row.get("category_id"),
                category_name=cat_map.get(row.get("category_id")) or "None",
                payment_method=row.get("payment_method"),
                created_by=row.get("created_by"),
                expense_date=row.get("expense_date"),
                reference_no=row.get("reference_no"),
                cheque_no=row.get("cheque_number") or row.get("cheque_no") or (row.get("reference_no") if not (row.get("reference_no") or "").startswith("REF-") else None),
                amount=row.get("amount") or 0.0,
                amount_paid=row.get("amount_paid") or 0.0,
                unpaid_balance=Decimal(str(row.get("amount") or 0.0)) - Decimal(str(row.get("amount_paid") or 0.0)),
                particulars=row.get("description") or "",
                description=row.get("description") or "",
                created_at=row.get("created_at"),
                updated_at=row.get("updated_at")
            )
            for row in rows
        ]
    except Exception as e:
        # Fallback to local SQLite if Supabase is unavailable
        query = (
            db.query(
                Expense,
                Company.company_name.label("company_name"),
                Category.name.label("category_name")
            )
            .outerjoin(Company, Expense.company_id == Company.company_id)
            .outerjoin(Category, Expense.category_id == Category.category_id)
        )

        if company_id:
            query = query.filter(Expense.company_id == company_id)
        elif company_name and company_name.lower() != "all companies":
            query = query.filter(func.lower(Company.company_name) == func.lower(company_name.strip()))

        if category_id:
            query = query.filter(Expense.category_id == category_id)
        if start_date:
            query = query.filter(Expense.expense_date >= start_date)
        if end_date:
            query = query.filter(Expense.expense_date <= end_date)

        rows = query.order_by(Expense.expense_date.desc(), Expense.expense_id.desc()).all()

        return [
            ExpenseOut(
                expense_id=exp.expense_id,
                company_id=exp.company_id,
                company_name=c_name,
                category_id=exp.category_id,
                category_name=cat_name or "None",
                payment_method=exp.payment_method,
                created_by=exp.created_by,
                expense_date=exp.expense_date,
                reference_no=exp.reference_no,
                cheque_no=exp.cheque_number or exp.cheque_no or (exp.reference_no if not (exp.reference_no or "").startswith("REF-") else None),
                amount=exp.amount,
                amount_paid=exp.amount_paid or Decimal("0.00"),
                unpaid_balance=exp.amount - (exp.amount_paid or Decimal("0.00")),
                particulars=exp.description or "",
                description=exp.description or "",
                created_at=exp.created_at,
                updated_at=exp.updated_at
            )
            for exp, c_name, cat_name in rows
        ]

@router.post("", response_model=ExpenseOut, status_code=status.HTTP_201_CREATED, summary="Record a new expense")
def create_expense(expense_in: ExpenseCreate, request: Request, db: Session = Depends(get_db)):
    if expense_in.amount < Decimal("1.00"):
        raise HTTPException(status_code=400, detail="Withdrawal amount must be at least 1.00 (cannot be 0 or negative).")

    if expense_in.expense_date > date.today():
        raise HTTPException(status_code=400, detail="Expense date cannot be in the future (maximum date is today).")

    parts = (expense_in.particulars or expense_in.description or "").strip()
    if not parts:
        raise HTTPException(status_code=400, detail="Particulars is required.")

    cheque = (expense_in.cheque_no or expense_in.chequeNo or "").strip() or None
    ref = expense_in.reference_no or (f"CHK-{cheque}" if cheque else f"REF-{expense_in.expense_date.strftime('%Y%m%d')}")

    try:
        client = get_supabase_admin_client()
        company_map, cat_map = get_supabase_mappings(client)

        # 1. Resolve Company in Supabase
        target_company_id = expense_in.company_id
        target_company_name = expense_in.company or ""

        if target_company_id and target_company_id in company_map:
            target_company_name = company_map[target_company_id]
        elif target_company_name:
            for cid, cname in company_map.items():
                if cname.strip().lower() == target_company_name.strip().lower():
                    target_company_id = cid
                    target_company_name = cname
                    break

        if not target_company_id:
            if target_company_name:
                ins_comp = client.table("company").insert({
                    "company_name": target_company_name.strip(),
                    "location": "Metro Manila, Philippines",
                    "contact_person": f"{target_company_name} Manager",
                    "contact_number": "09123456789",
                    "email": "info@mct.com",
                    "starting_balance": 0.00,
                    "current_balance": 0.00
                }).execute()
                if ins_comp.data:
                    target_company_id = ins_comp.data[0]["company_id"]
            else:
                raise HTTPException(status_code=400, detail="Invalid company specified.")

        # Petty cash expenses are paid from the company's petty cash wallet, not sales
        PettyCashService(db).ensure_sufficient_balance(target_company_id, expense_in.payment_method, expense_in.amount)

        # 2. Resolve Category in Supabase
        resolved_category_id = expense_in.category_id
        category_name = "None"
        category_str = (expense_in.category or "").strip()

        if category_str and category_str.lower() != "none":
            for cid, cname in cat_map.items():
                if cname.strip().lower() == category_str.lower():
                    resolved_category_id = cid
                    category_name = cname
                    break
            if not resolved_category_id:
                ins_cat = client.table("category").insert({"name": category_str}).execute()
                if ins_cat.data:
                    resolved_category_id = ins_cat.data[0]["category_id"]
                    category_name = category_str
        elif resolved_category_id and resolved_category_id in cat_map:
            category_name = cat_map[resolved_category_id]
        else:
            resolved_category_id = None
            category_name = "None"

        # 3. Insert into Supabase
        payment_method_str = (expense_in.payment_method or "").strip() or None
        sb_insert = client.table("expenses").insert({
            "company_id": target_company_id,
            "category_id": resolved_category_id,
            "payment_method": payment_method_str,
            "created_by": expense_in.created_by,
            "expense_date": expense_in.expense_date.isoformat(),
            "reference_no": ref,
            "cheque_number": cheque,
            "amount": float(expense_in.amount),
            "amount_paid": float(expense_in.amount_paid or 0.0),
            "description": parts,
        }).execute()

        if not sb_insert.data:
            raise HTTPException(status_code=500, detail="Failed to insert expense into Supabase.")

        created_row = sb_insert.data[0]
        sb_expense_id = created_row["expense_id"]

        # Also backup to local SQLite
        try:
            local_comp = db.query(Company).filter(Company.company_id == target_company_id).first()
            if not local_comp:
                local_comp = Company(
                    company_id=target_company_id,
                    company_name=target_company_name,
                    starting_balance=0.00,
                    current_balance=0.00
                )
                db.add(local_comp)
                db.commit()

            local_exp = Expense(
                expense_id=sb_expense_id,
                company_id=target_company_id,
                category_id=resolved_category_id,
                payment_method=payment_method_str,
                created_by=expense_in.created_by,
                expense_date=expense_in.expense_date,
                reference_no=ref,
                cheque_no=cheque,
                cheque_number=cheque,
                amount=expense_in.amount,
                amount_paid=expense_in.amount_paid or Decimal("0.00"),
                description=parts
            )
            db.merge(local_exp)
            db.commit()
        except Exception:
            db.rollback()

        log_transaction(
            db, AuditAction.EXPENSE_CREATED,
            user_id=None, company_id=target_company_id,
            ip_address=request.client.host if request.client else "unknown",
            record_id=sb_expense_id, record_type="expense",
            extra={"amount": float(expense_in.amount), "expense_date": expense_in.expense_date.isoformat()},
        )

        return ExpenseOut(
            expense_id=created_row["expense_id"],
            company_id=created_row.get("company_id"),
            company_name=target_company_name,
            category_id=created_row.get("category_id"),
            category_name=category_name,
            payment_method=payment_method_str,
            created_by=created_row.get("created_by"),
            expense_date=created_row.get("expense_date"),
            reference_no=created_row.get("reference_no"),
            cheque_no=created_row.get("cheque_number") or cheque or (created_row.get("reference_no") if not (created_row.get("reference_no") or "").startswith("REF-") else None),
            amount=created_row.get("amount"),
            amount_paid=created_row.get("amount_paid") or 0.0,
            unpaid_balance=Decimal(str(created_row.get("amount") or 0.0)) - Decimal(str(created_row.get("amount_paid") or 0.0)),
            particulars=created_row.get("description"),
            description=created_row.get("description"),
            created_at=created_row.get("created_at"),
            updated_at=created_row.get("updated_at")
        )

    except HTTPException:
        raise
    except Exception as e:
        # Fallback to local SQLite only if Supabase error occurs
        target_company = None
        if expense_in.company_id:
            target_company = db.query(Company).filter(Company.company_id == expense_in.company_id).first()
        elif expense_in.company:
            target_company = db.query(Company).filter(
                func.lower(Company.company_name) == func.lower(expense_in.company.strip())
            ).first()

        if not target_company:
            if expense_in.company and expense_in.company.strip():
                target_company = Company(
                    company_name=expense_in.company.strip(),
                    starting_balance=0.00,
                    current_balance=0.00
                )
                db.add(target_company)
                db.commit()
                db.refresh(target_company)
            else:
                raise HTTPException(status_code=400, detail="Invalid company specified.")

        PettyCashService(db).ensure_sufficient_balance(target_company.company_id, expense_in.payment_method, expense_in.amount)

        expense = Expense(
            company_id=target_company.company_id,
            category_id=expense_in.category_id,
            payment_method=(expense_in.payment_method or "").strip() or None,
            created_by=expense_in.created_by,
            expense_date=expense_in.expense_date,
            reference_no=ref,
            amount=expense_in.amount,
            amount_paid=expense_in.amount_paid or Decimal("0.00"),
            description=parts,
        )
        db.add(expense)
        db.commit()
        db.refresh(expense)

        cat = db.query(Category).filter(Category.category_id == expense.category_id).first() if expense.category_id else None

        log_transaction(
            db, AuditAction.EXPENSE_CREATED,
            user_id=None, company_id=target_company.company_id,
            ip_address=request.client.host if request.client else "unknown",
            record_id=expense.expense_id, record_type="expense",
            extra={"amount": float(expense.amount), "expense_date": expense.expense_date.isoformat()},
        )

        return ExpenseOut(
            expense_id=expense.expense_id,
            company_id=expense.company_id,
            company_name=target_company.company_name,
            category_id=expense.category_id,
            category_name=cat.name if cat else "None",
            created_by=expense.created_by,
            expense_date=expense.expense_date,
            reference_no=expense.reference_no,
            cheque_no=expense.cheque_number or expense.cheque_no or cheque or (expense.reference_no if not (expense.reference_no or "").startswith("REF-") else None),
            amount=expense.amount,
            amount_paid=expense.amount_paid or Decimal("0.00"),
            unpaid_balance=expense.amount - (expense.amount_paid or Decimal("0.00")),
            particulars=expense.description,
            description=expense.description,
            created_at=expense.created_at,
            updated_at=expense.updated_at
        )

@router.get("/{expense_id}", response_model=ExpenseOut, summary="Get expense details")
def get_expense(expense_id: int, db: Session = Depends(get_db)):
    try:
        client = get_supabase_admin_client()
        company_map, cat_map = get_supabase_mappings(client)
        res = client.table("expenses").select("*").eq("expense_id", expense_id).execute()
        if res.data:
            row = res.data[0]
            return ExpenseOut(
                expense_id=row["expense_id"],
                company_id=row.get("company_id"),
                company_name=company_map.get(row.get("company_id")) or "Unknown",
                category_id=row.get("category_id"),
                category_name=cat_map.get(row.get("category_id")) or "None",
                created_by=row.get("created_by"),
                expense_date=row.get("expense_date"),
                reference_no=row.get("reference_no"),
                cheque_no=row.get("cheque_number") or row.get("cheque_no") or (row.get("reference_no") if not (row.get("reference_no") or "").startswith("REF-") else None),
                amount=row.get("amount") or 0.0,
                amount_paid=row.get("amount_paid") or 0.0,
                unpaid_balance=Decimal(str(row.get("amount") or 0.0)) - Decimal(str(row.get("amount_paid") or 0.0)),
                particulars=row.get("description") or "",
                description=row.get("description") or "",
                created_at=row.get("created_at"),
                updated_at=row.get("updated_at")
            )
    except Exception:
        pass

    result = (
        db.query(
            Expense,
            Company.company_name.label("company_name"),
            Category.name.label("category_name")
        )
        .outerjoin(Company, Expense.company_id == Company.company_id)
        .outerjoin(Category, Expense.category_id == Category.category_id)
        .filter(Expense.expense_id == expense_id)
        .first()
    )
    if not result:
        raise HTTPException(status_code=404, detail="Expense not found")
    exp, c_name, cat_name = result
    return ExpenseOut(
        expense_id=exp.expense_id,
        company_id=exp.company_id,
        company_name=c_name,
        category_id=exp.category_id,
        category_name=cat_name or "None",
        created_by=exp.created_by,
        expense_date=exp.expense_date,
        reference_no=exp.reference_no,
        cheque_no=exp.cheque_number or exp.cheque_no or (exp.reference_no if not (exp.reference_no or "").startswith("REF-") else None),
        amount=exp.amount,
        amount_paid=exp.amount_paid or Decimal("0.00"),
        unpaid_balance=exp.amount - (exp.amount_paid or Decimal("0.00")),
        particulars=exp.description or "",
        description=exp.description or "",
        created_at=exp.created_at,
        updated_at=exp.updated_at
    )

@router.put("/{expense_id}", response_model=ExpenseOut, summary="Update an existing expense")
@router.patch("/{expense_id}", response_model=ExpenseOut, summary="Update an existing expense")
def update_expense(expense_id: int, expense_in: ExpenseUpdate, request: Request, db: Session = Depends(get_db)):
    target_amt = expense_in.amount if expense_in.amount is not None else expense_in.withdrawal
    if target_amt is not None and target_amt < Decimal("1.00"):
        raise HTTPException(status_code=400, detail="Withdrawal amount must be at least 1.00 (cannot be 0 or negative).")

    if expense_in.expense_date is not None and expense_in.expense_date > date.today():
        raise HTTPException(status_code=400, detail="Expense date cannot be in the future (maximum date is today).")

    # Re-check the petty cash wallet with this expense's old amount added back
    current = _current_expense_row(db, expense_id)
    if current:
        PettyCashService(db).ensure_sufficient_balance(
            current.get("company_id"),
            expense_in.payment_method if expense_in.payment_method is not None else current.get("payment_method"),
            target_amt if target_amt is not None else current.get("amount"),
            exclude_expense_id=expense_id,
        )

    update_payload = {}
    if expense_in.expense_date:
        update_payload["expense_date"] = expense_in.expense_date.isoformat()
    if target_amt is not None:
        update_payload["amount"] = float(target_amt)
    if expense_in.amount_paid is not None:
        update_payload["amount_paid"] = float(expense_in.amount_paid)

    parts = expense_in.particulars or expense_in.description
    if parts is not None:
        update_payload["description"] = parts.strip()

    cheque = expense_in.cheque_no if expense_in.cheque_no is not None else expense_in.chequeNo
    if cheque is not None:
        chq_val = cheque.strip() if cheque.strip() else None
        update_payload["cheque_number"] = chq_val
        if chq_val:
            update_payload["reference_no"] = chq_val
    elif expense_in.reference_no is not None:
        update_payload["reference_no"] = expense_in.reference_no.strip() if expense_in.reference_no.strip() else None

    # Update in Supabase
    updated_row = None
    try:
        client = get_supabase_admin_client()
        company_map, cat_map = get_supabase_mappings(client)

        category_str = (expense_in.category or "").strip()
        if category_str:
            if category_str.lower() == "none":
                update_payload["category_id"] = None
            else:
                cat_id = None
                for cid, cname in cat_map.items():
                    if cname.lower() == category_str.lower():
                        cat_id = cid
                        break
                if not cat_id:
                    ins_cat = client.table("category").insert({"name": category_str}).execute()
                    if ins_cat.data:
                        cat_id = ins_cat.data[0]["category_id"]
                update_payload["category_id"] = cat_id
        elif expense_in.category_id is not None:
            update_payload["category_id"] = expense_in.category_id

        if expense_in.payment_method is not None:
            update_payload["payment_method"] = (expense_in.payment_method or "").strip() or None

        if update_payload:
            sb_res = client.table("expenses").update(update_payload).eq("expense_id", expense_id).execute()
            if sb_res.data:
                updated_row = sb_res.data[0]
    except Exception as e:
        print(f"Supabase expense update error: {e}")

    # Also update in local SQLite
    expense = db.query(Expense).filter(Expense.expense_id == expense_id).first()
    if expense:
        if "expense_date" in update_payload:
            expense.expense_date = expense_in.expense_date
        if "amount" in update_payload:
            expense.amount = target_amt
        if "amount_paid" in update_payload:
            expense.amount_paid = expense_in.amount_paid
        if "description" in update_payload:
            expense.description = update_payload["description"]
        if "reference_no" in update_payload:
            expense.reference_no = update_payload["reference_no"]
        if "cheque_number" in update_payload:
            expense.cheque_number = update_payload["cheque_number"]
            expense.cheque_no = update_payload["cheque_number"]
        if "category_id" in update_payload:
            expense.category_id = update_payload["category_id"]
        if "payment_method" in update_payload:
            expense.payment_method = update_payload["payment_method"]
        db.commit()
        db.refresh(expense)

    if updated_row:
        client = get_supabase_admin_client()
        company_map, cat_map = get_supabase_mappings(client)
        log_transaction(
            db, AuditAction.EXPENSE_UPDATED,
            user_id=None, company_id=updated_row.get("company_id"),
            ip_address=request.client.host if request.client else "unknown",
            record_id=expense_id, record_type="expense",
        )
        return ExpenseOut(
            expense_id=updated_row["expense_id"],
            company_id=updated_row.get("company_id"),
            company_name=company_map.get(updated_row.get("company_id")) or "Unknown",
            category_id=updated_row.get("category_id"),
            category_name=cat_map.get(updated_row.get("category_id")) or "None",
            payment_method=updated_row.get("payment_method"),
            created_by=updated_row.get("created_by"),
            expense_date=updated_row.get("expense_date"),
            reference_no=updated_row.get("reference_no"),
            cheque_no=updated_row.get("cheque_number") or cheque or (updated_row.get("reference_no") if not (updated_row.get("reference_no") or "").startswith("REF-") else None),
            amount=updated_row.get("amount"),
            amount_paid=updated_row.get("amount_paid") or 0.0,
            unpaid_balance=Decimal(str(updated_row.get("amount") or 0.0)) - Decimal(str(updated_row.get("amount_paid") or 0.0)),
            particulars=updated_row.get("description"),
            description=updated_row.get("description"),
            created_at=updated_row.get("created_at"),
            updated_at=updated_row.get("updated_at")
        )

    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    company = db.query(Company).filter(Company.company_id == expense.company_id).first()
    category = db.query(Category).filter(Category.category_id == expense.category_id).first() if expense.category_id else None

    log_transaction(
        db, AuditAction.EXPENSE_UPDATED,
        user_id=None, company_id=expense.company_id,
        ip_address=request.client.host if request.client else "unknown",
        record_id=expense_id, record_type="expense",
    )
    return ExpenseOut(
        expense_id=expense.expense_id,
        company_id=expense.company_id,
        company_name=company.company_name if company else None,
        category_id=expense.category_id,
        category_name=category.name if category else "None",
        created_by=expense.created_by,
        expense_date=expense.expense_date,
        reference_no=expense.reference_no,
        cheque_no=expense.cheque_number or expense.cheque_no or (expense.reference_no if not (expense.reference_no or "").startswith("REF-") else None),
        amount=expense.amount,
        amount_paid=expense.amount_paid or Decimal("0.00"),
        unpaid_balance=expense.amount - (expense.amount_paid or Decimal("0.00")),
        particulars=expense.description,
        description=expense.description,
        created_at=expense.created_at,
        updated_at=expense.updated_at
    )

@router.delete("/{expense_id}", status_code=status.HTTP_200_OK, summary="Delete an expense")
def delete_expense(expense_id: int, request: Request, db: Session = Depends(get_db)):
    deleted_from_supabase = False
    deleted_company_id = None
    try:
        client = get_supabase_admin_client()
        existing = client.table("expenses").select("company_id").eq("expense_id", expense_id).limit(1).execute()
        if existing.data:
            deleted_company_id = existing.data[0].get("company_id")
        sb_res = client.table("expenses").delete().eq("expense_id", expense_id).execute()
        if sb_res.data and len(sb_res.data) > 0:
            deleted_from_supabase = True
    except Exception as e:
        print(f"Supabase delete expense error: {e}")

    expense = db.query(Expense).filter(Expense.expense_id == expense_id).first()
    if expense:
        deleted_company_id = deleted_company_id or expense.company_id
        db.delete(expense)
        db.commit()

    try:
        log_transaction(
            db, AuditAction.EXPENSE_DELETED,
            user_id=None, company_id=deleted_company_id,
            ip_address=request.client.host if request.client else "unknown",
            record_id=expense_id, record_type="expense",
        )
    except Exception as e:
        print(f"Audit log error on expense delete: {e}")

    return {
        "message": "Expense deleted successfully",
        "success": True,
        "expense_id": expense_id,
        "supabase_deleted": deleted_from_supabase
    }

