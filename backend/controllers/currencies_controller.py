from fastapi import APIRouter, Request

from backend.dependencies import get_oauth_session
from backend.services import splitwise_service

router = APIRouter(tags=["currencies"])


@router.get("/get_currencies")
def get_currencies(request: Request):
    oauth = get_oauth_session(request)
    return splitwise_service.fetch_currencies(oauth)
