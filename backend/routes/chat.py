# routes/chat.py

from fastapi import APIRouter
from services.conversation_engine import generate_response

router = APIRouter()

@router.post("/chat")
def chat(message: dict):
    user_message = message["message"]
    response = generate_response(user_message)
    return {"reply": response}
