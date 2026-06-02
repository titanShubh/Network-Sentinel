import pytest
from app.services.scanner import parse_ip_range, parse_port_range
from app.services.risk_engine import evaluate_risks
from app.core.security import get_password_hash, verify_password

def test_ip_range_parser():
    # Single IP
    assert parse_ip_range("192.168.1.1") == ["192.168.1.1"]
    
    # Comma separation
    assert parse_ip_range("192.168.1.1, 192.168.1.2") == ["192.168.1.1", "192.168.1.2"]
    
    # Subnet CIDR range
    cidr_ips = parse_ip_range("192.168.1.0/30")
    assert len(cidr_ips) == 2  # hosts are .1 and .2
    assert "192.168.1.1" in cidr_ips
    
    # Hyphenated prefix range
    hyphen_ips = parse_ip_range("192.168.1.10-15")
    assert len(hyphen_ips) == 6
    assert hyphen_ips[0] == "192.168.1.10"
    assert hyphen_ips[-1] == "192.168.1.15"

def test_port_range_parser():
    # Default list when empty
    default_ports = parse_port_range("")
    assert len(default_ports) > 0
    assert 22 in default_ports
    
    # Commas & ranges mixed
    mixed_ports = parse_port_range("22,80-82,443")
    assert mixed_ports == [22, 80, 81, 82, 443]

def test_risk_evaluation():
    # Test Redis exposed vuln intelligence
    redis_findings = evaluate_risks("127.0.0.1", 6379, "Redis", "Redis key-value store")
    assert len(redis_findings) > 0
    assert redis_findings[0]["severity"] == "CRITICAL"
    assert "Redis" in redis_findings[0]["title"]
    
    # Test Telnet high risk
    telnet_findings = evaluate_risks("127.0.0.1", 23, "Telnet", "Telnet banner")
    assert len(telnet_findings) > 0
    assert telnet_findings[0]["severity"] == "HIGH"
    
    # Standard low risk exposed port
    generic_findings = evaluate_risks("127.0.0.1", 9999, "my-custom-service", "")
    assert len(generic_findings) == 1
    assert generic_findings[0]["severity"] == "LOW"

def test_security_password_hashing():
    pwd = "my-secure-password"
    hashed = get_password_hash(pwd)
    assert verify_password(pwd, hashed) is True
    assert verify_password("wrong-password", hashed) is False
