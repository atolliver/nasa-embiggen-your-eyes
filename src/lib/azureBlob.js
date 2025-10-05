import { BlobServiceClient } from "@azure/storage-blob";

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
if (!connectionString) {
  throw new Error("Missing AZURE_STORAGE_CONNECTION_STRING in environment");
}

export const blobServiceClient =
  BlobServiceClient.fromConnectionString(connectionString);
export const containerName = process.env.AZURE_STORAGE_CONTAINER || "tiles";

export async function listBlobs() {
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blobs = [];
  for await (const blob of containerClient.listBlobsFlat()) {
    blobs.push(blob.name);
  }
  return blobs;
}

export async function uploadBlob(fileName, buffer) {
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(fileName);
  await blockBlobClient.uploadData(buffer);
  return `Uploaded ${fileName}`;
}
