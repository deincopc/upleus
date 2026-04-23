import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Upleus — Uptime & SSL Monitoring";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#030712",
          position: "relative",
        }}
      >
        {/* Grid lines */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        {/* Glow blob */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "800px",
            height: "500px",
            borderRadius: "50%",
            background: "radial-gradient(ellipse, rgba(16,185,129,0.18) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />

        {/* Status dot row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "32px",
            background: "rgba(16,185,129,0.1)",
            border: "1px solid rgba(16,185,129,0.2)",
            borderRadius: "100px",
            padding: "8px 20px",
          }}
        >
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#10b981",
            }}
          />
          <span style={{ color: "#6ee7b7", fontSize: "16px", fontWeight: 600 }}>
            All systems operational
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: "72px",
            fontWeight: 800,
            color: "white",
            textAlign: "center",
            lineHeight: 1.1,
            letterSpacing: "-2px",
            marginBottom: "20px",
            maxWidth: "900px",
          }}
        >
          Know before
          <br />
          <span style={{ color: "#10b981" }}>your users do</span>
        </div>

        {/* Sub */}
        <div
          style={{
            fontSize: "22px",
            color: "#6b7280",
            textAlign: "center",
            maxWidth: "700px",
          }}
        >
          Uptime, SSL, domain, and heartbeat monitoring with instant alerts
        </div>

        {/* Bottom brand */}
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "#10b981",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ width: "14px", height: "14px", borderRadius: "50%", background: "white" }} />
          </div>
          <span style={{ color: "#9ca3af", fontSize: "20px", fontWeight: 600 }}>Upleus</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
