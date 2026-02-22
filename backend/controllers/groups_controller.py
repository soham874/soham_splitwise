from fastapi import APIRouter, Request

from backend.dependencies import get_oauth_session
from backend.services import splitwise_service

router = APIRouter(tags=["groups"])


@router.get("/get_groups")
def get_groups(request: Request):
    oauth = get_oauth_session(request)
    return splitwise_service.fetch_groups(oauth)
