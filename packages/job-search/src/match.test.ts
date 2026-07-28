import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  enrichJobsWithMatch,
  extractSkillsFromText,
  matchJobAgainstProfile,
  matchJobSkills,
  normalizeSkill,
  resolveJobSkillsForMatch,
  skillMentionedInText,
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

describe('extractSkillsFromText', () => {
  it('finds skills mentioned inside sentences', () => {
    const text = `
      Backend — PHP/Laravel. Frontend — TypeScript/React/React Native.
      Infra — AWS, Datadog, Sentry. Data — Redshift, dbt, Airflow.
    `;
    const found = extractSkillsFromText(text, [
      'PHP',
      'Laravel',
      'TypeScript',
      'React',
      'React Native',
      'AWS',
      'Datadog',
      'Sentry',
      'Redshift',
      'dbt',
      'Airflow',
      'Go',
    ]);
    assert.ok(found.includes('PHP'));
    assert.ok(found.includes('Laravel'));
    assert.ok(found.includes('TypeScript'));
    assert.ok(found.includes('React Native'));
    assert.ok(found.includes('AWS'));
    assert.ok(!found.includes('Go'));
  });

  it('does not treat java as a javascript hit', () => {
    assert.equal(skillMentionedInText('we use javascript daily', 'Java'), false);
    assert.equal(skillMentionedInText('experience with java and spring', 'Java'), true);
  });
});

describe('resolveJobSkillsForMatch / matchJobAgainstProfile', () => {
  it('scores jobs with empty skill tags using JD prose', () => {
    const job = {
      skills: [],
      title: 'Staff Software Engineer',
      description:
        'Tech you will touch: TypeScript, React, PostgreSQL, and AWS. Node.js services preferred.',
    };
    const resolved = resolveJobSkillsForMatch(job, ['TypeScript', 'React', 'Go']);
    assert.ok(resolved.includes('TypeScript'));
    assert.ok(resolved.includes('React'));
    assert.ok(resolved.includes('PostgreSQL'));
    assert.ok(resolved.includes('AWS'));

    const match = matchJobAgainstProfile(job, ['TypeScript', 'React', 'Go']);
    assert.ok(match);
    assert.ok((match.matchScore ?? 0) > 0);
    assert.ok(match.matchedSkills.includes('TypeScript'));
    assert.ok(match.matchedSkills.includes('React'));
  });

  it('still returns null without profile skills', () => {
    assert.equal(
      matchJobAgainstProfile(
        { skills: [], description: 'TypeScript and React' },
        [],
      ),
      null,
    );
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

  it('enriches from description when skills array is empty', () => {
    const [job] = enrichJobsWithMatch(
      [
        {
          id: 'jd',
          skills: [],
          description: 'We use TypeScript and React every day.',
        },
      ],
      ['TypeScript', 'React', 'Python'],
    );
    assert.ok(typeof job.matchScore === 'number');
    assert.ok((job.matchScore as number) >= 50);
    assert.ok(job.matchedSkills?.includes('TypeScript'));
  });
});
