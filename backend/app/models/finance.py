from sqlalchemy import Column, BigInteger, String, Text, Numeric, Date, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.session import Base

class Category(Base):
    __tablename__ = "category"

    category_id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    sales = relationship("Sale", back_populates="category")
    expenses = relationship("Expense", back_populates="category")
    budgets = relationship("Budget", back_populates="category")


class CashInflow(Base):
    __tablename__ = "cash_inflow"

    cash_transaction_id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    company_id = Column(BigInteger, nullable=False, index=True)
    transaction_date = Column(Date, nullable=False)
    transaction_type = Column(String(100), nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    reference_no = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Sale(Base):
    __tablename__ = "sales"

    sales_id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    company_id = Column(BigInteger, nullable=False, index=True)
    category_id = Column(BigInteger, ForeignKey("category.category_id", ondelete="SET NULL"), nullable=True)
    transaction_date = Column(Date, nullable=False)
    reference_no = Column(String(100), nullable=True)
    amount = Column(Numeric(15, 2), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    category = relationship("Category", back_populates="sales")


class Expense(Base):
    __tablename__ = "expenses"

    expense_id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    company_id = Column(BigInteger, nullable=False, index=True)
    category_id = Column(BigInteger, ForeignKey("category.category_id", ondelete="SET NULL"), nullable=True)
    created_by = Column(BigInteger, nullable=True)
    expense_date = Column(Date, nullable=False)
    reference_no = Column(String(100), nullable=True)
    amount = Column(Numeric(15, 2), nullable=False)
    amount_paid = Column(Numeric(15, 2), default=0.00)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    category = relationship("Category", back_populates="expenses")


class Budget(Base):
    __tablename__ = "budget"

    budget_id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    company_id = Column(BigInteger, nullable=False, index=True)
    category_id = Column(BigInteger, ForeignKey("category.category_id", ondelete="CASCADE"), nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    period_type = Column(String(50), nullable=False)  # monthly, quarterly, yearly
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    category = relationship("Category", back_populates="budgets")
