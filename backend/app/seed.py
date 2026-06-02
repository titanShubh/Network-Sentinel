import sys
from app.database import Base, engine, SessionLocal
from app.models import User
from app.core.security import get_password_hash

def seed_db():
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Check if admin user already exists
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            print("Creating default admin user (admin / admin123)...")
            hashed_pwd = get_password_hash("admin123")
            admin_user = User(username="admin", hashed_password=hashed_pwd)
            db.add(admin_user)
            db.commit()
            print("Admin user seeded successfully.")
        else:
            print("Admin user already exists. Skipping seed.")
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
