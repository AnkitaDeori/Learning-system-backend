# services/conversation_engine.py

from services.graph_service import get_related_concepts
from services.emotion_engine import detect_emotion
from groq import Groq
import os

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def generate_response(user_message):

    # 1️⃣ Detect emotion
    emotion = detect_emotion(user_message)

    # 2️⃣ Retrieve graph context
    graph_context = get_related_concepts(user_message)

    # 3️⃣ Build LLM prompt
    prompt = f"""
    You are a helpful teacher.

    Student emotion: {emotion}

    Knowledge Graph Context:
    {graph_context}

    Student Question:
    {user_message}

    Explain clearly.
    """

    # 4️⃣ Call Groq
    response = client.chat.completions.create(
        model="mixtral-8x7b-32768",
        messages=[{"role": "user", "content": prompt}]
    )

    answer = response.choices[0].message.content

    return answer
