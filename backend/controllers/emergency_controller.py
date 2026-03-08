import logging

from fastapi import APIRouter, Request, HTTPException, Query

from backend.constants import SESSION_USER_ID
from backend.services import emergency_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["emergency"])


@router.get("/emergency_services")
def get_emergency_services(
    request: Request,
    location: str = Query(..., description="City or location name"),
    category: str = Query("all", description="hospital, police, pharmacy, embassy, or all"),
):
    user_id = request.session.get(SESSION_USER_ID)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    location = location.strip()
    if not location:
        return {"services": {}}

    if category == "all":
        result = emergency_service.get_all_emergency_services(location)
    else:
        result = {category: emergency_service.get_emergency_services(location, category)}

    logger.info(
        "Emergency services for '%s' category='%s' user=%s — %s",
        location, category, user_id,
        {k: len(v) for k, v in result.items()},
    )
    return {"services": result}
