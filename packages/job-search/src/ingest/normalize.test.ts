import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
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
