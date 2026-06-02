from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import AuditLog
from .auth import get_current_user

router = APIRouter(prefix="/audit", tags=["audit"])

@router.get("/logs", response_model=List[dict])
def get_audit_logs(db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).all()
    result = []
    for log in logs:
        result.append({
            "id": log.id,
            "action": log.action,
            "username": log.username,
            "ip_address": log.ip_address,
            "timestamp": log.timestamp
        })
    return result
