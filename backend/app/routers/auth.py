from fastapi import APIRouter, HTTPException, Response, Cookie, Depends, status
from supabase import create_client, Client
from app.config import settings
from app.schemas.user import UserSignup, UserLogin, TokenResponse, UserResponse
from app.security.auth_handler import hash_password, verify_password, create_access_token, create_refresh_token, verify_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])

def get_supabase() -> Client:
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

@router.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(user_data: UserSignup, db: Client = Depends(get_supabase)):
    password_hash = hash_password(user_data.password)
    
    # Check if duplicate email
    existing = db.table("users").select("id").eq("email", user_data.email).execute()
    if existing.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
        
    try:
        new_user = {
            "name": user_data.name,
            "email": user_data.email,
            "password_hash": password_hash,
            "created_at": "now()"
        }
        res = db.table("users").insert(new_user).execute()
        user_record = res.data[0]
        return {"message": "User registered successfully", "user": {"id": user_record["id"], "name": user_record["name"], "email": user_record["email"]}}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to register user"
        )

@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, response: Response, db: Client = Depends(get_supabase)):
    res = db.table("users").select("*").eq("email", credentials.email).execute()
    if not res.data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
        
    user_record = res.data[0]
    if not verify_password(credentials.password, user_record["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
        
    payload = {
        "id": user_record["id"],
        "name": user_record["name"],
        "email": user_record["email"]
    }
    
    access_token = create_access_token(payload)
    refresh_token = create_refresh_token(payload)
    
    # Secure HTTPOnly Cookie for Refresh Token
    response.set_cookie(
        key="neet_refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="strict",
        max_age=7 * 24 * 60 * 60  # 7 days
    )
    
    return {
        "accessToken": access_token,
        "user": {
            "id": user_record["id"],
            "name": user_record["name"],
            "email": user_record["email"]
        }
    }

@router.post("/refresh")
async def refresh(response: Response, neet_refresh_token: str = Cookie(None)):
    if not neet_refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing"
        )
    try:
        from jose import jwt
        payload = jwt.decode(neet_refresh_token, settings.JWT_REFRESH_SECRET, algorithms=["HS256"])
        new_payload = {
            "id": payload["id"],
            "name": payload["name"],
            "email": payload["email"]
        }
        new_access_token = create_access_token(new_payload)
        return {"accessToken": new_access_token}
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Refresh token is invalid or expired"
        )

@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("neet_refresh_token")
    return {"message": "Logged out successfully"}

@router.get("/me", response_model=UserResponse)
async def me(current_user: dict = Depends(verify_access_token)):
    return {
        "id": current_user["id"],
        "name": current_user["name"],
        "email": current_user["email"]
    }
