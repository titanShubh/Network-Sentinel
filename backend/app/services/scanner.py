import socket
import subprocess
import re
import ipaddress
import threading
import time
import datetime
from typing import List, Dict, Callable, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
from sqlalchemy.orm import Session
from ..database import SessionLocal
from ..models import Host, Port, Scan, Finding, AuditLog
from .risk_engine import evaluate_risks

COMMON_SERVICES = {
    21: "FTP",
    22: "SSH",
    23: "Telnet",
    25: "SMTP",
    53: "DNS",
    80: "HTTP",
    110: "POP3",
    139: "NetBIOS",
    143: "IMAP",
    443: "HTTPS",
    445: "SMB",
    1433: "MSSQL",
    1521: "Oracle",
    3306: "MySQL",
    3389: "RDP",
    5432: "PostgreSQL",
    5900: "VNC",
    6379: "Redis",
    2121: "FTP",
    2221: "FTP",
    8080: "HTTP",
    8888: "HTTP",
    27017: "MongoDB"
}

# In-memory store for real-time progress
# format: { scan_id: { "progress": float, "status": str, "current_host": str, "current_port_range": str, "estimated_completion": str, "hosts_found": int } }
active_scans_progress: Dict[int, Dict] = {}
progress_lock = threading.Lock()

def parse_ip_range(target: str) -> List[str]:
    targets = [t.strip() for t in target.split(",") if t.strip()]
    ips = []
    for t in targets:
        if "/" in t:
            try:
                network = ipaddress.ip_network(t, strict=False)
                if network.num_addresses > 2:
                    ips.extend([str(ip) for ip in network.hosts()])
                else:
                    ips.extend([str(ip) for ip in network])
            except ValueError:
                pass
        elif "-" in t:
            match = re.match(r"^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})-(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$", t)
            if match:
                start_ip_str, end_ip_str = match.groups()
                try:
                    start_ip = ipaddress.ip_address(start_ip_str)
                    end_ip = ipaddress.ip_address(end_ip_str)
                    if start_ip <= end_ip:
                        curr = start_ip
                        while curr <= end_ip:
                            ips.append(str(curr))
                            curr += 1
                except ValueError:
                    pass
            else:
                parts = t.split("-")
                if len(parts) == 2:
                    prefix_match = re.match(r"^(\d+\.\d+\.\d+\.)(\d+)$", parts[0].strip())
                    suffix_match = re.match(r"^(\d+)$", parts[1].strip())
                    if prefix_match and suffix_match:
                        prefix = prefix_match.group(1)
                        start_val = int(prefix_match.group(2))
                        end_val = int(suffix_match.group(1))
                        if start_val <= end_val:
                            for val in range(start_val, end_val + 1):
                                ips.append(f"{prefix}{val}")
        else:
            try:
                ip = ipaddress.ip_address(t)
                ips.append(str(ip))
            except ValueError:
                pass
    seen = set()
    return [x for x in ips if not (x in seen or seen.add(x))]

def parse_port_range(ports_str: str) -> List[int]:
    ports = []
    if not ports_str or ports_str.strip() == "":
        return list(COMMON_SERVICES.keys())
    
    parts = [p.strip() for p in ports_str.split(",") if p.strip()]
    for part in parts:
        if "-" in part:
            subparts = part.split("-")
            if len(subparts) == 2:
                try:
                    start_port = int(subparts[0])
                    end_port = int(subparts[1])
                    if 0 <= start_port <= 65535 and 0 <= end_port <= 65535 and start_port <= end_port:
                        ports.extend(list(range(start_port, end_port + 1)))
                except ValueError:
                    pass
        else:
            try:
                p_val = int(part)
                if 0 <= p_val <= 65535:
                    ports.append(p_val)
            except ValueError:
                pass
    return sorted(list(set(ports)))

