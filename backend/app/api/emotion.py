from fastapi import APIRouter
from pydantic import BaseModel

from app.core.decision_engine import update_emotion

router = APIRouter()

class EmotionRequest(BaseModel):
    session_token: str
    emotion: str


@router.post("/update")
def update_emotion_route(data: EmotionRequest):
    print(
        f"[EMOTION UPDATE] session={data.session_token} emotion={data.emotion}"
    )
    update_emotion(data.session_token, data.emotion)
    return {"status": "emotion updated", "emotion": data.emotion}
