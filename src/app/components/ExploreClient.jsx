"use client";

import dynamic from "next/dynamic";

// Load the Leaflet viewer only on the client
const DeepZoomViewer = dynamic(() => import("./DeepZoomViewer"), {
  ssr: false,
});

export default function ExploreClient() {
  return <DeepZoomViewer />;
}
