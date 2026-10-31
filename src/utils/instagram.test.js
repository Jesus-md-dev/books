import test from 'node:test';
import assert from 'node:assert/strict';
import { validPostUrls } from './instagram.js';

test('normalizes post, reel and tv urls and drops duplicates', () => {
  assert.deepEqual(
    validPostUrls([
      'https://www.instagram.com/p/ABC123/',
      'https://instagram.com/p/ABC123?utm_source=x',
      ' https://www.instagram.com/reel/Xy_-9 ',
    ]),
    ['https://www.instagram.com/p/ABC123/', 'https://www.instagram.com/reel/Xy_-9/'],
  );
});

test('rejects other hosts, profiles, non-strings and non-arrays', () => {
  assert.deepEqual(
    validPostUrls([
      'http://www.instagram.com/p/ABC/',
      'https://evil.com/p/ABC/',
      'https://www.instagram.com/bahia.lectora/',
      'javascript:alert(1)',
      42,
      null,
    ]),
    [],
  );
  assert.deepEqual(validPostUrls(undefined), []);
});
