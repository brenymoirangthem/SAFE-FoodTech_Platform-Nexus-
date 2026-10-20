from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    Float,
    String,
    DateTime,
)
from sqlalchemy.orm import declarative_base, sessionmaker
from passlib.context import CryptContext


# --------------------------------------------------
# 1. APPLICATION CONFIGURATION
# --------------------------------------------------

app = FastAPI(
    title="SAFE FoodTech API",
    description="Smart Aid for Food Emergency backend",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
   allow_origins=[
    "https://safe-food-tech-platform-nexus.vercel.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# 2. DATABASE CONFIGURATION
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent
DATABASE_URL = f"sqlite:///{BASE_DIR / 'foodtech.db'}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


# --------------------------------------------------
# 3. PASSWORD SECURITY
# --------------------------------------------------

password_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
)


def hash_password(password: str) -> str:
    return password_context.hash(password)


def verify_password(
    plain_password: str,
    hashed_password: str,
) -> bool:
    return password_context.verify(
        plain_password,
        hashed_password,
    )


# --------------------------------------------------
# 4. DATABASE MODEL
# --------------------------------------------------

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String(100), nullable=False)

    email = Column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
    )

    password_hash = Column(String(255), nullable=False)

    role = Column(
        String(30),
        nullable=False,
        default="consumer",
    )

    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

class Center(Base):
    __tablename__ = "centers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    address = Column(String(300), nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    phone = Column(String(30), nullable=False)
    type = Column(String(100), nullable=False)
    supplier_email = Column(String(255), nullable=False, index=True)
    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

class InventoryItem(Base):
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(String(30), nullable=False, default="kg")
    category = Column(String(100), nullable=False, default="Vegetables")
    center_id = Column(Integer, nullable=False, index=True)
    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

Base.metadata.create_all(bind=engine)


# --------------------------------------------------
# 5. REQUEST MODELS
# --------------------------------------------------

class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    role: str = "consumer"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=72)

class CenterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    address: str = Field(min_length=2, max_length=300)
    lat: float
    lng: float
    phone: str = Field(min_length=5, max_length=30)
    type: str = Field(min_length=2, max_length=100)
    supplier_email: EmailStr
# --------------------------------------------------
# 6. HELPER FUNCTIONS
# --------------------------------------------------

ALLOWED_ROLES = {
    "consumer",
    "supplier",
    "emergency",
}


def normalize_email(email: str) -> str:
    return email.strip().lower()


def get_user_response(user: User) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
    }


# --------------------------------------------------
# 7. HOME AND HEALTH CHECK
# --------------------------------------------------

@app.get("/")
def home():
    return {
        "message": "Welcome to SAFE FoodTech API",
        "status": "running",
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "application": "SAFE FoodTech",
    }


# --------------------------------------------------
# 8. REGISTER USER
# --------------------------------------------------

