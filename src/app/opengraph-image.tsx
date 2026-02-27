import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "CampLog - Campaign Change Tracking for Ad Arbitrage Teams";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            background: "#366ae8",
          }}
        />

        {/* Logo + name */}
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 24 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 16,
              background: "#366ae8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 32,
              fontWeight: 700,
            }}
          >
            CL
          </div>
          <span style={{ fontSize: 56, fontWeight: 700, color: "#0f172a" }}>
            CampLog
          </span>
        </div>

        {/* Tagline */}
        <p
          style={{
            fontSize: 28,
            color: "#64748b",
            textAlign: "center",
            maxWidth: 700,
            lineHeight: 1.4,
            margin: 0,
          }}
        >
          Campaign change tracking built for
          <br />
          ad arbitrage performance teams
        </p>

        {/* Feature pills */}
        <div style={{ display: "flex", gap: 16, marginTop: 40 }}>
          {["AI Extraction", "Screenshot Support", "Impact Tracking"].map(
            (label) => (
              <div
                key={label}
                style={{
                  background: "rgba(54, 106, 232, 0.1)",
                  border: "1px solid rgba(54, 106, 232, 0.2)",
                  borderRadius: 100,
                  padding: "10px 24px",
                  fontSize: 18,
                  fontWeight: 600,
                  color: "#366ae8",
                }}
              >
                {label}
              </div>
            )
          )}
        </div>

        {/* Bottom branding */}
        <div
          style={{
            position: "absolute",
            bottom: 32,
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 16,
            color: "#94a3b8",
          }}
        >
          camplog-ltv.vercel.app
        </div>
      </div>
    ),
    { ...size }
  );
}
