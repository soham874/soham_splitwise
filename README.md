# Splitwise Manager

> A full-stack trip expense manager built on top of Splitwise — track, categorise, and analyse group travel spending.

**[Try the app](https://soham-splitwise.duckdns.org/)**

---

## Features

- **Splitwise Sync** — OAuth login, auto-import expenses from Splitwise groups
- **Multi-Trip Support** — create and manage multiple trips with locations, currencies, and date ranges
- **Expense Categorisation** — assign location & category to every expense
- **Stay Management** — dedicated tab for hotel/hostel stays with check-in, check-out & per-night cost spreading
- **Analytics Dashboard** — pie charts (by category, location, date), bar charts (stay cost/night, food cost/day), summary stats
- **Currency Conversion** — real-time exchange rates with batch conversion
- **Personal Expenses** — add local-only expenses that don't hit Splitwise
- **Health Check** — `GET /api/health` returns app + DB status

---

## Tech Stack

| Layer      | Technology                                    |
|------------|-----------------------------------------------|
| Frontend   | React, Vite, Tailwind CSS                     |
| Backend    | FastAPI, Uvicorn                               |
| Database   | MySQL 8+                                       |
| Auth       | Splitwise OAuth 1.0a                           |
| Deployment | Oracle Cloud VM, DuckDNS                       |

---

## Project Structure

```
.
├── run.sh                          # One-command local dev launcher
├── .env.example                    # Template for secrets & config
├── backend/
│   ├── main.py                     # FastAPI app + health check
│   ├── config.py                   # Settings from .env
│   ├── constants.py                # API URLs, session keys
│   ├── db.py                       # MySQL connection pool
│   ├── schema.sql                  # Idempotent base schema
│   ├── requirements.txt
│   ├── migrations/                 # Incremental DDL scripts
│   │   ├── V001__initial_schema.sql
│   │   ├── V002__multi_trip_and_expenses.sql
│   │   ├── V003__trip_created_by.sql
│   │   ├── V004__expense_end_date.sql
│   │   ├── V005__unique_expense_per_user.sql
│   │   └── V006__expense_start_date.sql
│   ├── controllers/                # Route handlers
│   │   ├── auth_controller.py
│   │   ├── groups_controller.py
│   │   ├── expenses_controller.py
│   │   ├── currencies_controller.py
│   │   └── trip_controller.py
│   └── services/                   # Business logic
│       ├── auth_service.py
│       ├── expense_service.py
│       ├── trip_service.py
│       ├── user_service.py
│       └── splitwise_service.py
└── frontend/
    ├── package.json
    ├── vite.config.js              # Dev proxy → backend
    ├── tailwind.config.js
    └── src/
        ├── App.jsx                 # Root routing & state
        ├── api.js                  # All backend fetch calls
        ├── index.css
        └── components/
            ├── AnalyticsPage.jsx
            ├── CurrencyConverterPage.jsx
            ├── DashboardPage.jsx
            ├── ExpenseForm.jsx
            ├── ExpenseHistory.jsx
            ├── MyTripsPage.jsx
            ├── TripDetailPage.jsx
            ├── TripSetupPage.jsx
            └── ...
```

---

## Prerequisites

- **Python 3.9+**
- **Node.js 18+** & npm
- **MySQL 8+**

---

## Quick Start

1. Copy `.env.example` → `.env` and fill in your credentials:

   ```bash
   cp .env.example .env
   ```

2. Launch everything:

   ```bash
   ./run.sh
   ```

   This will:
   - Create a Python venv and install backend dependencies
   - Start the FastAPI server on **port 8080**
   - Install frontend dependencies
   - Start the Vite dev server on **port 5173**

3. Open **http://localhost:5173**

---

## Environment Variables

| Variable          | Description                        | Default              |
|-------------------|------------------------------------|----------------------|
| `CONSUMER_KEY`    | Splitwise OAuth consumer key       | —                    |
| `CONSUMER_SECRET` | Splitwise OAuth consumer secret    | —                    |
| `SECRET_KEY`      | Session encryption key             | —                    |
| `BACKEND_PORT`    | Backend port                       | `8080`               |
| `FRONTEND_PORT`   | Frontend port                      | `5173`               |
| `FRONTEND_URL`    | Frontend origin for CORS/redirects | `http://localhost:5173` |
| `MYSQL_HOST`      | MySQL host                         | `127.0.0.1`          |
| `MYSQL_PORT`      | MySQL port                         | `3306`               |
| `MYSQL_USER`      | MySQL user                         | `root`               |
| `MYSQL_PASSWORD`  | MySQL password                     | —                    |
| `MYSQL_DATABASE`  | MySQL database name                | `splitwise_manager`  |

---

## Health Check

```
GET /api/health
```

Returns:

```json
{ "status": "ok", "db": "ok" }
```

If the database is unreachable, `db` will contain the error message.

---

## Database Migrations

Migrations live in `backend/migrations/` and are numbered sequentially. Run them in order against your MySQL instance:

```bash
mysql -u root -p splitwise_manager < backend/migrations/V006__expense_start_date.sql
```

The base schema (`backend/schema.sql`) is executed automatically on app startup via `init_db()`.

---

## Deployment

Deployed on an **Oracle Cloud VM** (Ubuntu). Access with SSH auth:

```bash
ssh ubuntu@140.245.31.106
```

2 screens are created to access systems.

```bash
app # backend
db # mysql
```

---

## External Services

| Service                                              | Purpose                  |
|------------------------------------------------------|--------------------------|
| [Splitwise API](https://dev.splitwise.com/)          | Expense sync & OAuth     |
| [ExchangeRate API](https://www.exchangerate-api.com/)| Currency conversion      |
| [DuckDNS](https://www.duckdns.org/)                  | Dynamic DNS for domain   |
|[Health Check](https://hrpt5w0z.status.cron-job.org/)| Service status|
