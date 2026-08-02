import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { detectAts, isFixtureApplyUrl } from './ats-detect';
import { buildSelectorPlan } from './field-map';
import { canRunAssistFill } from './index';

describe('ATS detect', () => {
  it('detects fixture and major ATS hosts', () => {
    assert.equal(isFixtureApplyUrl('http://localhost:3000/apply-fixture'), true);
    assert.equal(detectAts('http://localhost:3000/apply-fixture'), 'fixture');
    assert.equal(detectAts('https://boards.greenhouse.io/acme/jobs/1'), 'greenhouse');
    assert.equal(detectAts('https://jobs.lever.co/acme/abc'), 'lever');
    assert.equal(detectAts('https://jobs.ashbyhq.com/acme'), 'ashby');
    assert.equal(detectAts(null, 'workable'), 'workable');
    assert.equal(detectAts('https://careers.example.com/x'), 'generic');
    assert.equal(detectAts('https://openai.com/careers/job/123'), 'generic');
    assert.equal(detectAts('https://acme.wd5.myworkdayjobs.com/en-US/External/job/X'), 'generic');
  });
});

describe('field map', () => {
  it('maps fill-plan fields to selector candidates', () => {
    const plan = buildSelectorPlan([
      { id: 'full_name', label: 'Full name', value: 'Ada', source: 'profile', sensitive: false },
      { id: 'email', label: 'Email', value: 'a@b.co', source: 'profile', sensitive: true },
      { id: 'cover_letter', label: 'Cover', value: 'Hi', source: 'draft', sensitive: false },
    ]);
    assert.equal(plan.length, 3);
    assert.ok(plan[0]!.selectors.some((s) => s.includes('name')));
    assert.ok(plan[1]!.selectors.some((s) => s.includes('email')));
    assert.ok(plan[2]!.selectors.some((s) => s.includes('cover') || s === 'textarea'));
  });
});

describe('fill gate', () => {
  it('allows fixture fill after approval; live needs env', () => {
    assert.equal(canRunAssistFill({ vendor: 'fixture', fillApproved: true }), true);
    assert.equal(canRunAssistFill({ vendor: 'greenhouse', fillApproved: false }), false);
    assert.equal(canRunAssistFill({ vendor: 'greenhouse', fillApproved: true }), false);
    assert.equal(canRunAssistFill({ vendor: 'unknown', fillApproved: true }), false);
    assert.equal(canRunAssistFill({ vendor: 'generic', fillApproved: true }), false);
  });
});
