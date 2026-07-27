import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildJobInsights } from '../src/insights';

const baseJob = {
  id: 'job1',
  slug: 'acme-senior-engineer',
  title: 'Senior Software Engineer',
  description: 'Build APIs',
  responsibilities: [],
  requirements: ['5+ years TypeScript', 'React experience required'],
  benefits: [],
  skills: ['TypeScript', 'React', 'GraphQL', 'AWS'],
  employmentType: 'full-time',
  workMode: 'remote',
  seniority: 'senior',
  location: 'Remote',
  city: null,
  country: 'US',
  salaryMin: 120000,
  salaryMax: 160000,
  salaryCurrency: 'USD',
  salaryPeriod: 'year',
  source: 'seed',
  sourceUrl: null,
  applyUrl: null,
  postedAt: new Date().toISOString(),
  expiresAt: null,
  isActive: true,
  company: {
    id: 'c1',
    name: 'Acme',
    slug: 'acme',
    websiteUrl: null,
    logoUrl: null,
    industry: 'Tech',
    size: '50-200',
    location: 'SF',
    about: null,
  },
};

describe('buildJobInsights', () => {
  it('returns gaps and learning recs for partial match', () => {
    const insights = buildJobInsights(baseJob, {
      yearsOfExperience: 6,
      workLocationPreference: 'remote',
      desiredRoles: ['Software Engineer'],
      salaryExpectation: 130000,
      salaryCurrency: 'USD',
      skills: [{ name: 'TypeScript' }, { name: 'React' }],
    });

    assert.equal(insights.matchScore, 50);
    assert.deepEqual(insights.missingSkills.sort(), ['AWS', 'GraphQL']);
    assert.ok(insights.skillGaps.some((g) => g.skill === 'GraphQL' && g.priority === 'medium'));
    assert.ok(insights.skillGaps.some((g) => g.skill === 'AWS' && g.priority === 'medium'));
    assert.ok(insights.learningRecommendations.length > 0);
    assert.ok(insights.fitSignals.some((s) => s.key === 'seniority' && s.level === 'strong'));
    assert.match(insights.summary, /50%/);
  });

  it('handles missing profile skills gracefully', () => {
    const insights = buildJobInsights(baseJob, {
      skills: [],
    });
    assert.equal(insights.matchScore, null);
    assert.equal(insights.skillGaps.length, 0);
    assert.match(insights.summary, /Add skills/);
  });
});
