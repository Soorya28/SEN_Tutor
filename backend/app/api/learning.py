from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.core.llm_adapter import generate_mcq
from app.core.decision_engine import get_session
from app.core.llm_adapter import generate_parts, explain_part

router = APIRouter()


class LearningRequest(BaseModel):
    session_token: str
    topic: Optional[str] = None


@router.post("/start")
def start_learning(data: LearningRequest):
    session = get_session(data.session_token)

    # 🔥 RESET session when a NEW topic is provided
    if data.topic:
        session["topic"] = data.topic
        session["current_part_index"] = 0
        session["simplicity_level"] = 1
        session["parts"] = generate_parts(data.topic)
        session["next_action"] = None 

    if not session:
        raise HTTPException(status_code=400, detail="Invalid session")

    # ---------- FIRST TIME TOPIC ----------
    if session["topic"] is None:
        if not data.topic:
            raise HTTPException(status_code=400, detail="Topic required")

        session["topic"] = data.topic
        session["parts"] = generate_parts(data.topic)
        session["current_part_index"] = 0
        session["simplicity_level"] = 1
        session["last_emotion"] = "neutral"
        session["next_action"] = None
        
        total = len(session["parts"])
        part = session["parts"][0]

        content = explain_part(
            session["topic"],
            part,
            session["simplicity_level"],
        )

        question, options, correct = generate_mcq(
            session["topic"],
            part
        )

        session["current_question"] = question
        session["correct_option"] = correct

        return {
            "content": content,
            "question": question,
            "options": options,
            "part_number": session["current_part_index"] + 1,
            "total_parts": total,
        }
    
    # ---------- DECISION PHASE (Determine WHERE to go next) ----------
    next_action = session.get("next_action")
    status = ""
    
    if next_action:
        if next_action == "next":
            # Check completion
            if session["current_part_index"] >= len(session["parts"]) - 1:
                # TOPIC COMPLETED
                session["topic"] = None
                session["parts"] = []
                session["current_part_index"] = 0
                session["simplicity_level"] = 1
                session["next_action"] = None
                
                return {
                    "completed": True,
                    "status": "topic_completed",
                    "content": "🎉 Great job! You have successfully completed this topic.",
                    "part_number": 5,
                    "total_parts": 5,
                }
            else:
                session["current_part_index"] += 1
                session["simplicity_level"] = 1 # Reset simplicity for new part
                status = "moving_to_next_part"

        elif next_action == "repeat_simple":
            session["simplicity_level"] = min(session["simplicity_level"] + 1, 3)
            status = "re_explaining_same_part"
        
        elif next_action == "repeat":
             status = "re_explaining_same_part"

        # Clear action after using it
        session["next_action"] = None

    # ---------- GENERATE CONTENT & MCQ FOR CURRENT STATE ----------
    part_index = session["current_part_index"]
    total = len(session["parts"])
    
    if part_index >= total:
         return {
            "completed": True,
            "status": "topic_completed",
            "content": "Topic Completed.",
            "part_number": total,
            "total_parts": total,
        }

    current_part = session["parts"][part_index]
    simplicity = session["simplicity_level"]

    # 1. Generate Explanation
    content = explain_part(
        session["topic"],
        current_part,
        simplicity,
    )

    # 2. Generate MCQ 
    question, options, correct = generate_mcq(
        session["topic"],
        current_part
    )

    session["current_question"] = question
    session["correct_option"] = correct

    # Return Response
    return {
        "completed": False,
        "status": status,
        "content": content,
        "question": question,
        "options": options,
        "part_number": part_index + 1,
        "total_parts": total,
    }


class AnswerRequest(BaseModel):
    session_token: str
    selected_option: str


@router.post("/answer")
def submit_answer(data: AnswerRequest):
    session = get_session(data.session_token)
    if not session:
        raise HTTPException(status_code=400, detail="Invalid session")

    correct = session.get("correct_option")
    emotion = session.get("last_emotion", "neutral") # Default to neutral if missing

    is_correct = (data.selected_option == correct)
    
    # LOGIC TABLE IMPLEMENTATION
    # | Answer  | Emotion  | Action                |
    # | ------- | -------- | --------------------- |
    # | Correct | Happy    | ✅ Next part          |
    # | Correct | Neutral  | ✅ Next part          |
    # | Correct | Confused | ❌ Same part (simpler)|
    # | Wrong   | Happy    | ❌ Same part          |
    # | Wrong   | Neutral  | ❌ Same part          |
    # | Wrong   | Confused | ❌ Same part          |

    next_action = "repeat" # Default fail safe

    if is_correct:
        if emotion in ["engaged", "happy", "neutral"]:
            next_action = "next"
        elif emotion == "confused":
            next_action = "repeat_simple"
        else:
             # Fallback for unexpected emotions
             next_action = "next" 
    else:
        # WRONG answer -> Always repeat
        # If confused, maybe simple? Table says just "Same part"
        # Let's align with table: "Same part" (keep simplicity or just repeat)
        next_action = "repeat"
        
        # User requested: "Confused -> Same part (simpler)" only when correct? 
        # Table row: "Wrong | Confused | Same part"
        # I will stick to the table strictly.

    session["next_action"] = next_action

    return {
        "move_forward": (next_action == "next"),
        "correct": is_correct,
        "emotion": emotion,
        "next_action": next_action
    }
