from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models import Host, Port, Finding
from .auth import get_current_user

router = APIRouter(prefix="/hosts", tags=["hosts"])

@router.get("/list", response_model=List[dict])
def list_hosts(
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    query = db.query(Host)
    if search:
        query = query.filter(
            (Host.ip_address.contains(search)) | 
            (Host.hostname.contains(search))
        )
    hosts = query.order_by(Host.ip_address).all()
    
    result = []
    for h in hosts:
        # Retrieve the latest open ports for this host
        # Find latest scan for this host's ports
        latest_port_sub = db.query(Port.scan_id).filter(Port.host_id == h.id).order_by(Port.detected_at.desc()).limit(1).scalar_subquery()
        open_ports = db.query(Port).filter(Port.host_id == h.id, Port.scan_id == latest_port_sub, Port.state == "open").all()
        
        # Retrieve findings
        latest_finding_sub = db.query(Finding.scan_id).filter(Finding.host_id == h.id).order_by(Finding.detected_at.desc()).limit(1).scalar_subquery()
        findings = db.query(Finding).filter(Finding.host_id == h.id, Finding.scan_id == latest_finding_sub).all()
        
        result.append({
            "id": h.id,
            "ip_address": h.ip_address,
            "hostname": h.hostname,
            "last_seen": h.last_seen,
            "open_ports_count": len(open_ports),
            "findings_count": len(findings),
            "highest_severity": get_highest_severity([f.severity for f in findings])
        })
    return result

@router.get("/{host_id}/details", response_model=dict)
def host_details(host_id: int, db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    host = db.query(Host).filter(Host.id == host_id).first()
    if not host:
        raise HTTPException(status_code=404, detail="Host not found")
        
    # Get latest port states
    latest_port_sub = db.query(Port.scan_id).filter(Port.host_id == host_id).order_by(Port.detected_at.desc()).limit(1).scalar_subquery()
    ports = db.query(Port).filter(Port.host_id == host_id, Port.scan_id == latest_port_sub).order_by(Port.port).all()
    
    # Get latest findings
    latest_finding_sub = db.query(Finding.scan_id).filter(Finding.host_id == host_id).order_by(Finding.detected_at.desc()).limit(1).scalar_subquery()
    findings = db.query(Finding).filter(Finding.host_id == host_id, Finding.scan_id == latest_finding_sub).all()
    
    return {
        "id": host.id,
        "ip_address": host.ip_address,
        "hostname": host.hostname,
        "last_seen": host.last_seen,
        "ports": [{
            "id": p.id,
            "port": p.port,
            "service": p.service,
            "state": p.state,
            "banner": p.banner,
            "detected_at": p.detected_at
        } for p in ports],
        "findings": [{
            "id": f.id,
            "port": f.port,
            "severity": f.severity,
            "title": f.title,
            "description": f.description,
            "recommendation": f.recommendation,
            "detected_at": f.detected_at
        } for f in findings]
    }

@router.get("/findings/all", response_model=List[dict])
def list_all_findings(
    severity: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    query = db.query(Finding, Host.ip_address).join(Host)
    if severity:
        query = query.filter(Finding.severity == severity)
        
    findings = query.order_by(Finding.detected_at.desc()).all()
    
    result = []
    for f, ip in findings:
        result.append({
            "id": f.id,
            "host_id": f.host_id,
            "ip_address": ip,
            "port": f.port,
            "severity": f.severity,
            "title": f.title,
            "description": f.description,
            "recommendation": f.recommendation,
            "detected_at": f.detected_at
        })
    return result

def get_highest_severity(severities: List[str]) -> str:
    if not severities:
        return "NONE"
    order = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1}
    highest = "NONE"
    highest_val = 0
    for s in severities:
        val = order.get(s, 0)
        if val > highest_val:
            highest_val = val
            highest = s
    return highest
