import { useEffect, useRef, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import "./App.css";

const API_URL = "http://localhost:8000/nodes";

const SECTORS_META = {
  "node-1": {
    name: "Sector Alpha",
    role: "Forest Watch",
    pins: "DHT: Pin 15 | MQ-2: Pin 34",
    color: "#10b981", // Emerald
    bgGlow: "rgba(16, 185, 129, 0.15)",
  },
  "node-2": {
    name: "Sector Bravo",
    role: "Valley Basin",
    pins: "DHT: Pin 13 | MQ-2: Pin 35",
    color: "#38bdf8", // Sky Blue
    bgGlow: "rgba(56, 189, 248, 0.15)",
  },
  "node-3": {
    name: "Sector Charlie",
    role: "Ridge Summit",
    pins: "DHT: Pin 14 | MQ-2: Pin 32",
    color: "#f59e0b", // Amber
    bgGlow: "rgba(245, 158, 11, 0.15)",
  },
  "node-4": {
    name: "Sector Delta",
    role: "Industrial Border",
    pins: "DHT: Pin 27 | MQ-2: Pin 33",
    color: "#c084fc", // Purple
    bgGlow: "rgba(192, 132, 252, 0.15)",
  },
};

function App() {
  const [nodes, setNodes] = useState([
    {
      id: "node-1",
      name: "Sector Alpha",
      role: "Forest Watch",
      status: "waiting",
      is_live: true,
      temperature: 0,
      humidity: 0,
      gas: 0,
      fire_risk: 0,
      pollution_risk: 0,
      alert: "WAITING FOR SENSOR",
    },
    {
      id: "node-2",
      name: "Sector Bravo",
      role: "Valley Basin",
      status: "waiting",
      is_live: true,
      temperature: 0,
      humidity: 0,
      gas: 0,
      fire_risk: 0,
      pollution_risk: 0,
      alert: "WAITING FOR SENSOR",
    },
    {
      id: "node-3",
      name: "Sector Charlie",
      role: "Ridge Summit",
      status: "waiting",
      is_live: true,
      temperature: 0,
      humidity: 0,
      gas: 0,
      fire_risk: 0,
      pollution_risk: 0,
      alert: "WAITING FOR SENSOR",
    },
    {
      id: "node-4",
      name: "Sector Delta",
      role: "Industrial Border",
      status: "waiting",
      is_live: true,
      temperature: 0,
      humidity: 0,
      gas: 0,
      fire_risk: 0,
      pollution_risk: 0,
      alert: "WAITING FOR SENSOR",
    },
  ]);

  const [networkAlert, setNetworkAlert] = useState("NORMAL");
  const [onlineCount, setOnlineCount] = useState(0);
  const [activeMetric, setActiveMetric] = useState("temp"); // "temp" | "hum" | "gas"
  const [timelineHistory, setTimelineHistory] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const audioCtxRef = useRef(null);
  const alarmRef = useRef(null);

  // Stop active alarm siren
  const stopAlarm = () => {
    if (alarmRef.current) {
      try {
        const { gainNode, ctx, oscs } = alarmRef.current;
        if (gainNode && ctx) {
          gainNode.gain.setValueAtTime(gainNode.gain.value, ctx.currentTime);
          gainNode.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.08);
          setTimeout(() => {
            try {
              oscs.forEach((osc) => {
                osc.stop();
                osc.disconnect();
              });
            } catch (e) {}
          }, 90);
        }
      } catch (e) {}
      alarmRef.current = null;
    }
  };

  // Start continuous acoustic emergency siren
  const startAlarm = (isCritical = false) => {
    if (alarmRef.current?.isCritical === isCritical) {
      return;
    }
    stopAlarm();

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }

      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.18, ctx.currentTime);

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(2600, ctx.currentTime);

      masterGain.connect(filter);
      filter.connect(ctx.destination);

      const carrier = ctx.createOscillator();
      carrier.type = isCritical ? "sawtooth" : "triangle";
      const baseFreq = isCritical ? 880 : 640;
      carrier.frequency.setValueAtTime(baseFreq, ctx.currentTime);

      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();

      lfo.type = "sine";
      lfo.frequency.setValueAtTime(isCritical ? 3.5 : 1.6, ctx.currentTime);
      lfoGain.gain.setValueAtTime(isCritical ? 240 : 140, ctx.currentTime);

      lfo.connect(carrier.frequency);
      carrier.connect(masterGain);

      carrier.start();
      lfo.start();

      alarmRef.current = {
        isCritical,
        ctx,
        gainNode: masterGain,
        oscs: [carrier, lfo],
      };
    } catch (err) {
      console.warn("Unable to start alarm audio:", err);
    }
  };

  // Check network threat severity across all active sectors
  const criticalSectors = nodes.filter(
    (n) =>
      n.status === "online" &&
      (n.alert === "HIGH ENVIRONMENTAL RISK" ||
        n.fire_risk >= 70 ||
        n.pollution_risk >= 70)
  );

  const warningSectors = nodes.filter(
    (n) =>
      n.status === "online" &&
      (n.alert === "ENVIRONMENTAL RISK DETECTED" ||
        n.fire_risk >= 40 ||
        n.pollution_risk >= 40)
  );

  const hasCritical = criticalSectors.length > 0;
  const hasWarning = warningSectors.length > 0;
  const hasRisk = hasCritical || hasWarning;
  const isAlarmRinging = hasRisk && soundEnabled;

  // Manage continuous audio alarm
  useEffect(() => {
    if (soundEnabled && hasRisk) {
      startAlarm(hasCritical);
    } else {
      stopAlarm();
    }

    return () => {
      stopAlarm();
    };
  }, [hasRisk, hasCritical, soundEnabled]);

  // Fetch all 4 nodes simultaneously
  useEffect(() => {
    const fetchAllNodes = async () => {
      try {
        const response = await fetch(API_URL);
        if (!response.ok) return;

        const result = await response.json();
        if (result.nodes) {
          setNodes(result.nodes);
          setOnlineCount(result.online_nodes ?? 0);
          setNetworkAlert(result.network_alert ?? "NORMAL");

          // Build unified comparative timeline point
          const timeLabel = new Date().toLocaleTimeString();
          const newPoint = { time: timeLabel };

          result.nodes.forEach((node) => {
            newPoint[`${node.id}_temp`] = node.temperature;
            newPoint[`${node.id}_hum`] = node.humidity;
            newPoint[`${node.id}_gas`] = node.gas;
          });

          setTimelineHistory((prev) => [...prev, newPoint].slice(-24));
        }
      } catch (err) {
        // Backend offline or reconnecting
      }
    };

    fetchAllNodes();
    const interval = setInterval(fetchAllNodes, 4000);
    return () => clearInterval(interval);
  }, []);

  const getSeverityBadge = (node) => {
    if (node.status !== "online") {
      return { text: "STANDBY", class: "standby" };
    }
    if (node.alert === "HIGH ENVIRONMENTAL RISK" || node.fire_risk >= 70 || node.pollution_risk >= 70) {
      return { text: "CRITICAL HAZARD", class: "danger" };
    }
    if (node.alert === "ENVIRONMENTAL RISK DETECTED" || node.fire_risk >= 40 || node.pollution_risk >= 40) {
      return { text: "RISK DETECTED", class: "warning" };
    }
    return { text: "NORMAL", class: "normal" };
  };

  return (
    <div className="command-center">
      {/* GLOBAL HEADER */}
      <header className="cc-header">
        <div className="cc-brand">
          <div className="radar-icon">
            <span className="radar-beam"></span>
            <span className="radar-center"></span>
          </div>
          <div>
            <h1>TerraSentinel</h1>
            <p className="cc-subtitle">Multi-Sector IoT Environmental Defense Mesh</p>
          </div>
        </div>

        <div className="cc-header-controls">
          <div className="network-pill">
            <span className={`status-dot ${onlineCount > 0 ? "live" : "waiting"}`}></span>
            <strong>{onlineCount} / 4</strong> Wokwi Nodes Online
          </div>

          <button
            type="button"
            className={`sound-btn ${soundEnabled ? "active" : ""} ${
              isAlarmRinging ? "ringing" : ""
            }`}
            onClick={() => setSoundEnabled((prev) => !prev)}
            title={soundEnabled ? "Mute alert audio" : "Enable alert audio"}
          >
            {soundEnabled
              ? isAlarmRinging
                ? "🚨 SIREN RINGING"
                : "🔊 Siren Armed"
              : "🔇 Siren Muted"}
          </button>
        </div>
      </header>

      {/* NETWORK THREAT BANNER */}
      {hasRisk ? (
        <div className={`network-alert-banner ${hasCritical ? "critical" : "warning"}`}>
          <div className="alert-banner-content">
            <span className="alert-badge-pulse">
              {hasCritical ? "CRITICAL ALERT" : "HAZARD DETECTED"}
            </span>
            <p>
              {hasCritical
                ? `Emergency fire/pollution hazard active in: ${criticalSectors.map((s) => s.name).join(", ")}`
                : `Elevated environmental risk detected in: ${warningSectors.map((s) => s.name).join(", ")}`}
            </p>
          </div>
          <span className="alert-action-tag">Acoustic Siren Active</span>
        </div>
      ) : (
        <div className="network-alert-banner safe">
          <div className="alert-banner-content">
            <span className="alert-badge-safe">DEFENSE MESH STABLE</span>
            <p>All environmental sectors within safe baseline parameters.</p>
          </div>
          <span className="alert-action-tag safe">Zero Threats</span>
        </div>
      )}

      {/* 4-SECTOR COMMAND GRID (ALL NODES SIMULTANEOUSLY) */}
      <section className="sectors-section">
        <div className="section-title-bar">
          <div>
            <h2>Operational Sector Matrix</h2>
            <p className="section-desc">
              Real-time telemetry and hazard risk engine for all 4 Wokwi environmental nodes
            </p>
          </div>
          <span className="sectors-count-badge">4 Active Sectors</span>
        </div>

        <div className="sectors-grid">
          {nodes.map((node) => {
            const meta = SECTORS_META[node.id] || {
              name: node.name,
              role: node.role,
              pins: "Pins Unassigned",
              color: "#38bdf8",
            };
            const sev = getSeverityBadge(node);
            const isOnline = node.status === "online";

            return (
              <div
                key={node.id}
                className={`sector-card ${sev.class} ${isOnline ? "online" : "offline"}`}
                style={{ "--sector-accent": meta.color }}
              >
                {/* Sector Card Header */}
                <div className="sector-card-header">
                  <div>
                    <span className="sector-id-tag">{node.id.toUpperCase()}</span>
                    <h3 className="sector-name">{meta.name}</h3>
                    <p className="sector-role">{meta.role}</p>
                  </div>
                  <div className="sector-badges">
                    <span className={`connection-badge ${node.status}`}>
                      {node.status === "online" ? "● Live Wokwi" : node.status === "waiting" ? "⏳ Waiting" : "Offline"}
                    </span>
                    <span className={`threat-badge ${sev.class}`}>{sev.text}</span>
                  </div>
                </div>

                {/* Hardware Pin Tag */}
                <div className="pin-mapping-tag">
                  <span className="pin-icon">⚡</span>
                  <code>{meta.pins}</code>
                </div>

                {/* Live Telemetry Display */}
                <div className="telemetry-deck">
                  {/* Temperature */}
                  <div className="telemetry-box temp">
                    <div className="telemetry-box-header" title="Temperature">
                      <span>🌡️ Temp</span>
                      <span className="mini-status">
                        {node.temperature > 35 ? "High" : "Optimal"}
                      </span>
                    </div>
                    <div className="telemetry-value">
                      <strong>{isOnline ? node.temperature.toFixed(1) : "--"}</strong>
                      <small>°C</small>
                    </div>
                    <div className="sensor-meter-track">
                      <div
                        className="sensor-meter-fill temp-fill"
                        style={{
                          width: `${Math.min(100, Math.max(0, (node.temperature / 50) * 100))}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Humidity */}
                  <div className="telemetry-box hum">
                    <div className="telemetry-box-header" title="Humidity">
                      <span>💧 Hum</span>
                      <span className="mini-status">
                        {node.humidity < 40 ? "Dry" : "Normal"}
                      </span>
                    </div>
                    <div className="telemetry-value">
                      <strong>{isOnline ? node.humidity.toFixed(1) : "--"}</strong>
                      <small>%</small>
                    </div>
                    <div className="sensor-meter-track">
                      <div
                        className="sensor-meter-fill hum-fill"
                        style={{
                          width: `${Math.min(100, Math.max(0, node.humidity))}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Gas Concentration */}
                  <div className="telemetry-box gas">
                    <div className="telemetry-box-header" title="Gas Concentration">
                      <span>💨 Gas</span>
                      <span className="mini-status">
                        {node.gas > 1500 ? "Toxic" : "Clean"}
                      </span>
                    </div>
                    <div className="telemetry-value">
                      <strong>{isOnline ? node.gas : "--"}</strong>
                      <small>ppm</small>
                    </div>
                    <div className="sensor-meter-track">
                      <div
                        className="sensor-meter-fill gas-fill"
                        style={{
                          width: `${Math.min(100, Math.max(0, (node.gas / 3000) * 100))}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* AI Environmental Threat Analysis Deck */}
                <div className="risk-deck">
                  <div className="risk-deck-title">
                    <span>🤖 AI Threat Analysis</span>
                    <small className="ai-status-pill">ML Model Active</small>
                  </div>

                  {/* Fire Risk */}
                  <div className="risk-gauge-row">
                    <div className="risk-gauge-label">
                      <span>🔥 AI Wildfire Risk</span>
                      <strong>{isOnline ? `${node.fire_risk}%` : "--"}</strong>
                    </div>
                    <div className="risk-progress-track">
                      <div
                        className="risk-progress-bar fire-bar"
                        style={{ width: `${node.fire_risk}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Pollution Risk */}
                  <div className="risk-gauge-row">
                    <div className="risk-gauge-label">
                      <span>🏭 AI Air Quality / Pollution Risk</span>
                      <strong>{isOnline ? `${node.pollution_risk}%` : "--"}</strong>
                    </div>
                    <div className="risk-progress-track">
                      <div
                        className="risk-progress-bar pollution-bar"
                        style={{ width: `${node.pollution_risk}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* COMPARATIVE MULTI-NODE TIME SERIES CHART */}
      <section className="analytics-section">
        <div className="chart-header-bar">
          <div>
            <h2>Comparative Network Analytics</h2>
            <p className="section-desc">
              Synchronized multi-line telemetry across all four environmental sectors
            </p>
          </div>

          {/* Metric Switcher */}
          <div className="metric-tabs">
            <button
              type="button"
              className={`metric-tab ${activeMetric === "temp" ? "active" : ""}`}
              onClick={() => setActiveMetric("temp")}
            >
              <span className="metric-tab-full">🌡️ Temperature (°C)</span>
              <span className="metric-tab-short">🌡️ Temp</span>
            </button>
            <button
              type="button"
              className={`metric-tab ${activeMetric === "hum" ? "active" : ""}`}
              onClick={() => setActiveMetric("hum")}
            >
              <span className="metric-tab-full">💧 Humidity (%)</span>
              <span className="metric-tab-short">💧 Hum</span>
            </button>
            <button
              type="button"
              className={`metric-tab ${activeMetric === "gas" ? "active" : ""}`}
              onClick={() => setActiveMetric("gas")}
            >
              <span className="metric-tab-full">💨 Gas / Smoke (PPM)</span>
              <span className="metric-tab-short">💨 Gas</span>
            </button>
          </div>
        </div>

        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={timelineHistory} margin={{ top: 15, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
              <XAxis dataKey="time" stroke="#64748b" tick={{ fill: "#64748b", fontSize: 11 }} />
              <YAxis
                stroke="#64748b"
                tick={{ fill: "#64748b", fontSize: 11 }}
                domain={
                  activeMetric === "temp"
                    ? [10, 50]
                    : activeMetric === "hum"
                    ? [0, 100]
                    : [0, 3000]
                }
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderColor: "#334155",
                  borderRadius: "8px",
                  color: "#f8fafc",
                  fontSize: "12px",
                }}
              />
              <Legend wrapperStyle={{ paddingTop: "10px", fontSize: "12px" }} />

              {/* Sector Alpha Line */}
              <Line
                type="monotone"
                dataKey={`node-1_${activeMetric}`}
                name="Sector Alpha"
                stroke={SECTORS_META["node-1"].color}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5 }}
              />

              {/* Sector Bravo Line */}
              <Line
                type="monotone"
                dataKey={`node-2_${activeMetric}`}
                name="Sector Bravo"
                stroke={SECTORS_META["node-2"].color}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5 }}
              />

              {/* Sector Charlie Line */}
              <Line
                type="monotone"
                dataKey={`node-3_${activeMetric}`}
                name="Sector Charlie"
                stroke={SECTORS_META["node-3"].color}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5 }}
              />

              {/* Sector Delta Line */}
              <Line
                type="monotone"
                dataKey={`node-4_${activeMetric}`}
                name="Sector Delta"
                stroke={SECTORS_META["node-4"].color}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* MESH HEALTH & HARDWARE PIN GUIDE */}
      <section className="guide-section">
        <div className="guide-box">
          <h3>📡 Wokwi Simulator Controls Guide</h3>
          <p>
            You can interactively change values on any of the 4 sensors inside your Wokwi canvas:
          </p>
          <div className="guide-grid">
            <div className="guide-item">
              <strong>Sector Alpha</strong>
              <span>Click <code>dht1</code> or <code>mq2_1</code> on left side</span>
            </div>
            <div className="guide-item">
              <strong>Sector Bravo</strong>
              <span>Click <code>dht2</code> or <code>mq2_2</code> on bottom-left</span>
            </div>
            <div className="guide-item">
              <strong>Sector Charlie</strong>
              <span>Click <code>dht3</code> or <code>mq2_3</code> on right side</span>
            </div>
            <div className="guide-item">
              <strong>Sector Delta</strong>
              <span>Click <code>dht4</code> or <code>mq2_4</code> on bottom-right</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default App;