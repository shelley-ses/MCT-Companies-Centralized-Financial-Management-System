import logging
from typing import List, Optional

from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.supabase import get_supabase_admin_client
from app.models.company import Company
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, UserUpdate

logger = logging.getLogger(__name__)


class UserServiceError(Exception):
    """Safe application error for user operations."""


class UserValidationError(ValueError):
    """Safe validation error for user business rules."""


class UserService:
    """Database profile operations and Supabase Auth coordination."""

    def __init__(self, db: Session):
        self.db = db

    #get all users, optionally filtered by company_id
    def list_users(self, company_id: int | None = None) -> List[UserResponse]:
        try:
            query = self.db.query(User)
            if company_id is not None:
                query = query.filter(User.company_id == company_id)
            return [self.to_response(user) for user in query.order_by(User.user_id.asc()).all()]
        except SQLAlchemyError as error:
            raise self._database_error("list users", error)

    #get a single user by ID
    def get_user(self, user_id: int) -> Optional[User]:
        try:
            return self.db.query(User).filter(User.user_id == user_id).first()
        except SQLAlchemyError as error:
            raise self._database_error("get user", error)

    #get a single user by ID and return a UserResponse
    def get_user_response(self, user_id: int) -> Optional[UserResponse]:
        user = self.get_user(user_id)
        return self.to_response(user) if user else None

    #create a new user and return a UserResponse
    def create_user(self, user_in: UserCreate) -> UserResponse:
        user_role = str(user_in.role or ("admin" if user_in.is_admin else "company")).lower()
        self._validate_user_assignment(user_in.company_id, user_in.is_admin, user_role)
        self._ensure_company_exists(user_in.company_id)
        self._ensure_email_available(user_in.email)
        auth_user_id = self._create_auth_user(user_in, user_in.email)

        user = User(
            name=user_in.name.strip(),
            email=user_in.email,
            company_id=user_in.company_id,
            is_admin=user_in.is_admin or (user_role == "admin"),
            role=user_role,
        )
        try:
            self.db.add(user)
            self.db.commit()
            self.db.refresh(user)
            return self.to_response(user)
        except IntegrityError as error:
            self.db.rollback()
            self._delete_auth_user(auth_user_id)
            raise UserValidationError("A user with this email already exists.") from error
        except SQLAlchemyError as error:
            self._delete_auth_user(auth_user_id)
            raise self._database_error("create user", error)

    #update an existing user and return a UserResponse, or None if not found
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
        role = update_data.get("role", getattr(user, "role", "company"))
        self._validate_user_assignment(company_id, is_admin, role)
        self._ensure_company_exists(company_id)

        auth_changes = {}
        if "email" in update_data:
            self._ensure_email_available(update_data["email"], excluding_user_id=user_id)
            auth_changes["email"] = update_data["email"]
        if "name" in update_data:
            update_data["name"] = update_data["name"].strip()
            auth_changes["user_metadata"] = {"name": update_data["name"]}
        if "password" in update_data:
            auth_changes["password"] = update_data.pop("password")
        if auth_changes:
            self._update_auth_user(user.email, auth_changes)

        try:
            for field, value in update_data.items():
                setattr(user, field, value)
            self.db.commit()
            self.db.refresh(user)
            return self.to_response(user)
        except IntegrityError as error:
            self.db.rollback()
            raise UserValidationError("A user with this email already exists.") from error
        except SQLAlchemyError as error:
            raise self._database_error("update user", error)

    #delete a user by ID and return True if deleted, False if not found
    def delete_user(self, user_id: int) -> bool:
        user = self.get_user(user_id)
        if not user:
            return False
        auth_user_id = self._find_auth_user_id(user.email)
        try:
            self._delete_auth_user(auth_user_id)
            self.db.delete(user)
            self.db.commit()
            return True
        except SQLAlchemyError as error:
            raise self._database_error("delete user", error)

    #convert a User model instance to a UserResponse schema instance
    def to_response(self, user: User) -> UserResponse:
        try:
            company_name = None
            if user.company_id is not None:
                company = self.db.query(Company).filter(
                    Company.company_id == user.company_id
                ).first()
                company_name = company.company_name if company else None
            user_role = str(getattr(user, "role", "admin" if user.is_admin else "company") or ("admin" if user.is_admin else "company")).lower()
            return UserResponse(
                user_id=user.user_id,
                name=user.name,
                email=user.email,
                company_id=user.company_id,
                is_admin=user.is_admin,
                role=user_role,
                last_login_at=user.last_login_at,
                created_at=user.created_at,
                updated_at=user.updated_at,
                company_name=company_name,
            )
        except SQLAlchemyError as error:
            raise self._database_error("build user response", error)

    #validate that the specified company exists in the database, if provided
    def _ensure_company_exists(self, company_id: int | None) -> None:
        if company_id is None:
            return
        try:
            exists = self.db.query(Company.company_id).filter(
                Company.company_id == company_id
            ).first()
        except SQLAlchemyError as error:
            raise self._database_error("validate user company", error)
        if exists is None:
            raise UserValidationError("The selected company does not exist.")

    #validate that the specified email is not already used by another user, optionally excluding a specific user ID
    def _ensure_email_available(
        self,
        email: str,
        excluding_user_id: int | None = None,
    ) -> None:
        try:
            query = self.db.query(User).filter(User.email == email)
            if excluding_user_id is not None:
                query = query.filter(User.user_id != excluding_user_id)
            if query.first() is not None:
                raise UserValidationError("A user with this email already exists.")
        except SQLAlchemyError as error:
            raise self._database_error("validate user email", error)

    #validate that the user assignment is consistent with business rules regarding admin status and company association
    @staticmethod
    def _validate_user_assignment(company_id: int | None, is_admin: bool, role: str = "company") -> None:
        r = (role or "").lower()
        if (is_admin or r in ["audit", "admin"]) and company_id is not None:
            raise UserValidationError(
                "An administrator cannot be assigned to a company."
            )
        if r == "company" and not is_admin and company_id is None:
            raise UserValidationError(
                "A company user must be assigned to a company."
            )

    #create a new Supabase Auth user and return the auth user ID
    @staticmethod
    def _create_auth_user(user_in: UserCreate, email: str) -> str:
        try:
            response = get_supabase_admin_client().auth.admin.create_user({
                "email": email,
                "password": user_in.password,
                "email_confirm": True,
                "user_metadata": {"name": user_in.name.strip()},
            })
            auth_user = getattr(response, "user", response)
            auth_user_id = getattr(auth_user, "id", None)
            if not auth_user_id:
                raise UserServiceError("The user could not be created in authentication.")
            return str(auth_user_id)
        except UserServiceError:
            raise
        except Exception as error:
            logger.exception("Supabase Auth user creation failed (%s)", type(error).__name__)
            raise UserValidationError(
                "The user could not be created in authentication."
            ) from error

    #find the Supabase Auth user ID for a given email, raising an error if not found
    @classmethod
    def _find_auth_user_id(cls, email: str) -> str:
        try:
            response = get_supabase_admin_client().auth.admin.list_users()
            auth_users = getattr(response, "users", response)
            for auth_user in auth_users:
                if str(getattr(auth_user, "email", "")).lower() == email.lower():
                    return str(auth_user.id)
        except Exception as error:
            logger.exception("Supabase Auth user lookup failed (%s)", type(error).__name__)
            raise UserServiceError("The user operation could not be completed.") from error
        raise UserValidationError("The authentication user was not found.")

    #update the Supabase Auth user with the specified changes, raising an error if the operation fails
    @classmethod
    def _update_auth_user(cls, email: str, changes: dict[str, object]) -> None:
        auth_user_id = cls._find_auth_user_id(email)
        try:
            get_supabase_admin_client().auth.admin.update_user_by_id(
                auth_user_id,
                changes,
            )
        except Exception as error:
            logger.exception("Supabase Auth user update failed (%s)", type(error).__name__)
            raise UserServiceError("The user authentication could not be updated.") from error

    #delete the Supabase Auth user with the specified auth user ID, raising an error if the operation fails
    @staticmethod
    def _delete_auth_user(auth_user_id: str) -> None:
        try:
            get_supabase_admin_client().auth.admin.delete_user(auth_user_id)
        except Exception as error:
            logger.exception("Supabase Auth user deletion failed (%s)", type(error).__name__)
            raise UserServiceError("The user operation could not be completed.") from error

    #handle database errors by rolling back the session, logging the error, and raising a UserServiceError
    def _database_error(self, operation: str, error: SQLAlchemyError) -> UserServiceError:
        self.db.rollback()
        logger.exception(
            "User database operation failed: %s (%s)",
            operation,
            type(error).__name__,
        )
        return UserServiceError("The user operation could not be completed.")
