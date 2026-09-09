# TerraSentinel — Quick Setup Guide

Follow these steps to run the complete **TerraSentinel** multi-node IoT environmental monitoring system with Wokwi and Cloudflare Tunnel.

---

## 1. Start FastAPI Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 2. Start Cloudflare Tunnel

Open a new terminal window and run:

```bash
cloudflared tunnel --url http://localhost:8000
```

Look for the public URL in the terminal output:
`https://<YOUR-SUBDOMAIN>.trycloudflare.com`

---

## 3. Update ESP32 Firmware Server URL

Open `src/main.cpp` (or `sketch.ino`) and set `serverURL` to your Cloudflare tunnel endpoint:

```cpp
const char *serverURL = "https://<YOUR-SUBDOMAIN>.trycloudflare.com/sensor-data";
```

Compile firmware:
```bash
pio run
```

---

## 4. Run Wokwi Simulator

1. Open VS Code with the **Wokwi Simulator extension** installed.
2. Open `diagram.json`.
3. Press `F1` -> **Wokwi: Start Simulator** (or click the green Play button).

---

## 5. Start React Frontend Dashboard

Open a new terminal window:

```bash
cd frontend
npm install
npm run dev
```

Open your browser to: **`http://localhost:5173`**
