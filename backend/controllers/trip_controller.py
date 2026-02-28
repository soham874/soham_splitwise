import logging

from fastapi import APIRouter, Request, HTTPException

from backend.constants import SESSION_USER_ID
from backend.dependencies import get_oauth_session
from backend.services import trip_service, splitwise_service, expense_service, user_service

logger = logging.getLogger(__name__)

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
    logged_in_user_id = _get_user_id(request)
    data = await request.json()
    trip_data = _parse_trip_data(data)
    group_id = trip_data["group_id"]
    logger.info("Creating trip: name=%s group_id=%s user=%s", trip_data["name"], group_id, logged_in_user_id)

    oauth = get_oauth_session(request)

    # Upsert all group members into the users table and create trip rows
    # for every member so each user sees this trip in their list.
    member_db_ids = []
    if group_id:
        try:
            groups_resp = splitwise_service.fetch_groups(oauth)
            groups = groups_resp.get("groups", [])
            group = next(
                (g for g in groups if str(g.get("id")) == group_id), None
            )
            if group:
                for member in group.get("members", []):
                    sw_id = member.get("id")
                    first = member.get("first_name", "")
                    last = member.get("last_name", "")
                    email = member.get("email", "")
                    db_user = user_service.upsert_user(
                        splitwise_id=sw_id,
                        name=f"{first} {last}".strip(),
                        email=email,
                    )
                    member_db_ids.append(db_user["id"])
        except Exception:
            pass  # Fall back to logged-in user only

    # Ensure the logged-in user is always included
    if logged_in_user_id not in member_db_ids:
        member_db_ids.append(logged_in_user_id)

    # Create a trip row for each member, tagging the creator
    trip = None
    for db_id in member_db_ids:
        created = trip_service.create_trip(
            user_id=db_id, **trip_data, created_by=logged_in_user_id
        )
        if db_id == logged_in_user_id:
            trip = created

    # Sync existing Splitwise expenses (skip "Payment" settlements)
    if group_id:
        try:
            sw_expenses = splitwise_service.fetch_expenses(oauth, group_id)
            if sw_expenses:
                expense_service.sync_expenses_from_splitwise(group_id, sw_expenses)
        except Exception:
            pass  # Non-critical: trip is still created even if sync fails

    logger.info("Trip created: id=%s name=%s members=%d", trip["id"] if trip else "-", trip_data["name"], len(member_db_ids))
    return {"status": "success", "trip": trip}


@router.post("/update_trip/{trip_id}")
async def update_trip(request: Request, trip_id: int):
    user_id = _get_user_id(request)
    existing = trip_service.get_trip_by_id(trip_id)
    if not existing or existing.get("created_by") != user_id:
        logger.warning("Unauthorized trip update attempt: trip_id=%s user=%s", trip_id, user_id)
        raise HTTPException(status_code=403, detail="Only the trip creator can edit this trip")
    data = await request.json()
    trip = trip_service.update_trip(trip_id=trip_id, **_parse_trip_data(data))
    logger.info("Trip updated: id=%s user=%s", trip_id, user_id)
    return {"status": "success", "trip": trip}


@router.get("/get_trips")
def get_trips(request: Request):
    user_id = _get_user_id(request)
    trips = trip_service.get_trips(user_id)
    logger.info("Fetched %d trips for user=%s", len(trips), user_id)
    return {"trips": trips}


@router.post("/delete_trip/{trip_id}")
def delete_trip(request: Request, trip_id: int):
    user_id = _get_user_id(request)
    existing = trip_service.get_trip_by_id(trip_id)
    if not existing or existing.get("created_by") != user_id:
        logger.warning("Unauthorized trip delete attempt: trip_id=%s user=%s", trip_id, user_id)
        raise HTTPException(status_code=403, detail="Only the trip creator can delete this trip")
    trip_service.delete_trip(trip_id)
    logger.info("Trip deleted: id=%s group_id=%s user=%s", trip_id, existing.get("groupId"), user_id)
    return {"status": "success"}


@router.get("/get_trip/{trip_id}")
def get_trip(request: Request, trip_id: int):
    _get_user_id(request)
    trip = trip_service.get_trip_by_id(trip_id)
    if trip is None:
        return {"trip": None}
    return {"trip": trip}
