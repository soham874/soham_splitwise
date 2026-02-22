#!/usr/bin/env bash
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Splitwise Manager — Local Dev Setup ===${NC}"

# ---------- Backend ----------
echo -e "\n${YELLOW}[1/4] Setting up Python virtual environment...${NC}"
if [ ! -d "$PROJECT_DIR/venv" ]; then
    python3 -m venv "$PROJECT_DIR/venv"
fi
source "$PROJECT_DIR/venv/bin/activate"

echo -e "${YELLOW}[2/4] Installing backend dependencies...${NC}"
pip install -q -r "$PROJECT_DIR/backend/requirements.txt"

echo -e "${YELLOW}[3/4] Starting FastAPI backend (uvicorn) on port 8080...${NC}"
cd "$PROJECT_DIR"
uvicorn backend.main:app --host 0.0.0.0 --port 8080 --reload &
BACKEND_PID=$!

# ---------- Frontend ----------
echo -e "${YELLOW}[4/4] Installing frontend dependencies & starting Vite dev server...${NC}"
cd "$PROJECT_DIR/frontend"
npm install --silent
npm run dev &
FRONTEND_PID=$!

# ---------- Cleanup on exit ----------
cleanup() {
    echo -e "\n${GREEN}Shutting down...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    deactivate 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo -e "\n${GREEN}============================================${NC}"
echo -e "${GREEN}  Backend  → http://localhost:8080${NC}"
echo -e "${GREEN}  Frontend → http://localhost:5173${NC}"
echo -e "${GREEN}============================================${NC}"
echo -e "Press Ctrl+C to stop both servers.\n"

# Wait for both background processes
wait
