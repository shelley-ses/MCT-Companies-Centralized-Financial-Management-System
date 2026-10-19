"""
Seeds sample sales and expenses for every company from May 1 up to today, so the
dashboard (KPIs, Monthly Profit / Loss, Income and Expense summaries) has data.
July and September are seeded as loss months; the other months are profitable.

Seeded rows are marked so they can be removed without touching real data:
  - sales:    cheque_number starts with "SEED-DB-"
  - expenses: reference_no  starts with "SEED-DB-"

Usage (from backend/, after migrate_payment_method.py):
    python seed_dashboard.py           # add sample data (replaces earlier seed rows)
    python seed_dashboard.py --clear   # remove sample data only
"""
import random
import sys
from datetime import date, timedelta
from decimal import Decimal

from app.db.session import SessionLocal, init_db
from app.models.company import Company
from app.models.finance import Category, Expense, Sale


SEED_PREFIX = "SEED-DB-"
START_MONTH = 5  # May

# Expenses as a share of that month's sales: > 1 means a loss month
MONTH_EXPENSE_RATIO = {5: 0.72, 6: 0.81, 7: 1.24, 8: 0.68, 9: 1.15, 10: 0.77}

# Typical monthly sales per company (PHP)
COMPANY_MONTHLY_SALES = {
    "MCT Kitchen": 185000,
    "MCT Hotel": 260000,
    "JK Printing": 95000,
    "Speedfire": 70000,
    "JK Property and Ventures": 140000,
    "Golden Sunburst Ventures": 60000,
}
DEFAULT_MONTHLY_SALES = 80000

SALES_ITEMS = [
    ("Sales Revenue", "Daily walk-in sales"),
    ("Sales Revenue", "Weekend sales remittance"),
    ("Service Income", "Service package billing"),
    ("Product Sales", "Retail product sales"),
    ("Catering", "Corporate lunch catering"),
    ("Event Booking", "Function room booking"),
    ("Other Income", "Miscellaneous income"),
]
SALES_METHODS = ["Cash", "GCash", "Maya", "Bank Transfer", "PayMongo", "Cheque"]

# (category, particulars, share of the month's expenses)
EXPENSE_ITEMS = [
    ("Payroll", "Staff payroll", 0.40),
    ("Electricity", "Meralco electric bill", 0.10),
    ("Hotel Supplies", "Supplies restock", 0.12),
    ("Rendered Fee", "Contractor service fee", 0.10),
    ("BIR", "Withholding tax remittance", 0.08),
    ("SSS", "SSS contributions", 0.05),
    ("Philhealth", "Philhealth contributions", 0.04),
    ("HDMF", "Pag-IBIG contributions", 0.03),
    ("Revolving Funds", "Revolving fund replenishment", 0.05),
    ("BBMP Foundation", "Foundation donation", 0.03),
]
EXPENSE_METHODS = ["Bank Transfer", "Cash", "Cheque", "GCash"]


def clear(db) -> None:
    sales = db.query(Sale).filter(Sale.cheque_no.like(f"{SEED_PREFIX}%")).delete(synchronize_session=False)
    expenses = db.query(Expense).filter(Expense.reference_no.like(f"{SEED_PREFIX}%")).delete(synchronize_session=False)
    db.commit()
    print(f"[CLEARED] {sales} seeded sales, {expenses} seeded expenses")


def category_ids(db, names) -> dict:
    ids = {}
    for name in names:
        category = db.query(Category).filter(Category.name.ilike(name)).first()
        if not category:
            category = Category(name=name)
            db.add(category)
            db.commit()
            db.refresh(category)
        ids[name] = category.category_id
    return ids


def month_days(year: int, month: int, today: date) -> list:
    day = date(year, month, 1)
    days = []
    while day.month == month and day <= today:
        days.append(day)
        day += timedelta(days=1)
    return days


def money(value: float) -> Decimal:
    return Decimal(str(round(value / 5) * 5))


def seed_company(db, rng, company: Company, cat_ids: dict, today: date) -> list:
    base = COMPANY_MONTHLY_SALES.get(company.company_name, DEFAULT_MONTHLY_SALES)
    summary = []
    sale_no = expense_no = 0

    for month in range(START_MONTH, today.month + 1):
        days = month_days(today.year, month, today)
        if not days:
            continue
        # Partial current month scales down with the days elapsed
        month_sales_target = base * rng.uniform(0.9, 1.1) * len(days) / 30
        month_expense_target = month_sales_target * MONTH_EXPENSE_RATIO.get(month, 0.8)

        # Sales: 8-12 entries per full month
        entries = max(3, round(rng.randint(8, 12) * len(days) / 30))
        weights = [rng.uniform(0.6, 1.4) for _ in range(entries)]
        month_sales = Decimal("0")
        for weight in weights:
            category, particulars = rng.choice(SALES_ITEMS)
            amount = money(month_sales_target * weight / sum(weights))
            sale_no += 1
            db.add(Sale(
                company_id=company.company_id,
                category_id=cat_ids[category],
                payment_method=rng.choice(SALES_METHODS),
                transaction_date=rng.choice(days),
                cheque_no=f"{SEED_PREFIX}S-{company.company_id}-{sale_no:04d}",
                amount=amount,
                particulars=particulars,
            ))
            month_sales += amount

        # Expenses: one entry per category, sized by its share of the month
        month_expenses = Decimal("0")
        for category, particulars, share in EXPENSE_ITEMS:
            amount = money(month_expense_target * share * rng.uniform(0.85, 1.15))
            expense_no += 1
            db.add(Expense(
                company_id=company.company_id,
                category_id=cat_ids[category],
                payment_method=rng.choice(EXPENSE_METHODS),
                expense_date=rng.choice(days),
                reference_no=f"{SEED_PREFIX}E-{company.company_id}-{expense_no:04d}",
                amount=amount,
                amount_paid=amount,
                description=particulars,
            ))
            month_expenses += amount

        summary.append((month, month_sales, month_expenses))

    db.commit()
    return summary


def main() -> None:
    init_db()
    db = SessionLocal()
    try:
        clear(db)
        if "--clear" in sys.argv:
            return

        rng = random.Random(20260501)
        today = date.today()
        cat_ids = category_ids(
            db,
            {c for c, _ in SALES_ITEMS} | {c for c, _, _ in EXPENSE_ITEMS},
        )
        for company in db.query(Company).order_by(Company.company_id).all():
            summary = seed_company(db, rng, company, cat_ids, today)
            months = ", ".join(
                f"{date(today.year, m, 1):%b} {'+' if s >= e else '-'}{abs(s - e):,.0f}"
                for m, s, e in summary
            )
            print(f"[SEEDED] {company.company_name}: {months}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
