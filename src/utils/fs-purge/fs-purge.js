import { glob } from 'glob';
import { unlink } from 'node:fs/promises';
import { logger } from '../logger.js';

export default class FSPurge {
  /**
   * @param {object} options
   * @param {string} options.pattern Glob pattern for files to consider for purging
   * @param {number} [options.lastAccessTTLMinutes=60] Minutes since last access before a file is eligible for purge
   * @param {number} [options.refreshIntervalMin=60] How often to run a sweep, in minutes
   */
  constructor({ pattern, lastAccessTTLMinutes = 60, refreshIntervalMin = 60 }) {
    this.lastAccessTTLMinutes = lastAccessTTLMinutes;
    this.pattern = pattern;
    this.refreshIntervalMin = refreshIntervalMin;
    this.lastSweep = null;
  }

  start() {
    this.refreshRef = setInterval(this.sweep.bind(this), this.refreshIntervalMin * (1000 * 60));
  }

  stop() {
    clearInterval(this.refreshRef);
  }

  async sweep() {
    const now = new Date();
    if (this.lastSweep && now - this.lastSweep < this.refreshIntervalMin * 60_000) return;
    this.lastSweep = now;

    const startSweep = now;
    const filesToBeRemoved = await this.getExpiredFiles();
    logger.info(`Removing ${filesToBeRemoved.length} files in sweep. Read time: ${(new Date() - startSweep) / 1000}s`);

    await Promise.allSettled(
      filesToBeRemoved.map((file) => {
        return unlink(file)
          .then(() => logger.debug(`Deleted file ${file}.`))
          .catch((error) => logger.error(`Error deleting file ${file}. ${error.toString()}`));
      }),
    );
  }

  async getExpiredFiles() {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() - this.lastAccessTTLMinutes);

    const files = await glob(this.pattern, {
      stat: true,
      withFileTypes: true,
      nodir: true,
    });

    return files.filter((file) => file.atime < expiresAt).map((file) => file.fullpath());
  }
}
