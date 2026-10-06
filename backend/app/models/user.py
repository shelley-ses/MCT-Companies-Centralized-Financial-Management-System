from sqlalchemy import Column, Integer, String, Numeric, DateTime
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'

    User_id = Column(Integer, primary_key=True, autoincrement=True)
    Company_ID = Column(Integer, nullable=True)
    name = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(128), nullable=False)
    last_login_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, nullable=False)
    is_Admin = Column(bool, nullable=False, default=0)  # 0 for regular user, 1 for admin

    def __repr__(self):
        return f"<User(id={self.id}, username='{self.username}', email='{self.email}')>"