@app.post("/register")
def register_user(request: RegisterRequest):
    db = SessionLocal()

    try:
        email = normalize_email(str(request.email))

        existing_user = (
            db.query(User)
            .filter(User.email == email)
            .first()
        )

        if existing_user:
            raise HTTPException(
                status_code=409,
                detail="An account with this email already exists.",
            )

        role = request.role.strip().lower()

        if role not in ALLOWED_ROLES:
            raise HTTPException(
                status_code=400,
                detail="Invalid user role.",
            )

        user = User(
            name=request.name.strip(),
            email=email,
            password_hash=hash_password(request.password),
            role=role,
        )

        db.add(user)
        db.commit()
        db.refresh(user)

        return {
            "message": "Registration successful.",
            "user": get_user_response(user),
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception as error:
        db.rollback()

        print(
            "REGISTRATION ERROR:",
            repr(error),
            flush=True,
        )

        raise HTTPException(
            status_code=500,
            detail="Registration failed. Check the backend terminal.",
        )

    finally:
        db.close()


# --------------------------------------------------
# 9. LOGIN USER
# --------------------------------------------------

@app.post("/login")
def login_user(request: LoginRequest):
    db = SessionLocal()

    try:
        email = normalize_email(str(request.email))

        user = (
            db.query(User)
            .filter(User.email == email)
            .first()
        )

        if user is None or not verify_password(
            request.password,
            user.password_hash,
        ):
            raise HTTPException(
                status_code=401,
                detail="Incorrect email or password.",
            )

        return {
            "message": "Login successful.",
            "user": get_user_response(user),
        }

    finally:
        db.close()


# --------------------------------------------------
# 10. DEVELOPMENT USER LIST
# --------------------------------------------------

@app.get("/users")
def get_users():
    db = SessionLocal()

    try:
        users = (
            db.query(User)
            .order_by(User.id.desc())
            .all()
        )

        return [
            get_user_response(user)
            for user in users
        ]

    finally:
        db.close()

# --------------------------------------------------
# 11. REGISTER AND RETRIEVE SUPPLIER CENTERS
# --------------------------------------------------

@app.post("/centers")
def register_center(request: CenterRequest):
    db = SessionLocal()

    try:
        supplier_email = normalize_email(str(request.supplier_email))

        supplier = (
            db.query(User)
            .filter(User.email == supplier_email)
            .first()
        )

        if supplier is None or supplier.role != "supplier":
            raise HTTPException(
                status_code=403,
                detail="A registered supplier account is required.",
            )

        center = Center(
            name=request.name.strip(),
            address=request.address.strip(),
            lat=request.lat,
            lng=request.lng,
            phone=request.phone.strip(),
            type=request.type.strip(),
            supplier_email=supplier_email,
        )

        db.add(center)
        db.commit()
        db.refresh(center)

        return {
            "message": "Center registered successfully.",
            "center": {
                "id": center.id,
                "name": center.name,
                "address": center.address,
                "lat": center.lat,
                "lng": center.lng,
                "phone": center.phone,
                "type": center.type,
                "supplier_email": center.supplier_email,
            },
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception as error:
        db.rollback()
        print("CENTER REGISTRATION ERROR:", repr(error), flush=True)
        raise HTTPException(
            status_code=500,
            detail="Center registration failed.",
        )

    finally:
        db.close()


@app.get("/centers/supplier/{email}")
def get_supplier_center(email: str):
    db = SessionLocal()

    try:
        supplier_email = normalize_email(email)

        centers = (
            db.query(Center)
            .filter(Center.supplier_email == supplier_email)
            .order_by(Center.id.desc())
            .all()
        )

        return [
            {
                "id": center.id,
                "name": center.name,
                "address": center.address,
                "lat": center.lat,
                "lng": center.lng,
                "phone": center.phone,
                "type": center.type,
                "supplier_email": center.supplier_email,
            }
            for center in centers
        ]

    finally:
        db.close()

# --------------------------------------------------
# 12. INVENTORY API
# --------------------------------------------------

class InventoryRequest(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    quantity: float = Field(ge=0)
    unit: str = Field(default="kg", max_length=30)
    category: str = Field(default="Vegetables", max_length=100)
    center_id: int


def inventory_response(item: InventoryItem) -> dict:
    return {
        "id": item.id,
        "name": item.name,
        "quantity": item.quantity,
        "unit": item.unit,
        "category": item.category,
        "center_id": item.center_id,
    }


@app.get("/inventory")
def get_inventory(center_id: int):
    db = SessionLocal()

    try:
        items = (
            db.query(InventoryItem)
            .filter(InventoryItem.center_id == center_id)
            .order_by(InventoryItem.id.desc())
            .all()
        )
        return [inventory_response(item) for item in items]

    finally:
        db.close()


@app.post("/inventory")
def add_inventory(request: InventoryRequest):
    db = SessionLocal()

    try:
        center = db.query(Center).filter(
            Center.id == request.center_id
        ).first()

        if center is None:
            raise HTTPException(
                status_code=404,
                detail="Center not found.",
            )

        item = InventoryItem(
            name=request.name.strip(),
            quantity=request.quantity,
            unit=request.unit.strip(),
            category=request.category.strip(),
            center_id=request.center_id,
        )

        db.add(item)
        db.commit()
        db.refresh(item)

        return inventory_response(item)

    except HTTPException:
        db.rollback()
        raise

    except Exception as error:
        db.rollback()
        print("ADD INVENTORY ERROR:", repr(error), flush=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to add inventory item.",
        )

    finally:
        db.close()


@app.put("/inventory/{item_id}")
def update_inventory(item_id: int, request: InventoryRequest):
    db = SessionLocal()

    try:
        item = db.query(InventoryItem).filter(
            InventoryItem.id == item_id,
            InventoryItem.center_id == request.center_id,
        ).first()

        if item is None:
            raise HTTPException(
                status_code=404,
                detail="Inventory item not found for this center.",
            )

        item.name = request.name.strip()
        item.quantity = request.quantity
        item.unit = request.unit.strip()
        item.category = request.category.strip()

        db.commit()
        db.refresh(item)

        return inventory_response(item)

    except HTTPException:
        db.rollback()
        raise

    except Exception as error:
        db.rollback()
        print("UPDATE INVENTORY ERROR:", repr(error), flush=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to update inventory item.",
        )

    finally:
        db.close()