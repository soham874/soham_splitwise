import logging
import uuid
from datetime import date

from fastapi import APIRouter, Request

from backend.constants import SESSION_USER_ID
from backend.dependencies import get_oauth_session
from backend.services import splitwise_service, expense_service, user_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["expenses"])


@router.get("/get_expenses/{group_id}")
def get_expenses(request: Request, group_id: str):
    logger.info("Fetching expenses for group_id=%s", group_id)
    oauth = get_oauth_session(request)
    active_expenses = splitwise_service.fetch_expenses(oauth, group_id)
    logger.info("Fetched %d active expenses for group_id=%s", len(active_expenses), group_id)
    return {"expenses": active_expenses}


@router.post("/create_expense")
async def create_expense(request: Request):
    oauth = get_oauth_session(request)
    payload = await request.json()
    logger.info("Creating expense: description=%s group_id=%s", payload.get("description"), payload.get("group_id"))

    # Extract location & category (not sent to Splitwise)
    location = payload.pop("location", "")
    category = payload.pop("category", "")

    # Identify the logged-in user's Splitwise ID
    db_user_id = request.session.get(SESSION_USER_ID)
    db_user = user_service.get_user_by_id(db_user_id) if db_user_id else None
    logged_in_sw_id = str(db_user["splitwise_id"]) if db_user else None

    # Parse user splits from the payload to check if others owe money
    user_splits = []
    idx = 0
    while f"users__{idx}__user_id" in payload:
        user_splits.append({
            "user_id": payload[f"users__{idx}__user_id"],
            "paid_share": payload.get(f"users__{idx}__paid_share", "0"),
            "owed_share": payload.get(f"users__{idx}__owed_share", "0"),
        })
        idx += 1

    others_owe = any(
        float(u["owed_share"]) > 0 and str(u["user_id"]) != logged_in_sw_id
        for u in user_splits
    )

    group_id = str(payload.get("group_id", ""))
    currency_code = payload.get("currency_code", "INR")
    description = payload.get("description", "")
    original_expense_id = payload.get("id")  # present when editing
    expense_id = None
    sw_result = {}

    if others_owe:
        # Other users have a share → save to Splitwise
        logger.info("Expense involves others; saving to Splitwise (edit=%s)", bool(original_expense_id))
        sw_result = splitwise_service.create_or_update_expense(oauth, payload)
        # Extract the Splitwise expense ID from the response
        expenses_list = sw_result.get("expenses", [])
        if expenses_list:
            expense_id = str(expenses_list[0].get("id", ""))
        elif sw_result.get("expense"):
            expense_id = str(sw_result["expense"].get("id", ""))
    else:
        # Solo expense – reuse original ID if editing, otherwise generate new
        expense_id = str(original_expense_id) if original_expense_id else f"local_{uuid.uuid4().hex[:12]}"
        logger.info("Solo expense; local expense_id=%s", expense_id)

    # If editing, remove old rows before re-inserting updated ones
    if original_expense_id:
        expense_service.delete_expense_rows(str(original_expense_id))

    # Save to local expenses table (one row per user who owes)
    expense_service.save_expense_rows(
        trip_id=group_id,
        expense_id=expense_id,
        description=description,
        location=location,
        category=category,
        currency_code=currency_code,
        users=user_splits,
        date_str=str(date.today()),
    )

    logger.info("Expense saved: expense_id=%s description=%s currency=%s", expense_id, description, currency_code)
    if others_owe:
        return sw_result
    else:
        return {"expenses": [{"id": expense_id, "description": description}]}


@router.post("/delete_expense/{expense_id}")
def delete_expense(request: Request, expense_id: str):
    logger.info("Deleting expense: expense_id=%s", expense_id)
    # Always remove from local DB
    expense_service.delete_expense_rows(expense_id)

    # If it's a Splitwise expense (not local-only), delete from Splitwise too
    if not expense_id.startswith("local_"):
        logger.info("Also deleting from Splitwise: expense_id=%s", expense_id)
        oauth = get_oauth_session(request)
        return splitwise_service.delete_expense(oauth, expense_id)

    logger.info("Local-only expense deleted: expense_id=%s", expense_id)
    return {"success": True}


@router.get("/get_my_expenses/{group_id}")
def get_my_expenses(request: Request, group_id: str):
    """Return local expense rows for the logged-in user in a given trip/group."""
    db_user_id = request.session.get(SESSION_USER_ID)
    if not db_user_id:
        return {"expenses": []}
    db_user = user_service.get_user_by_id(db_user_id)
    if not db_user:
        return {"expenses": []}
    rows = expense_service.get_user_expenses_by_trip(group_id, db_user["splitwise_id"])
    return {"expenses": rows}


@router.post("/update_expense_details")
async def update_expense_details(request: Request):
    """Update location and category on a single expense row."""
    db_user_id = request.session.get(SESSION_USER_ID)
    if not db_user_id:
        return {"status": "error", "detail": "Not authenticated"}
    data = await request.json()
    expense_service.update_expense_details(
        expense_row_id=data["id"],
        location=data.get("location", ""),
        category=data.get("category", ""),
    )
    return {"status": "success"}


@router.post("/update_stay_dates")
async def update_stay_dates(request: Request):
    """Update check-in (date) and check-out (end_date) on a stay expense row."""
    db_user_id = request.session.get(SESSION_USER_ID)
    if not db_user_id:
        return {"status": "error", "detail": "Not authenticated"}
    data = await request.json()
    expense_service.update_stay_dates(
        expense_row_id=data["id"],
        start_date=data.get("start_date", None),
        end_date=data.get("end_date", None),
        location=data.get("location", ""),
    )
    return {"status": "success"}


@router.get("/get_personal_expenses/{group_id}")
def get_personal_expenses(request: Request, group_id: str):
    """Return local-only personal expenses for a group, shaped like Splitwise expenses."""
    db_user_id = request.session.get(SESSION_USER_ID)
    if not db_user_id:
        return {"expenses": []}
    db_user = user_service.get_user_by_id(db_user_id)
    if not db_user:
        return {"expenses": []}
    logger.info("Fetching personal expenses for group_id=%s user=%s", group_id, db_user["splitwise_id"])
    expenses = expense_service.get_personal_expenses(group_id, db_user["splitwise_id"])
    return {"expenses": expenses}


@router.post("/sync_expenses/{group_id}")
def sync_expenses(request: Request, group_id: str):
    """Fetch expenses from Splitwise and sync any new ones into the local DB."""
    logger.info("Syncing expenses from Splitwise for group_id=%s", group_id)
    oauth = get_oauth_session(request)
    sw_expenses = splitwise_service.fetch_expenses(oauth, group_id)
    inserted = expense_service.sync_expenses_from_splitwise(group_id, sw_expenses)
    logger.info("Sync complete for group_id=%s: %d new rows inserted", group_id, inserted)
    return {"status": "success", "synced": inserted}


@router.get("/convert/{from_code}/{to_code}/{amount}")
def convert_currency(from_code: str, to_code: str, amount: float):
    """Convert an amount from one currency to another."""
    rate = expense_service.get_conversion_rate(from_code.upper(), to_code.upper())
    return {"rate": rate, "result": round(amount * rate, 2)}


@router.post("/convert_batch")
async def convert_batch(request: Request):
    """Return conversion rates from a base currency to multiple targets."""
    data = await request.json()
    base = data.get("base", "INR").upper()
    targets = [t.upper() for t in data.get("targets", [])]
    rates = {}
    for t in targets:
        rates[t] = expense_service.get_conversion_rate(base, t)
    return {"base": base, "rates": rates}
