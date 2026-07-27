import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildCompanyProfile, type CompanyJobInput } from './company-profile';

const company = {
  id: 'c1',
  name: 'Northwind Systems',
  slug: 'northwind-systems',
  websiteUrl: 'https://example.com/northwind',
  logoUrl: null,
  industry: 'Cloud Infrastructure',
  size: '501-1000',
  location: 'Austin, TX, United States',
  about: 'Managed Kubernetes platform.',
};

function job(partial: Partial<CompanyJobInput> & Pick<CompanyJobInput, 'id' | 'slug' | 'title'>): CompanyJobInput {
  return {
    workMode: 'remote',
    seniority: 'senior',
    location: 'Remote',
    city: null,
    country: 'US',
    skills: ['TypeScript', 'Kubernetes'],
    benefits: ['Health insurance', '401(k) match'],
    salaryMin: 120000,
    salaryMax: 150000,
    salaryCurrency: 'USD',
    salaryPeriod: 'year',
    postedAt: new Date(),
    ...partial,
  };
}

describe('buildCompanyProfile', () => {
  it('aggregates hiring, stack, and culture signals from open roles', () => {
    const profile = buildCompanyProfile({
      company,
      jobs: [
        job({ id: 'j1', slug: 'role-1', title: 'Senior Platform Engineer' }),
        job({
          id: 'j2',
          slug: 'role-2',
          title: 'Staff SRE',
          skills: ['Go', 'Kubernetes', 'Terraform'],
          workMode: 'hybrid',
        }),
      ],
    });

    assert.equal(profile.hiring.openRoles, 2);
    assert.ok(profile.techStack.some((s) => s.skill === 'Kubernetes' && s.count === 2));
    assert.ok(profile.benefits.length >= 2);
    assert.equal(profile.workModeMix.length, 2);
    assert.ok(profile.cultureSignals.some((s) => s.key === 'remote_friendly'));
    assert.match(profile.summary, /Northwind Systems/);
  });

  it('includes viewer stats when provided', () => {
    const profile = buildCompanyProfile({
      company,
      jobs: [job({ id: 'j1', slug: 'role-1', title: 'Engineer', matchScore: 80 })],
      viewer: { savedRoles: 1, applications: 2, avgMatchScore: 80 },
    });

    assert.equal(profile.viewer?.savedRoles, 1);
    assert.equal(profile.viewer?.applications, 2);
    assert.equal(profile.openRoles[0]?.matchScore, 80);
  });
});
