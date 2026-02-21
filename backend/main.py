from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import joblib
import pandas as pd
import numpy as np
import io

app = FastAPI(title="Tourism Forecast API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "https://mlproject-tourism-xgboost-1rh9tx95v.vercel.app","https://mlproject-tourism-xgboost-495btdvw1.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load trained objects
model = joblib.load("model.pkl")
scaler = joblib.load("scaler.pkl")
le = joblib.load("label_encoder.pkl")

class TouristInput(BaseModel):
    originCountry: str
    year: int
    month: int
    dollarRate: float
    apparent_temperature_mean_celcius: float
    sunshine_duration_seconds: float
    rain_sum_mm: float
    precipitation_hours: float
    num_establishments: float
    num_rooms: float
    AirPassengerFaresIndex: float
    consumerPriceIndex: float
    lag_1: Optional[float] = 0.0
    lag_2: Optional[float] = 0.0
    lag_3: Optional[float] = 0.0
    rolling_mean_3: Optional[float] = 0.0

def run_prediction(input_df: pd.DataFrame) -> np.ndarray:
    """Encode, scale, and predict for a prepared DataFrame."""
    input_df = input_df[scaler.feature_names_in_]
    input_scaled = scaler.transform(input_df)
    return model.predict(input_scaled)

@app.post("/predict")
def predict(data: TouristInput):
    encoded_country = le.transform([data.originCountry])[0]

    input_df = pd.DataFrame([{
        "originCountry": encoded_country,
        "year": data.year,
        "month": data.month,
        "dollarRate": data.dollarRate,
        "apparent_temperature_mean_celcius": data.apparent_temperature_mean_celcius,
        "sunshine_duration_seconds": data.sunshine_duration_seconds,
        "rain_sum_mm": data.rain_sum_mm,
        "precipitation_hours": data.precipitation_hours,
        "num_establishments": data.num_establishments,
        "num_rooms": data.num_rooms,
        "AirPassengerFaresIndex": data.AirPassengerFaresIndex,
        "consumerPriceIndex": data.consumerPriceIndex,
        "lag_1": data.lag_1,
        "lag_2": data.lag_2,
        "lag_3": data.lag_3,
        "rolling_mean_3": data.rolling_mean_3
    }])

    # Reorder columns to match the order used during training
    input_df = input_df[scaler.feature_names_in_]

    input_scaled = scaler.transform(input_df)
    prediction = model.predict(input_scaled)[0]

    return {"predicted_tourists": float(prediction)}


@app.post("/predict-csv")
async def predict_csv(file: UploadFile = File(...)):
    """
    Accept a CSV with historical tourist data (including a 'totalCount' column).
    Computes lag_1/2/3 and rolling_mean_3 from totalCount per country,
    then returns predictions for all valid rows.
    """
    # ── Read CSV ────────────────────────────────────────────────────────────────
    contents = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not parse CSV: {e}")

    # ── Validate required columns ───────────────────────────────────────────────
    required = [
        "originCountry", "year", "month", "totalCount",
        "dollarRate", "apparent_temperature_mean_celcius",
        "sunshine_duration_seconds", "rain_sum_mm", "precipitation_hours",
        "num_establishments", "num_rooms",
        "AirPassengerFaresIndex", "consumerPriceIndex",
    ]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise HTTPException(
            status_code=422,
            detail=f"Missing required columns: {', '.join(missing)}"
        )

    # ── Build date, sort ────────────────────────────────────────────────────────
    # Map month names to numbers if needed (e.g. "January" → 1)
    month_map = {
        "january":1,"february":2,"march":3,"april":4,
        "may":5,"june":6,"july":7,"august":8,
        "september":9,"october":10,"november":11,"december":12
    }
    if df["month"].dtype == object:
        df["month"] = df["month"].str.strip().str.lower().map(month_map)
        if df["month"].isna().any():
            raise HTTPException(status_code=422, detail="Unrecognised month name in 'month' column.")
    df["month"] = df["month"].astype(int)

    df["date"] = pd.to_datetime(df[["year", "month"]].assign(day=1))
    df = df.sort_values(["originCountry", "date"]).reset_index(drop=True)

    # ── Compute lag features per country ───────────────────────────────────────
    grp = df.groupby("originCountry")["totalCount"]
    df["lag_1"] = grp.shift(1)
    df["lag_2"] = grp.shift(2)
    df["lag_3"] = grp.shift(3)
    df["rolling_mean_3"] = grp.shift(1).transform(
        lambda s: s.rolling(window=3, min_periods=1).mean()
    )

    # Drop rows where we don't have enough history (first row per country has no lag_1)
    df = df.dropna(subset=["lag_1"]).reset_index(drop=True)

    if df.empty:
        raise HTTPException(
            status_code=422,
            detail="Not enough historical rows per country to compute lags. "
                   "Each country needs at least 2 rows."
        )

    # ── Encode country ─────────────────────────────────────────────────────────
    try:
        df["originCountry_enc"] = le.transform(df["originCountry"])
    except ValueError as e:
        raise HTTPException(status_code=422, detail=f"Unknown country value: {e}")

    # ── Build feature DataFrame ────────────────────────────────────────────────
    feature_df = pd.DataFrame({
        "originCountry": df["originCountry_enc"],
        "year": df["year"],
        "month": df["month"],
        "dollarRate": df["dollarRate"],
        "apparent_temperature_mean_celcius": df["apparent_temperature_mean_celcius"],
        "sunshine_duration_seconds": df["sunshine_duration_seconds"],
        "rain_sum_mm": df["rain_sum_mm"],
        "precipitation_hours": df["precipitation_hours"],
        "num_establishments": df["num_establishments"],
        "num_rooms": df["num_rooms"],
        "AirPassengerFaresIndex": df["AirPassengerFaresIndex"],
        "consumerPriceIndex": df["consumerPriceIndex"],
        "lag_1": df["lag_1"],
        "lag_2": df["lag_2"],
        "lag_3": df["lag_3"],
        "rolling_mean_3": df["rolling_mean_3"],
    })

    predictions = run_prediction(feature_df)

    # ── Build response ─────────────────────────────────────────────────────────
    results = []
    for i, (_, row) in enumerate(df.iterrows()):
        results.append({
            "row": i + 1,
            "originCountry": row["originCountry"],
            "year": int(row["year"]),
            "month": int(row["month"]),
            "dollarRate": float(row["dollarRate"]),
            "lag_1": float(row["lag_1"]),
            "lag_2": float(row["lag_2"]),
            "lag_3": float(row["lag_3"]),
            "rolling_mean_3": round(float(row["rolling_mean_3"]), 2),
            "actual_tourists": int(row["totalCount"]),
            "predicted_tourists": round(float(predictions[i])),
        })

    return {"count": len(results), "predictions": results}
