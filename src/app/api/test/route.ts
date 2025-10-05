export async function GET() {
  return new Response(
    JSON.stringify({
      container: process.env.AZURE_STORAGE_CONTAINER,
      hasConn: !!process.env.AZURE_STORAGE_CONNECTION_STRING,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}
