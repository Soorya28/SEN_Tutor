# app/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.learning import router as learning_router
from app.api.emotion import router as emotion_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Prefixes defined ONLY here
app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(learning_router, prefix="/learning", tags=["learning"])
app.include_router(emotion_router, prefix="/emotion", tags=["emotion"])

@app.get("/health")
def health():
    return {"status": "ok"}
