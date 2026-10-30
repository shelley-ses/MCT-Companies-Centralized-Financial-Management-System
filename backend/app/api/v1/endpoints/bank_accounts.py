from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Header, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.bank import (
    BankAccountCreate,
    BankAccountUpdate,
    BankAccountOut,
    BankTransactionOut,
    BankDepositWithdrawRequest,
)
from app.services.bank_service import BankService

router = APIRouter()


def check_finance_or_admin(
    user_role: Optional[str] = None,
    x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
    request: Request = None,
):
    """
    Strict server-side role enforcement.
    Client-supplied headers or query params cannot bypass authentication.
    A cryptographically valid JWT Bearer token with Finance or Admin privileges is mandatory.
    """
    if not request:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials are required.",
        )
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Missing Bearer token.",
        )
    token = auth_header.split(" ", 1)[1].strip()
    if not token or token in ("null", "undefined"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or empty authentication token.",
        )

    from app.core.security import verify_token
    claims = verify_token(token)
    metadata = claims.get("app_metadata", {})
    token_role = ""
    is_admin = False
    if isinstance(metadata, dict):
        is_admin = metadata.get("is_admin") is True
        token_role = str(metadata.get("role") or "").strip().lower()

    user_metadata = claims.get("user_metadata", {})
    if isinstance(user_metadata, dict) and not token_role:
        token_role = str(user_metadata.get("role") or "").strip().lower()

    if is_admin or token_role in ["admin", "finance"]:
        return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Only Finance and Administrator accounts can perform this bank action.",
    )


@router.get("", response_model=List[BankAccountOut], summary="List all corporate bank accounts")
def list_bank_accounts(
    company_name: Optional[str] = Query(None, description="Filter by company name"),
    request: Request = None,
    db: Session = Depends(get_db),
):
    effective_company = company_name
    effective_company_id = None
    if request:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1].strip()
            if token and token not in ("null", "undefined"):
                try:
                    from app.core.security import verify_token
                    claims = verify_token(token)
                    from app.core.dependencies import get_current_user
                    current_user = get_current_user(claims, db)
                    role = str(current_user.get("role") or "").lower()
                    is_admin = current_user.get("is_admin") or role in ("admin", "finance", "audit")
                    if not is_admin and current_user.get("company_id"):
                        effective_company_id = current_user.get("company_id")
                        from app.models.company import Company
                        comp = db.query(Company).filter(Company.company_id == current_user["company_id"]).first()
                        if comp:
                            effective_company = comp.company_name
                except Exception:
                    pass

    service = BankService(db)
    return service.list_accounts(company_name=effective_company, company_id=effective_company_id)


@router.get("/{account_id}", response_model=BankAccountOut, summary="Get single bank account with transactions")
def get_bank_account(
    account_id: str,
    db: Session = Depends(get_db),
):
    service = BankService(db)
    account = service.get_account(account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Bank account not found.")
    return account


@router.post("", response_model=BankAccountOut, status_code=status.HTTP_201_CREATED, summary="Create a new bank account")
def create_bank_account(
    data: BankAccountCreate,
    user_role: Optional[str] = Query(None),
    x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
    request: Request = None,
    db: Session = Depends(get_db),
):
    check_finance_or_admin(user_role, x_user_role, request)
    service = BankService(db)
    account = service.create_account(data)
    from app.core.websocket import ws_manager
    ws_manager.broadcast_sync({"type": "BANK_UPDATED", "payload": {"account_id": account.id}})
    return account


@router.put("/{account_id}", response_model=BankAccountOut, summary="Update bank account details")
def update_bank_account(
    account_id: str,
    data: BankAccountUpdate,
    user_role: Optional[str] = Query(None),
    x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
    request: Request = None,
    db: Session = Depends(get_db),
):
    check_finance_or_admin(user_role, x_user_role, request)
    service = BankService(db)
    account = service.update_account(account_id, data)
    if not account:
        raise HTTPException(status_code=404, detail="Bank account not found.")
    from app.core.websocket import ws_manager
    ws_manager.broadcast_sync({"type": "BANK_UPDATED", "payload": {"account_id": account_id}})
    return account


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a bank account")
def delete_bank_account(
    account_id: str,
    user_role: Optional[str] = Query(None),
    x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
    request: Request = None,
    db: Session = Depends(get_db),
):
    check_finance_or_admin(user_role, x_user_role, request)
    service = BankService(db)
    success = service.delete_account(account_id)
    if not success:
        raise HTTPException(status_code=404, detail="Bank account not found.")
    from app.core.websocket import ws_manager
    ws_manager.broadcast_sync({"type": "BANK_UPDATED", "payload": {"account_id": account_id}})
    return None


@router.post("/{account_id}/deposit", response_model=BankAccountOut, summary="Record a deposit to bank account")
def deposit_to_bank_account(
    account_id: str,
    req: BankDepositWithdrawRequest,
    user_role: Optional[str] = Query(None),
    x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
    request: Request = None,
    db: Session = Depends(get_db),
):
    check_finance_or_admin(user_role, x_user_role, request)
    service = BankService(db)
    try:
        account, _ = service.deposit(account_id, req)
        from app.core.websocket import ws_manager
        ws_manager.broadcast_sync({"type": "BANK_UPDATED", "payload": {"account_id": account_id}})
        return account
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{account_id}/withdraw", response_model=BankAccountOut, summary="Record a withdrawal from bank account")
def withdraw_from_bank_account(
    account_id: str,
    req: BankDepositWithdrawRequest,
    user_role: Optional[str] = Query(None),
    x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
    request: Request = None,
    db: Session = Depends(get_db),
):
    check_finance_or_admin(user_role, x_user_role, request)
    service = BankService(db)
    try:
        account, _ = service.withdraw(account_id, req)
        from app.core.websocket import ws_manager
        ws_manager.broadcast_sync({"type": "BANK_UPDATED", "payload": {"account_id": account_id}})
        return account
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
