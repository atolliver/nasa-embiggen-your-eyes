export type ImageMeta = {
    id: string;
    name: string;
    description: string;
    width: number;
    height: number;
    tileSize: number;
    maxZoom: number;
    format: "png" | "jpg";
    scheme: "xyz";
    tilesBase: string;
    status: "queued" | "tiling" | "ready" | "failed";
  };
  