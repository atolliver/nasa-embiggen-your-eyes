export async function GET() {
  const response = await fetch(
    "https://planetarycomputer.microsoft.com/api/stac/v1/search",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        collections: ["landsat-8-c2-l2"],
        limit: 6,
        query: { "eo:cloud_cover": { lt: 20 } },
      }),
    }
  );

  const data = await response.json();

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
