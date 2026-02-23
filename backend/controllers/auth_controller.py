from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse, JSONResponse

from backend.constants import (
    SESSION_ACCESS_TOKEN,
    SESSION_ACCESS_TOKEN_SECRET,
    SESSION_RESOURCE_OWNER_KEY,
    SESSION_RESOURCE_OWNER_SECRET,
    SESSION_USER_ID,
)
from backend.config import settings
from backend.dependencies import get_oauth_session
from backend.services import auth_service, splitwise_service, user_service

router = APIRouter(tags=["auth"])


@router.get("/check_login")
def check_login(request: Request):
    is_logged_in = (
        SESSION_ACCESS_TOKEN in request.session
        and SESSION_ACCESS_TOKEN_SECRET in request.session
        and SESSION_USER_ID in request.session
    )
    return {"logged_in": is_logged_in}


@router.get("/login")
def login(request: Request):
    token_data = auth_service.create_request_token()
    request.session[SESSION_RESOURCE_OWNER_KEY] = token_data["oauth_token"]
    request.session[SESSION_RESOURCE_OWNER_SECRET] = token_data["oauth_token_secret"]
    return RedirectResponse(url=token_data["authorization_url"])


@router.get("/callback")
def callback(request: Request, oauth_verifier: str):
    tokens = auth_service.exchange_access_token(
        resource_owner_key=request.session.get(SESSION_RESOURCE_OWNER_KEY, ""),
        resource_owner_secret=request.session.get(SESSION_RESOURCE_OWNER_SECRET, ""),
        verifier=oauth_verifier,
    )
    request.session[SESSION_ACCESS_TOKEN] = tokens["oauth_token"]
    request.session[SESSION_ACCESS_TOKEN_SECRET] = tokens["oauth_token_secret"]

    # Fetch the Splitwise profile and upsert into our users table
    oauth = get_oauth_session(request)
    sw_data = splitwise_service.fetch_current_user(oauth)
    sw_user = sw_data.get("user", {})
    db_user = user_service.upsert_user(
        splitwise_id=sw_user.get("id"),
        name=f"{sw_user.get('first_name', '')} {sw_user.get('last_name', '')}".strip(),
        email=sw_user.get("email", ""),
    )
    request.session[SESSION_USER_ID] = db_user["id"]

    return RedirectResponse(url=settings.FRONTEND_URL)


@router.get("/logout")
def logout(request: Request):
    request.session.clear()
    return RedirectResponse(url=settings.FRONTEND_URL)
