/**
 * Collects listing, download, and query timing stats and delivers them via a
 * single callback. Each invocation fires independently — the caller is
 * responsible for aggregation across events.
 *
 * @example
 * const stats = new StatsPlugin((event) => console.log(event));
 * // { type: 'listing',  prefix, bucket, fileCount, durationMs, cacheHit }
 * // { type: 'download', bucket, cacheHits, cacheMisses, bytesDownloaded, durationMs }
 * // { type: 'query',    sql, durationMs, rowCount }
 */
export default class StatsPlugin {
  constructor(onStats) {
    this.onStats = onStats;
  }

  processQuery(context) {
    return context;
  }

  preListFiles({ prefix, bucket }) {
    return ({ files, durationMs, cacheHit }) => {
      this.onStats({ type: 'listing', prefix, bucket, fileCount: files.length, durationMs, cacheHit });
    };
  }

  preDownloadFiles({ bucket, from, to }) {
    return ({ cacheHits, cacheMisses, enqueuedHits, bytesDownloaded, durationMs }) => {
      this.onStats({
        type: 'download',
        bucket,
        from,
        to,
        cacheHits,
        cacheMisses,
        enqueuedHits,
        bytesDownloaded,
        durationMs,
      });
    };
  }

  preQuery({ sql }) {
    const start = Date.now();
    return ({ result }) => {
      this.onStats({ type: 'query', sql, durationMs: Date.now() - start, rowCount: result.length });
    };
  }
}
