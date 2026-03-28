import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") || "Particle Post";
  const category = searchParams.get("category") || "AI Briefings for Business Leaders";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#141414",
          padding: "60px 80px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Logo area */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "40px" }}>
          {/* Monogram circle */}
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "6px",
              backgroundColor: "#F5F0EB",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              fontWeight: 700,
              color: "#141414",
            }}
          >
            P
          </div>
          <span
            style={{
              fontSize: "20px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase" as const,
              color: "#F5F0EB",
            }}
          >
            PARTICLE POST
          </span>
        </div>

        {/* Vermillion rule */}
        <div style={{ width: "100%", height: "2px", backgroundColor: "#E8552E", marginBottom: "40px" }} />

        {/* Category overline */}
        <div
          style={{
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase" as const,
            color: "#E8552E",
            marginBottom: "20px",
          }}
        >
          {category}
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: title.length > 60 ? "36px" : "48px",
            fontWeight: 700,
            color: "#F5F0EB",
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
            maxWidth: "900px",
          }}
        >
          {title}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            marginTop: "auto",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span style={{ fontSize: "12px", color: "#A89E94", letterSpacing: "0.05em" }}>
            theparticlepost.com
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
