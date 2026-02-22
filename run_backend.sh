#!/usr/bin/env bash
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Splitwise Manager — Backend Only ===${NC}"

# ---------- Virtual environment ----------
echo -e "\n${YELLOW}[1/3] Setting up Python virtual environment...${NC}"
if [ ! -d "$PROJECT_DIR/venv" ]; then
    python3 -m venv "$PROJECT_DIR/venv"
fi
source "$PROJECT_DIR/venv/bin/activate"

# ---------- Dependencies ----------
echo -e "${YELLOW}[2/3] Installing backend dependencies...${NC}"
pip install -q -r "$PROJECT_DIR/backend/requirements.txt"

# ---------- Start backend ----------
echo -e "${YELLOW}[3/3] Starting FastAPI backend (uvicorn) on port 8080...${NC}"
echo -e "\n${GREEN}  Backend → http://localhost:8080${NC}"
echo -e "Press Ctrl+C to stop.\n"

cd "$PROJECT_DIR"
uvicorn backend.main:app --host 0.0.0.0 --port 8080 --reload
