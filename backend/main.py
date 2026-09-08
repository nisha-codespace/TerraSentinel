from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="TerraSentinel API")


class SensorData(BaseModel):
    temperature: float
    humidity: float
    gas: int


@app.get("/")
def home():
    return {
        "message": "TerraSentinel API is running"
    }


@app.post("/sensor-data")
def receive_sensor_data(data: SensorData):

    fire_risk = 0
    pollution_risk = 0

    # Fire risk
    if data.temperature > 35:
        fire_risk += 40

    if data.humidity < 40:
        fire_risk += 30

    if data.gas > 2000:
        fire_risk += 30

    # Pollution risk
    if data.gas > 1500:
        pollution_risk += 50

    if data.gas > 2500:
        pollution_risk += 50

    fire_risk = min(fire_risk, 100)
    pollution_risk = min(pollution_risk, 100)

    if fire_risk >= 70 or pollution_risk >= 70:
        alert = "HIGH ENVIRONMENTAL RISK"
    elif fire_risk >= 40 or pollution_risk >= 40:
        alert = "ENVIRONMENTAL RISK DETECTED"
    else:
        alert = "NORMAL"

    return {
        "temperature": data.temperature,
        "humidity": data.humidity,
        "gas": data.gas,
        "fire_risk": fire_risk,
        "pollution_risk": pollution_risk,
        "alert": alert
    }