from fastapi import APIRouter, Request, HTTPException

from backend.constants import SESSION_USER_ID
from backend.services import trip_service

router = APIRouter(tags=["trip"])


def _get_user_id(request: Request) -> int:
    user_id = request.session.get(SESSION_USER_ID)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user_id


@router.post("/save_trip_details")
async def save_trip_details(request: Request):
    user_id = _get_user_id(request)
    data = await request.json()
    trip = trip_service.upsert_trip(
        user_id=user_id,
        group_id=str(data.get("groupId", "")),
        name=data.get("name", ""),
        start_date=data.get("start") or None,
        end_date=data.get("end") or None,
        currencies=data.get("currencies", []),
        locations=data.get("locations", []),
    )
    return {"status": "success", "trip": trip}


@router.get("/get_trip_details")
def get_trip_details(request: Request):
    user_id = _get_user_id(request)
    trip = trip_service.get_trip(user_id)
    if trip is None:
        return {"trip": None}
    return {"trip": trip}
