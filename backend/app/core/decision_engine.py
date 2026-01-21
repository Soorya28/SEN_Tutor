# app/core/decision_engine.py

sessions = {}

def create_session(session_token: str):
    sessions[session_token] = {
        "topic": None,
        "parts": [],
        "current_part_index": 0,
        "simplicity_level": 1,
        "last_emotion": "neutral",
    }

def get_session(session_token: str):
    return sessions.get(session_token)

def update_emotion(session_token: str, emotion: str):
    if session_token in sessions:
        sessions[session_token]["last_emotion"] = emotion
