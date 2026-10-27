from sqlalchemy import Column, BigInteger, String, Text, Numeric, Date, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.session import Base

class Loan(Base):
    __tablename__ = "loan"

    loan_id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    borrower = Column(BigInteger, nullable=False, index=True)  # Company_ID of borrower
    lender = Column(BigInteger, nullable=True, index=True)    # Company_ID of lender, assigned by Finance upon approval
    loan_ref_no = Column(String(100), unique=True, nullable=True)
    principal_amount = Column(Numeric(15, 2), nullable=False)
    interest_rate = Column(Numeric(5, 2), default=0.00)
    interest_type = Column(String(50), default="simple")  # simple, compound
    loan_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=True)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="Pending Finance Endorsement")
    endorsed_by = Column(String(100), nullable=True)
    endorsed_at = Column(DateTime(timezone=True), nullable=True)
    finance_remark = Column(Text, nullable=True)
    audit_reviewed_by = Column(String(100), nullable=True)
    audit_reviewed_at = Column(DateTime(timezone=True), nullable=True)
    audit_remark = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    repayments = relationship("LoanRepayment", back_populates="loan", cascade="all, delete-orphan")


class LoanRepayment(Base):
    __tablename__ = "loans_repayments"

    loan_repayment_id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    loan_id = Column(BigInteger, ForeignKey("loan.loan_id", ondelete="CASCADE"), nullable=False, index=True)
    recorded_by = Column(BigInteger, nullable=True)
    payment_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=True)
    remaining_balance = Column(Numeric(15, 2), nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    reference_no = Column(String(100), nullable=True)
    status = Column(String(50), default="completed")  # pending, completed, overdue
    received_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    loan = relationship("Loan", back_populates="repayments")
