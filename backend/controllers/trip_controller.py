from fastapi import APIRouter, Request

router = APIRouter(tags=["trip"])


@router.post("/save_trip_details")
async def save_trip_details(request: Request):
    data = await request.json()
    print(f"Received trip details: {data}")
    return {"status": "success", "message": "Trip details received"}
