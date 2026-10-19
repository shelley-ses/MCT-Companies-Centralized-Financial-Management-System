"""
Seeds sample petty cash data so the Petty Cash page and expense list have
something to show: top-ups from sales plus expenses paid with "Petty Cash"
for every company, from August 1 up to today.

Every seeded row has a reference_no starting with "SEED-PC-", so it can be
removed again without touching real data.

Usage (from backend/, after migrate_payment_method.py):
    python seed_petty_cash.py           # add sample data (replaces earlier seed rows)
    python seed_petty_cash.py --clear   # remove sample data only
"""
import random
import sys
from datetime import date, timedelta
from decimal import Decimal

from app.db.session import SessionLocal, init_db
from app.models.company import Company
from app.models.finance import Category, Expense
from app.models.petty_cash import PettyCashTopUp, PettyCashWallet


SEED_PREFIX = "SEED-PC-"
START_DATE = date(date.today().year, 8, 1)

# Petty cash sub-categories, same list as the expense form
PETTY_CASH_ITEMS = [
    ("Office Supplies & Stationery", "Bond paper and ballpens", (120, 650)),
    ("Courier & Delivery Services", "LBC documents to supplier", (180, 450)),
    ("Transportation & Fare (Taxi/Grab/Jeepney)", "Grab to bank deposit", (150, 520)),
    ("Gasoline & Fuel Allowance", "Motorcycle fuel for errands", (300, 900)),
    ("Toll Fees & Parking", "Parking at city hall", (60, 250)),
    ("Staff Overtime Meals & Snacks", "Overtime merienda", (250, 1200)),
    ("Pantry Supplies & Drinking Water", "Water refill and coffee", (180, 700)),
    ("Cleaning Materials & Janitorial Supplies", "Detergent and mops", (200, 850)),
    ("Emergency Kitchen & Store Supplies", "Gas tank refill", (450, 1500)),
    ("Minor Hardware Tools & Repairs", "Faucet repair parts", (150, 980)),
    ("Electrical & Light Bulb Replacements", "LED bulbs", (180, 600)),
    ("First Aid & Emergency Medicine", "First aid kit restock", (150, 500)),
    ("Notarial & Legal Documentation Fees", "Notarized affidavit", (200, 600)),
    ("Representation & Client Refreshments", "Client meeting snacks", (350, 1400)),
]

# Per-company top-up size (PHP), low-balance alert, and whether to leave the wallet low
COMPANY_PROFILES = {
    "MCT Kitchen": (Decimal("8000"), Decimal("2000"), False),
    "MCT Hotel": (Decimal("10000"), Decimal("3000"), False),
    "JK Printing": (Decimal("5000"), Decimal("1500"), True),
    "Speedfire": (Decimal("4000"), Decimal("1000"), False),
    "JK Property and Ventures": (Decimal("6000"), Decimal("1500"), True),
    "Golden Sunburst Ventures": (Decimal("5000"), Decimal("1000"), False),
}
DEFAULT_PROFILE = (Decimal("5000"), Decimal("1000"), False)


def clear(db) -> None:
    expenses = db.query(Expense).filter(Expense.reference_no.like(f"{SEED_PREFIX}%")).delete(synchronize_session=False)
    topups = db.query(PettyCashTopUp).filter(PettyCashTopUp.reference_no.like(f"{SEED_PREFIX}%")).delete(synchronize_session=False)
    db.commit()
    print(f"[CLEARED] {topups} seeded top-ups, {expenses} seeded petty cash expenses")


def petty_cash_category_id(db) -> int:
    category = db.query(Category).filter(Category.name.ilike("Petty Cash")).first()
    if not category:
        category = Category(name="Petty Cash")
        db.add(category)
        db.commit()
        db.refresh(category)
    return category.category_id


def seed_company(db, rng: random.Random, company: Company, category_id: int) -> tuple:
    topup_size, threshold, leave_low = COMPANY_PROFILES.get(company.company_name, DEFAULT_PROFILE)
    today = date.today()
    balance = Decimal("0")
    topup_count = expense_count = 0
    day = START_DATE

    while day <= today:
        days_left = (today - day).days
        # Top up when the wallet runs low, except near the end for wallets meant to show the alert
        if balance < threshold and not (leave_low and days_left < 12 and topup_count > 0):
            db.add(PettyCashTopUp(
                company_id=company.company_id,
                amount=topup_size,
                topup_date=day,
                reference_no=f"{SEED_PREFIX}TU-{company.company_id}-{topup_count + 1:03d}",
                description="Petty cash replenishment from sales",
            ))
            balance += topup_size
            topup_count += 1

        # Roughly three petty cash expenses a week, Mon-Sat
        if day.weekday() < 6 and rng.random() < 0.5:
            sub_category, note, (low, high) = rng.choice(PETTY_CASH_ITEMS)
            amount = Decimal(rng.randrange(low, high, 5))
            if amount <= balance:
                db.add(Expense(
                    company_id=company.company_id,
                    category_id=category_id,
                    payment_method="Petty Cash",
                    expense_date=day,
                    reference_no=f"{SEED_PREFIX}EX-{company.company_id}-{expense_count + 1:03d}",
                    amount=amount,
                    amount_paid=amount,
                    description=f"{sub_category} - {note}",
                ))
                balance -= amount
                expense_count += 1

        day += timedelta(days=1)

    wallet = db.query(PettyCashWallet).filter(PettyCashWallet.company_id == company.company_id).first()
    if not wallet:
        wallet = PettyCashWallet(company_id=company.company_id)
        db.add(wallet)
    wallet.low_balance_threshold = threshold

    return topup_count, expense_count, balance, threshold


def main() -> None:
    init_db()
    db = SessionLocal()
    try:
        clear(db)
        if "--clear" in sys.argv:
            return

        rng = random.Random(20261020)
        category_id = petty_cash_category_id(db)
        for company in db.query(Company).order_by(Company.company_id).all():
            topups, expenses, balance, threshold = seed_company(db, rng, company, category_id)
            db.commit()
            status = "LOW" if balance < threshold else "ok"
            print(
                f"[SEEDED] {company.company_name}: {topups} top-ups, {expenses} expenses, "
                f"balance PHP {balance:,.2f} ({status})"
            )
    finally:
        db.close()


if __name__ == "__main__":
    main()
