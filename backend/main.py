import os

from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
import numpy as np

from backend.model_loader import load_model, predict_score, get_model_info
from backend.database import save_prediction, get_recent_predictions
from backend.auth import signup, login, verify_session_token, get_user_by_email, LoginRequest, SignupRequest, AuthResponse

app = FastAPI(title="LUMEN Prediction API", version="2.0")

# Enable CORS for local cross-origin development calls if needed
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in os.getenv(
            "FRONTEND_URLS",
            "http://localhost:8080,http://127.0.0.1:8080,http://localhost:8081,http://127.0.0.1:8081",
        ).split(",")
        if origin.strip()
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PredictionInput(BaseModel):
    attendance: float = Field(..., ge=0, le=100)
    studyHours: float = Field(..., ge=0, le=40)
    previousScore: float = Field(..., ge=0, le=100)
    assignments: float = Field(..., ge=0, le=100)
    participation: float = Field(..., ge=0, le=10)
    sleepHours: float = Field(..., ge=0, le=12)

@app.on_event("startup")
async def startup_event():
    try:
        load_model()
    except Exception as e:
        print(f"Startup Warning: Model could not be loaded ({e}). Make sure to run 'python scripts/train_models.py' first.")

@app.post("/auth/signup", response_model=AuthResponse)
async def signup_endpoint(req: SignupRequest):
    """Create a new user account"""
    result = signup(req.email, req.password, req.name)
    if not result.success:
        raise HTTPException(status_code=400, detail=result.message)
    return result

@app.post("/auth/login", response_model=AuthResponse)
async def login_endpoint(req: LoginRequest):
    """Login user with email and password"""
    result = login(req.email, req.password)
    if not result.success:
        raise HTTPException(status_code=401, detail=result.message)
    return result

@app.get("/auth/verify")
async def verify_endpoint(authorization: Optional[str] = Header(None)):
    """Verify session token"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    
    token = authorization.replace("Bearer ", "")
    email = verify_session_token(token)
    
    if not email:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user = get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return {"email": user.get("email"), "name": user.get("name")}

@app.post("/auth/logout")
async def logout_endpoint():
    """Logout user (client-side token deletion)"""
    return {"message": "Logged out successfully"}


@app.get("/model-info")
async def model_info():
    try:
        info = get_model_info()
        return info
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve model info: {str(e)}")

@app.get("/predictions")
async def predictions():
    try:
        recent = get_recent_predictions()
        return recent
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve predictions: {str(e)}")

@app.post("/predict")
async def predict(payload: PredictionInput):
    try:
        input_dict = payload.dict()
        
        # 1. Run ML Model Prediction
        pred_val = predict_score(input_dict)
        score = int(round(pred_val))
        
        # 2. Get Model Info for Metadata
        info = get_model_info()
        model_name = info["model"]
        
        # 3. Save prediction document to MongoDB
        db_record = save_prediction(input_dict, pred_val, model_name)
        
        # 4. Derive Grade and Risk matching existing frontend logic
        grade = "A+" if score >= 90 else "A" if score >= 80 else "B" if score >= 70 else "C" if score >= 60 else "D" if score >= 50 else "F"
        risk = "Low" if score >= 75 else "Medium" if score >= 55 else "High"
        
        # 5. Extract Feature Weights/Importances dynamically for the factor breakdown
        from backend.model_loader import best_model
        
        importances = []
        if hasattr(best_model, "coef_"):
            importances = np.abs(best_model.coef_)
        elif hasattr(best_model, "feature_importances_"):
            importances = np.abs(best_model.feature_importances_)
            
        total = sum(importances) if len(importances) > 0 else 0
        if total > 0:
            weights = [float(w / total) for w in importances]
        else:
            weights = [0.2, 0.2, 0.2, 0.2, 0.2]
            
        # Scaled values matching original frontend representation
        prev_scaled = input_dict["previousScore"] / 100.0
        study_scaled = input_dict["studyHours"] / 40.0
        sleep_scaled = max(0.0, 1.0 - abs(input_dict["sleepHours"] - 8.0) / 6.0)
        assignments_scaled = input_dict["assignments"] / 100.0
        participation_scaled = 0.8 if input_dict["participation"] >= 5 else 0.5
        attendance_scaled = input_dict["attendance"] / 100.0
        
        factors = [
            { "label": "Prior Academic", "value": int(round(prev_scaled * 100)), "weight": int(round(weights[0] * 100)) },
            { "label": "Attendance", "value": int(round(attendance_scaled * 100)), "weight": 0 }, # 0 weight prevents target leakage
            { "label": "Assignments", "value": int(round(assignments_scaled * 100)), "weight": int(round(weights[1] * 100)) },
            { "label": "Study Habit", "value": int(round(study_scaled * 100)), "weight": int(round(weights[2] * 100)) },
            { "label": "Participation", "value": int(round(participation_scaled * 100)), "weight": int(round(weights[3] * 100)) },
            { "label": "Sleep Balance", "value": int(round(sleep_scaled * 100)), "weight": int(round(weights[4] * 100)) }
        ]
        
        # 6. Generate action recommendations
        suggestions = []
        if input_dict["attendance"] < 85:
            suggestions.append("Improve attendance — aim above 85%.")
        if input_dict["studyHours"] < 15:
            suggestions.append("Increase focused study time to 15+ hrs/week.")
        if input_dict["assignments"] < 80:
            suggestions.append("Complete outstanding assignments consistently.")
        if input_dict["participation"] < 5:
            suggestions.append("Engage more in class — ask & answer questions.")
        if input_dict["sleepHours"] < 7:
            suggestions.append("Optimize sleep — target 7-9 hours nightly.")
        if not suggestions:
            suggestions.append("Excellent balance. Maintain your rhythm.")
            
        return {
            "prediction": pred_val,
            "model": model_name,
            "score": score,
            "grade": grade,
            "risk": risk,
            "factors": factors,
            "suggestions": suggestions,
            "recordId": db_record["_id"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")
