// src/app/api/wise/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function parsePipeRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ra = Number(searchParams.get("ra") ?? 266.4);
  const dec = Number(searchParams.get("dec") ?? -29.0);
  const srDeg = Number(searchParams.get("sr") ?? 0.1);
  const table = searchParams.get("table") ?? "allwise_p3as_psd";

  // Catalog lookup (SCS)
  const scsUrl = `https://irsa.ipac.caltech.edu/SCS?table=${encodeURIComponent(
    table
  )}&RA=${ra}&DEC=${dec}&SR=${srDeg}&format=ipac_table`;

  const resp = await fetch(scsUrl, { cache: "no-store" });
  if (!resp.ok) {
    return NextResponse.json(
      { error: `WISE API returned ${resp.status}` },
      { status: resp.status }
    );
  }

  const text = await resp.text();
  const lines = text.split(/\r?\n/);

  const firstPipeIdx = lines.findIndex((l) => l.trim().startsWith("|"));
  if (firstPipeIdx === -1) {
    console.error("WISE RAW OUTPUT SAMPLE:", lines.slice(0, 15));
    return NextResponse.json(
      { error: "WISE metadata format not recognized" },
      { status: 500 }
    );
  }

  const columns = parsePipeRow(lines[firstPipeIdx]);

  let dataIdx = firstPipeIdx + 1;
  while (dataIdx < lines.length && lines[dataIdx].trim().startsWith("|"))
    dataIdx++;
  while (
    dataIdx < lines.length &&
    (lines[dataIdx].trim() === "" || lines[dataIdx].trim().startsWith("\\"))
  ) {
    dataIdx++;
  }
  if (dataIdx >= lines.length) {
    return NextResponse.json({ error: "No data rows found" }, { status: 404 });
  }

  const firstDataLine = lines[dataIdx].trim();
  const values = firstDataLine.split(/\s+/);
  const firstSource: Record<string, string | number | null> = {};
  const len = Math.min(columns.length, values.length);
  for (let i = 0; i < len; i++) {
    const key = columns[i].toLowerCase();
    const val = values[i] === "null" ? null : values[i];
    firstSource[key] = val as any;
  }

  const coaddId =
    (firstSource["coadd_id"] as string | undefined) ||
    (firstSource["source_id"] as string | undefined) ||
    null;

  // FinderChart PNG for the same RA/Dec
  const subsetArcmin = Math.max(0.1, Math.min(60, 2 * srDeg * 60));
  const fcUrl =
    "https://irsa.ipac.caltech.edu/applications/finderchart/servlet/api" +
    `?mode=prog&locstr=${encodeURIComponent(`${ra} ${dec}`)}` +
    `&survey=WISE&subsetsize=${subsetArcmin.toFixed(3)}&reproject=true`;

  let pngUrl: string | null = null;
  try {
    const fc = await fetch(fcUrl, { cache: "no-store" });
    const xml = await fc.text();
    const m = xml.match(/<jpgurl>([^<]+)<\/jpgurl>/i);
    if (m) {
      pngUrl = m[1];
    } else {
      console.error(
        "FinderChart XML had no <jpgurl>. First 500 chars:",
        xml.slice(0, 500)
      );
    }
  } catch (e) {
    console.error("FinderChart fetch failed:", e);
  }

  return NextResponse.json({
    query: { table, ra, dec, sr: srDeg },
    columns,
    firstSource,
    coaddId,
    pngUrl,
  });
}
