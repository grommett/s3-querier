import FSPurge from '../../utils/fs-purge/fs-purge.js';

export default class FSPurgePlugin {
  /**
   * @param {object} options
   * @param {string} options.bucketsDir Local directory where S3 files are cached
   * @param {number} [options.lastAccessTTLMinutes=60] Minutes since last access before a file is eligible for purge
   * @param {number} [options.refreshIntervalMin=60] Minimum minutes between sweeps
   */
  constructor({ bucketsDir, lastAccessTTLMinutes = 60, refreshIntervalMin = 60 }) {
    this.purger = new FSPurge({ pattern: `${bucketsDir}/**`, lastAccessTTLMinutes, refreshIntervalMin });
  }

  processQuery(context) {
    return context;
  }

  postQuery() {
    this.purger.sweep();
  }
}
