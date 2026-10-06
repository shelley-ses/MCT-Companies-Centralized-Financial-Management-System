import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.session import engine, Base
import app.models  # Import all models to register with Base

def init_db():
    if engine is None:
        print("Error: DATABASE_URL is not configured in backend/.env")
        sys.exit(1)
    
    print("Creating all tables in database...")
    Base.metadata.create_all(bind=engine)
    print("All tables successfully created!")

if __name__ == "__main__":
    init_db()
