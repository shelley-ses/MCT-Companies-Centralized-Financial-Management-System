from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from typing import List, Optional
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.db.session import get_db
from app.db.supabase import get_supabase_admin_client
from app.models.loan import Loan, LoanRepayment
from app.models.company import Company
from app.schemas.loan import (
    LoanCreate,
    LoanOut,
    LoanUpdate,
    LoanApproveRequest,
    LoanRepaymentCreate,
    LoanRepaymentOut,
    LoanStatementOut,
    CompanyLoanOut,
    CompanyLoanListOut,
)
from app.core.dependencies import AdminUser, CurrentUser
from app.services.finance_service import FinanceService, FinanceCalculator
from app.services.audit_service import AuditAction, log_transaction

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
    14: "FILCAP Prime Holdings Corp.",
}

from app.core.cache import get_cached, set_cached

def get_supabase_company_mapping(client, db: Optional[Session] = None):
    cached = get_cached("supabase_loan_company_mapping")
    if cached:
        return cached[0], cached[1]

    id_to_name = dict(CANONICAL_COMPANY_MAP)
    name_to_id = {v.strip().lower(): k for k, v in CANONICAL_COMPANY_MAP.items()}

    if db:
        try:
            comps = db.query(Company).all()
            for c in comps:
                id_to_name[c.company_id] = c.company_name
                name_to_id[c.company_name.strip().lower()] = c.company_id
        except Exception:
            pass

    if client:
        try:
            companies = client.table("company").select("company_id, company_name").execute().data or []
            for c in companies:
                id_to_name[c["company_id"]] = c["company_name"]
                name_to_id[c["company_name"].strip().lower()] = c["company_id"]
        except Exception:
            pass

    set_cached("supabase_loan_company_mapping", (id_to_name, name_to_id), ttl_seconds=600)
    return id_to_name, name_to_id


def resolve_company_id(
    cid: Optional[int],
    cname: Optional[str],
    name_to_id: dict,
    db: Session
) -> Optional[int]:
    if cid:
        return cid
    if cname and cname.strip():
        norm = cname.strip().lower()
        if norm in name_to_id:
            return name_to_id[norm]
        comp = db.query(Company).filter(func.lower(Company.company_name) == norm).first()
        if comp:
            return comp.company_id
    return None


def _company_loan_query(
    db: Session,
    borrower_id: Optional[int],
    lender_id: Optional[int],
    company_id: Optional[int],
    category: Optional[str],
    reference: Optional[str],
    particulars: Optional[str],
    payment_status: Optional[str],
    start_date: Optional[date],
    end_date: Optional[date],
):
    query = db.query(Loan)
    if borrower_id:
        query = query.filter(Loan.borrower == borrower_id)
    if lender_id:
        query = query.filter(Loan.lender == lender_id)
    if company_id:
        query = query.filter(or_(Loan.borrower == company_id, Loan.lender == company_id))
    query = query.filter(func.lower(Loan.status).in_(["approved", "paid", "overdue"]))
    if reference:
        query = query.filter(Loan.loan_ref_no.ilike(f"%{reference.strip()}%"))
    if particulars:
        query = query.filter(Loan.description.ilike(f"%{particulars.strip()}%"))
    if start_date:
        query = query.filter(Loan.loan_date >= start_date)
    if end_date:
        query = query.filter(Loan.loan_date <= end_date)
    return query


LOAN_CATEGORIES = ("Rent", "Electricity", "Water Bill", "Internet", "Operating Supplies")


def _loan_category(description: Optional[str]) -> Optional[str]:
    text = (description or "").lower()
    aliases = {
        "Rent": ("rent", "lease"),
        "Electricity": ("electricity", "electric", "power", "meralco"),
        "Water Bill": ("water", "maynilad", "manila water"),
        "Internet": ("internet", "wifi", "wi-fi", "broadband"),
        "Operating Supplies": ("operating supplies", "supplies", "utility", "utilities"),
    }
    for category, keywords in aliases.items():
        if any(keyword in text for keyword in keywords):
            return category
    return None


