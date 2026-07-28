import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildTextPdf } from './text-pdf';

describe('buildTextPdf', () => {
  it('produces a PDF header and EOF', () => {
    const bytes = buildTextPdf({
      title: 'Test doc',
      subtitle: 'Subtitle',
      body: 'Hello world.\nSecond line.',
    });
    const text = Buffer.from(bytes).toString('latin1');
    assert.match(text, /^%PDF-1\.4/);
    assert.match(text, /%%EOF/);
    assert.match(text, /Hello world/);
  });
});
