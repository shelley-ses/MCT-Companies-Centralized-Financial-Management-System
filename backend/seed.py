import os
import sys

from app.core.config import settings
from app.db.supabase import get_supabase_admin_client


def seed_admin() -> None:
    admin_client = get_supabase_admin_client()
    email = os.environ.get("SEED_ADMIN_EMAIL", "admin@mct.com").strip()
    password = os.environ.get("SEED_ADMIN_PASSWORD")
    if not password:
        raise RuntimeError("SEED_ADMIN_PASSWORD must be set when seeding the admin account.")

    print("--- Starting Supabase Admin Seed ---")
    print(f"Target Supabase URL: {settings.SUPABASE_URL}")
    auth_users = admin_client.auth.admin.list_users()
    auth_user_map = {user.email.lower(): user for user in auth_users if user.email}
    auth_user = auth_user_map.get(email.lower())

    if auth_user:
        admin_client.auth.admin.update_user_by_id(
            auth_user.id,
            {
                "email": email,
                "password": password,
                "email_confirm": True,
                "user_metadata": {"name": "MCT Administrator"},
            },
        )
        print(f"[UPDATED] Supabase Auth admin: {email}")
    else:
        auth_response = admin_client.auth.admin.create_user(
            {
                "email": email,
                "password": password,
                "email_confirm": True,
                "user_metadata": {"name": "MCT Administrator"},
            }
        )
        auth_user = (
            auth_response.user
            if hasattr(auth_response, "user")
            else auth_response
        )
        print(f"[CREATED] Supabase Auth admin: {email} (UUID: {auth_user.id})")

    profile = {
        "email": email,
        "name": "MCT Administrator",
        "company_id": None,
        "is_admin": True,
    }
    existing_profile = (
        admin_client.table("users").select("*").eq("email", email).execute()
    )
    if existing_profile.data:
        profile_response = (
            admin_client.table("users")
            .update(profile)
            .eq("email", email)
            .execute()
        )
        user_id = profile_response.data[0]["user_id"]
        print(f"[UPDATED] public.users admin profile: {email} (User ID: {user_id})")
    else:
        profile_response = admin_client.table("users").insert(profile).execute()
        user_id = profile_response.data[0]["user_id"]
        print(f"[CREATED] public.users admin profile: {email} (User ID: {user_id})")

    print(f"Admin seed complete for {email} (User ID: {user_id}).")


if __name__ == "__main__":
    if "--admin-only" not in sys.argv:
        print("Demo companies and employee users are no longer seeded.")
        print("Use --admin-only to seed or repair the central admin account.")
        raise SystemExit(0)
    seed_admin()