def _company_loan_item(loan: Loan, company_names: dict[int, str], db: Session) -> CompanyLoanOut:
    principal = Decimal(str(loan.principal_amount or 0))
    interest = FinanceCalculator.calculate_loan_interest(
        principal, Decimal(str(loan.interest_rate or 0))
    )
    total_payable = FinanceCalculator.calculate_loan_total_payable(principal, interest)
    total_paid = Decimal(str(
        db.query(func.coalesce(func.sum(LoanRepayment.amount), 0))
        .filter(LoanRepayment.loan_id == loan.loan_id, LoanRepayment.status != "pending")
        .scalar() or 0
    ))
    outstanding = FinanceCalculator.calculate_loan_remaining_balance(total_payable, total_paid)
    if outstanding <= 0:
        payment_status = "Fully Paid"
    elif loan.due_date and loan.due_date < date.today():
        payment_status = "Overdue"
    elif total_paid > 0:
        payment_status = "Partially Paid"
    else:
        payment_status = "Unpaid"
    category = _loan_category(loan.description) or "Operating Supplies"
    interest_display = f"{loan.interest_rate or Decimal('0.00')}%"
    return CompanyLoanOut(
        loan_id=loan.loan_id,
        borrower=loan.borrower,
        lender=loan.lender,
        borrower_name=company_names.get(loan.borrower) or f"Company #{loan.borrower}",
        lender_name=company_names.get(loan.lender) if loan.lender else "External Lender",
        loan_ref_no=loan.loan_ref_no,
        principal_amount=principal,
        amount=principal,
        interest_rate=Decimal(str(loan.interest_rate or 0)),
        interest_type=loan.interest_type or "simple",
        loan_date=loan.loan_date,
        due_date=loan.due_date,
        description=loan.description,
        particulars=loan.description,
        status=loan.status,
        category=category,
        total_paid=total_paid,
        outstanding_balance=outstanding,
        payment_status=payment_status,
        interest_display=interest_display,
        created_at=loan.created_at,
        updated_at=loan.updated_at,
    )


def _group_company_loans(
    loans: list[Loan], company_names: dict[int, str], db: Session
) -> list[dict]:
    groups: dict[tuple[int, Optional[int], str], list[CompanyLoanOut]] = {}
    for loan in loans:
        item = _company_loan_item(loan, company_names, db)
        key = (item.borrower, item.lender, item.category)
        groups.setdefault(key, []).append(item)

    result = []
    for (borrower, lender, category), items in groups.items():
        rates = {item.interest_rate for item in items}
        outstanding = sum((item.outstanding_balance for item in items), Decimal("0.00"))
        total_paid = sum((item.total_paid for item in items), Decimal("0.00"))
        statuses = {item.payment_status for item in items}
        if "Overdue" in statuses:
            payment_status = "Overdue"
        elif outstanding <= 0:
            payment_status = "Fully Paid"
        elif "Partially Paid" in statuses or "Fully Paid" in statuses:
            payment_status = "Partially Paid"
        else:
            payment_status = "Unpaid"
        interest_display = (
            f"{next(iter(rates))}%"
            if len(rates) == 1
            else "Multiple rates"
        )
        result.append({
            "borrower": borrower,
            "lender": lender,
            "borrower_name": items[0].borrower_name,
            "lender_name": items[0].lender_name,
            "category": category,
            "total_loan_amount": sum((item.principal_amount for item in items), Decimal("0.00")),
            "total_paid": total_paid,
            "outstanding_balance": outstanding,
            "interest_display": interest_display,
            "payment_status": payment_status,
            "loan_count": len(items),
            "loans": items,
        })
    return result


