import { logger } from '../utils/logger.js';
import { mergeSettings } from '../utils/file-settings/file-settings.js';

/**
 * Passes the query through each plugin's `processQuery` hook and merges the
 * resulting file download settings.
 *
 * @param {object[]} plugins - Plugin instances.
 * @param {object} context - `{ query, endpoint, defaultBucket, bucketsDir }`.
 * @returns {{ query: string, fileSettings: object[], settings: object[], ... }}
 */
export function processQuery(plugins = [], { query = '', endpoint, defaultBucket, bucketsDir }) {
  const processedQuery = plugins.reduce((result, plugin) => plugin.processQuery(result), {
    endpoint,
    defaultBucket,
    bucketsDir,
    query,
    settings: [],
  });
  const fileSettings = processedQuery.settings;
  processedQuery.settings = mergeSettings(processedQuery.settings);
  return { ...processedQuery, fileSettings };
}

/**
 * Passes the raw query through each plugin's `finalizeQuery` hook, substituting
 * exact downloaded paths in place of glob patterns.
 *
 * @param {object} params
 * @param {object[]} params.plugins - Plugin instances.
 * @param {string} params.rawQuery - SQL with original file references and date/location tokens.
 * @param {object[]} params.fileSettings - Pre-merge per-file settings from `processQuery`.
 * @param {string[]} params.downloadedPaths - Absolute local paths of all downloaded files.
 * @param {string} params.bucketsDir - Root directory where files are cached locally.
 * @returns {string} Finalized SQL ready for DuckDB execution.
 */
export function runFinalizers({ plugins, rawQuery, fileSettings, downloadedPaths, bucketsDir }) {
  return plugins.reduce((query, plugin) => {
    if (!plugin.finalizeQuery) return query;
    return plugin.finalizeQuery(query, fileSettings, downloadedPaths, bucketsDir);
  }, rawQuery);
}

/**
 * Calls each plugin's `preListFiles` hook and collects the returned callbacks.
 * Plugins that do not implement `preListFiles` contribute a `null` placeholder
 * so that callback indices stay aligned with plugin indices.
 *
 * @param {object[]} plugins - Plugin instances.
 * @param {object} context - `{ prefix, bucket }`.
 * @returns {Array<Function|null>} One entry per plugin — a callback or `null`.
 */
export function runPreListFiles(plugins, context) {
  return plugins.map((plugin) => plugin.preListFiles?.(context) ?? null);
}

/**
 * Invokes each callback returned by `runPreListFiles`. Errors are logged and
 * swallowed so a failing plugin never rejects the caller's query result.
 *
 * @param {Array<Function|null>} callbacks - Collected from `runPreListFiles`.
 * @param {object} context - `{ prefix, bucket, files, durationMs, cacheHit }`.
 */
export function runPostListFiles(callbacks, context) {
  callbacks.forEach((cb) => {
    if (cb) Promise.resolve(cb(context)).catch((error) => logger.error(error));
  });
}

/**
 * Calls each plugin's `preDownloadFiles` hook and collects the returned callbacks.
 * Plugins that do not implement `preDownloadFiles` contribute a `null` placeholder
 * so that callback indices stay aligned with plugin indices.
 *
 * @param {object[]} plugins - Plugin instances.
 * @param {object} context - `{ bucket, from, to }`.
 * @returns {Array<Function|null>} One entry per plugin — a callback or `null`.
 */
export function runPreDownloadFiles(plugins, context) {
  return plugins.map((plugin) => plugin.preDownloadFiles?.(context) ?? null);
}

/**
 * Invokes each callback returned by `runPreDownloadFiles`. Errors are logged and
 * swallowed so a failing plugin never rejects the caller's query result.
 *
 * @param {Array<Function|null>} callbacks - Collected from `runPreDownloadFiles`.
 * @param {object} context - `{ cacheHits, cacheMisses, enqueuedHits, bytesDownloaded, durationMs, bucket }`.
 */
export function runPostDownloadFiles(callbacks, context) {
  callbacks.forEach((cb) => {
    if (cb) Promise.resolve(cb(context)).catch((error) => logger.error(error));
  });
}

/**
 * Calls each plugin's `preQuery` hook and collects the returned callbacks.
 * Plugins that do not implement `preQuery` contribute a `null` placeholder
 * so that callback indices stay aligned with plugin indices.
 *
 * @param {object[]} plugins - Plugin instances.
 * @param {object} context - `{ sql, downloadedPaths, bucketsDir }`.
 * @returns {Array<Function|null>} One entry per plugin — a callback or `null`.
 */
export function runPreQuery(plugins, context) {
  return plugins.map((plugin) => plugin.preQuery?.(context) ?? null);
}

/**
 * Invokes each callback returned by `runPreQuery` and each plugin's `postQuery`
 * hook. Errors are logged and swallowed so a failing plugin never rejects the
 * caller's query result.
 *
 * @param {object[]} plugins - Plugin instances.
 * @param {object} context - `{ result, downloadedPaths, bucketsDir }`.
 * @param {Array<Function|null>} callbacks - Collected from `runPreQuery`.
 */
export function runPostQuery(plugins, context, callbacks = []) {
  plugins.forEach((plugin, index) => {
    const cb = callbacks[index];
    if (cb) Promise.resolve(cb(context)).catch((error) => logger.error(error));
    if (plugin.postQuery) Promise.resolve(plugin.postQuery(context)).catch((error) => logger.error(error));
  });
}
