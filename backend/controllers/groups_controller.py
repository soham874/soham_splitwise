import logging

from fastapi import APIRouter, Request

from backend.dependencies import get_oauth_session
from backend.services import splitwise_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["groups"])


@router.get("/get_groups")
def get_groups(request: Request):
    logger.info("Fetching Splitwise groups")
    oauth = get_oauth_session(request)
    result = splitwise_service.fetch_groups(oauth)
    logger.info("Fetched %d groups", len(result.get("groups", [])))
    return result
