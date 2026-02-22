from requests_oauthlib import OAuth1Session

from backend.constants import BASE_API_URL, DEFAULT_EXPENSE_LIMIT


def fetch_groups(oauth: OAuth1Session) -> dict:
    response = oauth.get(f"{BASE_API_URL}/get_groups")
    return response.json()


def fetch_expenses(oauth: OAuth1Session, group_id: str) -> list:
    response = oauth.get(
        f"{BASE_API_URL}/get_expenses",
        params={"group_id": group_id, "limit": DEFAULT_EXPENSE_LIMIT},
    )
    data = response.json()
    expenses = data.get("expenses", [])
    # Filter out deleted expenses
    active_expenses = [
        e
        for e in expenses
        if e.get("deleted_at") is None and e.get("deleted_by") is None
    ]
    return active_expenses


def create_or_update_expense(oauth: OAuth1Session, payload: dict) -> dict:
    expense_id = payload.pop("id", None)
    if expense_id:
        response = oauth.post(
            f"{BASE_API_URL}/update_expense/{expense_id}", data=payload
        )
    else:
        response = oauth.post(f"{BASE_API_URL}/create_expense", data=payload)
    return response.json()


def delete_expense(oauth: OAuth1Session, expense_id: str) -> dict:
    response = oauth.post(f"{BASE_API_URL}/delete_expense/{expense_id}")
    return response.json()


def fetch_currencies(oauth: OAuth1Session) -> dict:
    response = oauth.get(f"{BASE_API_URL}/get_currencies")
    return response.json()
