import os
import sys
from app.core.config import settings
from app.db.supabase import get_supabase_admin_client

def seed():
    admin_client = get_supabase_admin_client()
    print("--- Starting Supabase Seed ---")
    print(f"Target Supabase URL: {settings.SUPABASE_URL}")

    # 1. Define Companies: MCT Kitchen and MCT Hotel
    companies_data = [
        {
            "company_name": "MCT Kitchen",
            "location": "Cebu City, Philippines",
            "contact_person": "Alex Cruz",
            "contact_number": "+63 917 111 2233",
            "phone": "+63 32 412 3456",
            "email": "kitchen@mct.com",
            "starting_balance": 500000.00,
            "current_balance": 500000.00
        },
        {
            "company_name": "MCT Hotel",
            "location": "Lapu-Lapu City, Cebu, Philippines",
            "contact_person": "Jordan Rivera",
            "contact_number": "+63 918 222 3344",
            "phone": "+63 32 495 6789",
            "email": "hotel@mct.com",
            "starting_balance": 750000.00,
            "current_balance": 750000.00
        }
    ]

    seeded_companies = []
    for c in companies_data:
        # Check if already exists
        res = admin_client.table("company").select("*").eq("company_name", c["company_name"]).execute()
        if res.data:
            company = res.data[0]
            # Update details if needed
            admin_client.table("company").update(c).eq("company_id", company["company_id"]).execute()
            print(f"[EXISTS/UPDATED] Company: {company['company_name']} (ID: {company['company_id']})")
        else:
            insert_res = admin_client.table("company").insert(c).execute()
            company = insert_res.data[0]
            print(f"[CREATED] Company: {company['company_name']} (ID: {company['company_id']})")
        seeded_companies.append(company)

    # 2. Define Users (One for MCT Kitchen, One for MCT Hotel)
    users_data = [
        {
            "email": "alex.cruz@mct.com",
            "password": "Password123!",
            "name": "Alex Cruz",
            "company_id": seeded_companies[0]["company_id"],
            "is_admin": False
        },
        {
            "email": "jordan.rivera@mct.com",
            "password": "Password123!",
            "name": "Jordan Rivera",
            "company_id": seeded_companies[1]["company_id"],
            "is_admin": False
        }
    ]

    # Get existing auth users
    auth_users = admin_client.auth.admin.list_users()
    auth_user_map = {u.email.lower(): u for u in auth_users if u.email}

    seeded_users = []
    for u in users_data:
        email = u["email"].lower()
        password = u["password"]
        company_id = u["company_id"]
        name = u["name"]
        is_admin = u["is_admin"]

        # Ensure in Supabase Auth
        if email in auth_user_map:
            auth_user = auth_user_map[email]
            print(f"[EXISTS] Supabase Auth User: {email} (UUID: {auth_user.id})")
            # Update password to ensure it is valid
            try:
                admin_client.auth.admin.update_user_by_id(
                    auth_user.id,
                    {"password": password, "email_confirm": True, "user_metadata": {"name": name}}
                )
            except Exception as e:
                print(f"Warning updating auth user {email}: {e}")
        else:
            try:
                auth_res = admin_client.auth.admin.create_user({
                    "email": email,
                    "password": password,
                    "email_confirm": True,
                    "user_metadata": {"name": name}
                })
                auth_user = auth_res.user if hasattr(auth_res, "user") else auth_res
                print(f"[CREATED] Supabase Auth User: {email}")
            except Exception as e:
                print(f"Error creating auth user {email}: {e}")
                auth_user = None

        # Ensure in public.users table
        pub_res = admin_client.table("users").select("*").eq("email", email).execute()
        if pub_res.data:
            existing_pub = pub_res.data[0]
            admin_client.table("users").update({
                "name": name,
                "company_id": company_id,
                "is_admin": is_admin
            }).eq("email", email).execute()
            print(f"[UPDATED] public.users record: {email} -> Company ID {company_id} (User ID: {existing_pub['user_id']})")
            user_record = existing_pub
            user_record["company_id"] = company_id
        else:
            new_user_res = admin_client.table("users").insert({
                "email": email,
                "name": name,
                "company_id": company_id,
                "is_admin": is_admin
            }).execute()
            user_record = new_user_res.data[0]
            print(f"[CREATED] public.users record: {email} -> Company ID {company_id} (User ID: {user_record['user_id']})")

        company_name = next(c["company_name"] for c in seeded_companies if c["company_id"] == company_id)
        seeded_users.append({
            "user_id": user_record.get("user_id"),
            "name": name,
            "email": email,
            "password": password,
            "company_name": company_name,
            "company_id": company_id
        })

    print("\n================== SEED SUMMARY ==================")
    for u in seeded_users:
        print(f"User: {u['name']}")
        print(f"  - Email: {u['email']}")
        print(f"  - Password: {u['password']}")
        print(f"  - Assigned Company: {u['company_name']} (ID: {u['company_id']})")
        print(f"  - User DB ID: {u['user_id']}")
    print("==================================================")

if __name__ == "__main__":
    seed()
