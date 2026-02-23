import uuid
from datetime import date

from fastapi import APIRouter, Request

from backend.constants import SESSION_USER_ID
from backend.dependencies import get_oauth_session
from backend.services import splitwise_service, expense_service, user_service

router = APIRouter(tags=["expenses"])


@router.get("/get_expenses/{group_id}")
def get_expenses(request: Request, group_id: str):
    oauth = get_oauth_session(request)
    active_expenses = splitwise_service.fetch_expenses(oauth, group_id)
    return {"expenses": active_expenses}


@router.post("/create_expense")
async def create_expense(request: Request):
    oauth = get_oauth_session(request)
    payload = await request.json()

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
    expense_id = None
    sw_result = {}

    if others_owe:
        # Other users have a share → save to Splitwise
        sw_result = splitwise_service.create_or_update_expense(oauth, payload)
        # Extract the Splitwise expense ID from the response
        expenses_list = sw_result.get("expenses", [])
        if expenses_list:
            expense_id = str(expenses_list[0].get("id", ""))
        elif sw_result.get("expense"):
            expense_id = str(sw_result["expense"].get("id", ""))
    else:
        # Solo expense – generate a local-only ID
        expense_id = f"local_{uuid.uuid4().hex[:12]}"

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

    if others_owe:
        return sw_result
    else:
        return {"expenses": [{"id": expense_id, "description": description}]}


@router.post("/delete_expense/{expense_id}")
def delete_expense(request: Request, expense_id: str):
    # Always remove from local DB
    expense_service.delete_expense_rows(expense_id)

    # If it's a Splitwise expense (not local-only), delete from Splitwise too
    if not expense_id.startswith("local_"):
        oauth = get_oauth_session(request)
        return splitwise_service.delete_expense(oauth, expense_id)

    return {"success": True}
