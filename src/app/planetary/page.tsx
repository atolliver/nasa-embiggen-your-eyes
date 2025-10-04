"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface PlanetaryAsset {
  href: string;
}

interface PlanetaryFeature {
  id: string;
  assets?: {
    thumbnail?: PlanetaryAsset;
    rendered_preview?: PlanetaryAsset;
    SR_B4?: PlanetaryAsset;
    SR_B5?: PlanetaryAsset;
  };
}

interface PlanetaryResponse {
  features?: PlanetaryFeature[];
}

export default function PlanetaryPage() {
  const [features, setFeatures] = useState<PlanetaryFeature[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/planetary");
        const data: PlanetaryResponse = await res.json();
        setFeatures(data.features ?? []);
      } catch (err) {
        console.error("Failed to fetch data", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <main style={{ padding: "2rem" }}>
      <h1
        style={{
          fontSize: "1.5rem",
          fontWeight: "bold",
          marginBottom: "1.5rem",
        }}
      >
        NASA / Planetary Computer — Landsat 8 Gallery
      </h1>

      {loading ? (
        <p>Loading imagery...</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "1rem",
          }}
        >
          {features.map((feature) => {
            const thumb =
              feature.assets?.thumbnail?.href ||
              feature.assets?.rendered_preview?.href;
            const title = feature.id;
            const red = feature.assets?.SR_B4?.href;
            const nir = feature.assets?.SR_B5?.href;

            return (
              <div
                key={title}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  padding: "1rem",
                  background: "#fafafa",
                }}
              >
                <h3
                  style={{
                    fontSize: "1rem",
                    fontWeight: "600",
                    marginBottom: "0.5rem",
                  }}
                >
                  {title}
                </h3>
                {thumb ? (
                  <Image
                    src={thumb}
                    alt={title}
                    width={250}
                    height={250}
                    style={{
                      borderRadius: "4px",
                      objectFit: "cover",
                      background: "#eee",
                    }}
                    unoptimized
                  />
                ) : (
                  <p>No thumbnail available.</p>
                )}
                <div style={{ marginTop: "0.5rem" }}>
                  {red && (
                    <a
                      href={red}
                      target="_blank"
                      rel="noreferrer"
                      style={{ marginRight: "1rem" }}
                    >
                      Red Band
                    </a>
                  )}
                  {nir && (
                    <a href={nir} target="_blank" rel="noreferrer">
                      NIR Band
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
