from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import pandas as pd
import numpy as np

app = FastAPI(title="Tourism Forecast API")

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
    lag_1: float
    lag_2: float
    lag_3: float
    rolling_mean_3: float

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

    input_scaled = scaler.transform(input_df)
    prediction = model.predict(input_scaled)[0]

    return {"predicted_tourists": float(prediction)}