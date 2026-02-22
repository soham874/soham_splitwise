# Splitwise Manager

A full-stack Splitwise expense management app with a **React** frontend and **FastAPI** backend.

## Project Structure

```
.
├── .env                    # Secrets & config (not committed)
├── .env.example            # Template for .env
├── run.sh                  # One-command local dev launcher
├── backend/
│   ├── main.py             # FastAPI app entry point (uvicorn)
│   ├── config.py           # Settings loaded from .env
│   ├── constants.py        # Splitwise API URLs, session keys
│   ├── dependencies.py     # Shared OAuth session builder
│   ├── requirements.txt    # Python dependencies
│   ├── controllers/        # Route handlers (one per domain)
│   │   ├── auth_controller.py
│   │   ├── groups_controller.py
│   │   ├── expenses_controller.py
│   │   ├── currencies_controller.py
│   │   └── trip_controller.py
│   └── services/           # Business logic
│       ├── auth_service.py
│       └── splitwise_service.py
└── frontend/
    ├── package.json
    ├── vite.config.js       # Dev proxy to backend
    ├── tailwind.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx          # Root component & page routing
        ├── api.js           # All fetch calls to backend
        ├── index.css        # Tailwind + custom styles
        └── components/
            ├── Navbar.jsx
            ├── LoadingOverlay.jsx
            ├── TripSetupPage.jsx
            ├── TripSummaryPage.jsx
            ├── GroupsPage.jsx
            ├── DashboardPage.jsx
            ├── ExpenseForm.jsx
            ├── BalancesPanel.jsx
            └── ExpenseHistory.jsx
```

## Prerequisites

- **Python 3.9+**
- **Node.js 18+** & npm

## Quick Start

1. Copy `.env.example` to `.env` and fill in your Splitwise credentials.
2. Run:
   ```bash
   ./run.sh
   ```
   This will:
   - Create a Python virtual environment (`venv/`)
   - Install backend dependencies
   - Start the FastAPI server on **port 8080**
   - Install frontend dependencies
   - Start the Vite dev server on **port 5173**

3. Open **http://localhost:5173** in your browser.

## Environment Variables

| Variable          | Description                        |
|-------------------|------------------------------------|
| `CONSUMER_KEY`    | Splitwise OAuth consumer key       |
| `CONSUMER_SECRET` | Splitwise OAuth consumer secret    |
| `SECRET_KEY`      | Session encryption key             |
| `BACKEND_PORT`    | Backend port (default `8080`)      |
| `FRONTEND_PORT`   | Frontend port (default `5173`)     |
| `FRONTEND_URL`    | Frontend origin for CORS/redirects |
