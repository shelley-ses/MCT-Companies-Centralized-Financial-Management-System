"""
[DECOMMISSIONED / RETIRED]
Sample petty cash seeding has been retired per Spec 0007.
All petty cash records and top-ups originate exclusively from live user operations
and official application endpoints.
"""
import sys
from app.db.session import SessionLocal
from app.models.finance import Expense
from app.models.petty_cash import PettyCashTopUp

SEED_PREFIX = "SEED-PC-"


def clear(db) -> None:
    expenses = db.query(Expense).filter(Expense.reference_no.like(f"{SEED_PREFIX}%")).delete(synchronize_session=False)
    topups = db.query(PettyCashTopUp).filter(PettyCashTopUp.reference_no.like(f"{SEED_PREFIX}%")).delete(synchronize_session=False)
    db.commit()
    print(f"[CLEARED] {topups} seeded top-ups, {expenses} seeded petty cash expenses")


if __name__ == "__main__":
    if "--clear" in sys.argv:
        db = SessionLocal()
        clear(db)
        db.close()
    else:
        print("Notice: Sample petty cash seeding has been decommissioned.")
        print("Petty cash entries must come exclusively from live operations via application endpoints.")
        print("Use --clear if you need to purge any legacy SEED-PC- records.")
        sys.exit(0)
