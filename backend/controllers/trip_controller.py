from fastapi import APIRouter, Request, HTTPException

from backend.constants import SESSION_USER_ID
from backend.dependencies import get_oauth_session
from backend.services import trip_service, splitwise_service, expense_service

router = APIRouter(tags=["trip"])


def _get_user_id(request: Request) -> int:
    user_id = request.session.get(SESSION_USER_ID)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user_id


def _parse_trip_data(data: dict) -> dict:
    return dict(
        group_id=str(data.get("groupId", "")),
        name=data.get("name", ""),
        start_date=data.get("start") or None,
        end_date=data.get("end") or None,
        currencies=data.get("currencies", []),
        locations=data.get("locations", []),
    )


@router.post("/create_trip")
async def create_trip(request: Request):
    user_id = _get_user_id(request)
    data = await request.json()
    trip = trip_service.create_trip(user_id=user_id, **_parse_trip_data(data))

    # Sync existing Splitwise expenses for this group into the local DB
    group_id = str(data.get("groupId", ""))
    if group_id:
        try:
            oauth = get_oauth_session(request)
            sw_expenses = splitwise_service.fetch_expenses(oauth, group_id)
            if sw_expenses:
                expense_service.sync_expenses_from_splitwise(group_id, sw_expenses)
        except Exception:
            pass  # Non-critical: trip is still created even if sync fails

    return {"status": "success", "trip": trip}


@router.post("/update_trip/{trip_id}")
async def update_trip(request: Request, trip_id: int):
    _get_user_id(request)
    data = await request.json()
    trip = trip_service.update_trip(trip_id=trip_id, **_parse_trip_data(data))
    return {"status": "success", "trip": trip}


@router.get("/get_trips")
def get_trips(request: Request):
    user_id = _get_user_id(request)
    trips = trip_service.get_trips(user_id)
    return {"trips": trips}


@router.post("/delete_trip/{trip_id}")
def delete_trip(request: Request, trip_id: int):
    _get_user_id(request)
    trip_service.delete_trip(trip_id)
    return {"status": "success"}


@router.get("/get_trip/{trip_id}")
def get_trip(request: Request, trip_id: int):
    _get_user_id(request)
    trip = trip_service.get_trip_by_id(trip_id)
    if trip is None:
        return {"trip": None}
    return {"trip": trip}
