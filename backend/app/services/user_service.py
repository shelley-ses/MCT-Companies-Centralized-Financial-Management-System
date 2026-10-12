import hashlib
import logging
import secrets
from typing import List, Optional

from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.company import Company
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, UserUpdate

logger = logging.getLogger(__name__)


class UserServiceError(Exception):
    """Safe application error for user operations."""


class UserValidationError(ValueError):
    """Safe validation error for user business rules."""


class UserService:
    """Database operations and business rules for application users."""

    def __init__(self, db: Session):
        self.db = db

    def list_users(self, company_id: int | None = None) -> List[UserResponse]:
        try:
            query = self.db.query(User)
            if company_id is not None:
                query = query.filter(User.company_id == company_id)
            users = query.order_by(User.user_id.asc()).all()
            return [self.to_response(user) for user in users]
        except SQLAlchemyError as error:
            raise self._database_error("list users", error)

    def get_user(self, user_id: int) -> Optional[User]:
        try:
            return self.db.query(User).filter(User.user_id == user_id).first()
        except SQLAlchemyError as error:
            raise self._database_error("get user", error)

    def get_user_response(self, user_id: int) -> Optional[UserResponse]:
        user = self.get_user(user_id)
        return self.to_response(user) if user else None

    def create_user(self, user_in: UserCreate) -> UserResponse:
        self._validate_user_assignment(
            company_id=user_in.company_id,
            is_admin=user_in.is_admin,
        )
        normalized_email = self._normalize_email(user_in.email)
        self._ensure_company_exists(user_in.company_id)
        user = User(
            name=user_in.name.strip(),
            email=normalized_email,
            password_hash=self.hash_password(user_in.password),
            company_id=user_in.company_id,
            is_admin=user_in.is_admin,
        )
        try:
            self.db.add(user)
            self.db.commit()
            self.db.refresh(user)
            return self.to_response(user)
        except IntegrityError as error:
            self.db.rollback()
            logger.info("User creation rejected because the email already exists.")
            raise UserValidationError("A user with this email already exists.") from error
        except SQLAlchemyError as error:
            raise self._database_error("create user", error)

    def update_user(
        self,
        user_id: int,
        user_in: UserUpdate,
    ) -> Optional[UserResponse]:
        user = self.get_user(user_id)
        if not user:
            return None

        update_data = user_in.model_dump(exclude_unset=True)
        company_id = update_data.get("company_id", user.company_id)
        is_admin = update_data.get("is_admin", user.is_admin)
        self._validate_user_assignment(company_id=company_id, is_admin=is_admin)
        self._ensure_company_exists(company_id)

        if "email" in update_data:
            update_data["email"] = self._normalize_email(update_data["email"])
        if "name" in update_data:
            update_data["name"] = update_data["name"].strip()
        if "password" in update_data:
            update_data["password_hash"] = self.hash_password(update_data.pop("password"))

        try:
            for field, value in update_data.items():
                setattr(user, field, value)
            self.db.commit()
            self.db.refresh(user)
            return self.to_response(user)
        except IntegrityError as error:
            self.db.rollback()
            logger.info("User update rejected because the email already exists.")
            raise UserValidationError("A user with this email already exists.") from error
        except SQLAlchemyError as error:
            raise self._database_error("update user", error)

    def delete_user(self, user_id: int) -> bool:
        user = self.get_user(user_id)
        if not user:
            return False
        try:
            self.db.delete(user)
            self.db.commit()
            return True
        except SQLAlchemyError as error:
            raise self._database_error("delete user", error)

    def to_response(self, user: User) -> UserResponse:
        try:
            company_name = None
            if user.company_id is not None:
                company = (
                    self.db.query(Company)
                    .filter(Company.company_id == user.company_id)
                    .first()
                )
                company_name = company.company_name if company else None
            return UserResponse(
                user_id=user.user_id,
                name=user.name,
                email=user.email,
                company_id=user.company_id,
                is_admin=user.is_admin,
                last_login_at=user.last_login_at,
                created_at=user.created_at,
                updated_at=user.updated_at,
                company_name=company_name,
            )
        except SQLAlchemyError as error:
            raise self._database_error("build user response", error)

    @staticmethod
    def hash_password(password: str) -> str:
        salt = secrets.token_bytes(16)
        digest = hashlib.scrypt(
            password.encode("utf-8"),
            salt=salt,
            n=2**14,
            r=8,
            p=1,
        )
        return f"scrypt${salt.hex()}${digest.hex()}"

    @staticmethod
    def verify_password(password: str, password_hash: str) -> bool:
        try:
            algorithm, salt_hex, digest_hex = password_hash.split("$", 2)
            if algorithm != "scrypt":
                return False
            digest = hashlib.scrypt(
                password.encode("utf-8"),
                salt=bytes.fromhex(salt_hex),
                n=2**14,
                r=8,
                p=1,
            )
            return secrets.compare_digest(digest.hex(), digest_hex)
        except (TypeError, ValueError):
            return False

    def _ensure_company_exists(self, company_id: int | None) -> None:
        if company_id is None:
            return
        try:
            exists = (
                self.db.query(Company.company_id)
                .filter(Company.company_id == company_id)
                .first()
            )
        except SQLAlchemyError as error:
            raise self._database_error("validate user company", error)
        if exists is None:
            raise UserValidationError("The selected company does not exist.")

    @staticmethod
    def _validate_user_assignment(
        *,
        company_id: int | None,
        is_admin: bool,
    ) -> None:
        if is_admin and company_id is not None:
            raise UserValidationError(
                "An administrator cannot be assigned to a company."
            )
        if not is_admin and company_id is None:
            raise UserValidationError(
                "A company user must be assigned to a company."
            )

    @staticmethod
    def _normalize_email(email: str) -> str:
        return str(email).strip().lower()

    def _database_error(self, operation: str, error: SQLAlchemyError) -> UserServiceError:
        self.db.rollback()
        logger.exception(
            "User database operation failed: %s (%s)",
            operation,
            type(error).__name__,
        )
        return UserServiceError("The user operation could not be completed.")
