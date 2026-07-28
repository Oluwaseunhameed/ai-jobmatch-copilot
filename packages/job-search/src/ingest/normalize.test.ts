import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  htmlToJobDescription,
  mapEmploymentType,
  mapSeniority,
  mapWorkMode,
  parseSalaryRange,
  slugify,
  stripHtml,
} from './normalize';

describe('ingest normalize', () => {
  it('slugifies company names', () => {
    assert.equal(slugify('Acme Robotics!'), 'acme-robotics');
  });

  it('strips html', () => {
    assert.match(stripHtml('<p>Hello <b>world</b></p>'), /Hello world/);
  });

  it('converts job HTML to structured description', () => {
    const md = htmlToJobDescription(`
      <p><strong>This is a remote role for candidates located in </strong><strong>Campinas, Brazil.</strong></p>
      <p><strong>About LawnStarter</strong></p>
      <p>We build marketplaces.</p>
      <p><strong>Requirements</strong></p>
      <ul><li><strong>AI-native.</strong> Use Cursor daily.</li><li>Ship outcomes.</li></ul>
    `);
    assert.match(md, /\*\*This is a remote role for candidates located in Campinas, Brazil\.\*\*/);
    assert.doesNotMatch(md, /\*{4}/);
    assert.match(md, /^## About LawnStarter/m);
    assert.match(md, /We build marketplaces\./);
    assert.match(md, /^## Requirements/m);
    assert.match(md, /^- \*\*AI-native\.\*\* Use Cursor daily\./m);
    assert.match(md, /^- Ship outcomes\./m);
  });

  it('maps employment / work mode / seniority', () => {
    assert.equal(mapEmploymentType('part_time'), 'part-time');
    assert.equal(mapWorkMode('Hybrid - NYC'), 'hybrid');
    assert.equal(mapSeniority('Senior Engineer'), 'senior');
  });

  it('parses salary ranges', () => {
    const parsed = parseSalaryRange('$120,000 - $150,000 USD');
    assert.equal(parsed.salaryMin, 120000);
    assert.equal(parsed.salaryMax, 150000);
    assert.equal(parsed.salaryCurrency, 'USD');
  });
});