@router.get("/company", response_model=CompanyLoanListOut, summary="List approved company loans for administrators")
def get_company_loans(
    _admin: AdminUser,
    borrower_id: Optional[int] = Query(None),
    lender_id: Optional[int] = Query(None),
    company_id: Optional[int] = Query(None),
    category: Optional[str] = Query(None),
    reference: Optional[str] = Query(None),
    particulars: Optional[str] = Query(None),
    payment_status: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    company_names = {c.company_id: c.company_name for c in db.query(Company).all()}
    query = _company_loan_query(
        db, borrower_id, lender_id, company_id, category, reference,
        particulars, payment_status, start_date, end_date,
    )
    groups = _group_company_loans(
        query.order_by(Loan.loan_date.desc(), Loan.loan_id.desc()).all(),
        company_names,
        db,
    )
    if category and category.lower() != "all":
        groups = [group for group in groups if group["category"].lower() == category.lower()]
    if payment_status and payment_status.lower() != "all":
        groups = [group for group in groups if group["payment_status"].lower() == payment_status.lower()]
    total = len(groups)
    items = groups[offset:offset + limit]
    return CompanyLoanListOut(
        items=items,
        total=total,
        offset=offset,
        limit=limit,
    )


@router.get("/company/export", summary="Export approved company loans as CSV")
def export_company_loans(
    _admin: AdminUser,
    borrower_id: Optional[int] = Query(None),
    lender_id: Optional[int] = Query(None),
    company_id: Optional[int] = Query(None),
    category: Optional[str] = Query(None),
    reference: Optional[str] = Query(None),
    particulars: Optional[str] = Query(None),
    payment_status: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
) -> Response:
    import csv
    import io

    company_names = {c.company_id: c.company_name for c in db.query(Company).all()}
    query = _company_loan_query(
        db, borrower_id, lender_id, company_id, category, reference,
        particulars, payment_status, start_date, end_date,
    )
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Borrower Company", "Lender Company", "Category", "Total Loan Amount",
        "Total Paid", "Outstanding Balance", "Interest Rate", "Status",
    ])
    groups = _group_company_loans(
        query.order_by(Loan.loan_date.desc(), Loan.loan_id.desc()).all(),
        company_names,
        db,
    )
    if category and category.lower() != "all":
        groups = [group for group in groups if group["category"].lower() == category.lower()]
    if payment_status and payment_status.lower() != "all":
        groups = [group for group in groups if group["payment_status"].lower() == payment_status.lower()]
    for group in groups:
        writer.writerow([
            group["borrower_name"],
            group["lender_name"],
            group["category"],
            group["total_loan_amount"],
            group["total_paid"],
            group["outstanding_balance"],
            group["interest_display"],
            group["payment_status"],
        ])
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="company-loans.csv"'},
    )


