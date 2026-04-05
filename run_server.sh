#!/usr/bin/env bash

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_FILE="$PROJECT_DIR/server.log"
ENV_FILE="$PROJECT_DIR/.env"
POLL_INTERVAL=60

# --- OCI CONFIGURATION ---
DB_ID="ocid1.mysqldbsystem.oc1.ap-mumbai-1.aaaaaaaamem6wuqpr44jilla6ehjvkwlzjuqi6c5p3ltyphhehnt6kri2goq"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

BACKEND_PID=""

log() {
    echo -e "$(date '+%Y-%m-%d %H:%M:%S') $1" | tee -a "$LOG_FILE"
}

# --- NEW: ENV PARSER ---
get_env_var() {
    if [ -f "$ENV_FILE" ]; then
        # Looks for the key, removes 'key=', and strips any surrounding quotes
        grep "^$1=" "$ENV_FILE" | cut -d'=' -f2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"
    else
        echo ""
    fi
}

# Load DB info from .env
DB_IP=$(get_env_var "MYSQL_HOST")
DB_PORT=$(get_env_var "MYSQL_PORT")

# Default values if .env is missing or keys are empty
DB_PORT=${DB_PORT:-3306}

# --- DB MONITORING FUNCTIONS ---

check_db_status() {
    # 1. Check Lifecycle State via OCI CLI
    STATE=$(oci mysql db-system get --db-system-id "$DB_ID" --query "data.\"lifecycle-state\"" --raw-output 2>/dev/null)
    
    if [[ "$STATE" == "INACTIVE" || "$STATE" == "STOPPED" ]]; then
        log "${RED}DB is STOPPED. Sending OCI start command...${NC}"
        oci mysql db-system start --db-system-id "$DB_ID" > /dev/null
        return 1
    elif [[ "$STATE" != "UP" && "$STATE" != "ACTIVE" ]]; then
        log "${YELLOW}DB is currently $STATE. Waiting for ACTIVE status...${NC}"
        return 1
    fi

    # 2. Check Network Connectivity using .env values
    if ! nc -z -w 5 "$DB_IP" "$DB_PORT" 2>/dev/null; then
        log "${YELLOW}OCI says DB is ACTIVE, but $DB_IP:$DB_PORT is unreachable. Waiting...${NC}"
        return 1
    fi

    return 0 
}

wait_for_db() {
    if [ -z "$DB_IP" ]; then
        log "${RED}Error: MYSQL_HOST not found in .env file!${NC}"
        exit 1
    fi

    log "${YELLOW}Verifying Database availability at $DB_IP...${NC}"
    until check_db_status; do
        sleep 30
    done
    log "${GREEN}Database is online and reachable.${NC}"
}

# --- SERVER LOGIC ---

start_server() {
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

    log "${YELLOW}[4/4] Starting FastAPI server on port 8080...${NC}"
    cd "$PROJECT_DIR"
    uvicorn backend.main:app --host 0.0.0.0 --port 8080 --proxy-headers --forwarded-allow-ips='*' &
    BACKEND_PID=$!
    
    sleep 2
    if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
        log "${RED}FastAPI failed to start. Review server.log for Python tracebacks.${NC}"
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
    pkill -f "uvicorn" 2>/dev/null || true
    
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
    [ "$LOCAL" != "$REMOTE" ]
}

# --- Main ---
log "${GREEN}=== Splitwise Manager — VM Server ===${NC}"

start_server

log "${GREEN}Polling for git updates and DB health every ${POLL_INTERVAL}s...${NC}"
while true; do
    # 1. Health Check
    if [ -z "$BACKEND_PID" ] || ! kill -0 "$BACKEND_PID" 2>/dev/null; then
        log "${RED}App process not found. Attempting restart...${NC}"
        stop_server
        start_server
    fi

    # 2. Update Check
    if check_for_updates; then
        log "${YELLOW}New commits detected. Updating...${NC}"
        cd "$PROJECT_DIR"
        git pull origin
        stop_server
        start_server
    fi

    sleep "$POLL_INTERVAL"
done
