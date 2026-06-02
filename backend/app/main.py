from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .api import auth, scans, hosts, reports, audit

# Ensure database tables exist (already seeded, but good practice)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Network Sentinel API",
    description="Backend API for Network Security Assessment Platform",
    version="1.0.0"
)

# CORS configurations for local frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Prefix and register routers
app.include_router(auth.router, prefix="/api")
app.include_router(scans.router, prefix="/api")
app.include_router(hosts.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(audit.router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "Welcome to Network Sentinel API. Go to /docs for Swagger documentation."}
