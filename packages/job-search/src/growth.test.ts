import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildCareerGrowthHub, type GrowthJobInput } from './growth';

const jobs: GrowthJobInput[] = [
  {
    title: 'Senior Software Engineer',
    skills: ['TypeScript', 'React', 'AWS', 'GraphQL'],
    seniority: 'senior',
    salaryMin: 140000,
    salaryMax: 180000,
    salaryCurrency: 'USD',
    salaryPeriod: 'year',
  },
  {
    title: 'Platform Engineer',
    skills: ['Kubernetes', 'Terraform', 'AWS', 'Go'],
    seniority: 'senior',
    salaryMin: 150000,
    salaryMax: 190000,
    salaryCurrency: 'USD',
    salaryPeriod: 'year',
  },
  {
    title: 'Mid Frontend Engineer',
    skills: ['React', 'TypeScript', 'GraphQL'],
    seniority: 'mid',
    salaryMin: 100000,
    salaryMax: 130000,
    salaryCurrency: 'USD',
    salaryPeriod: 'year',
  },
];

describe('buildCareerGrowthHub', () => {
  it('surfaces market gaps, roadmap, and promotion readiness', () => {
    const hub = buildCareerGrowthHub(
      {
        yearsOfExperience: 4,
        desiredRoles: ['Software Engineer'],
        salaryExpectation: 120000,
        salaryCurrency: 'USD',
        currentJobTitle: 'Software Engineer',
        skills: [{ name: 'TypeScript' }, { name: 'React' }],
      },
      jobs,
    );

    assert.ok(hub.skillGaps.some((g) => g.skill === 'AWS' || g.skill === 'GraphQL'));
    assert.ok(hub.roadmap.length > 0);
    assert.ok(hub.trendingTechnologies.some((t) => t.skill === 'TypeScript' && t.have));
    assert.ok(hub.careerPaths.length >= 1);
    assert.ok(hub.salaryGrowth);
    assert.ok(hub.promotionReadiness.score >= 0);
    assert.match(hub.summary, /skill gap/i);
  });

  it('handles empty profile skills', () => {
    const hub = buildCareerGrowthHub({ skills: [] }, jobs);
    assert.ok(hub.skillGaps.length > 0);
    assert.equal(hub.trendingTechnologies.every((t) => t.have === false), true);
  });
});
