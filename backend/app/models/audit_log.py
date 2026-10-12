from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.db.session import Base

class AuditLog(Base):
    __tablename__ = 'audit_logs'

    audit_log_id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    company_id = Column(Integer, ForeignKey("company.company_id", ondelete="SET NULL"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    action = Column(String(255), nullable=False)
    # Category of the action (e.g. AUTH, TRANSACTION, USER, etc.)
    action_category = Column(String(50), nullable=True)
    # IP address of the user who performed the action
    ip_address = Column(String(45), nullable=True)
    # Optional extra context stored as plain text (e.g. record IDs, field changes)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
