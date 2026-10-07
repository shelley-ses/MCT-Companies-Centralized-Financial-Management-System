from sqlalchemy import Column, Integer, String, Numeric, DateTime
from sqlalchemy.sql import func
from app.db.session import Base

class Company(Base):
    __tablename__ = 'company'

    company_id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    company_name = Column(String(100), nullable=False)
    location = Column(String(100), nullable=True)
    contact_person = Column(String(100), nullable=True)
    contact_number = Column(String(20), nullable=True)
    phone = Column(String(20), nullable=True)
    email = Column(String(100), nullable=True)
    starting_balance = Column(Numeric(15, 2), nullable=False, default=0.00)
    current_balance = Column(Numeric(15, 2), nullable=False, default=0.00)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())