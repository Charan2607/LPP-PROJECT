import os
import json
import numpy as np
import joblib
import pandas as pd

MODEL_PATH = "models/best_model.joblib"
METADATA_PATH = "models/model_metadata.json"

best_model = None
metadata = None

def load_model():
    """
    Loads the trained best model and metadata.
    """
    global best_model, metadata
    if not os.path.exists(MODEL_PATH) or not os.path.exists(METADATA_PATH):
        raise FileNotFoundError(
            "Trained model files not found. Please run 'python scripts/train_models.py' first."
        )
    
    print(f"Loading best ML model from {MODEL_PATH}...")
    best_model = joblib.load(MODEL_PATH)
    
    with open(METADATA_PATH, 'r') as f:
        metadata = json.load(f)
    metric = metadata.get("selection_metric", "accuracy")
    metric_value = metadata.get(metric, 0.0)
    print(f"Model loaded: {metadata['model']} ({metric}: {metric_value:.4f})")

def get_model_info():
    """
    Returns loaded model metadata.
    """
    global metadata
    if metadata is None:
        load_model()
    return metadata

def predict_score(input_data: dict) -> float:
    """
    Applies preprocessing to input features and runs prediction with the loaded ML model.
    """
    global best_model, metadata
    if best_model is None or metadata is None:
        load_model()
        
    # Exact preprocessing matching the training script:
    # 1. previousScore: scale 0-1 from 0-100 range
    prev_scaled = float(input_data["previousScore"]) / 100.0
    
    # 2. studyHours: scale 0-1 from 0-40 range
    study_scaled = float(input_data["studyHours"]) / 40.0
    
    # 3. sleepHours: Gaussian-ish falloff centered around 8 hours
    sleep_scaled = max(0.0, 1.0 - abs(float(input_data["sleepHours"]) - 8.0) / 6.0)
    
    # 4. assignments: scale 0-1 from 0-100 completion percentage
    assignments_scaled = float(input_data["assignments"]) / 100.0
    
    # 5. participation: 0.8 if >= 5 else 0.5 (representing high/medium class interaction)
    participation_scaled = 0.8 if float(input_data["participation"]) >= 5 else 0.5

    # Features DataFrame matching the exact trained order:
    # ['previousScore_scaled', 'assignments_scaled', 'studyHours_scaled', 'participation_scaled', 'sleep_scaled']
    feature_dict = {
        'previousScore_scaled': [prev_scaled],
        'assignments_scaled': [assignments_scaled],
        'studyHours_scaled': [study_scaled],
        'participation_scaled': [participation_scaled],
        'sleep_scaled': [sleep_scaled]
    }
    X_pred = pd.DataFrame(feature_dict)
    
    # Predict
    y_pred = best_model.predict(X_pred)[0]
    
    prediction = float(y_pred)
    prediction = max(0.0, min(100.0, prediction))
    
    return prediction
