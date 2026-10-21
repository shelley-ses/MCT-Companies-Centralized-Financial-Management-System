"""
Seeds sample sales and expenses for every company for the past 18 months up to today, so the
dashboard (KPIs, Monthly Profit / Loss, Income and Expense summaries) has rich historical data.
July and September (and January) are seeded as loss months; the other months are profitable.

Seeded rows are marked so they can be removed without touching real data:
  - sales:    cheque_number starts with "SEED-DB-"
  - expenses: reference_no  starts with "SEED-DB-"

Usage (from backend/):
    python seed_dashboard.py               # add sample data for 18 months
    python seed_dashboard.py --months 24   # custom month count
    python seed_dashboard.py --clear       # remove sample data only
"""
import argparse
import random
import sys
from datetime import date, timedelta
from decimal import Decimal

from app.db.session import SessionLocal, init_db
from app.models.company import Company
from app.models.finance import Category, Expense, Sale


SEED_PREFIX = "SEED-DB-"
DEFAULT_MONTHS_COUNT = 18

# Base expenses as a share of that month's sales: all <= 0.65 to ensure consistent profits
MONTH_EXPENSE_RATIO = {
    1: 0.60,   # Jan: profit
    2: 0.58,   # Feb: profit
    3: 0.55,   # Mar: profit
    4: 0.52,   # Apr: profit
    5: 0.54,   # May: profit
    6: 0.56,   # Jun: profit
    7: 0.64,   # Jul: solid profit (~36% margin)
    8: 0.48,   # Aug: strong profit
    9: 0.62,   # Sep: solid profit (~38% margin)
    10: 0.50,  # Oct: strong profit
    11: 0.52,  # Nov: strong profit
    12: 0.40,  # Dec: peak holiday sales (large profit ~60% margin)
}

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


def get_month_sequence(today: date, count: int) -> list:
    """Returns a list of (year, month) from `count` months ago up to today's month."""
    sequence = []
    y, m = today.year, today.month
    for _ in range(count):
        sequence.append((y, m))
        m -= 1
        if m == 0:
            m = 12
            y -= 1
    sequence.reverse()
    return sequence


def month_days(year: int, month: int, today: date) -> list:
    day = date(year, month, 1)
    days = []
    while day.month == month and day <= today:
        days.append(day)
        day += timedelta(days=1)
    return days


def money(value: float) -> Decimal:
    return Decimal(str(round(value / 5) * 5))


def seed_company(db, rng, company: Company, cat_ids: dict, today: date, month_seq: list) -> list:
    base = COMPANY_MONTHLY_SALES.get(company.company_name, DEFAULT_MONTHLY_SALES)
    summary = []
    sale_no = expense_no = 0

    for year, month in month_seq:
        days = month_days(year, month, today)
        if not days:
            continue

        days_in_month = (date(year, month + 1, 1) - timedelta(days=1)).day if month < 12 else 31
        scale = len(days) / days_in_month

        # Slight company variance for sales
        month_sales_target = base * rng.uniform(0.9, 1.1) * scale

        # Base expense ratio capped at 0.70 to ensure every month is profitable
        base_ratio = MONTH_EXPENSE_RATIO.get(month, 0.55)
        month_ratio = min(0.70, base_ratio * rng.uniform(0.94, 1.02))

        month_expense_target = month_sales_target * month_ratio

        # Sales: 8-12 entries per full month (pro-rated if partial month)
        entries = max(3, round(rng.randint(8, 12) * scale))
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
                cheque_no=f"{SEED_PREFIX}S-{company.company_id}-{sale_no:05d}",
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
                reference_no=f"{SEED_PREFIX}E-{company.company_id}-{expense_no:05d}",
                amount=amount,
                amount_paid=amount,
                description=particulars,
            ))
            month_expenses += amount

        summary.append((year, month, month_sales, month_expenses))

    db.commit()
    return summary


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed dashboard sales and expenses.")
    parser.add_argument("--clear", action="store_true", help="Remove seeded dashboard data only")
    parser.add_argument("--months", type=int, default=DEFAULT_MONTHS_COUNT, help=f"Number of months to seed (default: {DEFAULT_MONTHS_COUNT})")
    args = parser.parse_args()

    init_db()
    db = SessionLocal()
    try:
        clear(db)
        if args.clear:
            return

        rng = random.Random(20260501)
        today = date.today()
        month_seq = get_month_sequence(today, args.months)

        cat_ids = category_ids(
            db,
            {c for c, _ in SALES_ITEMS} | {c for c, _, _ in EXPENSE_ITEMS},
        )
        companies = db.query(Company).order_by(Company.company_id).all()
        print(f"[START] Seeding {len(month_seq)} months ({month_seq[0][0]}-{month_seq[0][1]:02d} to {month_seq[-1][0]}-{month_seq[-1][1]:02d}) for {len(companies)} companies...")

        for company in db.query(Company).order_by(Company.company_id).all():
            summary = seed_company(db, rng, company, cat_ids, today, month_seq)
            months = ", ".join(
                f"{date(y, m, 1):%b '%y} {'+' if s >= e else '-'}{abs(s - e):,.0f}"
                for y, m, s, e in summary
            )
            print(f"[SEEDED] {company.company_name} ({len(summary)} months): {months}")
    finally:
        db.close()


if __name__ == "__main__":
    main()

