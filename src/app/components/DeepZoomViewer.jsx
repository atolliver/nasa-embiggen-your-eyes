"use client";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";

// Your image size
const IMG_WIDTH = 8192;
const IMG_HEIGHT = 4096;

// Match your gdal2tiles settings
const TILE_SIZE = 256;
const MAX_ZOOM = 4;
const EXT = "png";
const TMS = false;

// CRS that matches 512px base tiles (prevents aspect distortion)
const CRS512 = L.extend({}, L.CRS.Simple, {
  transformation: new L.Transformation(1 / TILE_SIZE, 0, -1 / TILE_SIZE, 0),
  scale: (z) => TILE_SIZE * Math.pow(2, z),
  zoom: (s) => Math.log(s / TILE_SIZE) / Math.LN2
});

function FitToImage() {
  const W = 8192, H = 4096, Z = 5;
  const map = useMap();
  useEffect(() => {
    const sw = map.unproject([0, H], Z);
    const ne = map.unproject([W, 0], Z);
    const bounds = L.latLngBounds(sw, ne);
    map.setMaxBounds(bounds);
    map.fitBounds(bounds, { animate: false });
    map.options.maxBoundsViscosity = 1.0; // optional: “sticky” edges
  }, [map]);
  return null;
}

export default function DeepZoomViewer() {
  return (
    <MapContainer
      crs={CRS512}
      center={[0, 0]}
      zoom={0}
      minZoom={0}
      maxZoom={MAX_ZOOM}
      style={{ height: "70vh", width: "100%" }}
      preferCanvas
      attributionControl={false}
    >
      <TileLayer
        url={`/data/earth_snapshot/tiles/{z}/{x}/{y}.${EXT}`}
        tileSize={TILE_SIZE}
        noWrap
        tms={TMS}                 // ← true for default gdal2tiles; false if you used --xyz
        maxNativeZoom={MAX_ZOOM}
        minNativeZoom={0}
        updateWhenIdle
      />
      <FitToImage />
    </MapContainer>
  );
}
