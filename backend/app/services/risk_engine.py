from typing import List, Dict

# Local Vulnerability Intelligence Knowledge Base
# Mapping service patterns/banners to risk findings
VULN_INTELLIGENCE = {
    "telnet": {
        "severity": "HIGH",
        "title": "Unencrypted Telnet Service Exposed",
        "description": "Telnet transmits passwords and data in cleartext. An attacker can sniff the network traffic to steal credentials.",
        "recommendation": "Disable the Telnet service and use SSH (Secure Shell) on port 22 instead."
    },
    "ftp": {
        "severity": "MEDIUM",
        "title": "Cleartext FTP Service Exposed",
        "description": "File Transfer Protocol (FTP) sends credentials and data without encryption, exposing them to credential theft via sniffing.",
        "recommendation": "Decommission FTP and upgrade to SFTP (SSH File Transfer Protocol) or FTPS (FTP over SSL/TLS)."
    },
    "redis": {
        "severity": "CRITICAL",
        "title": "Redis Exposed Without Authentication",
        "description": "Redis database was detected running. If exposed without a password, any remote user can read/write data, run arbitrary commands, or compromise the host.",
        "recommendation": "Configure Redis to require password authentication (requirepass) and bind only to localhost/private interfaces."
    },
    "mongodb": {
        "severity": "CRITICAL",
        "title": "MongoDB Database Service Exposed",
        "description": "MongoDB instance is publicly accessible, potentially exposing sensitive databases or permitting unauthorized access/data extortion.",
        "recommendation": "Enable authorization (auth = true) and restrict access to the MongoDB port (27017) using a firewall."
    },
    "mysql": {
        "severity": "HIGH",
        "title": "MySQL Database Port Exposed",
        "description": "MySQL database server port is accessible. Directly exposing SQL ports increases the attack surface for password brute-forcing and exploitation.",
        "recommendation": "Bind MySQL to 127.0.0.1 or configure access lists. Use VPN or SSH tunnel to connect to the database remotely."
    },
    "postgresql": {
        "severity": "HIGH",
        "title": "PostgreSQL Database Port Exposed",
        "description": "PostgreSQL database server port is accessible. Directly exposing database ports increases security risks.",
        "recommendation": "Configure pg_hba.conf to restrict access to trusted IPs only and enforce strong password authentication."
    },
    "rdp": {
        "severity": "HIGH",
        "title": "Remote Desktop Protocol (RDP) Exposed",
        "description": "RDP port (3389) is open. Remote desktop access is a high-value target for ransomware groups and brute-force attacks.",
        "recommendation": "Restrict RDP access using firewall rules, enforce multi-factor authentication (MFA), or use a VPN/Bastion host."
    },
    "vnc": {
        "severity": "HIGH",
        "title": "VNC Remote Desktop Port Exposed",
        "description": "Virtual Network Computing (VNC) is running. VNC configurations often use weak password schemes vulnerable to decryption.",
        "recommendation": "Tunnel VNC over SSH/VPN, or replace VNC with a secure remote management protocol."
    },
    "dns": {
        "severity": "LOW",
        "title": "DNS Server Exposed",
        "description": "Domain Name System (DNS) service is running on port 53. If not secured, it can be abused for DNS amplification DDoS attacks.",
        "recommendation": "Disable open recursion on public-facing DNS servers and restrict access."
    },
    "http": {
        "severity": "LOW",
        "title": "HTTP Web Service Exposed",
        "description": "Standard HTTP service is running. Data transmitted over standard HTTP is unencrypted.",
        "recommendation": "Configure SSL/TLS certificates and redirect traffic to HTTPS on port 443."
    }
}

def evaluate_risks(ip: str, port: int, service: str, banner: str) -> List[Dict[str, str]]:
    findings = []
    service_lower = service.lower()
    banner_lower = banner.lower()
    
    # Rule 1: Check known dangerous protocols in service name
    matched = False
    for vuln_key, details in VULN_INTELLIGENCE.items():
        if vuln_key in service_lower or vuln_key in banner_lower:
            findings.append({
                "severity": details["severity"],
                "title": details["title"],
                "description": f"Service: {service} on port {port}. " + details["description"],
                "recommendation": details["recommendation"]
            })
            matched = True
            
    # Rule 2: Outdated OpenSSH banner check
    if "ssh" in service_lower and "openssh" in banner_lower:
        # Check if version is old, e.g. OpenSSH 7.x or below
        import re
        version_match = re.search(r"openssh[_-]([0-9\.]+)", banner_lower)
        if version_match:
            try:
                version = float(".".join(version_match.group(1).split(".")[:2]))
                if version < 8.5:
                    findings.append({
                        "severity": "HIGH",
                        "title": "Outdated OpenSSH Server Version",
                        "description": f"The remote host is running OpenSSH version {version_match.group(1)} (Banner: {banner}). Outdated versions of OpenSSH may be vulnerable to remote exploits (e.g. CVE-2021-41617, CVE-2024-6387 RegreSSHion).",
                        "recommendation": "Upgrade to the latest OpenSSH release (>= 9.8p1)."
                    })
            except ValueError:
                pass
                
    # Rule 3: Catch-all for standard services exposed
    if not matched:
        severity = "LOW"
        # If sensitive DB or admin ports are open, assign MEDIUM/HIGH risk
        if port in [22, 443]:
            severity = "LOW" # secure remote shell or web
        elif port in [1433, 1521, 3306, 5432, 6379, 27017]:
            severity = "HIGH"
        elif port in [139, 445, 137, 138]:
            severity = "MEDIUM" # NetBIOS/SMB internal service
            
        description = f"Standard service {service} is exposed on port {port}."
        rec = "Confirm if this port needs to be reachable externally. Implement firewall rules to restrict traffic to trusted IPs only."
        
        findings.append({
            "severity": severity,
            "title": f"Exposed Port {port} ({service})",
            "description": description,
            "recommendation": rec
        })
        
    return findings
