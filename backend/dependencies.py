import logging

from fastapi import Request, HTTPException
from requests_oauthlib import OAuth1Session

from backend.config import settings
from backend.constants import SESSION_ACCESS_TOKEN, SESSION_ACCESS_TOKEN_SECRET

logger = logging.getLogger(__name__)


def get_oauth_session(request: Request) -> OAuth1Session:
    """Build an authenticated OAuth1Session from the current session, or raise 401."""
    access_token = request.session.get(SESSION_ACCESS_TOKEN)
    access_token_secret = request.session.get(SESSION_ACCESS_TOKEN_SECRET)
    if not access_token or not access_token_secret:
        logger.warning("OAuth session requested but no tokens in session")
        raise HTTPException(status_code=401, detail="Not authenticated")
    return OAuth1Session(
        settings.CONSUMER_KEY,
        client_secret=settings.CONSUMER_SECRET,
        resource_owner_key=access_token,
        resource_owner_secret=access_token_secret,
    )
