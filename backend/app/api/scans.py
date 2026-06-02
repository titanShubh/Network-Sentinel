from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
import datetime
import asyncio
import json

from ..database import get_db
from ..models import Scan, Host, Port, Finding, AuditLog
from ..services.scanner import NetworkScanner, active_scans_progress, progress_lock
from .auth import get_current_user

router = APIRouter(prefix="/scans", tags=["scans"])

# Websocket connections registry for real-time progress
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_text(json.dumps(message))
            except Exception:
                pass

manager = ConnectionManager()

class ScanCreateRequest(BaseModel):
    target_range: str
    ports_scanned: Optional[str] = ""
    thread_count: Optional[int] = 50

# Background runner
def run_scanner_task(scan_id: int, target_range: str, ports_scanned: str, thread_count: int):
    scanner = NetworkScanner(scan_id, target_range, ports_scanned, thread_count)
    scanner.execute()

@router.post("/start", response_model=dict)
def start_scan(
    request: ScanCreateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    # Audit log entry
    audit = AuditLog(
        action=f"Started scan on range {request.target_range} ports: {request.ports_scanned or 'common'}",
        username=current_user.username,
        timestamp=datetime.datetime.utcnow()
    )
    db.add(audit)
    
    # Create Scan metadata
    scan = Scan(
        target_range=request.target_range,
        ports_scanned=request.ports_scanned or "Common Ports",
        started_at=datetime.datetime.utcnow(),
        status="running"
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)
    
    # Start scan in background thread
    background_tasks.add_task(
        run_scanner_task,
        scan.id,
        request.target_range,
        request.ports_scanned,
        request.thread_count
    )
    
    return {"message": "Scan started", "scan_id": scan.id}

@router.get("/list", response_model=List[dict])
def list_scans(db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    scans = db.query(Scan).order_by(Scan.started_at.desc()).all()
    result = []
    for s in scans:
        result.append({
            "id": s.id,
            "target_range": s.target_range,
            "ports_scanned": s.ports_scanned,
            "started_at": s.started_at,
            "completed_at": s.completed_at,
            "status": s.status,
            "total_hosts_found": s.total_hosts_found
        })
    return result

@router.get("/progress/{scan_id}", response_model=dict)
def get_scan_progress(scan_id: int, current_user: str = Depends(get_current_user)):
    with progress_lock:
        progress = active_scans_progress.get(scan_id)
        if not progress:
            return {"status": "not_found", "progress": 0.0}
        return progress

@router.get("/compare", response_model=dict)
def compare_scans(
    scan_a_id: int,
    scan_b_id: int,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Compare port differences between two scans."""
    scan_a = db.query(Scan).filter(Scan.id == scan_a_id).first()
    scan_b = db.query(Scan).filter(Scan.id == scan_b_id).first()
    
    if not scan_a or not scan_b:
        raise HTTPException(status_code=404, detail="One or both scans not found.")
        
    ports_a = db.query(Port, Host.ip_address).join(Host).filter(Port.scan_id == scan_a_id, Port.state == "open").all()
    ports_b = db.query(Port, Host.ip_address).join(Host).filter(Port.scan_id == scan_b_id, Port.state == "open").all()
    
    set_a = {(ip, p.port, p.service) for p, ip in ports_a}
    set_b = {(ip, p.port, p.service) for p, ip in ports_b}
    
    newly_opened = set_b - set_a
    newly_closed = set_a - set_b
    
    return {
        "scan_a": {"id": scan_a_id, "timestamp": scan_a.started_at, "range": scan_a.target_range},
        "scan_b": {"id": scan_b_id, "timestamp": scan_b.started_at, "range": scan_b.target_range},
        "newly_exposed_services": [{"ip": ip, "port": p, "service": s} for ip, p, s in newly_opened],
        "closed_services": [{"ip": ip, "port": p, "service": s} for ip, p, s in newly_closed]
    }

# WebSocket endpoint for real-time progress broadcast
@router.websocket("/ws/progress")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Periodically broadcast active scan states to listening clients
            with progress_lock:
                current_states = dict(active_scans_progress)
            await websocket.send_text(json.dumps(current_states))
            await asyncio.sleep(1.0)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)
