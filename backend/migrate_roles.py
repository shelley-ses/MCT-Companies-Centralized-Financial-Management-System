import sqlite3

conn = sqlite3.connect('mct_financial.db')
cursor = conn.cursor()

# Check and add role column to users
cols = [c[1] for c in cursor.execute('PRAGMA table_info(users)').fetchall()]
if 'role' not in cols:
    cursor.execute("ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'company'")
    cursor.execute("UPDATE users SET role = 'audit' WHERE is_admin = 1")
    conn.commit()
    print("Added role column to users table.")

# Ensure demo accounts exist in SQLite
existing_emails = {row[0].lower(): row[1] for row in cursor.execute("SELECT email, user_id FROM users").fetchall()}

# Admin / Audit user
if "admin@mct.com" not in existing_emails:
    cursor.execute("""
        INSERT INTO users (name, email, role, is_admin, company_id)
        VALUES ('Head of Audit', 'admin@mct.com', 'audit', 1, NULL)
    """)
    conn.commit()
    print("Inserted admin@mct.com (role: audit)")

# Finance user (New)
if "finance@mct.com" not in existing_emails:
    cursor.execute("""
        INSERT INTO users (name, email, role, is_admin, company_id)
        VALUES ('Finance Officer', 'finance@mct.com', 'finance', 0, NULL)
    """)
    conn.commit()
    print("Inserted finance@mct.com (role: finance)")

# Company user (Temporary Employee)
if "temporaryemployee@gmail.com" not in existing_emails:
    cursor.execute("""
        INSERT INTO users (name, email, role, is_admin, company_id)
        VALUES ('Temporary Employee', 'temporaryemployee@gmail.com', 'company', 0, 3)
    """)
    conn.commit()
    print("Inserted temporaryemployee@gmail.com (role: company, company_id: 3)")

print("Users currently in DB:")
for row in cursor.execute("SELECT user_id, email, name, role, is_admin, company_id FROM users").fetchall():
    print(row)

conn.close()
