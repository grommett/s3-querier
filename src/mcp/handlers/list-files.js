import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { bigintReplacer } from '../../s3-querier.js';
import { buildS3Client } from '../../s3/s3.js';
import { readParquetColumns } from '../../utils/parquet-schema-reader.js';

const { S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_API_KEY, S3_ENDPOINT, S3_BUCKET } = process.env;

export async function handleListFiles({ prefix = '', maxResults = 100, endpoint, bucket }) {
  const resolvedEndpoint = endpoint || S3_ENDPOINT;
  const resolvedBucket = bucket || S3_BUCKET;
  const clientConfig = {
    apiKey: S3_API_KEY,
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
    endpoint: resolvedEndpoint,
  };
  const s3Client = buildS3Client(clientConfig);
  const listCommand = new ListObjectsV2Command({
    Bucket: resolvedBucket,
    Prefix: prefix,
    MaxKeys: maxResults,
    Delimiter: '/',
  });
  const response = await s3Client.send(listCommand);
  const directories = (response.CommonPrefixes ?? []).map(({ Prefix }) => Prefix);
  const files = (response.Contents ?? []).map(({ Key, Size }) => ({ file: Key, size: Size }));
  const truncated = response.IsTruncated ?? false;
  const representatives = getRepresentativeFiles(files);
  const filesWithSchema = await Promise.all(
    files.map((fileObj) => maybeAddSchema(s3Client, resolvedBucket, representatives, fileObj)),
  );

  return {
    content: [
      { type: 'text', text: JSON.stringify({ directories, files: filesWithSchema, truncated }, bigintReplacer) },
    ],
  };
}

/** Helpers */

async function addSchema(s3Client, bucket, { file, size }) {
  if (!file.endsWith('.parquet')) return { file, size };
  const columns = await readParquetColumns(s3Client, bucket, file).catch(() => null);
  return { file, size, columns };
}

function maybeAddSchema(s3Client, bucket, representatives, fileObj) {
  if (representatives.has(fileObj.file)) return addSchema(s3Client, bucket, fileObj);
  return Promise.resolve(fileObj);
}

function getRepresentativeFiles(files) {
  const parquetFiles = files.filter(({ file }) => file.endsWith('.parquet'));
  const dirMap = parquetFiles.reduce(addFirstFilePerDir, new Map());
  return new Set(dirMap.values());
}

function addFirstFilePerDir(acc, { file }) {
  const dir = file.substring(0, file.lastIndexOf('/'));
  if (!acc.has(dir)) acc.set(dir, file);
  return acc;
}
