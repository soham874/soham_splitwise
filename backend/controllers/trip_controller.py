from fastapi import APIRouter, Request, HTTPException

from backend.constants import SESSION_ACCESS_TOKEN
from backend.services import trip_service

router = APIRouter(tags=["trip"])


def _get_user_token(request: Request) -> str:
    token = request.session.get(SESSION_ACCESS_TOKEN)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return token


@router.post("/save_trip_details")
async def save_trip_details(request: Request):
    user_token = _get_user_token(request)
    data = await request.json()
    trip = trip_service.upsert_trip(
        user_token=user_token,
        group_id=str(data.get("groupId", "")),
        name=data.get("name", ""),
        start_date=data.get("start") or None,
        end_date=data.get("end") or None,
        currencies=data.get("currencies", []),
    )
    return {"status": "success", "trip": trip}


@router.get("/get_trip_details")
def get_trip_details(request: Request):
    user_token = _get_user_token(request)
    trip = trip_service.get_trip(user_token)
    if trip is None:
        return {"trip": None}
    return {"trip": trip}