def ping_host(ip: str, timeout: float = 1.0) -> bool:
    """Check if host is up using system ping utility."""
    try:
        # Standard ping arguments depending on OS
        # -c 1: send 1 packet. -W 1 (or -W 1000 on macOS): wait 1s.
        param = '-W' if subprocess.os.name == 'posix' and 'darwin' in subprocess.sys.platform else '-w'
        # Wait timeout value (Mac is milliseconds in -W, Linux is seconds in -w)
        timeout_val = str(int(timeout * 1000)) if param == '-W' else str(int(timeout))
        
        command = ['ping', '-c', '1', param, timeout_val, ip]
        # Hide output
        res = subprocess.run(command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if res.returncode == 0:
            return True
    except Exception:
        pass
    
    # TCP Ping fallback on common ports
    fallback_ports = [22, 80, 443, 3389, 445]
    for port in fallback_ports:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(0.5)
                if s.connect_ex((ip, port)) == 0:
                    return True
        except Exception:
            pass
            
    return False

def resolve_hostname(ip: str) -> Optional[str]:
    try:
        hostname, _, _ = socket.gethostbyaddr(ip)
        return hostname
    except Exception:
        return None

def grab_banner(ip: str, port: int, timeout: float = 1.5) -> str:
    banner = ""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(timeout)
            s.connect((ip, port))
            # Read greeting banner if protocol sends it immediately
            try:
                data = s.recv(1024)
                if data:
                    banner = data.decode('utf-8', errors='ignore').strip()
                    return banner
            except socket.timeout:
                pass
            
            # HTTP probe
            if port in [80, 443, 8080, 8000]:
                s.sendall(b"GET / HTTP/1.0\r\n\r\n")
                try:
                    data = s.recv(1024)
                    if data:
                        response = data.decode('utf-8', errors='ignore')
                        for line in response.split('\r\n'):
                            if line.lower().startswith('server:'):
                                banner = line[7:].strip()
                                return banner
                        banner = response.split('\r\n')[0]
                        return banner
                except Exception:
                    pass
            else:
                # Send simple probe to elicit server banner response
                try:
                    s.sendall(b"\r\n")
                    data = s.recv(1024)
                    if data:
                        banner = data.decode('utf-8', errors='ignore').strip()
                        return banner
                except Exception:
                    pass
    except Exception:
        pass
    return banner

def detect_service(port: int, banner: str) -> str:
    banner_lower = banner.lower()
    if "ssh" in banner_lower:
        return "SSH"
    if "http" in banner_lower or "apache" in banner_lower or "nginx" in banner_lower:
        return "HTTP"
    if "ftp" in banner_lower or "vsftpd" in banner_lower:
        return "FTP"
    if "redis" in banner_lower:
        return "Redis"
    if "mysql" in banner_lower:
        return "MySQL"
    if "postgresql" in banner_lower:
        return "PostgreSQL"
    
    return COMMON_SERVICES.get(port, "Unknown")

class NetworkScanner:
    def __init__(self, scan_id: int, target_range: str, ports_str: str, thread_count: int = 50):
        self.scan_id = scan_id
        self.target_range = target_range
        self.ports_str = ports_str
        self.thread_count = thread_count
        self.db = SessionLocal()
        
    def update_progress(self, progress: float, current_host: str = "", current_port_range: str = "", status: str = "running", hosts_found: int = 0, elapsed_sec: float = 0):
        with progress_lock:
            # Estimate completion time
            est_comp = "Calculating..."
            if elapsed_sec > 0 and progress > 0:
                total_time = elapsed_sec / (progress / 100)
                remaining_time = total_time - elapsed_sec
                est_comp = f"{int(remaining_time)}s remaining" if remaining_time > 0 else "0s"
            
            active_scans_progress[self.scan_id] = {
                "progress": round(progress, 1),
                "status": status,
                "current_host": current_host,
                "current_port_range": current_port_range,
                "estimated_completion": est_comp,
                "hosts_found": hosts_found
            }

    def scan_port_task(self, host_ip: str, port: int) -> dict:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(1.0)
                res = s.connect_ex((host_ip, port))
                if res == 0:
                    banner = grab_banner(host_ip, port)
                    service = detect_service(port, banner)
                    return {
                        "port": port,
                        "state": "open",
                        "service": service,
                        "banner": banner
                    }
                elif res in [111, 61, 10061]: # Connection refused codes
                    return {
                        "port": port,
                        "state": "closed",
                        "service": COMMON_SERVICES.get(port, "Unknown"),
                        "banner": ""
                    }
                else: # Timeout or filtered
                    return {
                        "port": port,
                        "state": "filtered",
                        "service": COMMON_SERVICES.get(port, "Unknown"),
                        "banner": ""
                    }
        except Exception:
            return {
                "port": port,
                "state": "filtered",
                "service": COMMON_SERVICES.get(port, "Unknown"),
                "banner": ""
            }

    def execute(self):
        start_time = time.time()
        print(f"Starting Scan #{self.scan_id} targets: {self.target_range}")
        
        try:
            self.update_progress(0, status="parsing", current_host="Parsing targets...")
            ips = parse_ip_range(self.target_range)
            ports = parse_port_range(self.ports_str)
            
            if not ips:
                raise ValueError("No valid IP addresses parsed from range.")
            
            # Step 1: Host Discovery
            self.update_progress(5, status="host_discovery", current_host=f"Scanning {len(ips)} IPs for active hosts...")
            
            active_hosts = []
            with ThreadPoolExecutor(max_workers=self.thread_count) as executor:
                future_to_ip = {executor.submit(ping_host, ip): ip for ip in ips}
                
                completed_count = 0
                for future in as_completed(future_to_ip):
                    ip = future_to_ip[future]
                    completed_count += 1
                    try:
                        is_up = future.result()
                        if is_up:
                            active_hosts.append(ip)
                    except Exception:
                        pass
                    
                    disc_prog = 5 + (completed_count / len(ips)) * 15 # 5% to 20% range
                    elapsed = time.time() - start_time
                    self.update_progress(disc_prog, current_host=ip, status="host_discovery", hosts_found=len(active_hosts), elapsed_sec=elapsed)
            
            if not active_hosts:
                # Mark scan completed with 0 hosts
                self.complete_scan(0, start_time)
                return
            
            # Step 2: Resolve hostname & Add to DB
            self.update_progress(20, status="resolving_names", current_host=f"Resolving {len(active_hosts)} hostnames...")
            
            host_db_ids = {}
            for ip in active_hosts:
                hostname = resolve_hostname(ip)
                # Save or update host in db
                host = self.db.query(Host).filter(Host.ip_address == ip).first()
                if not host:
                    host = Host(ip_address=ip, hostname=hostname, last_seen=datetime.datetime.utcnow())
                    self.db.add(host)
                else:
                    host.hostname = hostname
                    host.last_seen = datetime.datetime.utcnow()
                self.db.commit()
                self.db.refresh(host)
                host_db_ids[ip] = host.id
                
            # Step 3: Multi-threaded Port Scan
            self.update_progress(25, status="port_scanning", current_host="Starting port scan...")
            
            total_tasks = len(active_hosts) * len(ports)
            tasks_done = 0
            
            # We want to clear old port/findings results for these hosts to record clean scan results, 
            # but wait, do we keep history of ports?
            # Standard requirement says: Store host information, open ports, findings.
            # To detect newly exposed ports, we can compare ports in the DB for the scan history.
            # Let's write the port status to the Ports table, and keep them updated, but how do we trace historical scans?
            # To support comparing scans, we should associate scans with ports/findings, or keep standard tables.
            # Let's look at the database schema requested:
            # Hosts (id, ip_address, hostname, last_seen)
            # Ports (id, host_id, port, service, state) -> Wait! If Ports doesn't have scan_id, how do we compare scans?
            # Oh! Maybe we should store scan results or add `scan_id` to Ports and Findings to allow comparison!
            # Wait, the user schema:
            # Ports: id, host_id, port, service, state
            # Findings: id, host_id, severity, title, description, recommendation
            # Scans: id, started_at, completed_at, status
            # If the database schema has a Scans table but Ports/Findings do not have scan_id, how do we check history?
            # Wait, can we add `scan_id` to Ports and Findings (or create a ScanResult mapping table, or simply add a scan_id column)?
            # Yes! Adding `scan_id` column to Ports and Findings is the cleanest way to support historical scans and comparisons.
            # Let's double check if we can add a scan_id column to Ports and Findings.
            # Yes! "The user schema: ... " we can add `scan_id` to `Ports` and `Findings` tables to associate each scanned port/finding with a specific scan.
            # Let's inspect if `models.py` already includes `scan_id`. Ah, `models.py` doesn't have it yet. Let's make sure we support it or add it!
            # Wait, let's write the scanner execution first. We can add scan_id to models. Let's edit `models.py` later if needed, or we can just add the column now in our minds. In `models.py` I created:
            # Host: ports, findings
            # Port: host_id, port, service, state, banner, detected_at (and let's add scan_id!)
            # Finding: host_id, port, severity, title, description, recommendation, detected_at (and let's add scan_id!)
            # Adding `scan_id` to `Port` and `Finding` makes scan comparisons trivial! I will modify `models.py` to add `scan_id` column to Port and Finding models!

            # Let's continue scanning logic:
            results = []
            with ThreadPoolExecutor(max_workers=self.thread_count) as executor:
                future_to_task = {}
                for ip in active_hosts:
                    for port in ports:
                        t = executor.submit(self.scan_port_task, ip, port)
                        future_to_task[t] = (ip, port)
                        
                for future in as_completed(future_to_task):
                    ip, port = future_to_task[future]
                    tasks_done += 1
                    try:
                        res = future.result()
                        res["ip"] = ip
                        res["host_id"] = host_db_ids[ip]
                        results.append(res)
                    except Exception:
                        pass
                    
                    scan_prog = 25 + (tasks_done / total_tasks) * 65 # 25% to 90% range
                    elapsed = time.time() - start_time
                    self.update_progress(scan_prog, current_host=ip, current_port_range=f"Port {port}", status="port_scanning", hosts_found=len(active_hosts), elapsed_sec=elapsed)
            
            # Step 4: Save Port states & Evaluate Risks
            self.update_progress(90, status="risk_evaluation", current_host="Evaluating security risks...")
            
            for res in results:
                # Insert or update Port state for this host/scan
                # Add scan_id column to keep track of this specific scan's findings
                db_port = Port(
                    host_id=res["host_id"],
                    port=res["port"],
                    service=res["service"],
                    state=res["state"],
                    banner=res["banner"],
                    scan_id=self.scan_id # We will add scan_id to models!
                )
                self.db.add(db_port)
                self.db.commit()
                self.db.refresh(db_port)
                
                # If port is open, run the risk engine!
                if res["state"] == "open":
                    findings = evaluate_risks(res["ip"], res["port"], res["service"], res["banner"])
                    for f in findings:
                        db_finding = Finding(
                            host_id=res["host_id"],
                            port=res["port"],
                            severity=f["severity"],
                            title=f["title"],
                            description=f["description"],
                            recommendation=f["recommendation"],
                            scan_id=self.scan_id # We will add scan_id to models!
                        )
                        self.db.add(db_finding)
            self.db.commit()
            
            # Step 5: Complete scan
            self.complete_scan(len(active_hosts), start_time)
            
        except Exception as e:
            print(f"Error in scan {self.scan_id}: {e}")
            self.update_progress(100, status="failed", current_host=f"Scan failed: {str(e)}")
            scan = self.db.query(Scan).filter(Scan.id == self.scan_id).first()
            if scan:
                scan.status = "failed"
                scan.completed_at = datetime.datetime.utcnow()
                self.db.commit()
        finally:
            self.db.close()

    def complete_scan(self, hosts_found: int, start_time: float):
        elapsed = time.time() - start_time
        print(f"Completing Scan #{self.scan_id}. Found {hosts_found} hosts in {elapsed:.2f}s")
        
        self.update_progress(100, status="completed", current_host="Scan completed.", hosts_found=hosts_found)
        
        scan = self.db.query(Scan).filter(Scan.id == self.scan_id).first()
        if scan:
            scan.status = "completed"
            scan.completed_at = datetime.datetime.utcnow()
            scan.total_hosts_found = hosts_found
            self.db.commit()
            
        # Log audit trail
        audit = AuditLog(
            action=f"Completed scan ID {self.scan_id} on range {self.target_range}. Found {hosts_found} hosts.",
            username="system",
            timestamp=datetime.datetime.utcnow()
        )
        self.db.add(audit)
        self.db.commit()
