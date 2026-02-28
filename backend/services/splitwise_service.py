import logging

from requests_oauthlib import OAuth1Session

from backend.constants import BASE_API_URL, DEFAULT_EXPENSE_LIMIT

logger = logging.getLogger(__name__)


def fetch_current_user(oauth: OAuth1Session) -> dict:
    logger.debug("Splitwise API: GET /get_current_user")
    response = oauth.get(f"{BASE_API_URL}/get_current_user")
    logger.debug("Splitwise API: /get_current_user status=%s", response.status_code)
    return response.json()


def fetch_groups(oauth: OAuth1Session) -> dict:
    logger.debug("Splitwise API: GET /get_groups")
    response = oauth.get(f"{BASE_API_URL}/get_groups")
    logger.debug("Splitwise API: /get_groups status=%s", response.status_code)
    return response.json()


def fetch_expenses(oauth: OAuth1Session, group_id: str) -> list:
    logger.debug("Splitwise API: GET /get_expenses group_id=%s", group_id)
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
    logger.debug("Splitwise API: fetched %d expenses (%d active) for group_id=%s", len(expenses), len(active_expenses), group_id)
    return active_expenses


def create_or_update_expense(oauth: OAuth1Session, payload: dict) -> dict:
    expense_id = payload.pop("id", None)
    if expense_id:
        logger.info("Splitwise API: POST /update_expense/%s", expense_id)
        response = oauth.post(
            f"{BASE_API_URL}/update_expense/{expense_id}", data=payload
        )
    else:
        logger.info("Splitwise API: POST /create_expense")
        response = oauth.post(f"{BASE_API_URL}/create_expense", data=payload)
    logger.info("Splitwise API: expense response status=%s", response.status_code)
    return response.json()


def delete_expense(oauth: OAuth1Session, expense_id: str) -> dict:
    logger.info("Splitwise API: POST /delete_expense/%s", expense_id)
    response = oauth.post(f"{BASE_API_URL}/delete_expense/{expense_id}")
    logger.info("Splitwise API: delete_expense status=%s", response.status_code)
    return response.json()


def fetch_currencies(oauth: OAuth1Session) -> dict:
    logger.debug("Splitwise API: GET /get_currencies")
    response = oauth.get(f"{BASE_API_URL}/get_currencies")
    return response.json()
