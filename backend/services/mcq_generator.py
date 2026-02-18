def generate_mcqs(concept_text):
    response = client.chat.completions.create(
        model="mixtral-8x7b-32768",
        messages=[
            {"role": "user", "content": f"Generate MCQs from:\n{concept_text}"}
        ]
    )
    return response.choices[0].message.content
