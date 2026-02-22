import os
from flask import Flask, redirect, request, session, jsonify, render_template_string
from requests_oauthlib import OAuth1Session

app = Flask(__name__)
app.secret_key = os.urandom(24)

# Splitwise Credentials

CONSUMER_KEY = "zg2U4abbbsYMCPkLtlVenujhxzIk1adjKFnIYUid"
CONSUMER_KEY = "pN5RXEpigBzlB7RyfyfmpH2oKj4MUz7KYWdjqzNF"
CONSUMER_SECRET = "H3HdsqKf8ROzhBt7NkAQ7DRvxF3cURoTjr5hhIYK"
CONSUMER_SECRET = "F3dLoz7dAYdjuaNTETAqmtbqZ4aEtrclMpK85t3V"

REQUEST_TOKEN_URL = "https://secure.splitwise.com/oauth/request_token"
AUTHORIZATION_URL = "https://secure.splitwise.com/oauth/authorize"
ACCESS_TOKEN_URL = "https://secure.splitwise.com/oauth/access_token"
BASE_API_URL = "https://secure.splitwise.com/api/v3.0"

def get_oauth_session():
    access_token = session.get("access_token")
    access_token_secret = session.get("access_token_secret")
    if not access_token:
        return None
    return OAuth1Session(
        CONSUMER_KEY,
        client_secret=CONSUMER_SECRET,
        resource_owner_key=access_token,
        resource_owner_secret=access_token_secret,
    )

@app.route("/")
def index():
    # Check if the user is already logged in via session tokens
    if "access_token" in session and "access_token_secret" in session:
        return render_template_string(open("index.html").read())
    # If not logged in, redirect to Splitwise OAuth flow
    return redirect("/login")

@app.route("/check_login")
def check_login():
    is_logged_in = "access_token" in session and "access_token_secret" in session
    return jsonify({"logged_in": is_logged_in})

@app.route("/login")
def login():
    oauth = OAuth1Session(CONSUMER_KEY, client_secret=CONSUMER_SECRET)
    fetch_response = oauth.fetch_request_token(REQUEST_TOKEN_URL)
    session["resource_owner_key"] = fetch_response.get("oauth_token")
    session["resource_owner_secret"] = fetch_response.get("oauth_token_secret")
    authorization_url = oauth.authorization_url(AUTHORIZATION_URL)
    return redirect(authorization_url)

@app.route("/callback")
def callback():
    verifier = request.args.get("oauth_verifier")
    oauth = OAuth1Session(
        CONSUMER_KEY,
        client_secret=CONSUMER_SECRET,
        resource_owner_key=session.get("resource_owner_key"),
        resource_owner_secret=session.get("resource_owner_secret"),
        verifier=verifier,
    )
    tokens = oauth.fetch_access_token(ACCESS_TOKEN_URL)
    session["access_token"] = tokens.get("oauth_token")
    session["access_token_secret"] = tokens.get("oauth_token_secret")
    return redirect("/")

@app.route("/get_groups")
def get_groups():
    oauth = get_oauth_session()
    if not oauth: return jsonify({"error": "Unauthorized"}), 401
    response = oauth.get(f"{BASE_API_URL}/get_groups")
    return jsonify(response.json())

@app.route("/get_expenses/<group_id>")
def get_expenses(group_id):
    access_token = session.get("access_token")
    access_token_secret = session.get("access_token_secret")
    if not access_token:
        return jsonify({"expenses": []})

    oauth = OAuth1Session(
        CONSUMER_KEY,
        client_secret=CONSUMER_SECRET,
        resource_owner_key=access_token,
        resource_owner_secret=access_token_secret,
    )
    
    # Fetch expenses for the specific group
    response = oauth.get(f"{BASE_API_URL}/get_expenses?group_id={group_id}&limit=100")
    data = response.json()
    
    expenses = data.get("expenses", [])
    
    # Filter: Only include expenses where 'deleted_at' is None (null)
    # Splitwise typically uses 'deleted_at' to mark deletions
    active_expenses = [
        e for e in expenses 
        if e.get("deleted_at") is None and e.get("deleted_by") is None
    ]
    
    return jsonify({"expenses": active_expenses})

@app.route("/create_expense", methods=["POST"])
def create_expense():
    access_token = session.get("access_token")
    access_token_secret = session.get("access_token_secret")
    if not access_token:
        return jsonify({"errors": "Not authenticated"})

    oauth = OAuth1Session(
        CONSUMER_KEY,
        client_secret=CONSUMER_SECRET,
        resource_owner_key=access_token,
        resource_owner_secret=access_token_secret,
    )
    
    # Use .copy() to avoid mutating the original request data if needed
    payload = request.json.copy()
    expense_id = payload.pop('id', None) # Remove 'id' from the body
    
    if expense_id:
        # Update existing expense: ID goes in URL, parameters in body
        response = oauth.post(f"{BASE_API_URL}/update_expense/{expense_id}", data=payload)
    else:
        # Create new expense
        response = oauth.post(f"{BASE_API_URL}/create_expense", data=payload)
        
    return response.json()
    # return jsonify(response.json())

@app.route("/delete_expense/<expense_id>", methods=["POST"])
def delete_expense(expense_id):
    access_token = session.get("access_token")
    access_token_secret = session.get("access_token_secret")
    if not access_token:
        return jsonify({"errors": "Not authenticated"})

    oauth = OAuth1Session(
        CONSUMER_KEY,
        client_secret=CONSUMER_SECRET,
        resource_owner_key=access_token,
        resource_owner_secret=access_token_secret,
    )
    
    response = oauth.post(f"{BASE_API_URL}/delete_expense/{expense_id}")
    return response.json()

@app.route("/get_currencies")
def get_currencies():
    oauth = get_oauth_session()
    if not oauth: return jsonify({"errors": "Not authenticated"}), 401
    response = oauth.get(f"{BASE_API_URL}/get_currencies")
    return response.json()

@app.route("/add_personal_expense", methods=["POST"])
def add_personnal_expense():
    oauth = get_oauth_session()
    if not oauth: return jsonify({"errors": "Not authenticated"}), 401
    payload = request.json.copy()
    return "OK"

@app.route("/logout")
def logout():
    session.clear()
    return redirect("/")


@app.route("/save_trip_details", methods=["POST"])
def save_trip_details():
    # In a real app, you'd save this to a database linked to the user's Splitwise ID
    data = request.json
    print(f"Received trip details: {data}")
    return jsonify({"status": "success", "message": "Trip details received"})


if __name__ == "__main__":
    app.run(host='0.0.0.0', port=8080, debug=True)