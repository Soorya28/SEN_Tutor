# app/core/llm_adapter.py

import requests

OLLAMA_URL = "http://localhost:11434/api/chat"
MODEL_NAME = "phi3"

def call_llm(prompt: str) -> str:
    response = requests.post(
        OLLAMA_URL,
        json={
            "model": MODEL_NAME,
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "stream": False,
        },
        timeout=120,
    )

    response.raise_for_status()

    data = response.json()
    return data["message"]["content"]


def generate_parts(topic: str):
    prompt = f"""
Break the topic "{topic}" into exactly 5 simple teaching parts
suitable for a 13–15 year old child with learning difficulties (SEN).

Rules:
- Return ONLY a numbered list
- No explanations
"""

    output = call_llm(prompt)

    parts = []
    for line in output.split("\n"):
        line = line.strip()
        if line and line[0].isdigit():
            parts.append(line.split(".", 1)[1].strip())

    return parts[:5]


def explain_part(topic: str, part: str, simplicity_level: int):
    simplicity_map = {
        1: "Use very simple words.",
        2: "Use simpler words with examples.",
        3: "Explain like teaching a small child with learning difficulties (SEN) using analogies.",
    }

    prompt = f"""
Topic: {topic}
Part: {part}

Explain this part.
{simplicity_map.get(simplicity_level, simplicity_map[3])}

Rules:
- Do not introduce new concepts
- Keep explanation short and clear
"""

    return call_llm(prompt)

def generate_mcq(topic: str, part: str):
    prompt = f"""
You are teaching a child.

From the explanation about:
Topic: {topic}
Part: {part}

Create ONE very simple multiple-choice question.

Rules:
- The answer must be directly available in the explanation
- Only 2 options (A and B)
- Clearly mention which option is correct

Format EXACTLY like this:
Question: <question>
A) <option>
B) <option>
Correct: A or B
"""

    for attempt in range(2):
        output = call_llm(prompt)
        
        # Robust parsing using simple checks
        question = ""
        options = {}
        correct = ""
        
        lines = [l.strip() for l in output.split("\n") if l.strip()]
        
        for line in lines:
            if line.startswith("Question:") or line.startswith("Q:"):
                question = line.split(":", 1)[1].strip()
            # Catch A) or A.
            elif line.startswith("A)") or line.startswith("A."):
                val = line.split(")", 1)[1] if ")" in line else line.split(".", 1)[1]
                options["A"] = val.strip()
            # Catch B) or B.
            elif line.startswith("B)") or line.startswith("B."):
                val = line.split(")", 1)[1] if ")" in line else line.split(".", 1)[1]
                options["B"] = val.strip()
            # Catch Correct: or Answer:
            elif line.startswith("Correct:") or line.startswith("Answer:"):
                # Extract A or B
                val = line.split(":", 1)[1].strip().upper()
                if "A" in val: correct = "A"
                elif "B" in val: correct = "B"

        # Validate
        if question and "A" in options and "B" in options and correct:
            return question, options, correct
            
    # Fallback if both attempts fail
    return (
        "Did you understand the explanation?",
        {"A": "Yes", "B": "No"},
        "A"
    )
