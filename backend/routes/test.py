from fastapi import APIRouter
from services.emotion_engine import detect_emotion

router = APIRouter()

@router.get("/test-emotion")
def test_emotion(message: str):
    emotion = detect_emotion(message)
    return {"emotion": emotion}
