from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, Request, Response, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.petty_cash import (
    PettyCashEndorseIn,
    PettyCashLedgerEntry,
    PettyCashReviewIn,
    PettyCashSummaryOut,
    PettyCashTopUpCreate,
    PettyCashTopUpOut,
    PettyCashWalletUpdate,
)
from app.services.audit_service import AuditAction, log_transaction
from app.services.petty_cash_service import PettyCashService


router = APIRouter()


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


@router.get("/summary", response_model=PettyCashSummaryOut, summary="Petty cash balance for one company")
def get_summary(
    company_id: Optional[int] = Query(None),
    company_name: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
):
    service = PettyCashService(db)
    company = service.resolve_company(company_id, company_name)
    return service.get_summary(company, start_date, end_date)


@router.get("/summaries", response_model=List[PettyCashSummaryOut], summary="Petty cash balances for all companies")
def list_summaries(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
):
    return PettyCashService(db).list_summaries(start_date, end_date)


@router.get("/ledger", response_model=List[PettyCashLedgerEntry], summary="Petty cash top-ups and spending")
def get_ledger(
    company_id: Optional[int] = Query(None),
    company_name: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    user_role: Optional[str] = Query(None),
    request: Request = None,
    db: Session = Depends(get_db),
):
    service = PettyCashService(db)
    company = None
    if company_id or (company_name and company_name.strip().lower() != "all companies"):
        company = service.resolve_company(company_id, company_name)
    role = user_role or (request.headers.get("X-User-Role") if request else None)
    return service.list_ledger(company, start_date, end_date, user_role=role)


@router.post("/topups", response_model=PettyCashTopUpOut, status_code=status.HTTP_201_CREATED, summary="Top up petty cash from sales")
def create_topup(topup_in: PettyCashTopUpCreate, request: Request, db: Session = Depends(get_db)):
    topup = PettyCashService(db).create_topup(topup_in)
    log_transaction(
        db, AuditAction.PETTY_CASH_TOPUP_CREATED,
        user_id=topup_in.created_by, company_id=topup.company_id,
        ip_address=_client_ip(request),
        record_id=topup.topup_id, record_type="petty_cash_topup",
        extra={"amount": float(topup.amount), "topup_date": topup.topup_date.isoformat()},
    )
    return topup


@router.post("/topups/{topup_id}/endorse", response_model=PettyCashTopUpOut, summary="Finance endorse or reject petty cash request")
def endorse_topup(
    topup_id: int,
    endorse_in: PettyCashEndorseIn,
    request: Request,
    db: Session = Depends(get_db),
):
    endorser = request.headers.get("X-User-Name") or "Finance Officer"
    topup = PettyCashService(db).endorse_topup(
        topup_id=topup_id,
        action=endorse_in.action,
        remark=endorse_in.remark,
        endorser_name=endorser,
    )
    log_transaction(
        db, AuditAction.PETTY_CASH_TOPUP_CREATED,
        user_id=None, company_id=topup.company_id,
        ip_address=_client_ip(request),
        record_id=topup.topup_id, record_type="petty_cash_endorsement",
        extra={"action": endorse_in.action, "remark": endorse_in.remark, "status": topup.status},
    )
    return topup


@router.post("/topups/{topup_id}/review", response_model=PettyCashTopUpOut, summary="Audit approve or disapprove petty cash request")
def review_topup(
    topup_id: int,
    review_in: PettyCashReviewIn,
    request: Request,
    db: Session = Depends(get_db),
):
    reviewer = request.headers.get("X-User-Name") or "Internal Auditor"
    topup = PettyCashService(db).review_topup(
        topup_id=topup_id,
        action=review_in.action,
        remark=review_in.remark,
        reviewer_name=reviewer,
    )
    log_transaction(
        db, AuditAction.PETTY_CASH_TOPUP_CREATED,
        user_id=None, company_id=topup.company_id,
        ip_address=_client_ip(request),
        record_id=topup.topup_id, record_type="petty_cash_audit_review",
        extra={"action": review_in.action, "remark": review_in.remark, "status": topup.status},
    )
    return topup


@router.delete("/topups/{topup_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Remove a petty cash top-up")
def delete_topup(topup_id: int, request: Request, db: Session = Depends(get_db)):
    topup = PettyCashService(db).delete_topup(topup_id)
    log_transaction(
        db, AuditAction.PETTY_CASH_TOPUP_DELETED,
        user_id=None, company_id=topup.company_id,
        ip_address=_client_ip(request),
        record_id=topup_id, record_type="petty_cash_topup",
        extra={"amount": float(topup.amount)},
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.put("/wallet", response_model=PettyCashSummaryOut, summary="Update petty cash low-balance alert")
def update_wallet(
    wallet_in: PettyCashWalletUpdate,
    request: Request,
    company_id: Optional[int] = Query(None),
    company_name: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    service = PettyCashService(db)
    company = service.resolve_company(company_id, company_name)
    summary = service.update_threshold(company, wallet_in.low_balance_threshold)
    log_transaction(
        db, AuditAction.PETTY_CASH_WALLET_UPDATED,
        user_id=None, company_id=company.company_id,
        ip_address=_client_ip(request),
        record_type="petty_cash_wallet",
        extra={"low_balance_threshold": float(wallet_in.low_balance_threshold)},
    )
    return summary
