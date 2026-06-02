import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Host(Base):
    __tablename__ = "hosts"

    id = Column(Integer, primary_key=True, index=True)
    ip_address = Column(String, unique=True, index=True, nullable=False)
    hostname = Column(String, nullable=True)
    last_seen = Column(DateTime, default=datetime.datetime.utcnow)

    ports = relationship("Port", back_populates="host", cascade="all, delete-orphan")
    findings = relationship("Finding", back_populates="host", cascade="all, delete-orphan")

class Port(Base):
    __tablename__ = "ports"

    id = Column(Integer, primary_key=True, index=True)
    host_id = Column(Integer, ForeignKey("hosts.id", ondelete="CASCADE"), nullable=False)
    scan_id = Column(Integer, ForeignKey("scans.id", ondelete="CASCADE"), nullable=True)
    port = Column(Integer, nullable=False)
    service = Column(String, nullable=True)
    state = Column(String, default="open")  # open, closed, filtered
    banner = Column(String, nullable=True)
    detected_at = Column(DateTime, default=datetime.datetime.utcnow)

    host = relationship("Host", back_populates="ports")

class Finding(Base):
    __tablename__ = "findings"

    id = Column(Integer, primary_key=True, index=True)
    host_id = Column(Integer, ForeignKey("hosts.id", ondelete="CASCADE"), nullable=False)
    scan_id = Column(Integer, ForeignKey("scans.id", ondelete="CASCADE"), nullable=True)
    port = Column(Integer, nullable=True)  # Can be associated with a port or just general host risk
    severity = Column(String, nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    recommendation = Column(String, nullable=False)
    detected_at = Column(DateTime, default=datetime.datetime.utcnow)

    host = relationship("Host", back_populates="findings")

class Scan(Base):
    __tablename__ = "scans"

    id = Column(Integer, primary_key=True, index=True)
    target_range = Column(String, nullable=False)
    ports_scanned = Column(String, nullable=False)
    started_at = Column(DateTime, default=datetime.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    status = Column(String, default="running")  # running, completed, failed
    total_hosts_found = Column(Integer, default=0)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    action = Column(String, nullable=False)
    username = Column(String, nullable=False)
    ip_address = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
