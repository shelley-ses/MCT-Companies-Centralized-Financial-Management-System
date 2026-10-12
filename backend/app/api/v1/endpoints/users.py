from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import AdminUser
from app.db.session import get_db
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.services.user_service import (
    UserService,
    UserServiceError,
    UserValidationError,
)

router = APIRouter()


@router.get("", response_model=list[UserResponse], summary="List application users")
def get_users(
    _: AdminUser,
    company_id: int | None = Query(default=None, gt=0),
    db: Session = Depends(get_db),
):
    try:
        return UserService(db).list_users(company_id=company_id)
    except UserServiceError as error:
        raise _service_http_error(error) from error


@router.get("/{user_id}", response_model=UserResponse, summary="Get an application user")
def get_user(user_id: int, _: AdminUser, db: Session = Depends(get_db)):
    try:
        user = UserService(db).get_user_response(user_id)
    except UserServiceError as error:
        raise _service_http_error(error) from error
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED, summary="Create an employee user")
def create_user(user: UserCreate, _: AdminUser, db: Session = Depends(get_db)):
    try:
        return UserService(db).create_user(user)
    except UserValidationError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(error),
        ) from error
    except UserServiceError as error:
        raise _service_http_error(error) from error


@router.patch("/{user_id}", response_model=UserResponse, summary="Update an application user")
def update_user(
    user_id: int,
    user: UserUpdate,
    _: AdminUser,
    db: Session = Depends(get_db),
):
    try:
        result = UserService(db).update_user(user_id, user)
    except UserValidationError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(error),
        ) from error
    except UserServiceError as error:
        raise _service_http_error(error) from error
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return result


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete an application user")
def delete_user(user_id: int, _: AdminUser, db: Session = Depends(get_db)):
    try:
        deleted = UserService(db).delete_user(user_id)
    except UserServiceError as error:
        raise _service_http_error(error) from error
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")


def _service_http_error(error: UserServiceError) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=str(error),
    )
