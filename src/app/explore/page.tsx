'use client';
import React, { useEffect, useMemo, useState } from 'react';
import DeepZoomViewer, { DeepZoomMeta } from '../components/DeepZoomViewer';

type ApiImage = {
  id: string;
  name: string;
  description: string;
  width: number;
  height: number;
  tileSize: number;
  maxZoom: number;
  format: 'png' | 'jpg';
  scheme: 'xyz' | 'tms';
  tilesBase: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

export default function ExplorePage() {
  const [images, setImages] = useState<ApiImage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/api/images`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: { images: ApiImage[] } = await res.json();
        if (!cancel) {
          setImages(data.images);
          setSelectedId(data.images[0]?.id ?? null);
        }
      } catch (e: any) {
        if (!cancel) setErr(e.message ?? 'Failed to load images');
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, []);

  const selected = useMemo(
    () => images.find(i => i.id === selectedId) ?? images[0],
    [images, selectedId]
  );

  const meta: DeepZoomMeta | null = selected
    ? {
        width: selected.width,
        height: selected.height,
        maxZoom: selected.maxZoom,
        tileSize: selected.tileSize,
        format: selected.format,
        tilesBase: selected.tilesBase,
        scheme: selected.scheme,
      }
    : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <h1 className="text-4xl font-extrabold text-blue-400 mb-2">Explore NASA Imagery</h1>
        <p className="text-gray-400">Loading…</p>
        <div className="mt-6 h-[600px] bg-gray-800 rounded-xl animate-pulse" />
      </div>
    );
  }
  if (err || !selected || !meta) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <h1 className="text-3xl font-bold">Explore NASA Imagery</h1>
        <p className="text-red-400 mt-2">Unable to load images{err ? `: ${err}` : ''}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      {/* title */}
      <div className="max-w-7xl mx-auto mb-8">
        <h1 className="text-4xl font-extrabold text-blue-400">Explore NASA Imagery</h1>
        <p className="text-gray-400 mt-2">Deep-zoom into high-resolution space imagery.</p>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* gallery */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-2xl font-semibold border-b border-gray-700 pb-2 mb-4">Gallery</h2>
          {images.map((img) => (
            <div
              key={img.id}
              className={`p-3 rounded-lg transition-all duration-200 cursor-pointer shadow-lg border-2 ${
                img.id === selectedId
                  ? 'border-blue-500 bg-blue-900/50'
                  : 'border-transparent hover:border-gray-500 hover:bg-gray-800'
              }`}
              onClick={() => setSelectedId(img.id)}
            >
              <h3 className="text-lg font-medium">{img.name}</h3>
              <p className="text-sm text-gray-400">{img.description}</p>
            </div>
          ))}
        </div>

        {/* deep zoom viewer */}
        <div className="lg:col-span-3">
          <div className="mb-6">
            <h2 className="text-3xl font-bold mb-1 text-yellow-300">{selected.name}</h2>
            <p className="text-gray-300">{selected.description}</p>
          </div>

          <DeepZoomViewer meta={meta} />

          <p className="text-xs text-gray-500 mt-2">
            Scroll to zoom; drag to pan. (If you see extra empty space at the smallest zoom, that’s normal for quadtree tile pyramids.)
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-12 text-center">
        <a href="/" className="cta-button link-style-on-hover text-blue-400">
          &larr; Back to Home
        </a>
      </div>
    </div>
  );
}
