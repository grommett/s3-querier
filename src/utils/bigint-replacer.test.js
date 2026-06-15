import { describe, it } from 'node:test';
import assert from 'node:assert';
import { bigintReplacer } from './bigint-replacer.js';

describe('bigintReplacer', () => {
  it('converts BigInt values to Number', () => {
    assert.strictEqual(bigintReplacer('count', 42n), 42);
    assert.strictEqual(bigintReplacer('total', 0n), 0);
  });

  it('passes non-BigInt values through unchanged', () => {
    assert.strictEqual(bigintReplacer('key', 'hello'), 'hello');
    assert.strictEqual(bigintReplacer('key', 42), 42);
    assert.strictEqual(bigintReplacer('key', null), null);
    assert.strictEqual(bigintReplacer('key', false), false);
  });
});
