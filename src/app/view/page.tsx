"use client";
import { useEffect, useRef, useState } from "react";
import OpenSeadragon from "openseadragon";

interface PlanetaryAsset {
  href: string;
}

interface PlanetaryFeature {
  assets?: {
    rendered_preview?: PlanetaryAsset;
    thumbnail?: PlanetaryAsset;
  };
}

interface PlanetaryResponse {
  features?: PlanetaryFeature[];
}

export default function ViewerPage() {
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // Fetch the imagery metadata from backend
  useEffect(() => {
    async function fetchImage() {
      const res = await fetch("/api/planetary");
      const data: PlanetaryResponse = await res.json();
      const firstItem = data.features?.[0];
      const href =
        firstItem?.assets?.rendered_preview?.href ||
        firstItem?.assets?.thumbnail?.href ||
        null;
      setImageUrl(href);
    }
    fetchImage();
  }, []);

  // Initialize the OpenSeadragon viewer
  useEffect(() => {
    if (imageUrl && viewerRef.current) {
      OpenSeadragon({
        element: viewerRef.current,
        prefixUrl: "https://openseadragon.github.io/openseadragon/images/",
        tileSources: {
          type: "image",
          url: imageUrl,
        },
        showNavigator: true,
        minZoomLevel: 0.5,
        maxZoomLevel: 20,
        defaultZoomLevel: 1,
      });
    }
  }, [imageUrl]);

  return (
    <main style={{ padding: "2rem" }}>
      <h1
        style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1rem" }}
      >
        NASA / Planetary Computer Viewer
      </h1>

      {!imageUrl ? (
        <p>Loading imagery...</p>
      ) : (
        <div
          ref={viewerRef}
          style={{
            width: "100%",
            height: "80vh",
            border: "1px solid #ccc",
            borderRadius: "8px",
          }}
        />
      )}
    </main>
  );
}
