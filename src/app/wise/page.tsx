// src/app/wise/page.tsx
"use client";
import { useEffect, useMemo, useRef, useState } from "react";

type WiseResp = {
  query: { ra: number; dec: number; sr: number };
  columns?: string[];
  firstSource?: Record<string, string | number | null>;
  coaddId?: string | null;
  pngUrl?: string | null; // <= new
  error?: string;
};

const FALLBACK_IMAGE = "https://upload.wikimedia.org/wikipedia/commons/9/95/Rogueplanet.jpg"; // only used if neither pngUrl nor env template resolve

function buildWisePreviewUrl(opts: {
  ra: number;
  dec: number;
  coaddId?: string;
  pngUrl?: string | null;
}): string {
  const { ra, dec, coaddId, pngUrl } = opts;

  // 1) If server already found a PNG, use it.
  if (pngUrl) return pngUrl;

  // 2) If you set an env template, allow it ({coadd_id},{ra},{dec})
  const tpl = process.env.NEXT_PUBLIC_WISE_IMAGE_URL;
  if (tpl && (coaddId || tpl.includes("{ra}") || tpl.includes("{dec}"))) {
    return tpl
      .replaceAll("{coadd_id}", coaddId ?? "")
      .replaceAll("{ra}", String(ra))
      .replaceAll("{dec}", String(dec));
  }

  // 3) Final fallback (local file)
  return FALLBACK_IMAGE;
}

export default function WisePage() {
  const viewerEl = useRef<HTMLDivElement | null>(null);
  const osdRef = useRef<any>(null);

  const [data, setData] = useState<WiseResp | null>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const query = useMemo(() => {
    if (typeof window === "undefined")
      return { ra: 266.4, dec: -29.0, sr: 0.1 };
    const p = new URLSearchParams(window.location.search);
    const ra = parseFloat(p.get("ra") ?? "266.4");
    const dec = parseFloat(p.get("dec") ?? "-29");
    const sr = parseFloat(p.get("sr") ?? "0.1");
    return { ra, dec, sr };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(
          `/api/wise?ra=${query.ra}&dec=${query.dec}&sr=${query.sr}`
        );
        const j: WiseResp = await r.json();
        if (!r.ok || j.error) throw new Error(j.error || "WISE API failed");
        setData(j);

        const coaddId =
          j.coaddId ||
          (j.firstSource?.coadd_id as string | undefined) ||
          (typeof j.firstSource?.source_id === "string"
            ? String(j.firstSource!.source_id).split("-")[0]
            : undefined);

        setImgUrl(
          buildWisePreviewUrl({
            ra: query.ra,
            dec: query.dec,
            coaddId,
            pngUrl: j.pngUrl ?? null,
          })
        );
      } catch (e: any) {
        setErr(e.message || String(e));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.ra, query.dec, query.sr]);

  useEffect(() => {
    if (!imgUrl || !viewerEl.current) return;
    let cancelled = false;
    (async () => {
      try {
        const OpenSeadragon = (await import("openseadragon")).default;
        if (cancelled) return;
        if (osdRef.current) {
          osdRef.current.destroy();
          osdRef.current = null;
        }
        osdRef.current = OpenSeadragon({
          element: viewerEl.current!,
          prefixUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/openseadragon/4.1.0/images/",
          showNavigator: true,
          blendTime: 0.1,
          visibilityRatio: 1.0,
          minZoomLevel: 1,
          maxZoomLevel: 50,
          crossOriginPolicy: "Anonymous", // helpful for remote PNGs
          tileSources: { type: "image", url: imgUrl },
        });
      } catch (e) {
        console.error("OSD init failed:", e);
      }
    })();
    return () => {
      cancelled = true;
      if (osdRef.current) {
        osdRef.current.destroy();
        osdRef.current = null;
      }
    };
  }, [imgUrl]);

  const irsaLink = useMemo(() => {
    const base =
      "https://irsa.ipac.caltech.edu/applications/wise/?api=searchPos&execute=true";
    return `${base}&ra=${query.ra}&dec=${query.dec}&imageset=allsky-4band&intersect=CENTER&dataproductlevel=3a,1b`;
  }, [query.ra, query.dec]);

  return (
    <div style={{ padding: 16, display: "grid", gap: 12 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>WISE Coadd Viewer</h1>

      <div
        style={{
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: 13,
        }}
      >
        <div>
          RA: {query.ra} &nbsp; DEC: {query.dec} &nbsp; SR: {query.sr}
        </div>
        {data?.coaddId && (
          <div>
            coadd_id: <b>{String(data.coaddId)}</b>
          </div>
        )}
        {!data?.coaddId && data?.firstSource?.coadd_id && (
          <div>
            coadd_id (from firstSource):{" "}
            <b>{String(data.firstSource.coadd_id)}</b>
          </div>
        )}
        <div>
          <a href={irsaLink} target="_blank" rel="noreferrer">
            Open in IRSA (same RA/Dec)
          </a>
        </div>
      </div>

      {err && (
        <div style={{ color: "crimson", fontFamily: "monospace" }}>
          Error: {err}
        </div>
      )}

      <div
        ref={viewerEl}
        style={{
          width: "100%",
          height: "70vh",
          background: "#111",
          borderRadius: 8,
          overflow: "hidden",
        }}
      />
      {imgUrl && (
        <details>
          <summary>Raw image fallback</summary>
          <div style={{ paddingTop: 8 }}>
            <code style={{ fontSize: 12 }}>{imgUrl}</code>
            <div style={{ marginTop: 8 }}>
              <img
                src={imgUrl}
                alt="WISE preview"
                style={{ maxWidth: "100%", border: "1px solid #333" }}
              />
            </div>
          </div>
        </details>
      )}
    </div>
  );
}
