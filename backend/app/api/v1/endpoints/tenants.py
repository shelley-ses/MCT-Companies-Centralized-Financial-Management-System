"""Tenant leases and payments (spec 0017). Every route needs a signed in user."""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy.orm import Session

from app.core.company_resolver import normalize_company_id, resolve_company
from app.core.dependencies import (
    AuthenticatedUser,
    check_company_access,
    get_current_user,
    require_audit_or_admin_user,
)
from app.core.websocket import ws_manager
from app.db.session import get_db
from app.schemas.audit_review import AuditReviewIn
from app.schemas.tenant import LeaseCreate, LeaseOut, LeaseUpdate, PaymentIn
from app.services.audit_review_service import _auditor_name
from app.services.audit_service import AuditAction, log_transaction
from app.services.tenant_service import TenantService

router = APIRouter()


def _is_audit_role(user: AuthenticatedUser) -> bool:
    return str(user.get("role") or "").lower() in ("audit", "auditor")


def _require_writer(user: AuthenticatedUser) -> None:
    """The Audit role may read and save an audit review only (spec 0017, AC-3)."""
    if _is_audit_role(user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="The Audit role cannot change tenant leases or payments.")


def _company_scope(
    user: AuthenticatedUser,
    db: Session,
    company_id: Optional[int],
    company_name: Optional[str],
) -> Optional[List[int]]:
    """Company ids the caller may see. None means every company."""
    role = str(user.get("role") or "").lower()
    privileged = bool(user.get("is_admin")) or role in ("admin", "finance", "audit", "auditor")

    requested: Optional[int] = None
    if company_id:
        requested = normalize_company_id(company_id)
    elif company_name and company_name.strip().lower() != "all companies":
        requested = resolve_company(db, company_name=company_name).company_id
    if requested:
        check_company_access(user, requested)
        return [requested]

    if privileged:
        return None
    ids = [cid for cid in (user.get("company_ids") or []) if cid is not None]
    if user.get("company_id") and user["company_id"] not in ids:
        ids.append(user["company_id"])
    return ids


def _log(db: Session, request: Request, user: AuthenticatedUser, action: AuditAction, lease: dict, extra: Optional[dict] = None) -> None:
    log_transaction(
        db, action,
        user_id=user.get("user_id"), company_id=lease.get("company_id"),
        ip_address=request.client.host if request.client else "unknown",
        record_id=lease.get("lease_id"), record_type="tenant_lease",
        extra={"ref": lease.get("tenant_ref"), **(extra or {})},
    )


def _notify(event: str, lease_id: int) -> None:
    ws_manager.broadcast_sync({"type": event, "payload": {"lease_id": lease_id}})


@router.get("/leases", response_model=List[LeaseOut], summary="List tenant leases with their payments")
def list_leases(
    company_id: Optional[int] = Query(None),
    company_name: Optional[str] = Query(None),
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    scope = _company_scope(current_user, db, company_id, company_name)
    return TenantService(db).list_leases(scope)


@router.get("/leases/{lease_id}", response_model=LeaseOut, summary="Get one tenant lease")
def get_lease(
    lease_id: int,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return TenantService(db).get_lease(lease_id, current_user)


@router.post("/leases", response_model=LeaseOut, status_code=status.HTTP_201_CREATED, summary="Create a tenant lease")
def create_lease(
    body: LeaseCreate,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_writer(current_user)
    lease = TenantService(db).create_lease(body, current_user)
    _log(db, request, current_user, AuditAction.TENANT_LEASE_CREATED, lease)
    _notify("TENANTS_UPDATED", lease["lease_id"])
    return lease


@router.patch("/leases/{lease_id}", response_model=LeaseOut, summary="Update a tenant lease")
def update_lease(
    lease_id: int,
    body: LeaseUpdate,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_writer(current_user)
    lease = TenantService(db).update_lease(lease_id, body, current_user)
    _log(db, request, current_user, AuditAction.TENANT_LEASE_UPDATED, lease)
    _notify("TENANTS_UPDATED", lease_id)
    return lease


@router.delete("/leases/{lease_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a tenant lease and its payments")
def delete_lease(
    lease_id: int,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_writer(current_user)
    row = TenantService(db).delete_lease(lease_id, current_user)
    _log(db, request, current_user, AuditAction.TENANT_LEASE_DELETED, row)
    _notify("TENANTS_UPDATED", lease_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/leases/{lease_id}/payments", response_model=LeaseOut, status_code=status.HTTP_201_CREATED, summary="Record a payment or a missed mark")
def add_payment(
    lease_id: int,
    body: PaymentIn,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_writer(current_user)
    lease = TenantService(db).add_payment(lease_id, body, current_user)
    _log(db, request, current_user, AuditAction.TENANT_PAYMENT_RECORDED, lease,
         {"amount": body.amount, "status": body.status})
    _notify("TENANTS_UPDATED", lease_id)
    return lease


@router.patch("/leases/{lease_id}/payments/{payment_id}", response_model=LeaseOut, summary="Edit a payment")
def update_payment(
    lease_id: int,
    payment_id: int,
    body: PaymentIn,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_writer(current_user)
    lease = TenantService(db).update_payment(lease_id, payment_id, body, current_user)
    _log(db, request, current_user, AuditAction.TENANT_PAYMENT_UPDATED, lease,
         {"payment_id": payment_id, "amount": body.amount, "status": body.status})
    _notify("TENANTS_UPDATED", lease_id)
    return lease


@router.delete("/leases/{lease_id}/payments/{payment_id}", response_model=LeaseOut, summary="Remove a payment")
def delete_payment(
    lease_id: int,
    payment_id: int,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_writer(current_user)
    lease = TenantService(db).delete_payment(lease_id, payment_id, current_user)
    _log(db, request, current_user, AuditAction.TENANT_PAYMENT_REMOVED, lease, {"payment_id": payment_id})
    _notify("TENANTS_UPDATED", lease_id)
    return lease


@router.patch("/leases/{lease_id}/audit", response_model=LeaseOut, summary="Save the audit review of a lease (Audit or Admin only)")
def review_lease_audit(
    lease_id: int,
    review_in: AuditReviewIn,
    request: Request,
    current_user: AuthenticatedUser = Depends(require_audit_or_admin_user),
    db: Session = Depends(get_db),
):
    lease = TenantService(db).save_audit_review(
        lease_id, review_in.audit_status, review_in.remarks, _auditor_name(db, current_user), current_user
    )
    _log(db, request, current_user, AuditAction.TENANT_AUDIT_REVIEWED, lease, {"audit_status": review_in.audit_status})
    ws_manager.broadcast_sync({
        "type": "AUDIT_UPDATED",
        "payload": {"resource": "tenant_leases", "id": lease_id},
    })
    _notify("TENANTS_UPDATED", lease_id)
    return lease
