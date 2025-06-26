const { BlobServiceClient, StorageSharedKeyCredential, generateBlobSASQueryParameters, BlobSASPermissions } = require('@azure/storage-blob');

const account = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;

const sharedKeyCredential = new StorageSharedKeyCredential(account, accountKey);
const blobServiceClient = new BlobServiceClient(
  `https://${account}.blob.core.windows.net`,
  sharedKeyCredential
);

async function uploadBlob(blobName, buffer) {
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  await blockBlobClient.uploadData(buffer);
  return blockBlobClient.name;
}

function getBlobSasUrl(blobName, expiresInMinutes = 60) {
  const now = new Date();
  const expiresOn = new Date(now.getTime() + expiresInMinutes * 60 * 1000);

  const sasToken = generateBlobSASQueryParameters({
    containerName,
    blobName,
    permissions: BlobSASPermissions.parse("r"),
    startsOn: now,
    expiresOn,
    protocol: "https"
  }, sharedKeyCredential).toString();

  return `https://${account}.blob.core.windows.net/${containerName}/${encodeURIComponent(blobName)}?${sasToken}`;
}

async function listBlobs() {
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blobs = [];
  for await (const blob of containerClient.listBlobsFlat()) {
    blobs.push(blob.name);
  }
  return blobs;
}

async function deleteBlob(blobName) {
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  await blockBlobClient.deleteIfExists();
}

module.exports = { uploadBlob, getBlobSasUrl, listBlobs, deleteBlob };