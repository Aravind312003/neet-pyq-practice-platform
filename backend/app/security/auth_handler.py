from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security_bearer = HTTPBearer()

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: Dict[str, Any]) -> str:
    payload = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=15)
    payload.update({"exp": expire})
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")

def create_refresh_token(data: Dict[str, Any]) -> str:
    payload = data.copy()
    expire = datetime.utcnow() + timedelta(days=7)
    payload.update({"exp": expire})
    return jwt.encode(payload, settings.JWT_REFRESH_SECRET, algorithm="HS256")

def verify_access_token(credentials: HTTPAuthorizationCredentials = Security(security_bearer)) -> Dict[str, Any]:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access token is invalid or expired"
        )
