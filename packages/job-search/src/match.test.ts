import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  enrichJobsWithMatch,
  matchJobSkills,
  normalizeSkill,
  sortJobsByMatchScore,
} from '../src/match';

describe('normalizeSkill', () => {
  it('lowercases and collapses whitespace', () => {
    assert.equal(normalizeSkill('  Type Script  '), 'type script');
  });

  it('maps common aliases', () => {
    assert.equal(normalizeSkill('JS'), 'javascript');
    assert.equal(normalizeSkill('TS'), 'typescript');
    assert.equal(normalizeSkill('Node.js'), 'node');
    assert.equal(normalizeSkill('React.js'), 'react');
    assert.equal(normalizeSkill('C++'), 'cpp');
    assert.equal(normalizeSkill('C#'), 'csharp');
  });
});

describe('matchJobSkills', () => {
  it('returns null when either side is empty', () => {
    assert.equal(matchJobSkills([], ['TypeScript']), null);
    assert.equal(matchJobSkills(['TypeScript'], []), null);
  });

  it('scores job-skill coverage and preserves job labels', () => {
    const match = matchJobSkills(
      ['TypeScript', 'React', 'Node.js'],
      ['TypeScript', 'React', 'GraphQL', 'AWS'],
    );
    assert.ok(match);
    assert.equal(match.matchScore, 50);
    assert.deepEqual(match.matchedSkills, ['TypeScript', 'React']);
    assert.deepEqual(match.missingSkills, ['GraphQL', 'AWS']);
  });

  it('matches via aliases', () => {
    const match = matchJobSkills(['ts', 'js'], ['TypeScript', 'JavaScript', 'Go']);
    assert.ok(match);
    assert.equal(match.matchScore, 67);
    assert.deepEqual(match.matchedSkills, ['TypeScript', 'JavaScript']);
    assert.deepEqual(match.missingSkills, ['Go']);
  });
});

describe('enrichJobsWithMatch / sortJobsByMatchScore', () => {
  it('attaches match fields and sorts descending', () => {
    const enriched = enrichJobsWithMatch(
      [
        { id: 'a', skills: ['Go', 'Rust'] },
        { id: 'b', skills: ['TypeScript', 'React'] },
        { id: 'c', skills: ['TypeScript'] },
      ],
      ['TypeScript', 'React'],
    );

    assert.equal(enriched[0].matchScore, 0);
    assert.equal(enriched[1].matchScore, 100);
    assert.equal(enriched[2].matchScore, 100);

    const ranked = sortJobsByMatchScore(
      enriched.map((job) => ({ id: job.id, matchScore: job.matchScore })),
    );
    assert.deepEqual(
      ranked.map((job) => job.id),
      ['b', 'c', 'a'],
    );
  });
});
