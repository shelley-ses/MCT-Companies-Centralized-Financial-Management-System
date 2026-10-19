from sqlalchemy import BigInteger, Column, Date, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.sql import func

from app.db.session import Base


class Bill(Base):
    __tablename__ = "bills"

    bill_id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    company_id = Column(
        BigInteger,
        ForeignKey("company.company_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    bill_name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False)
    account_no = Column(String(100), nullable=True)
    amount = Column(Numeric(15, 2), nullable=False)
    recurring = Column(String(50), nullable=False, default="monthly")
    due_date = Column(Date, nullable=False)
    due_date_reminder = Column(Integer, nullable=False, default=3)
    notes = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, default="unpaid")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())