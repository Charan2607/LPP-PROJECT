import os
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB = os.getenv("MONGODB_DB", "lumen")

# Secure connection print (hiding credentials if present)
db_host = MONGODB_URI.split("@")[-1] if "@" in MONGODB_URI else MONGODB_URI
print(f"Connecting to MongoDB database '{MONGODB_DB}' at '{db_host}'...")

client = MongoClient(MONGODB_URI)
db = client[MONGODB_DB]
predictions_col = db["predictions"]

def save_prediction(input_data: dict, prediction_score: float, model_name: str):
    """
    Saves a student prediction record to MongoDB 'predictions' collection.
    """
    from datetime import datetime
    
    document = {
        "previousScore": input_data.get("previousScore"),
        "studyHours": input_data.get("studyHours"),
        "sleepHours": input_data.get("sleepHours"),
        "assignments": input_data.get("assignments"),
        "participation": input_data.get("participation"),
        "attendance": input_data.get("attendance"),
        "prediction": float(prediction_score),
        "model": model_name,
        "createdAt": datetime.utcnow().isoformat() + "Z"
    }
    
    result = predictions_col.insert_one(document)
    # Convert ObjectId to string for response reference
    document["_id"] = str(result.inserted_id)
    return document

def get_recent_predictions(limit: int = 50):
    """
    Fetches recent prediction records.
    """
    cursor = predictions_col.find().sort("createdAt", -1).limit(limit)
    records = []
    for doc in cursor:
        doc["_id"] = str(doc["_id"])
        records.append(doc)
    return records
