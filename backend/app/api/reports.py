from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import csv
import io
import datetime
from typing import List

from ..database import get_db
from ..models import Host, Port, Finding, Scan, AuditLog
from .auth import get_current_user

# ReportLab libraries for PDF creation
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

router = APIRouter(prefix="/reports", tags=["reports"])

@router.get("/csv/{scan_id}")
def export_csv(
    scan_id: int,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
        
    ports = db.query(Port, Host.ip_address, Host.hostname).join(Host).filter(Port.scan_id == scan_id).all()
    findings = db.query(Finding, Host.ip_address).join(Host).filter(Finding.scan_id == scan_id).all()
    
    # Audit log entry
    audit = AuditLog(
        action=f"Exported CSV report for scan ID {scan_id}",
        username=current_user.username,
        timestamp=datetime.datetime.utcnow()
    )
    db.add(audit)
    db.commit()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Metadata headers
    writer.writerow(["Network Sentinel Security Report"])
    writer.writerow(["Scan ID", scan.id])
    writer.writerow(["Target Range", scan.target_range])
    writer.writerow(["Ports Scanned", scan.ports_scanned])
    writer.writerow(["Started At", scan.started_at])
    writer.writerow(["Completed At", scan.completed_at])
    writer.writerow([])
    
    # Write Port Inventory
    writer.writerow(["PORT INVENTORY"])
    writer.writerow(["IP Address", "Hostname", "Port", "Service", "State", "Banner"])
    for p, ip, hostname in ports:
        writer.writerow([ip, hostname or "", p.port, p.service or "", p.state, p.banner or ""])
    writer.writerow([])
    
    # Write Security Findings
    writer.writerow(["SECURITY FINDINGS"])
    writer.writerow(["IP Address", "Port", "Severity", "Title", "Description", "Recommendation"])
    for f, ip in findings:
        writer.writerow([ip, f.port or "Host-level", f.severity, f.title, f.description, f.recommendation])
        
    output.seek(0)
    
    filename = f"network_sentinel_report_{scan_id}.csv"
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8')),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/pdf/{scan_id}")
def export_pdf(
    scan_id: int,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
        
    ports = db.query(Port, Host.ip_address).join(Host).filter(Port.scan_id == scan_id).all()
    findings = db.query(Finding, Host.ip_address).join(Host).filter(Finding.scan_id == scan_id).all()
    
    # Audit log entry
    audit = AuditLog(
        action=f"Exported PDF report for scan ID {scan_id}",
        username=current_user.username,
        timestamp=datetime.datetime.utcnow()
    )
    db.add(audit)
    db.commit()
    
    buffer = io.BytesIO()
    
    # Initialize ReportLab document template
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )
    
    story = []
    styles = getSampleStyleSheet()
    
    # Custom Palette Styling
    primary_color = colors.HexColor("#0f172a") # Slate 900
    accent_color = colors.HexColor("#3b82f6") # Blue 500
    text_color = colors.HexColor("#1e293b")
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=primary_color,
        spaceAfter=15
    )
    
    h2_style = ParagraphStyle(
        'DocH2',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=primary_color,
        spaceBefore=15,
        spaceAfter=8
    )
    
    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['BodyText'],
        fontSize=10,
        textColor=text_color,
        spaceAfter=5
    )
    
    # Title Section
    story.append(Paragraph("Network Sentinel Security Report", title_style))
    story.append(Paragraph(f"Generated on {datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}", body_style))
    story.append(Spacer(1, 10))
    
    # Executive Summary Section
    story.append(Paragraph("Executive Summary", h2_style))
    summary_text = (
        f"A network scan was initiated on target range <b>{scan.target_range}</b>. "
        f"The scan target ports were <b>{scan.ports_scanned}</b>.<br/>"
        f"Scan started at {scan.started_at.strftime('%Y-%m-%d %H:%M:%S')} and completed at "
        f"{scan.completed_at.strftime('%Y-%m-%d %H:%M:%S') if scan.completed_at else 'N/A'}.<br/>"
        f"Total active hosts discovered: <b>{scan.total_hosts_found}</b>.<br/>"
        f"Total vulnerability findings: <b>{len(findings)}</b>."
    )
    story.append(Paragraph(summary_text, body_style))
    story.append(Spacer(1, 10))
    
    # Severity Breakdown Metrics
    sev_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
    for f, _ in findings:
        sev_counts[f.severity] = sev_counts.get(f.severity, 0) + 1
        
    story.append(Paragraph("Risk Breakdown", h2_style))
    metrics_data = [
        [Paragraph(f"<b>{k}</b>", body_style) for k in sev_counts.keys()],
        [Paragraph(str(v), body_style) for v in sev_counts.values()]
    ]
    metrics_table = Table(metrics_data, colWidths=[1.5*inch]*4)
    metrics_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f1f5f9")),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(metrics_table)
    story.append(Spacer(1, 15))
    
    # Open Ports Table
    story.append(Paragraph("Service & Port Inventory", h2_style))
    port_header = [Paragraph("<b>Host IP</b>", body_style), Paragraph("<b>Port</b>", body_style), Paragraph("<b>Service</b>", body_style), Paragraph("<b>State</b>", body_style), Paragraph("<b>Banner</b>", body_style)]
    port_table_data = [port_header]
    
    for p, ip in ports[:50]: # Cap first 50 entries to keep document length reasonable
        banner_trunc = (p.banner[:25] + "...") if p.banner and len(p.banner) > 25 else (p.banner or "")
        port_table_data.append([
            Paragraph(ip, body_style),
            Paragraph(str(p.port), body_style),
            Paragraph(p.service or "Unknown", body_style),
            Paragraph(p.state, body_style),
            Paragraph(banner_trunc, body_style)
        ])
        
    if len(ports) > 50:
        port_table_data.append([Paragraph(f"<i>... and {len(ports)-50} more open ports</i>", body_style), "", "", "", ""])
        
    port_table = Table(port_table_data, colWidths=[1.5*inch, 0.8*inch, 1.2*inch, 1.0*inch, 2.5*inch])
    port_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f8fafc")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('TOPPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(port_table)
    story.append(Spacer(1, 15))
    
    # Security Findings
    story.append(Paragraph("Detailed Security Findings", h2_style))
    if not findings:
        story.append(Paragraph("No security findings discovered.", body_style))
    else:
        for f, ip in findings:
            sev_colors = {
                "CRITICAL": colors.HexColor("#ef4444"), # Red
                "HIGH": colors.HexColor("#f97316"),     # Orange
                "MEDIUM": colors.HexColor("#eab308"),   # Yellow
                "LOW": colors.HexColor("#3b82f6")       # Blue
            }
            color_banner = sev_colors.get(f.severity, colors.gray)
            
            finding_header = [
                Paragraph(f"<b>{f.title}</b>", body_style),
                Paragraph(f"<b>Severity: {f.severity}</b>", ParagraphStyle('SevText', parent=body_style, textColor=color_banner))
            ]
            finding_body = [
                Paragraph(f"<b>Host IP:</b> {ip} | <b>Port:</b> {f.port or 'Host-level'}<br/><b>Description:</b> {f.description}<br/><b>Recommendation:</b> {f.recommendation}", body_style)
            ]
            
            finding_table_data = [
                finding_header,
                [finding_body, ""]
            ]
            
            finding_table = Table(finding_table_data, colWidths=[4.5*inch, 2.5*inch])
            finding_table.setStyle(TableStyle([
                ('SPAN', (0,1), (1,1)),
                ('BOX', (0,0), (-1,-1), 1, color_banner),
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f8fafc")),
                ('LINEBELOW', (0,0), (-1,0), 0.5, colors.HexColor("#e2e8f0")),
                ('PADDING', (0,0), (-1,-1), 6),
            ]))
            story.append(finding_table)
            story.append(Spacer(1, 10))
            
    doc.build(story)
    buffer.seek(0)
    
    filename = f"network_sentinel_report_{scan_id}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
