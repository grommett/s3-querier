import { GetObjectCommand } from '@aws-sdk/client-s3';
import { parquetMetadata, parquetSchema } from 'hyparquet';

/**
 * Reads the column names from a parquet file using two ranged S3 GET requests
 * (footer only — no full file download regardless of file size).
 *
 * @param {import('@aws-sdk/client-s3').S3Client} s3Client
 * @param {string} bucket
 * @param {string} key
 * @returns {Promise<string[]>} Column names
 */
export async function readParquetColumns(s3Client, bucket, key) {
  const tail = await fetchRange(s3Client, bucket, key, 'bytes=-8');
  const footerLength = tail.readUInt32LE(0);
  const footerBuffer = await fetchRange(s3Client, bucket, key, `bytes=-${footerLength + 8}`);
  const { buffer, byteOffset, byteLength } = footerBuffer;
  const arrayBuffer = buffer.slice(byteOffset, byteOffset + byteLength);
  const metadata = parquetMetadata(arrayBuffer);
  const schema = parquetSchema(metadata);
  return schema.children.map((col) => col.element.name);
}

/** Helpers */

async function fetchRange(s3Client, bucket, key, range) {
  const response = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: key, Range: range }));
  const chunks = [];
  for await (const chunk of response.Body) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