@router.get("", response_model=List[LoanOut], summary="List loans from Supabase / DB")
def get_loans(
    borrower_id: Optional[int] = Query(None, description="Filter by Borrower Company ID"),
    lender_id: Optional[int] = Query(None, description="Filter by Lender Company ID"),
    company_name: Optional[str] = Query(None, description="Filter by Company Name (matches borrower or lender)"),
    scope: Optional[str] = Query(None, description="'borrower' or 'lender' tab scope"),
    status: Optional[str] = Query(None, description="Filter by Loan Status"),
    start_date: Optional[date] = Query(None, description="Filter from loan date"),
    end_date: Optional[date] = Query(None, description="Filter to loan date"),
    db: Session = Depends(get_db),
):
    try:
        client = get_supabase_admin_client()
        id_to_name, name_to_id = get_supabase_company_mapping(client, db)

        resolved_target_cid = None
        if company_name and company_name.lower() != "all companies":
            resolved_target_cid = resolve_company_id(None, company_name, name_to_id, db)

        sb_query = client.table("loan").select("*")

        if isinstance(borrower_id, int):
            sb_query = sb_query.eq("borrower", borrower_id)
        if isinstance(lender_id, int):
            sb_query = sb_query.eq("lender", lender_id)

        if resolved_target_cid:
            if scope == "borrower":
                sb_query = sb_query.eq("borrower", resolved_target_cid)
            elif scope == "lender":
                sb_query = sb_query.eq("lender", resolved_target_cid)
            else:
                # Matches either borrower or lender
                sb_query = sb_query.or_(f"borrower.eq.{resolved_target_cid},lender.eq.{resolved_target_cid}")

        if isinstance(status, str) and status.lower() != "all":
            sb_query = sb_query.eq("status", status)

        if isinstance(start_date, (date, datetime)):
            sb_query = sb_query.gte("loan_date", start_date.isoformat())
        if isinstance(end_date, (date, datetime)):
            sb_query = sb_query.lte("loan_date", end_date.isoformat())

        res = sb_query.order("loan_date", desc=True).order("loan_id", desc=True).execute()
        rows = res.data or []

        result: List[LoanOut] = []
        for r in rows:
            b_id = r.get("borrower")
            l_id = r.get("lender")
            p_amt = Decimal(str(r.get("principal_amount") or 0.0))
            desc = r.get("description") or ""

            result.append(
                LoanOut(
                    loan_id=r["loan_id"],
                    borrower=b_id,
                    lender=l_id,
                    borrower_name=id_to_name.get(b_id) or f"Company #{b_id}",
                    lender_name=id_to_name.get(l_id) if l_id else "Pending Finance Assignment",
                    loan_ref_no=r.get("loan_ref_no"),
                    principal_amount=p_amt,
                    amount=p_amt,
                    interest_rate=Decimal(str(r.get("interest_rate") or 0.0)),
                    interest_type=r.get("interest_type") or "simple",
                    loan_date=r.get("loan_date"),
                    due_date=r.get("due_date"),
                    description=desc,
                    particulars=desc,
                    status=r.get("status") or "Pending Approval",
                    created_at=r.get("created_at"),
                    updated_at=r.get("updated_at"),
                )
            )
        return result

    except Exception as e:
        print(f"Supabase GET /loans failed, falling back to local SQLite: {e}")
        query = db.query(Loan)

        resolved_target_cid = None
        if company_name and company_name.lower() != "all companies":
            comp = db.query(Company).filter(func.lower(Company.company_name) == company_name.strip().lower()).first()
            if comp:
                resolved_target_cid = comp.company_id

        if isinstance(borrower_id, int):
            query = query.filter(Loan.borrower == borrower_id)
        if isinstance(lender_id, int):
            query = query.filter(Loan.lender == lender_id)

        if resolved_target_cid:
            if scope == "borrower":
                query = query.filter(Loan.borrower == resolved_target_cid)
            elif scope == "lender":
                query = query.filter(Loan.lender == resolved_target_cid)
            else:
                query = query.filter(or_(Loan.borrower == resolved_target_cid, Loan.lender == resolved_target_cid))

        if isinstance(status, str) and status.lower() != "all":
            query = query.filter(Loan.status == status)

        if isinstance(start_date, (date, datetime)):
            query = query.filter(Loan.loan_date >= start_date)
        if isinstance(end_date, (date, datetime)):
            query = query.filter(Loan.loan_date <= end_date)

        loans = query.order_by(Loan.loan_date.desc(), Loan.loan_id.desc()).all()

        companies = db.query(Company).all()
        comp_map = {c.company_id: c.company_name for c in companies}

        return [
            LoanOut(
                loan_id=l.loan_id,
                borrower=l.borrower,
                lender=l.lender,
                borrower_name=comp_map.get(l.borrower) or f"Company #{l.borrower}",
                lender_name=comp_map.get(l.lender) if l.lender else "Pending Finance Assignment",
                loan_ref_no=l.loan_ref_no,
                principal_amount=l.principal_amount,
                amount=l.principal_amount,
                interest_rate=l.interest_rate or Decimal("0.00"),
                interest_type=l.interest_type or "simple",
                loan_date=l.loan_date,
                due_date=l.due_date,
                description=l.description,
                particulars=l.description,
                status=getattr(l, "status", None) or "Pending Approval",
                created_at=l.created_at,
                updated_at=l.updated_at,
            )
            for l in loans
        ]


