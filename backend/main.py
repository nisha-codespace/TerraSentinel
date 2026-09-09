import time
from typing import Dict, Optional
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="TerraSentinel Multi-Node API (All Live Wokwi)")

# Allow React frontend to access the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SensorData(BaseModel):
    temperature: float
    humidity: float
    gas: int
    node_id: Optional[str] = "node-1"


def calculate_risk(temperature: float, humidity: float, gas: int):
    fire_risk = 0
    pollution_risk = 0

    # -------------------------
    # Fire Risk
    # -------------------------
    if temperature > 35:
        fire_risk += 40
    if humidity < 40:
        fire_risk += 30
    if gas > 2000:
        fire_risk += 30

    # -------------------------
    # Pollution Risk
    # -------------------------
    if gas > 1500:
        pollution_risk += 50
    if gas > 2500:
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

    return fire_risk, pollution_risk, alert


# All 4 nodes are real Live Wokwi nodes (waiting for sensor transmissions)
nodes: Dict[str, dict] = {
    "node-1": {
        "id": "node-1",
        "name": "Sector Alpha",
        "role": "Forest Watch",
        "status": "waiting",
        "is_live": True,
        "temperature": 0.0,
        "humidity": 0.0,
        "gas": 0,
        "fire_risk": 0,
        "pollution_risk": 0,
        "alert": "WAITING FOR SENSOR",
        "last_updated": 0,
    },
    "node-2": {
        "id": "node-2",
        "name": "Sector Bravo",
        "role": "Valley Basin",
        "status": "waiting",
        "is_live": True,
        "temperature": 0.0,
        "humidity": 0.0,
        "gas": 0,
        "fire_risk": 0,
        "pollution_risk": 0,
        "alert": "WAITING FOR SENSOR",
        "last_updated": 0,
    },
    "node-3": {
        "id": "node-3",
        "name": "Sector Charlie",
        "role": "Ridge Summit",
        "status": "waiting",
        "is_live": True,
        "temperature": 0.0,
        "humidity": 0.0,
        "gas": 0,
        "fire_risk": 0,
        "pollution_risk": 0,
        "alert": "WAITING FOR SENSOR",
        "last_updated": 0,
    },
    "node-4": {
        "id": "node-4",
        "name": "Sector Delta",
        "role": "Industrial Border",
        "status": "waiting",
        "is_live": True,
        "temperature": 0.0,
        "humidity": 0.0,
        "gas": 0,
        "fire_risk": 0,
        "pollution_risk": 0,
        "alert": "WAITING FOR SENSOR",
        "last_updated": 0,
    },
}


def refresh_node_connection_statuses():
    """Checks heartbeat timeout for each Wokwi node (marks offline if >25s inactive)"""
    now = time.time()
    for node in nodes.values():
        if node["last_updated"] == 0:
            node["status"] = "waiting"
        elif now - node["last_updated"] > 25.0:
            node["status"] = "offline"
        else:
            node["status"] = "online"


@app.get("/")
def home():
    return {
        "message": "TerraSentinel Multi-Node API (Live Wokwi Only)",
        "nodes_count": len(nodes),
    }


@app.get("/nodes")
def get_all_nodes():
    refresh_node_connection_statuses()

    has_high = any(
        n["alert"] == "HIGH ENVIRONMENTAL RISK" and n["status"] == "online"
        for n in nodes.values()
    )
    has_warning = any(
        n["alert"] == "ENVIRONMENTAL RISK DETECTED" and n["status"] == "online"
        for n in nodes.values()
    )

    if has_high:
        network_alert = "HIGH ENVIRONMENTAL RISK"
    elif has_warning:
        network_alert = "ENVIRONMENTAL RISK DETECTED"
    else:
        network_alert = "NORMAL"

    online_count = sum(1 for n in nodes.values() if n["status"] == "online")

    return {
        "network_alert": network_alert,
        "total_nodes": len(nodes),
        "online_nodes": online_count,
        "nodes": list(nodes.values()),
    }


# React frontend sensor endpoint (supports ?node_id=...)
@app.get("/sensor-data")
def get_sensor_data(node_id: Optional[str] = "node-1"):
    refresh_node_connection_statuses()

    target_id = node_id if (node_id and node_id in nodes) else "node-1"
    target_node = nodes[target_id]

    has_high = any(
        n["alert"] == "HIGH ENVIRONMENTAL RISK" and n["status"] == "online"
        for n in nodes.values()
    )
    has_warning = any(
        n["alert"] == "ENVIRONMENTAL RISK DETECTED" and n["status"] == "online"
        for n in nodes.values()
    )
    network_alert = (
        "HIGH ENVIRONMENTAL RISK"
        if has_high
        else ("ENVIRONMENTAL RISK DETECTED" if has_warning else "NORMAL")
    )

    return {
        **target_node,
        "network_alert": network_alert,
        "all_nodes": list(nodes.values()),
    }


from typing import Dict, List, Optional, Union

# ESP32/Wokwi nodes send data here (supports single node or multi-sector batch)
@app.post("/sensor-data")
def receive_sensor_data(data: Union[SensorData, List[SensorData]]):
    if isinstance(data, list):
        updated_nodes = []
        now = time.time()
        for item in data:
            target_id = item.node_id if (item.node_id and item.node_id in nodes) else "node-1"
            fire_risk, pollution_risk, alert = calculate_risk(
                item.temperature, item.humidity, item.gas
            )
            result = {
                "temperature": item.temperature,
                "humidity": item.humidity,
                "gas": item.gas,
                "fire_risk": fire_risk,
                "pollution_risk": pollution_risk,
                "alert": alert,
                "last_updated": now,
                "status": "online",
                "is_live": True,
            }
            if target_id in nodes:
                nodes[target_id].update(result)
                updated_nodes.append(nodes[target_id])
            else:
                result["id"] = target_id
                result["name"] = f"Sector {target_id.upper()}"
                result["role"] = "Live Wokwi Node"
                nodes[target_id] = result
                updated_nodes.append(result)
        return {"status": "ok", "updated_count": len(updated_nodes), "nodes": updated_nodes}

    # Single node payload
    target_id = data.node_id if (data.node_id and data.node_id in nodes) else "node-1"
    fire_risk, pollution_risk, alert = calculate_risk(
        data.temperature, data.humidity, data.gas
    )

    result = {
        "temperature": data.temperature,
        "humidity": data.humidity,
        "gas": data.gas,
        "fire_risk": fire_risk,
        "pollution_risk": pollution_risk,
        "alert": alert,
        "last_updated": time.time(),
        "status": "online",
        "is_live": True,
    }

    if target_id in nodes:
        nodes[target_id].update(result)
        return nodes[target_id]

    result["id"] = target_id
    result["name"] = f"Sector {target_id.upper()}"
    result["role"] = "Live Wokwi Node"
    nodes[target_id] = result
    return result