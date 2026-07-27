import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildCodingPack,
  codingSessionStatus,
  computeCodingPerformance,
  inferCodingStyles,
} from './coding';

describe('coding assessment prep', () => {
  it('infers styles and builds a timed pack for a role', () => {
    const styles = inferCodingStyles({
      id: 'j1',
      title: 'Senior Backend Engineer',
      skills: ['TypeScript', 'PostgreSQL', 'Node'],
      seniority: 'senior',
    });
    assert.ok(styles.includes('leetcode'));
    assert.ok(styles.includes('takehome'));

    const pack = buildCodingPack({
      job: {
        id: 'j1',
        title: 'Senior Backend Engineer',
        skills: ['TypeScript', 'Node'],
        seniority: 'senior',
        companyName: 'Acme',
      },
      limit: 5,
    });

    assert.equal(pack.problems.length, 5);
    assert.ok(pack.timeBudgetMinutes > 0);
    assert.match(pack.summary, /Acme/);
  });

  it('scores performance from attempts', () => {
    const pack = buildCodingPack({ limit: 4 });
    const attempts = pack.problems.slice(0, 3).map((p, i) => ({
      problemId: p.id,
      status: i === 0 ? ('solved' as const) : ('attempted' as const),
      minutesSpent: 10,
      selfRating: 4,
    }));
    const perf = computeCodingPerformance(pack.problems, attempts);
    assert.ok(perf.score > 0);
    assert.equal(perf.solved, 1);
    assert.equal(codingSessionStatus(pack.problems, attempts), 'practicing');
  });
});
