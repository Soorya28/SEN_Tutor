# app/api/auth.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import uuid

from app.core.decision_engine import create_session

router = APIRouter()

class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/login")
def login(data: LoginRequest):
    if data.username != "student1" or data.password != "test123":
        raise HTTPException(status_code=401, detail="Invalid credentials")

    session_token = str(uuid.uuid4())

    # ✅ Initialize learning session
    create_session(session_token)

    return {"session_token": session_token}
