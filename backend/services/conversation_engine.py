from groq import Groq
import os

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def detect_emotion(message: str):

    prompt = f"""
    Classify the student's emotion from this message.
    Choose only one:
    - confused
    - frustrated
    - neutral
    - confident

    Message:
    {message}

    Only return the emotion word.
    """

    response = client.chat.completions.create(
        model="mixtral-8x7b-32768",
        messages=[{"role": "user", "content": prompt}]
    )

    return response.choices[0].message.content.strip().lower()