@router.post("", response_model=LoanOut, status_code=status.HTTP_201_CREATED, summary="Create a new loan record")
def create_loan(loan_in: LoanCreate, request: Request, db: Session = Depends(get_db)):
    client = None
    name_to_id = {}
    id_to_name = {}
    try:
        client = get_supabase_admin_client()
        id_to_name, name_to_id = get_supabase_company_mapping(client)
    except Exception:
        pass

    borrower_id = resolve_company_id(loan_in.borrower, loan_in.borrower_company, name_to_id, db)
    lender_id = resolve_company_id(loan_in.lender, loan_in.lender_company, name_to_id, db) if (loan_in.lender or loan_in.lender_company) else None

    if not borrower_id:
        raise HTTPException(status_code=400, detail="Borrower company could not be resolved.")

    if lender_id and borrower_id == lender_id:
        raise HTTPException(status_code=400, detail="Borrower and lender cannot be the same company.")

    if loan_in.principal_amount < Decimal("1.00"):
        raise HTTPException(status_code=400, detail="Loan amount must be at least 1.00 (cannot be 0 or letters).")

    desc = (loan_in.particulars or loan_in.description or "").strip()
    if not desc:
        desc = "Inter-company term financing facility"

    ref_no = loan_in.loan_ref_no
    if not ref_no or not ref_no.strip():
        date_str = loan_in.loan_date.strftime("%Y%m%d") if loan_in.loan_date else datetime.now().strftime("%Y%m%d")
        ref_no = f"LN-{date_str}-{int(datetime.now().timestamp() % 10000):04d}"

    row_data = {
        "borrower": borrower_id,
        "lender": lender_id,
        "loan_ref_no": ref_no,
        "principal_amount": float(loan_in.principal_amount),
        "interest_rate": float(loan_in.interest_rate or 0.0),
        "interest_type": loan_in.interest_type or "simple",
        "loan_date": loan_in.loan_date.isoformat(),
        "due_date": loan_in.due_date.isoformat() if loan_in.due_date else None,
        "description": desc,
        "status": "Pending Approval",
    }

    created_row = None
    if client:
        try:
            sb_res = client.table("loan").insert(row_data).execute()
            if sb_res.data and len(sb_res.data) > 0:
                created_row = sb_res.data[0]
        except Exception as e:
            print(f"Supabase insert loan error: {e}")

    final_id = created_row["loan_id"] if created_row else None

    # Mirror into SQLite if Supabase inserted, or insert into db if Supabase was unavailable
    if not created_row or (db.bind and db.bind.dialect.name == "sqlite"):
        sqlite_loan = Loan(
            loan_id=created_row["loan_id"] if created_row else None,
            borrower=borrower_id,
            lender=lender_id,
            loan_ref_no=ref_no,
            principal_amount=loan_in.principal_amount,
            interest_rate=loan_in.interest_rate or Decimal("0.00"),
            interest_type=loan_in.interest_type or "simple",
            loan_date=loan_in.loan_date,
            due_date=loan_in.due_date,
            description=desc,
            status="Pending Approval",
        )
        try:
            db.add(sqlite_loan)
            db.commit()
            db.refresh(sqlite_loan)
            final_id = final_id or sqlite_loan.loan_id
        except Exception as e:
            db.rollback()
            print(f"Database mirror insert loan error: {e}")
    b_name = id_to_name.get(borrower_id) or loan_in.borrower_company or f"Company #{borrower_id}"
    l_name = id_to_name.get(lender_id) if lender_id else (loan_in.lender_company or "Pending Finance Assignment")

    try:
        log_transaction(
            db, AuditAction.LOAN_CREATED,
            user_id=None, company_id=borrower_id,
            ip_address=request.client.host if request.client else "unknown",
            record_id=final_id, record_type="loan",
            extra={"borrower": borrower_id, "lender": lender_id, "amount": float(loan_in.principal_amount)},
        )
    except Exception:
        pass

    return LoanOut(
        loan_id=final_id,
        borrower=borrower_id,
        lender=lender_id,
        borrower_name=b_name,
        lender_name=l_name,
        loan_ref_no=ref_no,
        principal_amount=loan_in.principal_amount,
        amount=loan_in.principal_amount,
        interest_rate=loan_in.interest_rate or Decimal("0.00"),
        interest_type=loan_in.interest_type or "simple",
        loan_date=loan_in.loan_date,
        due_date=loan_in.due_date,
        description=desc,
        particulars=desc,
        status="Pending Approval",
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )


