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

import os

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is not set")

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)

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

class FoodRequest(Base):
    __tablename__ = "food_requests"

    id = Column(Integer, primary_key=True, index=True)
    consumer_name = Column(String(100), nullable=False)
    item_name = Column(String(150), nullable=False)
    quantity = Column(Float, nullable=False)
    center_id = Column(Integer, nullable=True, index=True)
    center_name = Column(String(150), nullable=True)
    delivery_type = Column(String(30), nullable=False, default="pickup")
    phone = Column(String(30), nullable=False, default="Not Provided")
    is_priority = Column(Integer, nullable=False, default=0)
    status = Column(String(30), nullable=False, default="Pending")
    rejection_reason = Column(String(300), nullable=True)
    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

Base.metadata.create_all(bind=engine)

# FOOD REQUEST API ROUTES

class FoodRequestCreate(BaseModel):
    consumer_name: str
    item_name: str
    quantity: float
    center_id: int | None = None
    center_name: str | None = None
    delivery_type: str = "pickup"
    phone: str = "Not Provided"
    is_priority: bool = False


class FoodRequestReject(BaseModel):
    reason: str


@app.post("/request-food")
def create_food_request(request: FoodRequestCreate):
    db = SessionLocal()
    try:
        food_request = FoodRequest(
            consumer_name=request.consumer_name,
            item_name=request.item_name,
            quantity=request.quantity,
            center_id=request.center_id,
            center_name=request.center_name,
            delivery_type=request.delivery_type,
            phone=request.phone,
            is_priority=1 if request.is_priority else 0,
            status="Pending",
        )
        db.add(food_request)
        db.commit()
        db.refresh(food_request)

        return {
            "id": food_request.id,
            "consumer_name": food_request.consumer_name,
            "item_name": food_request.item_name,
            "quantity": food_request.quantity,
            "center_id": food_request.center_id,
            "center_name": food_request.center_name,
            "delivery_type": food_request.delivery_type,
            "status": food_request.status,
            "message": "Food request created successfully",
        }
    finally:
        db.close()


@app.get("/food-requests")
def get_food_requests(center_id: int | None = None):
    db = SessionLocal()
    try:
        query = db.query(FoodRequest)

        if center_id is not None:
            query = query.filter(FoodRequest.center_id == center_id)

        requests = query.order_by(FoodRequest.id.desc()).all()

        return [
            {
                "id": r.id,
                "consumer_name": r.consumer_name,
                "item_name": r.item_name,
                "quantity": r.quantity,
                "center_id": r.center_id,
                "center_name": r.center_name,
                "delivery_type": r.delivery_type,
                "phone": r.phone,
                "is_priority": bool(r.is_priority),
                "status": r.status,
                "rejection_reason": r.rejection_reason,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in requests
        ]
    finally:
        db.close()


@app.post("/fulfill-request/{request_id}")
def fulfill_food_request(request_id: int):
    db = SessionLocal()
    try:
        food_request = db.query(FoodRequest).filter(
            FoodRequest.id == request_id
        ).first()

        if not food_request:
            raise HTTPException(status_code=404, detail="Food request not found")

        food_request.status = "Fulfilled"
        db.commit()

        return {"message": "Food request fulfilled successfully"}
    finally:
        db.close()


@app.post("/reject-request/{request_id}")
def reject_food_request(request_id: int, request: FoodRequestReject):
    db = SessionLocal()
    try:
        food_request = db.query(FoodRequest).filter(
            FoodRequest.id == request_id
        ).first()

        if not food_request:
            raise HTTPException(status_code=404, detail="Food request not found")

        food_request.status = "Rejected"
        food_request.rejection_reason = request.reason
        db.commit()

        return {"message": "Food request rejected successfully"}
    finally:
        db.close()


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
@app.get("/centers")
def get_all_centers():
    db = SessionLocal()

    try:
        centers = (
            db.query(Center)
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
                "status": "open",
            }
            for center in centers
        ]

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
def get_inventory(center_id: int | None = None):
    db = SessionLocal()
    try:
        items_query = db.query(InventoryItem)

        if center_id is not None:
            items_query = items_query.filter(
                InventoryItem.center_id == center_id
            )

        items = items_query.order_by(
            InventoryItem.id.desc()
        ).all()

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


        # --------------------------------------------------
