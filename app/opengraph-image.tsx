import { ImageResponse } from "next/og";

// Image metadata
export const alt = "Les Ateliers Zo - Mode Ivoirienne Premium";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

// Image generation
export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 128,
          background: "linear-gradient(to bottom right, #00aeee, #00d4ff)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontFamily: "system-ui",
        }}
      >
        <div style={{ fontSize: 80, fontWeight: "bold" }}>Les Ateliers Zo</div>
        <div style={{ fontSize: 40, marginTop: 20 }}>
          Mode Ivoirienne Premium
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
