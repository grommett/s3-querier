import { describe, it } from 'node:test';
import assert from 'node:assert';
import esmock from 'esmock';

describe('readParquetColumns', () => {
  it('returns the column names from a parquet file in S3', async () => {
    const footerLength = 100;
    const tailBuffer = Buffer.alloc(8);
    tailBuffer.writeUInt32LE(footerLength, 0);

    let callCount = 0;
    const s3Client = {
      send() {
        callCount++;
        const chunk = callCount === 1 ? tailBuffer : Buffer.alloc(footerLength + 8);
        return Promise.resolve({
          Body: (async function* () {
            yield chunk;
          })(),
        });
      },
    };

    const mockSchema = {
      children: [{ element: { name: 'user_id' } }, { element: { name: 'event_type' } }],
    };

    const { readParquetColumns } = await esmock('./parquet-schema-reader.js', {
      '@aws-sdk/client-s3': {
        GetObjectCommand: class GetObjectCommand {
          constructor(params) {
            Object.assign(this, params);
          }
        },
      },
      hyparquet: {
        parquetMetadata: () => ({}),
        parquetSchema: () => mockSchema,
      },
    });

    const columns = await readParquetColumns(s3Client, 'my-bucket', 'path/to/file.parquet');

    assert.deepStrictEqual(columns, ['user_id', 'event_type']);
  });
});
