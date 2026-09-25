import os
import json
import urllib.request
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.tree import DecisionTreeRegressor
from xgboost import XGBRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import joblib

def main():
    # URL for Student_Performance.csv
    url = "https://raw.githubusercontent.com/sumana-2705/Predicting-Student-Performance-Index/main/Student_Performance.csv"
    csv_dir = "scripts"
    csv_path = os.path.join(csv_dir, "Student_Performance.csv")
    
    # Ensure scripts directory exists
    os.makedirs(csv_dir, exist_ok=True)
    
    if not os.path.exists(csv_path):
        print(f"Downloading dataset from {url}...")
        try:
            urllib.request.urlretrieve(url, csv_path)
            print("Download successful.")
        except Exception as e:
            print(f"Error downloading dataset: {e}")
            return
    else:
        print("Dataset already exists locally.")

    # Load dataset
    print("Loading and preprocessing dataset...")
    df = pd.read_csv(csv_path)
    
    # Preprocessing features without target leakage (excluding attendance!)
    # 1. previousScore (Previous Scores range: 0-100, scale 0-1)
    df['previousScore_scaled'] = df['Previous Scores'] / 100.0
    
    # 2. studyHours (Hours Studied range: 1-9, scale 0-1 based on max of 40 in frontend)
    df['studyHours_scaled'] = df['Hours Studied'] / 40.0
    
    # 3. sleepHours (Sleep Hours range: 4-9, scale 0-1 using Gaussian-ish falloff)
    df['sleep_scaled'] = np.maximum(0.0, 1.0 - np.abs(df['Sleep Hours'] - 8.0) / 6.0)
    
    # 4. assignments (Sample Question Papers Practiced range: 0-9, mapped to percentage, scaled 0-1)
    df['assignments_scaled'] = (df['Sample Question Papers Practiced'] * 10.0) / 100.0
    
    # 5. participation (Extracurricular Activities: Yes/No, mapped to 0.8 / 0.5, scaled 0-1)
    df['participation_scaled'] = df['Extracurricular Activities'].apply(lambda x: 0.8 if x == 'Yes' else 0.5)
    
    # Keep the numeric target so the models learn to predict the score directly.
    y = df['Performance Index'].astype(float)
    
    # Feature matrix (Genuine features only, no attendance!)
    features = [
        'previousScore_scaled',
        'assignments_scaled',
        'studyHours_scaled',
        'participation_scaled',
        'sleep_scaled'
    ]
    X = df[features]
    
    # Train/Test Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42
    )
    
    # Regression is a better fit for a numeric performance score than exact
    # classification into one class for every possible score.
    models = {
        "Linear Regression": LinearRegression(),
        "Random Forest": RandomForestRegressor(
            n_estimators=500,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1,
        ),
        "XGBoost": XGBRegressor(
            n_estimators=300,
            max_depth=6,
            learning_rate=0.05,
            objective="reg:squarederror",
            eval_metric="rmse",
            random_state=42,
            n_jobs=-1,
        ),
        "Decision Tree": DecisionTreeRegressor(
            min_samples_leaf=2,
            random_state=42,
        ),
    }
    
    results = {}
    trained_models = {}
    
    for name, model in models.items():
        print(f"Training {name}...")
        model.fit(X_train, y_train)
        trained_models[name] = model
        
        # Predict on test set
        y_pred = model.predict(X_test)
        
        results[name] = {
            "mae": float(mean_absolute_error(y_test, y_pred)),
            "rmse": float(np.sqrt(mean_squared_error(y_test, y_pred))),
            "r2": float(r2_score(y_test, y_pred)),
        }
        
    # Print comparison report format as requested
    print("\n==================================================")
    print("MODEL COMPARISON (lower RMSE is better)")
    print("==================================================")
    for name in models.keys():
        print(f"\n{name}")
        print(f"MAE: {results[name]['mae']:.2f}")
        print(f"RMSE: {results[name]['rmse']:.2f}")
        print(f"R2: {results[name]['r2']:.4f}")
    print("\n==================================================")
    
    # Programmatic best model selection based on lowest test-set RMSE.
    best_name = min(results, key=lambda name: results[name]["rmse"])
    best_metrics = results[best_name]
    best_model = trained_models[best_name]
    
    print("BEST MODEL")
    print("==================================================")
    print(f"Model: {best_name}")
    print(f"MAE: {best_metrics['mae']:.2f}")
    print(f"RMSE: {best_metrics['rmse']:.2f}")
    print(f"R2: {best_metrics['r2']:.4f}")
    print("==================================================")
    
    # Ensure models directory exists
    os.makedirs("models", exist_ok=True)
    
    # Save best model and metadata
    model_path = "models/best_model.joblib"
    joblib.dump(best_model, model_path)
    print(f"Saved best model to {model_path}")
    
    metadata = {
        "model": best_name,
        "selection_metric": "rmse",
        "mae": best_metrics["mae"],
        "rmse": best_metrics["rmse"],
        "r2": best_metrics["r2"],
        "model_comparison": results,
        "features": features,
        "target": "Performance Index"
    }
    
    metadata_path = "models/model_metadata.json"
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"Saved model metadata to {metadata_path}")
    
if __name__ == "__main__":
    main()
