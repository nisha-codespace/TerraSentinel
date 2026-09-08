from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="TerraSentinel API")

# Allow React frontend to access the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SensorData(BaseModel):
    temperature: float
    humidity: float
    gas: int


# Store the latest sensor result
latest_data = {
    "temperature": 0,
    "humidity": 0,
    "gas": 0,
    "fire_risk": 0,
    "pollution_risk": 0,
    "alert": "WAITING FOR SENSOR"
}


@app.get("/")
def home():
    return {
        "message": "TerraSentinel API is running"
    }


# React will use this endpoint
@app.get("/sensor-data")
def get_sensor_data():
    return latest_data


# ESP32/Wokwi sends data here
@app.post("/sensor-data")
def receive_sensor_data(data: SensorData):

    fire_risk = 0
    pollution_risk = 0

    # -------------------------
    # Fire Risk
    # -------------------------

    if data.temperature > 35:
        fire_risk += 40

    if data.humidity < 40:
        fire_risk += 30

    if data.gas > 2000:
        fire_risk += 30

    # -------------------------
    # Pollution Risk
    # -------------------------

    if data.gas > 1500:
        pollution_risk += 50

    if data.gas > 2500:
        pollution_risk += 50

    fire_risk = min(fire_risk, 100)
    pollution_risk = min(pollution_risk, 100)

    # -------------------------
    # Overall Alert
    # -------------------------

    if fire_risk >= 70 or pollution_risk >= 70:
        alert = "HIGH ENVIRONMENTAL RISK"

    elif fire_risk >= 40 or pollution_risk >= 40:
        alert = "ENVIRONMENTAL RISK DETECTED"

    else:
        alert = "NORMAL"

    # Create result
    result = {
        "temperature": data.temperature,
        "humidity": data.humidity,
        "gas": data.gas,
        "fire_risk": fire_risk,
        "pollution_risk": pollution_risk,
        "alert": alert
    }

    # Save latest reading
    latest_data.update(result)

    return result