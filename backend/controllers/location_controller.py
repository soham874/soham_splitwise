import logging

from fastapi import APIRouter, Request, HTTPException, Query

from backend.constants import SESSION_USER_ID
from backend.services import location_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["location"])


@router.get("/location_coords")
def get_location_coords(request: Request, names: str = Query(..., description="Comma-separated location names")):
    user_id = request.session.get(SESSION_USER_ID)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    name_list = [n.strip() for n in names.split(",") if n.strip()]
    if not name_list:
        return {"coords": []}

    coords = location_service.get_location_coords(name_list)
    logger.info("Returned %d location coords for user=%s", len(coords), user_id)
    return {"coords": coords}