@router.put("/{loan_id}", response_model=LoanOut, summary="Update an existing loan (Only allowed if Pending Approval)")
def update_loan(loan_id: int, loan_update: LoanUpdate, db: Session = Depends(get_db)):
    client = None
    try:
        client = get_supabase_admin_client()
    except Exception:
        pass

    # Check current status
    existing_status = None
    existing_row = None
    if client:
        try:
            res = client.table("loan").select("*").eq("loan_id", loan_id).execute()
            if res.data and len(res.data) > 0:
                existing_row = res.data[0]
                existing_status = existing_row.get("status")
        except Exception:
            pass

    sql_loan = db.query(Loan).filter(Loan.loan_id == loan_id).first()
    if not existing_status and sql_loan:
        existing_status = sql_loan.status

    if not existing_row and not sql_loan:
        raise HTTPException(status_code=404, detail="Loan not found.")

    if existing_status and existing_status.strip().lower() != "pending approval":
        raise HTTPException(
            status_code=400,
            detail=f"Loan is already {existing_status}. Once approved, loans can no longer be edited."
        )

    update_payload = {}
    if loan_update.principal_amount is not None:
        if loan_update.principal_amount < Decimal("1.00"):
            raise HTTPException(status_code=400, detail="Loan amount must be at least 1.00.")
        update_payload["principal_amount"] = float(loan_update.principal_amount)
    elif loan_update.amount is not None:
        if loan_update.amount < Decimal("1.00"):
            raise HTTPException(status_code=400, detail="Loan amount must be at least 1.00.")
        update_payload["principal_amount"] = float(loan_update.amount)

    if loan_update.interest_rate is not None:
        update_payload["interest_rate"] = float(loan_update.interest_rate)
    if loan_update.loan_date is not None:
        update_payload["loan_date"] = loan_update.loan_date.isoformat()
    if loan_update.due_date is not None:
        update_payload["due_date"] = loan_update.due_date.isoformat()
    if loan_update.particulars is not None or loan_update.description is not None:
        desc = (loan_update.particulars or loan_update.description or "").strip()
        update_payload["description"] = desc
    if loan_update.loan_ref_no is not None:
        update_payload["loan_ref_no"] = loan_update.loan_ref_no.strip()

    id_to_name, name_to_id = get_supabase_company_mapping(client) if client else ({}, {})
    if loan_update.lender or loan_update.lender_company:
        lid = resolve_company_id(loan_update.lender, loan_update.lender_company, name_to_id, db)
        if lid:
            update_payload["lender"] = lid

    updated_row = None
    if client and update_payload:
        try:
            update_payload["updated_at"] = datetime.now().isoformat()
            sb_res = client.table("loan").update(update_payload).eq("loan_id", loan_id).execute()
            if sb_res.data and len(sb_res.data) > 0:
                updated_row = sb_res.data[0]
        except Exception as e:
            print(f"Supabase update loan error: {e}")

    if sql_loan and update_payload:
        if "principal_amount" in update_payload:
            sql_loan.principal_amount = Decimal(str(update_payload["principal_amount"]))
        if "interest_rate" in update_payload:
            sql_loan.interest_rate = Decimal(str(update_payload["interest_rate"]))
        if "loan_date" in update_payload:
            sql_loan.loan_date = datetime.strptime(update_payload["loan_date"], "%Y-%m-%d").date()
        if "due_date" in update_payload:
            sql_loan.due_date = datetime.strptime(update_payload["due_date"], "%Y-%m-%d").date()
        if "description" in update_payload:
            sql_loan.description = update_payload["description"]
        if "lender" in update_payload:
            sql_loan.lender = update_payload["lender"]
        db.commit()
        db.refresh(sql_loan)

    final_row = updated_row or existing_row
    if final_row:
        b_id = final_row.get("borrower")
        l_id = final_row.get("lender")
        p_amt = Decimal(str(final_row.get("principal_amount") or 0.0))
        return LoanOut(
            loan_id=final_row["loan_id"],
            borrower=b_id,
            lender=l_id,
            borrower_name=id_to_name.get(b_id) or f"Company #{b_id}",
            lender_name=id_to_name.get(l_id) or f"Company #{l_id}",
            loan_ref_no=final_row.get("loan_ref_no"),
            principal_amount=p_amt,
            amount=p_amt,
            interest_rate=Decimal(str(final_row.get("interest_rate") or 0.0)),
            interest_type=final_row.get("interest_type") or "simple",
            loan_date=final_row.get("loan_date"),
            due_date=final_row.get("due_date"),
            description=final_row.get("description"),
            particulars=final_row.get("description"),
            status=final_row.get("status") or "Pending Approval",
            created_at=final_row.get("created_at"),
            updated_at=final_row.get("updated_at"),
        )

    return LoanOut.model_validate(sql_loan)


