#!/usr/bin/env bash
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_FILE="$PROJECT_DIR/server.log"
POLL_INTERVAL=60

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

BACKEND_PID=""
FRONTEND_PID=""

log() {
    echo -e "$(date '+%Y-%m-%d %H:%M:%S') $1" | tee -a "$LOG_FILE"
}

start_server() {
    log "${YELLOW}[1/4] Setting up Python virtual environment...${NC}"
    if [ ! -d "$PROJECT_DIR/venv" ]; then
        python3 -m venv "$PROJECT_DIR/venv"
    fi
    source "$PROJECT_DIR/venv/bin/activate"

    log "${YELLOW}[2/4] Installing backend dependencies...${NC}"
    pip install -q -r "$PROJECT_DIR/backend/requirements.txt"

    log "${YELLOW}[3/4] Starting FastAPI backend (uvicorn) on port 8080...${NC}"
    cd "$PROJECT_DIR"
    uvicorn backend.main:app --host 0.0.0.0 --port 8080 &
    BACKEND_PID=$!

    log "${YELLOW}[4/4] Installing frontend dependencies & building...${NC}"
    cd "$PROJECT_DIR/frontend"
    npm install --silent
    npm run build

    log "${GREEN}Serving frontend on port 5173...${NC}"
    npx serve -s dist -l 5173 &
    FRONTEND_PID=$!

    log "${GREEN}============================================${NC}"
    log "${GREEN}  Backend  → http://localhost:8080${NC}"
    log "${GREEN}  Frontend → http://localhost:5173${NC}"
    log "${GREEN}============================================${NC}"
}

stop_server() {
    log "${YELLOW}Stopping running servers...${NC}"
    if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
        kill "$BACKEND_PID" 2>/dev/null || true
        wait "$BACKEND_PID" 2>/dev/null || true
    fi
    if [ -n "$FRONTEND_PID" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
        kill "$FRONTEND_PID" 2>/dev/null || true
        wait "$FRONTEND_PID" 2>/dev/null || true
    fi
    deactivate 2>/dev/null || true
    BACKEND_PID=""
    FRONTEND_PID=""
}

cleanup() {
    log "\n${RED}Shutting down (signal received)...${NC}"
    stop_server
    exit 0
}
trap cleanup EXIT INT TERM

check_for_updates() {
    cd "$PROJECT_DIR"
    git fetch origin 2>/dev/null
    LOCAL=$(git rev-parse HEAD)
    REMOTE=$(git rev-parse @{u})
    if [ "$LOCAL" != "$REMOTE" ]; then
        return 0  # updates available
    fi
    return 1  # up to date
}

# --- Main ---
log "${GREEN}=== Splitwise Manager — VM Server ===${NC}"

start_server

log "${GREEN}Polling for git updates every ${POLL_INTERVAL}s...${NC}"
while true; do
    sleep "$POLL_INTERVAL"

    if check_for_updates; then
        log "${YELLOW}New commits detected. Pulling latest code...${NC}"
        cd "$PROJECT_DIR"
        git pull origin

        stop_server
        start_server

        log "${GREEN}Server restarted with latest code.${NC}"
    fi
done
