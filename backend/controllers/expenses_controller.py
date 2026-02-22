from fastapi import APIRouter, Request

from backend.dependencies import get_oauth_session
from backend.services import splitwise_service

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
    return splitwise_service.create_or_update_expense(oauth, payload)


@router.post("/delete_expense/{expense_id}")
def delete_expense(request: Request, expense_id: str):
    oauth = get_oauth_session(request)
    return splitwise_service.delete_expense(oauth, expense_id)
