import { describe, it } from 'node:test';
import assert from 'node:assert';
import esmock from 'esmock';

describe('FSPurge', () => {
  describe('sweep', () => {
    it('unlinks and deletes files from cache returned from `getExpiredFiles`', async (context) => {
      const unlinkSpy = context.mock.fn(() => Promise.resolve());

      const FSPurge = await getFSPurge({
        unlink: unlinkSpy,
      });
      const fsPurge = new FSPurge({ pattern: `**/*.{parquet,csv}` });
      const getExpiredFilesMock = context.mock.method(fsPurge, 'getExpiredFiles', () =>
        Promise.resolve(['file/to/delete']),
      );
      await fsPurge.sweep();
      assert.deepStrictEqual(getExpiredFilesMock.mock.callCount(), 1, 'getExpiredFilesMock called once');
      assert.deepStrictEqual(unlinkSpy.mock.callCount(), 1, 'unlinkSpy called once');
    });

    it('logs if an error is thrown', async (context) => {
      const unlinkMock = context.mock.fn(() => {
        return Promise.reject('o_0');
      });
      const errorSpy = context.mock.fn();
      const FSPurge = await getFSPurge({ unlink: unlinkMock }, { logger: { error: errorSpy, info: () => {} } });
      const fsPurge = new FSPurge({ pattern: `**/*.{parquet|csv}` });
      context.mock.method(fsPurge, 'getExpiredFiles', () => Promise.resolve(['file/to/delete']));
      await fsPurge.sweep();
      await new Promise((resolve) => {
        // Keep process alive long enough for promises to resolve
        setTimeout(resolve, 1);
      });
      assert.deepStrictEqual(errorSpy.mock.callCount(), 1);
    });
  });

  describe('getExpiredFiles', () => {
    it('returns a list of files that have not been accessed within their TTL', async () => {
      const expiredDate = new Date();
      expiredDate.setMinutes(expiredDate.getMinutes() - 61);
      const globMock = {
        glob() {
          return Promise.resolve([
            {
              atime: new Date('2000-01-01'),
              fullpath() {
                return 'file/expired';
              },
            },
            {
              atime: expiredDate,
              fullpath() {
                return 'file/expired2';
              },
            },
            {
              atime: new Date(),
              fullpath() {
                return 'file/active';
              },
            },
          ]);
        },
      };
      const FSPurge = await getFSPurge(null, null, globMock);
      const fsPurge = new FSPurge({ pattern: `**/*.{parquet|csv}` });
      const actual = await fsPurge.getExpiredFiles();

      assert.deepStrictEqual(actual, ['file/expired', 'file/expired2']);
    });
  });
});

function getFSPurge(unlinkMock, loggerMock, globMock) {
  return esmock('./fs-purge.js', {
    glob: { ...(globMock ? globMock : getGlobMock()) },
    'node:fs/promises': {
      ...(unlinkMock ? unlinkMock : getUnlinkMock()),
    },
    '../logger.js': {
      ...(loggerMock ? loggerMock : getMockLogger()),
    },
  });
}

function getGlobMock() {
  return {
    glob() {
      return Promise.resolve([
        {
          atime: new Date(),
          fullpath() {
            return '/path/to/file';
          },
        },
      ]);
    },
  };
}

function getUnlinkMock() {
  return {
    unlink() {
      return Promise.resolve();
    },
  };
}

function getMockLogger() {
  return {
    logger: {
      info() {},
      error() {},
      debug() {},
    },
  };
}
