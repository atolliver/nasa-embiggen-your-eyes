import { listBlobs } from "@/lib/azureBlob";

export async function GET() {
  try {
    const blobs = await listBlobs();
    return new Response(JSON.stringify({ blobs }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
    });
  }
}
