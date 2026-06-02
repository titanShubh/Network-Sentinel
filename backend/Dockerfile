FROM python:3.12-slim

WORKDIR /app

# Install system dependencies (including iputils-ping for SUID icmp checks)
RUN apt-get update && apt-get install -y --no-install-recommends \
    iputils-ping \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Expose FastAPI server port
EXPOSE 8000

# Start script automatically seeding the db and booting uvicorn
CMD python -m app.seed && uvicorn app.main:app --host 0.0.0.0 --port 8000
