from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
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
    LoanRepaymentCreate,
    LoanRepaymentOut,
    LoanStatementOut,
)
from app.services.finance_service import FinanceService, FinanceCalculator
from app.services.audit_service import AuditAction, log_transaction

router = APIRouter()

def get_supabase_company_mapping(client):
    try:
        companies = client.table("company").select("company_id, company_name").execute().data or []
        id_to_name = {c["company_id"]: c["company_name"] for c in companies}
        name_to_id = {c["company_name"].strip().lower(): c["company_id"] for c in companies}
    except Exception:
        id_to_name = {}
        name_to_id = {}
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
        id_to_name, name_to_id = get_supabase_company_mapping(client)

        resolved_target_cid = None
        if company_name and company_name.lower() != "all companies":
            resolved_target_cid = resolve_company_id(None, company_name, name_to_id, db)

        sb_query = client.table("loan").select("*")

        if borrower_id:
            sb_query = sb_query.eq("borrower", borrower_id)
        if lender_id:
            sb_query = sb_query.eq("lender", lender_id)

        if resolved_target_cid:
            if scope == "borrower":
                sb_query = sb_query.eq("borrower", resolved_target_cid)
            elif scope == "lender":
                sb_query = sb_query.eq("lender", resolved_target_cid)
            else:
                # Matches either borrower or lender
                sb_query = sb_query.or_(f"borrower.eq.{resolved_target_cid},lender.eq.{resolved_target_cid}")

        if status and status.lower() != "all":
            sb_query = sb_query.eq("status", status)

        if start_date:
            sb_query = sb_query.gte("loan_date", start_date.isoformat())
        if end_date:
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
                    lender_name=id_to_name.get(l_id) or f"Company #{l_id}",
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

        if borrower_id:
            query = query.filter(Loan.borrower == borrower_id)
        if lender_id:
            query = query.filter(Loan.lender == lender_id)

        if resolved_target_cid:
            if scope == "borrower":
                query = query.filter(Loan.borrower == resolved_target_cid)
            elif scope == "lender":
                query = query.filter(Loan.lender == resolved_target_cid)
            else:
                query = query.filter(or_(Loan.borrower == resolved_target_cid, Loan.lender == resolved_target_cid))

        if status and status.lower() != "all":
            query = query.filter(Loan.status == status)

        if start_date:
            query = query.filter(Loan.loan_date >= start_date)
        if end_date:
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
                lender_name=comp_map.get(l.lender) or f"Company #{l.lender}",
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
    lender_id = resolve_company_id(loan_in.lender, loan_in.lender_company, name_to_id, db)

    if not borrower_id:
        raise HTTPException(status_code=400, detail="Borrower company could not be resolved.")
    if not lender_id:
        raise HTTPException(status_code=400, detail="Lender company could not be resolved.")

    if borrower_id == lender_id:
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

    # Mirror or create in SQLite
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
    except Exception as e:
        db.rollback()
        print(f"SQLite mirror insert loan error: {e}")

    final_id = created_row["loan_id"] if created_row else sqlite_loan.loan_id
    b_name = id_to_name.get(borrower_id) or loan_in.borrower_company or f"Company #{borrower_id}"
    l_name = id_to_name.get(lender_id) or loan_in.lender_company or f"Company #{lender_id}"

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


@router.patch("/{loan_id}/approve", response_model=LoanOut, summary="Lender approves a pending loan request")
@router.post("/{loan_id}/approve", response_model=LoanOut, summary="Lender approves a pending loan request")
def approve_loan(loan_id: int, db: Session = Depends(get_db)):
    client = None
    try:
        client = get_supabase_admin_client()
    except Exception:
        pass

    updated_row = None
    if client:
        try:
            sb_res = (
                client.table("loan")
                .update({"status": "Approved", "updated_at": datetime.now().isoformat()})
                .eq("loan_id", loan_id)
                .execute()
            )
            if sb_res.data and len(sb_res.data) > 0:
                updated_row = sb_res.data[0]
        except Exception as e:
            print(f"Supabase approve loan error: {e}")

    sql_loan = db.query(Loan).filter(Loan.loan_id == loan_id).first()
    if sql_loan:
        sql_loan.status = "Approved"
        db.commit()
        db.refresh(sql_loan)

    if not updated_row and not sql_loan:
        raise HTTPException(status_code=404, detail="Loan not found.")

    id_to_name = {}
    if client:
        id_to_name, _ = get_supabase_company_mapping(client)

    if updated_row:
        b_id = updated_row.get("borrower")
        l_id = updated_row.get("lender")
        p_amt = Decimal(str(updated_row.get("principal_amount") or 0.0))
        return LoanOut(
            loan_id=updated_row["loan_id"],
            borrower=b_id,
            lender=l_id,
            borrower_name=id_to_name.get(b_id) or f"Company #{b_id}",
            lender_name=id_to_name.get(l_id) or f"Company #{l_id}",
            loan_ref_no=updated_row.get("loan_ref_no"),
            principal_amount=p_amt,
            amount=p_amt,
            interest_rate=Decimal(str(updated_row.get("interest_rate") or 0.0)),
            interest_type=updated_row.get("interest_type") or "simple",
            loan_date=updated_row.get("loan_date"),
            due_date=updated_row.get("due_date"),
            description=updated_row.get("description"),
            particulars=updated_row.get("description"),
            status="Approved",
            created_at=updated_row.get("created_at"),
            updated_at=updated_row.get("updated_at"),
        )

    return LoanOut(
        loan_id=sql_loan.loan_id,
        borrower=sql_loan.borrower,
        lender=sql_loan.lender,
        borrower_name=f"Company #{sql_loan.borrower}",
        lender_name=f"Company #{sql_loan.lender}",
        loan_ref_no=sql_loan.loan_ref_no,
        principal_amount=sql_loan.principal_amount,
        amount=sql_loan.principal_amount,
        interest_rate=sql_loan.interest_rate or Decimal("0.00"),
        interest_type=sql_loan.interest_type or "simple",
        loan_date=sql_loan.loan_date,
        due_date=sql_loan.due_date,
        description=sql_loan.description,
        particulars=sql_loan.description,
        status="Approved",
        created_at=sql_loan.created_at,
        updated_at=sql_loan.updated_at,
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
def get_loan_statement(loan_id: int, db: Session = Depends(get_db)):
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
        extra={"repayment_id": repayment.repayment_id, "amount": float(repayment.amount), "remaining_balance": float(new_remaining)},
    )
    return repayment
