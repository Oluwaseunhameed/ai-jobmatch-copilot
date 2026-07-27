import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildApplyChecklist,
  buildFillPlan,
  computeReadinessPct,
  evaluatePlaywrightGate,
} from './apply-assist';

describe('apply assist', () => {
  it('builds checklist and fill plan from draft context', () => {
    const ctx = {
      applyUrl: 'https://jobs.example/apply',
      resumeLinked: true,
      resumeTitle: 'Primary',
      draftStatus: 'ready',
      coverLetter: 'Dear hiring manager…',
      answers: [{ question: 'Why us?', answer: 'Mission fit' }],
      candidateName: 'Ada Lovelace',
      headline: 'Engineer',
      email: 'ada@example.com',
      skills: ['TypeScript'],
      jobTitle: 'Backend Engineer',
      companyName: 'Acme',
    };

    const checklist = buildApplyChecklist(ctx);
    assert.equal(computeReadinessPct(checklist), 100);
    assert.ok(checklist.every((item) => item.required === false || item.done));

    const plan = buildFillPlan(ctx);
    assert.ok(plan.some((f) => f.id === 'cover_letter'));
    assert.ok(plan.some((f) => f.id === 'email' && f.sensitive));
  });

  it('blocks playwright submit without approval and skips real ATS URLs', () => {
    const blocked = evaluatePlaywrightGate({
      fillApproved: false,
      applyUrl: 'https://boards.greenhouse.io/acme',
    });
    assert.equal(blocked.status, 'blocked');

    const pending = evaluatePlaywrightGate({
      fillApproved: true,
      applyUrl: 'https://boards.greenhouse.io/acme',
    });
    assert.equal(pending.status, 'approved_pending');
    assert.match(pending.detail, /will not submit/i);

    const fixture = evaluatePlaywrightGate({
      fillApproved: true,
      applyUrl: 'http://localhost:3999/fixture/apply',
      allowFixture: true,
    });
    assert.equal(fixture.status, 'fixture_ran');
  });
});
