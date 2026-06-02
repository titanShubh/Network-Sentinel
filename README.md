# Network Sentinel

Network Sentinel is a production-quality, web-based **Network Security Assessment Platform** designed for administrators and security engineers to discover hosts, audit open ports, grab service banners, evaluate security risks via a local vulnerability intelligence engine, and generate compliance reports.

---

## Technical Stack
- **Backend**: Python, FastAPI, SQLAlchemy, SQLite, `socket` & `threading` APIs.
- **Frontend**: React, Tailwind CSS v4, Recharts, Lucide Icons.
- **Reporting**: ReportLab (PDF) & Python `csv`.
- **Authentication**: JWT token-based auth.
- **Deployment**: Docker / Docker Compose.

---

## Core Features
1. **Host Discovery**: Multi-threaded host ping scanning (using OS SUID ping execution & TCP-connect ping fallbacks).
2. **Multi-threaded Port Scanner**: Concurrent TCP port validation supporting custom ports, start-end ranges, and CIDR subnets.
3. **Banner Grabbing**: Grabs service banners immediately on open TCP ports or probes web services (like extraction of `Server` headers).
4. **Vulnerability Intelligence Engine**: Analyzes and flags exposed sensitive services (e.g. exposed databases, Telnet, FTP, unauthenticated Redis instances, or outdated SSH banners).
5. **Real-time Live Progress**: Uses WebSockets to push scan progress, remaining time estimates, active hosts, and speed statistics directly to the web UI.
6. **Scan Comparison**: Compare two historical scans side-by-side to track differences, highlighting newly exposed services or successfully closed ports.
7. **Compliance Reporting**: Download detailed, formatted CSV files or publication-quality PDF executive reports.

---

## Deployment & Run Guide

### Option 1: Docker Compose (Recommended)
Simply spin up the entire application stack:
```bash
docker-compose up --build
```
- **Frontend Web UI**: Open [http://localhost](http://localhost) in your browser.
- **Backend REST Swagger API**: Accessible at [http://localhost:8081/docs](http://localhost:8081/docs).

### Option 2: Local Development Setup
To run the components individually for debugging:

#### Backend Setup
1. Change directory to `backend`:
   ```bash
   cd backend
   ```
2. Set up virtual environment and install packages:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```
3. Initialize SQLite DB tables and seed admin user:
   ```bash
   python3 -m app.seed
   ```
4. Start FastAPI server:
   ```bash
   uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```

#### Frontend Setup
1. Change directory to `frontend`:
   ```bash
   cd frontend
   ```
2. Install packages:
   ```bash
   npm install
   ```
3. Start development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) (default Vite dev server).

---

## Authentication & Default Accounts
Security controls are enforced across all scan and log APIs. The application seeds a default administrative account during setup:
- **Default Username**: `admin`
- **Default Password**: `admin123`

All api interactions are logged to the `audit_logs` table for compliance tracking.