@router.patch("/{loan_id}/approve", response_model=LoanOut, summary="Finance approves a pending loan request and assigns lender")
@router.post("/{loan_id}/approve", response_model=LoanOut, summary="Finance approves a pending loan request and assigns lender")
def approve_loan(
    loan_id: int,
    approval_in: Optional[LoanApproveRequest] = None,
    db: Session = Depends(get_db)
):
    client = None
    name_to_id = {}
    id_to_name = {}
    try:
        client = get_supabase_admin_client()
        id_to_name, name_to_id = get_supabase_company_mapping(client, db)
    except Exception:
        pass

    sql_loan = db.query(Loan).filter(Loan.loan_id == loan_id).first()
    existing_row = None
    if client:
        try:
            res = client.table("loan").select("*").eq("loan_id", loan_id).execute()
            if res.data and len(res.data) > 0:
                existing_row = res.data[0]
        except Exception:
            pass

    if not existing_row and not sql_loan:
        raise HTTPException(status_code=404, detail="Loan not found.")

    borrower_id = (existing_row.get("borrower") if existing_row else None) or (sql_loan.borrower if sql_loan else None)

    # Determine assigned lender
    new_lender_id = None
    if approval_in and (approval_in.lender or approval_in.lender_company):
        new_lender_id = resolve_company_id(approval_in.lender, approval_in.lender_company, name_to_id, db)

    current_lender = (existing_row.get("lender") if existing_row else None) or (sql_loan.lender if sql_loan else None)
    final_lender_id = new_lender_id or current_lender

    if not final_lender_id:
        raise HTTPException(
            status_code=400,
            detail="A lending company must be selected by Finance to approve this loan.",
        )

    if borrower_id and final_lender_id == borrower_id:
        raise HTTPException(
            status_code=400,
            detail="Lender company cannot be the same as the borrower company.",
        )

    update_payload = {
        "status": "Approved",
        "lender": final_lender_id,
        "updated_at": datetime.now().isoformat(),
    }
    if approval_in:
        if approval_in.interest_rate is not None:
            update_payload["interest_rate"] = float(approval_in.interest_rate)
        if approval_in.due_date is not None:
            update_payload["due_date"] = approval_in.due_date.isoformat()

    updated_row = None
    if client:
        try:
            sb_res = (
                client.table("loan")
                .update(update_payload)
                .eq("loan_id", loan_id)
                .execute()
            )
            if sb_res.data and len(sb_res.data) > 0:
                updated_row = sb_res.data[0]
        except Exception as e:
            print(f"Supabase approve loan error: {e}")

    if sql_loan:
        sql_loan.status = "Approved"
        sql_loan.lender = final_lender_id
        if approval_in and approval_in.interest_rate is not None:
            sql_loan.interest_rate = Decimal(str(approval_in.interest_rate))
        if approval_in and approval_in.due_date is not None:
            sql_loan.due_date = approval_in.due_date
        db.commit()
        db.refresh(sql_loan)

    if not id_to_name and client:
        id_to_name, _ = get_supabase_company_mapping(client)

    if not id_to_name:
        comps = db.query(Company).all()
        id_to_name = {c.company_id: c.company_name for c in comps}

    final_source = updated_row or {
        "loan_id": sql_loan.loan_id,
        "borrower": sql_loan.borrower,
        "lender": sql_loan.lender,
        "loan_ref_no": sql_loan.loan_ref_no,
        "principal_amount": float(sql_loan.principal_amount),
        "interest_rate": float(sql_loan.interest_rate or 0.0),
        "interest_type": sql_loan.interest_type,
        "loan_date": sql_loan.loan_date,
        "due_date": sql_loan.due_date,
        "description": sql_loan.description,
        "status": "Approved",
        "created_at": sql_loan.created_at,
        "updated_at": sql_loan.updated_at,
    }

    b_id = final_source.get("borrower")
    l_id = final_source.get("lender")
    p_amt = Decimal(str(final_source.get("principal_amount") or 0.0))

    return LoanOut(
        loan_id=final_source["loan_id"],
        borrower=b_id,
        lender=l_id,
        borrower_name=id_to_name.get(b_id) or f"Company #{b_id}",
        lender_name=id_to_name.get(l_id) if l_id else "Pending Finance Assignment",
        loan_ref_no=final_source.get("loan_ref_no"),
        principal_amount=p_amt,
        amount=p_amt,
        interest_rate=Decimal(str(final_source.get("interest_rate") or 0.0)),
        interest_type=final_source.get("interest_type") or "simple",
        loan_date=final_source.get("loan_date"),
        due_date=final_source.get("due_date"),
        description=final_source.get("description"),
        particulars=final_source.get("description"),
        status="Approved",
        created_at=final_source.get("created_at") or datetime.now(),
        updated_at=final_source.get("updated_at") or datetime.now(),
    )


