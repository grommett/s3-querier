import { describe, it } from 'node:test';
import assert from 'node:assert';
import esmock from 'esmock';

describe('handleListFiles', () => {
  it('returns directories, files, and truncated flag from S3', async () => {
    const tool = await getMockedTool({
      s3Response: {
        CommonPrefixes: [{ Prefix: 'sales/' }],
        Contents: [{ Key: 'sales/data.csv', Size: 256 }],
        IsTruncated: false,
      },
    });

    const result = await tool.handler({ prefix: 'sales/' });
    const parsed = JSON.parse(result.content[0].text);

    assert.deepStrictEqual(parsed.directories, ['sales/']);
    assert.deepStrictEqual(parsed.files, [{ file: 'sales/data.csv', size: 256 }]);
    assert.strictEqual(parsed.truncated, false);
  });

  it('handles an empty S3 response with no contents or prefixes', async () => {
    const tool = await getMockedTool({ s3Response: {} });

    const result = await tool.handler({});
    const parsed = JSON.parse(result.content[0].text);

    assert.deepStrictEqual(parsed.directories, []);
    assert.deepStrictEqual(parsed.files, []);
    assert.strictEqual(parsed.truncated, false);
  });

  it('sets truncated to true when the S3 response is truncated', async () => {
    const tool = await getMockedTool({
      s3Response: { Contents: [], CommonPrefixes: [], IsTruncated: true },
    });

    const result = await tool.handler({});
    const parsed = JSON.parse(result.content[0].text);

    assert.strictEqual(parsed.truncated, true);
  });

  it('adds column schema to the first parquet file per directory only', async () => {
    const tool = await getMockedTool({
      s3Response: {
        CommonPrefixes: [],
        Contents: [
          { Key: 'data/events.parquet', Size: 1024 },
          { Key: 'data/summary.parquet', Size: 512 },
          { Key: 'data/report.csv', Size: 256 },
        ],
        IsTruncated: false,
      },
      columns: ['id', 'name'],
    });

    const result = await tool.handler({});
    const { files } = JSON.parse(result.content[0].text);

    assert.deepStrictEqual(files[0].columns, ['id', 'name']); // first parquet in dir — representative
    assert.strictEqual(files[1].columns, undefined); // second parquet in same dir — skipped
    assert.strictEqual(files[2].columns, undefined); // csv — no schema
  });

  it('fetches schema independently for the first parquet in each distinct directory', async () => {
    const tool = await getMockedTool({
      s3Response: {
        CommonPrefixes: [],
        Contents: [
          { Key: 'events/raw.parquet', Size: 1024 },
          { Key: 'sales/daily.parquet', Size: 512 },
        ],
        IsTruncated: false,
      },
      columns: ['ts', 'value'],
    });

    const result = await tool.handler({});
    const { files } = JSON.parse(result.content[0].text);

    assert.deepStrictEqual(files[0].columns, ['ts', 'value']);
    assert.deepStrictEqual(files[1].columns, ['ts', 'value']);
  });
});

async function getMockedTool({ s3Response, columns = [] }) {
  const mockS3Client = { send: () => Promise.resolve(s3Response) };
  const { default: ListFilesTool } = await esmock('./list-files.js', {
    '@aws-sdk/client-s3': {
      ListObjectsV2Command: class ListObjectsV2Command {
        constructor(params) {
          Object.assign(this, params);
        }
      },
    },
    '../../../s3/s3.js': { buildS3Client: () => mockS3Client },
    '../../../utils/parquet-schema-reader.js': { readParquetColumns: () => Promise.resolve(columns) },
    '../../../utils/bigint-replacer.js': { bigintReplacer: (_, val) => val },
  });
  return new ListFilesTool({});
}
