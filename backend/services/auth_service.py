from requests_oauthlib import OAuth1Session

from backend.config import settings
from backend.constants import (
    REQUEST_TOKEN_URL,
    AUTHORIZATION_URL,
    ACCESS_TOKEN_URL,
)


def create_request_token() -> dict:
    """Initiate OAuth1 flow and return request token data + authorization URL."""
    oauth = OAuth1Session(settings.CONSUMER_KEY, client_secret=settings.CONSUMER_SECRET)
    fetch_response = oauth.fetch_request_token(REQUEST_TOKEN_URL)
    authorization_url = oauth.authorization_url(AUTHORIZATION_URL)
    return {
        "oauth_token": fetch_response.get("oauth_token"),
        "oauth_token_secret": fetch_response.get("oauth_token_secret"),
        "authorization_url": authorization_url,
    }


def exchange_access_token(
    resource_owner_key: str,
    resource_owner_secret: str,
    verifier: str,
) -> dict:
    """Exchange the request token + verifier for a permanent access token."""
    oauth = OAuth1Session(
        settings.CONSUMER_KEY,
        client_secret=settings.CONSUMER_SECRET,
        resource_owner_key=resource_owner_key,
        resource_owner_secret=resource_owner_secret,
        verifier=verifier,
    )
    tokens = oauth.fetch_access_token(ACCESS_TOKEN_URL)
    return {
        "oauth_token": tokens.get("oauth_token"),
        "oauth_token_secret": tokens.get("oauth_token_secret"),
    }
