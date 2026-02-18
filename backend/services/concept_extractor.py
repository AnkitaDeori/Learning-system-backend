# services/concept_extractor.py
from groq import Groq
import os

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def extract_concepts(text):
    response = client.chat.completions.create(
        model="mixtral-8x7b-32768",
        messages=[
            {"role": "system", "content": "Extract structured knowledge graph data."},
            {"role": "user", "content": text}
        ]
    )

    return response.choices[0].message.content