# 13. EMERGENCY SOS ALERTS AND RISK ZONES
# --------------------------------------------------

class SOSAlert(Base):
    __tablename__ = "sos_alerts"

    id = Column(Integer, primary_key=True, index=True)
    sender_name = Column(String(100), nullable=False)
    reason = Column(String(500), nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    status = Column(String(30), default="pending", nullable=False)
    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
from fastapi import HTTPException

@app.post("/sos-alert")
def create_sos_alert(payload: dict):
    db = SessionLocal()
    try:
        alert = SOSAlert(
            sender_name=payload.get("sender_name", "Anonymous"),
            reason=payload.get("reason", "").strip(),
            lat=payload.get("lat"),
            lng=payload.get("lng"),
        )

        if not alert.reason:
            raise HTTPException(
                status_code=400,
                detail="Please provide an emergency reason.",
            )

        if alert.lat is None or alert.lng is None:
            raise HTTPException(
                status_code=400,
                detail="Location coordinates are required.",
            )

        db.add(alert)
        db.commit()
        db.refresh(alert)

        return {
            "id": alert.id,
            "sender_name": alert.sender_name,
            "reason": alert.reason,
            "lat": alert.lat,
            "lng": alert.lng,
            "status": alert.status,
        }
    except HTTPException:
        raise
    except Exception as error:
        db.rollback()
        print("CREATE SOS ALERT ERROR:", repr(error))
        raise HTTPException(
            status_code=500,
            detail="Failed to create SOS alert.",
        )
    finally:
        db.close()
class RiskZone(Base):
    __tablename__ = "risk_zones"

    id = Column(Integer, primary_key=True, index=True)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    district = Column(String(150), nullable=False)
    location = Column(String(300), nullable=False)
    severity = Column(String(30), nullable=False)
    affected_population = Column(Integer, default=0, nullable=False)
    source = Column(String(100), default="SAFE", nullable=False)
    confidence = Column(String(30), default="Medium", nullable=False)
    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


Base.metadata.create_all(bind=engine)


@app.get("/sos-alerts")
def get_sos_alerts():
    db = SessionLocal()
    try:
        alerts = (
            db.query(SOSAlert)
            .order_by(SOSAlert.id.desc())
            .all()
        )
        return [
            {
                "id": a.id,
                "sender_name": a.sender_name,
                "reason": a.reason,
                "lat": a.lat,
                "lng": a.lng,
                "status": a.status,
                "timestamp": (
                    a.created_at.isoformat()
                    if a.created_at else None
                ),
            }
            for a in alerts
        ]
    finally:
        db.close()


@app.get("/risk-zones")
def get_risk_zones():
    db = SessionLocal()
    try:
        zones = (
            db.query(RiskZone)
            .order_by(RiskZone.id.desc())
            .all()
        )
        return [
            {
                "id": z.id,
                "lat":z.lat,
                "lng":z.lng,
                "district": z.district,
                "location": z.location,
                "severity": z.severity,
                "affected_population": z.affected_population,
                "source": z.source,
                "confidence": z.confidence,
                "timestamp": (
                    z.created_at.isoformat()
                    if z.created_at else None
                ),
            }
            for z in zones
        ]
    finally:
        db.close()
        # --------------------------------------------------
# 14. SEED DEMO RISK ZONE
# --------------------------------------------------

@app.on_event("startup")
def seed_demo_risk_zone():
    db = SessionLocal()

    try:

        demo_zone = (
            db.query(RiskZone)
            .filter(
                RiskZone.district == "Ukhrul",
                RiskZone.location == "Ukhrul Town",
                RiskZone.source == "SAFE Demo",
            )
            .first()
        )

        if demo_zone is None:
            demo_zone = RiskZone(
                district="Ukhrul",
                location="Ukhrul Town",
                severity="Critical",
                affected_population=500,
                source="SAFE Demo",
                confidence="Demo",
            )

            db.add(demo_zone)
            db.commit()

    except Exception as error:
        db.rollback()
        print("DEMO RISK ZONE ERROR:", repr(error), flush=True)

    finally:
        db.close()