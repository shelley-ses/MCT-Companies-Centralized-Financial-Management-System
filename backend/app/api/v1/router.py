from fastapi import APIRouter
from app.api.v1.endpoints import (
    health,
    auth,
    users,
    companies,
    categories,
    cash_inflows,
    sales,
    expenses,
    budgets,
    loans,
    calculations,
    audit_logs,
)

api_router = APIRouter()

api_router.include_router(health.router, tags=["Health"])
api_router.include_router(auth.router, tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(companies.router, prefix="/companies", tags=["Companies"])
api_router.include_router(categories.router, prefix="/categories", tags=["Categories"])
api_router.include_router(cash_inflows.router, prefix="/cash-inflows", tags=["Cash Inflows"])
api_router.include_router(sales.router, prefix="/sales", tags=["Sales"])
api_router.include_router(expenses.router, prefix="/expenses", tags=["Expenses"])
api_router.include_router(budgets.router, prefix="/budgets", tags=["Budgets"])
api_router.include_router(loans.router, prefix="/loans", tags=["Loans"])
api_router.include_router(calculations.router, prefix="/calculations", tags=["Financial Calculations"])
api_router.include_router(audit_logs.router, tags=["Audit Logs"])
