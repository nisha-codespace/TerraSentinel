import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import "./App.css";

const API_URL =
  "https://clara-crucial-baths-butter.trycloudflare.com/sensor-data";

function App() {
  const [data, setData] = useState({
    temperature: 0,
    humidity: 0,
    gas: 0,
    fire_risk: 0,
    pollution_risk: 0,
    alert: "WAITING FOR SENSOR",
  });

  const [history, setHistory] = useState([]);

  const [anomaly, setAnomaly] = useState({
    detected: false,
    message: "Analyzing environmental conditions...",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(API_URL);

        if (!response.ok) {
          return;
        }

        const result = await response.json();

        setData(result);

        setHistory((previous) => {
          const newPoint = {
            time: new Date().toLocaleTimeString(),
            temperature: result.temperature,
            humidity: result.humidity,
            gas: result.gas,
          };

          const updated = [...previous, newPoint];

          // AI anomaly detection
          if (updated.length >= 3) {
            const previousReadings = updated.slice(0, -1);

            const averageGas =
              previousReadings.reduce(
                (sum, item) => sum + item.gas,
                0
              ) / previousReadings.length;

            const currentGas = result.gas;

            if (
              averageGas > 0 &&
              currentGas > averageGas * 1.5
            ) {
              setAnomaly({
                detected: true,
                message:
                  "Abnormal gas concentration detected. Possible environmental event.",
              });
            } else {
              setAnomaly({
                detected: false,
                message:
                  "Environmental conditions are within the recent baseline.",
              });
            }
          }

          // Keep only the latest 20 readings
          return updated.slice(-20);
        });
      } catch (error) {
        console.log("Waiting for sensor data...");
      }
    };

    fetchData();

    const interval = setInterval(fetchData, 5000);

    return () => clearInterval(interval);
  }, []);

  const getStatusClass = () => {
    if (data.alert === "HIGH ENVIRONMENTAL RISK") {
      return "high";
    }

    if (data.alert === "ENVIRONMENTAL RISK DETECTED") {
      return "warning";
    }

    return "normal";
  };

  return (
    <div className="app">

      {/* HEADER */}

      <header>
        <div>
          <h1>🌍 TerraSentinel</h1>

          <p>
            AI-Powered Environmental Monitoring Network
          </p>
        </div>

        <div className="live">
          <span></span>
          LIVE
        </div>
      </header>


      <main>

        {/* ALERT */}

        <section className={`alert ${getStatusClass()}`}>
          <h2>{data.alert}</h2>

          <p>
            Environmental monitoring node is active
          </p>
        </section>


        {/* SENSOR CARDS */}

        <section className="cards">

          <div className="card">
            <h3>🌡️ Temperature</h3>

            <strong>
              {data.temperature} °C
            </strong>

            <p>
              Current temperature
            </p>
          </div>


          <div className="card">
            <h3>💧 Humidity</h3>

            <strong>
              {data.humidity} %
            </strong>

            <p>
              Current humidity
            </p>
          </div>


          <div className="card">
            <h3>🏭 Gas Level</h3>

            <strong>
              {data.gas}
            </strong>

            <p>
              MQ2 sensor raw reading
            </p>
          </div>

        </section>


        {/* RISK ANALYSIS */}

        <section className="risk-section">

          <h2>
            Environmental Risk Analysis
          </h2>


          {/* FIRE RISK */}

          <div className="risk-card">

            <div>
              <h3>
                🔥 Fire Risk
              </h3>

              <p>
                Based on temperature, humidity and gas
              </p>
            </div>


            <div className="risk-meter">

              <div className="risk-number">
                {data.fire_risk}%
              </div>

              <div className="progress">

                <div
                  className="progress-fill"
                  style={{
                    width: `${data.fire_risk}%`,
                  }}
                ></div>

              </div>

            </div>

          </div>


          {/* POLLUTION RISK */}

          <div className="risk-card">

            <div>
              <h3>
                🏭 Pollution Risk
              </h3>

              <p>
                Based on detected gas concentration
              </p>
            </div>


            <div className="risk-meter">

              <div className="risk-number">
                {data.pollution_risk}%
              </div>

              <div className="progress">

                <div
                  className="progress-fill"
                  style={{
                    width: `${data.pollution_risk}%`,
                  }}
                ></div>

              </div>

            </div>

          </div>

        </section>


        {/* SENSOR HISTORY */}

        <section className="history">

          <h2>
            📈 Live Sensor Activity
          </h2>

          <p className="history-description">
            Sensor readings collected from the monitoring node
          </p>


          <div className="chart-container">

            {history.length > 0 ? (

              <ResponsiveContainer
                width="100%"
                height={320}
              >

                <LineChart data={history}>

                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="time"
                  />

                  <YAxis />

                  <Tooltip />


                  <Line
                    type="monotone"
                    dataKey="temperature"
                    strokeWidth={2}
                    name="Temperature"
                  />


                  <Line
                    type="monotone"
                    dataKey="humidity"
                    strokeWidth={2}
                    name="Humidity"
                  />


                  <Line
                    type="monotone"
                    dataKey="gas"
                    strokeWidth={2}
                    name="Gas"
                  />

                </LineChart>

              </ResponsiveContainer>

            ) : (

              <div className="no-data">
                Waiting for sensor readings...
              </div>

            )}

          </div>

        </section>


        {/* AI ENVIRONMENTAL INTELLIGENCE */}

        <section className="ai-section">

          <div className="ai-header">

            <div>

              <h2>
                🤖 AI Environmental Intelligence
              </h2>

              <p>
                Real-time anomaly detection from sensor behaviour
              </p>

            </div>


            <div className="ai-status">
              ● AI ACTIVE
            </div>

          </div>


          <div
            className={`ai-result ${
              anomaly.detected
                ? "anomaly"
                : "safe"
            }`}
          >

            <div className="ai-icon">
              {anomaly.detected
                ? "⚠️"
                : "✓"}
            </div>


            <div>

              <h3>
                {anomaly.detected
                  ? "ANOMALY DETECTED"
                  : "NO ANOMALY DETECTED"}
              </h3>

              <p>
                {anomaly.message}
              </p>

            </div>

          </div>

        </section>


        {/* MONITORING NODE */}

        <section className="node">

          <h2>
            📡 Monitoring Node
          </h2>


          <div className="node-info">

            <div>
              <span>
                Node ID
              </span>

              <strong>
                TS-NODE-001
              </strong>
            </div>


            <div>
              <span>
                Status
              </span>

              <strong>
                🟢 Online
              </strong>
            </div>


            <div>
              <span>
                Communication
              </span>

              <strong>
                Wi-Fi
              </strong>
            </div>

          </div>

        </section>

      </main>


      <footer>
        TerraSentinel • Resilient Environmental Intelligence Network
      </footer>

    </div>
  );
}

export default App;