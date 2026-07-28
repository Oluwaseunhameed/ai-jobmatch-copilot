import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { weeklyDigestEmail } from './templates';

describe('weeklyDigestEmail', () => {
  it('includes counts and deep links', () => {
    const payload = weeklyDigestEmail({
      name: 'Ada',
      weekOf: 'Jul 21, 2026',
      savedJobs: 3,
      applications: 2,
      newMatches: [{ title: 'Engineer', companyName: 'Acme', slug: 'acme-engineer' }],
      pipelineHighlights: [
        { jobTitle: 'Engineer', companyName: 'Acme', stageLabel: 'Applied' },
      ],
    });
    assert.match(payload.subject, /weekly/i);
    assert.match(payload.html, /Ada/);
    assert.match(payload.html, /Saved jobs/);
    assert.match(payload.text, /acme-engineer/);
  });
});
