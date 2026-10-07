from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.db.session import Base

class AuditLog(Base):
    __tablename__ = 'audit_logs'

    audit_log_id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    company_id = Column(Integer, ForeignKey("company.company_id", ondelete="SET NULL"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    action = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
