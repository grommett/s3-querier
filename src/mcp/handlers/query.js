import s3Querier, { bigintReplacer } from '../../s3-querier.js';

const {
  S3_ACCESS_KEY_ID,
  S3_SECRET_ACCESS_KEY,
  S3_API_KEY,
  S3_ENDPOINT,
  S3_BUCKET,
  S3_BUCKETS_DIR = '/tmp/s3-querier',
} = process.env;

export async function handleQuery({ sql, from, to, endpoint, bucket }) {
  const fromMs = from ? new Date(from).getTime() : undefined;
  const toMs = to ? new Date(to).getTime() : undefined;
  const resolvedEndpoint = endpoint || S3_ENDPOINT;
  const resolvedBucket = bucket || S3_BUCKET;

  const results = await s3Querier({
    query: sql,
    from: fromMs,
    to: toMs,
    defaultEndpoint: resolvedEndpoint,
    defaultBucket: resolvedBucket,
    bucketsDir: S3_BUCKETS_DIR,
    apiKey: S3_API_KEY,
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
    format: 'jsonRecords',
  });

  return {
    content: [{ type: 'text', text: JSON.stringify(results, bigintReplacer) }],
  };
}
