'use client';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo } from 'react';

export type DeepZoomMeta = {
  width: number;            // pixels
  height: number;           // pixels
  maxZoom: number;          // e.g. 5
  tileSize: number;         // 256 (standard)
  format: 'png' | 'jpg';    // what your tiler emitted
  tilesBase: string;        // e.g. "https://.../tiles/<id>"
  scheme: 'xyz' | 'tms';    // gdal2tiles --xyz => 'xyz'
};

function FitToImage({ w, h, z }: { w:number; h:number; z:number }) {
  const map = useMap();
  const bounds = useMemo(() => {
    const sw = map.unproject([0, h], z);
    const ne = map.unproject([w, 0], z);
    return L.latLngBounds(sw, ne);
  }, [map, w, h, z]);

  useEffect(() => {
    map.setMaxBounds(bounds);
    map.fitBounds(bounds, { animate: false });
  }, [map, bounds]);

  return null;
}

export default function DeepZoomViewer({ meta }: { meta: DeepZoomMeta }) {
  const { width, height, maxZoom, tileSize, format, tilesBase, scheme } = meta;
  const tms = scheme !== 'xyz'; // only true for TMS

  return (
    <div className="relative w-full h-[600px] overflow-hidden rounded-xl border border-gray-700 shadow-2xl">
      <MapContainer
        crs={L.CRS.Simple}    // 256-based simple pixel CRS
        center={[0, 0]}
        zoom={0}
        minZoom={0}           // set to 1 to hide letterboxed z=0 if desired
        maxZoom={maxZoom}
        style={{ height: '100%', width: '100%' }}
        preferCanvas
        attributionControl={false}
      >
        <TileLayer
          url={`${tilesBase}/{z}/{x}/{y}.${format}`}
          tileSize={tileSize}
          noWrap
          tms={tms}
          maxNativeZoom={maxZoom}
          minNativeZoom={0}
        />
        <FitToImage w={width} h={height} z={maxZoom} />
      </MapContainer>
    </div>
  );
}
