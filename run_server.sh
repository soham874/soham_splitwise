#!/usr/bin/env bash
# set -e removed to allow the loop to continue even if a command fails during DB downtime

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_FILE="$PROJECT_DIR/server.log"
POLL_INTERVAL=60

# --- OCI CONFIGURATION ---
DB_ID="ocid1.mysqldbsystem.oc1.ap-mumbai-1.aaaaaaaamem6wuqpr44jilla6ehjvkwlzjuqi6c5p3ltyphhehnt6kri2goq"
DB_IP="10.0.x.x" # <--- REPLACE WITH YOUR PRIVATE DB IP
DB_PORT=3306

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

BACKEND_PID=""

log() {
    echo -e "$(date '+%Y-%m-%d %H:%M:%S') $1" | tee -a "$LOG_FILE"
}

# --- NEW: DB MONITORING FUNCTIONS ---

check_db_status() {
    # 1. Check Lifecycle State via OCI CLI
    STATE=$(oci mysql db-system get --db-system-id "$DB_ID" --query "data.\"lifecycle-state\"" --raw-output 2>/dev/null)
    
    if [[ "$STATE" == "INACTIVE" || "$STATE" == "STOPPED" ]]; then
        log "${RED}DB is STOPPED. Sending start command...${NC}"
        oci mysql db-system start --db-system-id "$DB_ID" > /dev/null
        return 1
    elif [[ "$STATE" != "UP" && "$STATE" != "ACTIVE" ]]; then
        log "${YELLOW}DB is in state: $STATE. Waiting for it to become ACTIVE...${NC}"
        return 1
    fi

    # 2. Check Network Connectivity (Port 3306)
    if ! nc -z -w 5 "$DB_IP" "$DB_PORT" 2>/dev/null; then
        log "${YELLOW}DB state is ACTIVE but port $DB_PORT is closed (Maintenance finishing?).${NC}"
        return 1
    fi

    return 0 # DB is fully ready
}

wait_for_db() {
    log "${YELLOW}Verifying Database availability...${NC}"
    until check_db_status; do
        sleep 30
    done
    log "${GREEN}Database is online and reachable.${NC}"
}

# --- MODIFIED SERVER LOGIC ---

start_server() {
    # Ensure DB is up BEFORE starting Python/Uvicorn
    wait_for_db

    log "${YELLOW}[1/4] Setting up Python virtual environment...${NC}"
    if [ ! -d "$PROJECT_DIR/venv" ]; then
        python3 -m venv "$PROJECT_DIR/venv"
    fi
    source "$PROJECT_DIR/venv/bin/activate"

    log "${YELLOW}[2/4] Installing backend dependencies...${NC}"
    pip install -q -r "$PROJECT_DIR/backend/requirements.txt"

    log "${YELLOW}[3/4] Installing frontend dependencies & building PWA...${NC}"
    cd "$PROJECT_DIR/frontend"
    npm install --silent
    npm run build

    log "${YELLOW}[4/4] Starting FastAPI server on port 8080 (API + PWA)...${NC}"
    cd "$PROJECT_DIR"
    # Added 'nohup' or ensure it runs in background correctly for the loop
    uvicorn backend.main:app --host 0.0.0.0 --port 8080 --proxy-headers --forwarded-allow-ips='*' &
    BACKEND_PID=$!
    
    # Give it a second to see if it immediately crashes due to DB
    sleep 2
    if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
        log "${RED}FastAPI failed to start. Check if DB connection string is correct.${NC}"
    fi

    log "${GREEN}============================================${NC}"
    log "${GREEN}  App Running → http://localhost:8080${NC}"
    log "${GREEN}============================================${NC}"
}

stop_server() {
    log "${YELLOW}Stopping running server...${NC}"
    if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
        kill "$BACKEND_PID" 2>/dev/null || true
        wait "$BACKEND_PID" 2>/dev/null || true
    fi
    # Also kill any stray uvicorn processes just in case
    pkill -f "uvicorn" 2>/dev/null || true
    
    # Deactivate only if in a venv
    if [[ "$VIRTUAL_ENV" != "" ]]; then
        deactivate 2>/dev/null || true
    fi
    BACKEND_PID=""
}

cleanup() {
    log "\n${RED}Shutting down (signal received)...${NC}"
    stop_server
    exit 0
}
trap cleanup EXIT INT TERM

check_for_updates() {
    cd "$PROJECT_DIR"
    git fetch origin 2>/dev/null || return 1
    LOCAL=$(git rev-parse HEAD)
    REMOTE=$(git rev-parse @{u})
    if [ "$LOCAL" != "$REMOTE" ]; then
        return 0  # updates available
    fi
    return 1  # up to date
}

# --- Main ---
log "${GREEN}=== Splitwise Manager — VM Server ===${NC}"

# Initial start
start_server

log "${GREEN}Polling for git updates and DB health every ${POLL_INTERVAL}s...${NC}"
while true; do
    # 1. Vitality Check: Is the app still running?
    if [ -z "$BACKEND_PID" ] || ! kill -0 "$BACKEND_PID" 2>/dev/null; then
        log "${RED}App is down! Attempting recovery...${NC}"
        stop_server
        start_server
    fi

    # 2. Update Check
    if check_for_updates; then
        log "${YELLOW}New commits detected. Pulling latest code...${NC}"
        cd "$PROJECT_DIR"
        git pull origin
        stop_server
        start_server
        log "${GREEN}Server restarted with latest code.${NC}"
    fi

    sleep "$POLL_INTERVAL"
done