@router.delete("/{loan_id}", status_code=status.HTTP_200_OK, summary="Delete loan (Only allowed if Pending Approval)")
def delete_loan(loan_id: int, db: Session = Depends(get_db)):
    client = None
    try:
        client = get_supabase_admin_client()
    except Exception:
        pass

    # Check status
    existing_status = None
    if client:
        try:
            res = client.table("loan").select("status").eq("loan_id", loan_id).execute()
            if res.data and len(res.data) > 0:
                existing_status = res.data[0].get("status")
        except Exception:
            pass

    sql_loan = db.query(Loan).filter(Loan.loan_id == loan_id).first()
    if not existing_status and sql_loan:
        existing_status = sql_loan.status

    if not existing_status and not sql_loan:
        raise HTTPException(status_code=404, detail="Loan not found.")

    if existing_status and existing_status.strip().lower() != "pending approval":
        raise HTTPException(
            status_code=400,
            detail=f"Approved loans cannot be deleted (current status: {existing_status})."
        )

    deleted_from_supabase = False
    if client:
        try:
            sb_res = client.table("loan").delete().eq("loan_id", loan_id).execute()
            if sb_res.data and len(sb_res.data) > 0:
                deleted_from_supabase = True
        except Exception as e:
            print(f"Supabase delete loan error: {e}")

    if sql_loan:
        db.delete(sql_loan)
        db.commit()

    return {
        "message": "Loan deleted successfully",
        "success": True,
        "loan_id": loan_id,
        "supabase_deleted": deleted_from_supabase,
    }


@router.get("/{loan_id}/statement", response_model=LoanStatementOut, summary="Get full loan statement and amortized balance")
def get_loan_statement(loan_id: int, current_user: CurrentUser, db: Session = Depends(get_db)):
    loan = db.query(Loan).filter(Loan.loan_id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    if not current_user["is_admin"] and current_user.get("role") not in {"admin", "audit", "finance"}:
        if current_user.get("company_id") not in {loan.borrower, loan.lender}:
            raise HTTPException(status_code=403, detail="You are not authorized to view this loan.")
    service = FinanceService(db)
    statement = service.get_loan_statement(loan_id)
    if not statement:
        raise HTTPException(status_code=404, detail="Loan not found")
    return statement


@router.post("/{loan_id}/repayments", response_model=LoanRepaymentOut, status_code=status.HTTP_201_CREATED, summary="Record a loan repayment")
def create_loan_repayment(loan_id: int, repayment_in: LoanRepaymentCreate, request: Request, db: Session = Depends(get_db)):
    loan = db.query(Loan).filter(Loan.loan_id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    service = FinanceService(db)
    statement = service.get_loan_statement(loan_id)
    if not statement:
        raise HTTPException(status_code=404, detail="Loan statement error")

    if repayment_in.amount > statement.current_remaining_balance:
        raise HTTPException(
            status_code=400,
            detail=f"Repayment amount ({repayment_in.amount}) exceeds remaining balance ({statement.current_remaining_balance})",
        )

    new_remaining = statement.current_remaining_balance - repayment_in.amount

    repayment_data = repayment_in.model_dump()
    repayment_data["loan_id"] = loan_id
    repayment_data["remaining_balance"] = new_remaining

    repayment = LoanRepayment(**repayment_data)
    db.add(repayment)
    db.commit()
    db.refresh(repayment)

    log_transaction(
        db, AuditAction.LOAN_UPDATED,
        user_id=None, company_id=loan.borrower,
        ip_address=request.client.host if request.client else "unknown",
        record_id=loan_id, record_type="loan_repayment",
        extra={"repayment_id": repayment.loan_repayment_id, "amount": float(repayment.amount), "remaining_balance": float(new_remaining)},
    )
    return repayment
