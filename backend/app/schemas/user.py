from pydantic import BaseModel, EmailStr, Field

class UserSignup(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8)
    turnstileToken: str = Field(default="")

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    turnstileToken: str = Field(default="")

class UserResponse(BaseModel):
    id: str
    name: str
    email: EmailStr

class TokenResponse(BaseModel):
    accessToken: str
    user: UserResponse
