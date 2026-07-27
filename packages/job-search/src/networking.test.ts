import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildNetworkingHub,
  buildNetworkingTargets,
  buildTalkTracks,
  normalizeContactInput,
} from './networking';

describe('professional networking', () => {
  it('dedupes company targets by stronger signal', () => {
    const targets = buildNetworkingTargets(
      [
        {
          companyId: 'c1',
          companyName: 'Acme',
          companySlug: 'acme',
          websiteUrl: 'https://acme.example',
          reason: 'viewed role',
          source: 'viewed',
          openRoles: 2,
          sampleJob: {
            id: 'j1',
            title: 'Engineer',
            slug: 'engineer',
            applyUrl: 'https://acme.example/careers',
            sourceUrl: null,
          },
        },
        {
          companyId: 'c1',
          companyName: 'Acme',
          companySlug: 'acme',
          websiteUrl: 'https://acme.example',
          reason: 'applied',
          source: 'application',
          openRoles: 3,
          sampleJob: {
            id: 'j2',
            title: 'Senior Engineer',
            slug: 'senior-engineer',
            applyUrl: null,
            sourceUrl: null,
          },
        },
      ],
      { limit: 5 },
    );

    assert.equal(targets.length, 1);
    assert.equal(targets[0]!.source, 'application');
    assert.equal(targets[0]!.openRoles, 3);
    assert.ok(targets[0]!.researchLinks.some((l) => l.label === 'Company website'));
  });

  it('builds talk tracks and normalizes contacts', () => {
    const tracks = buildTalkTracks({
      candidateName: 'Ada Lovelace',
      headline: 'Software engineer',
      skills: ['TypeScript', 'PostgreSQL'],
      companyName: 'Acme',
      jobTitle: 'Backend Engineer',
    });
    assert.equal(tracks.length, 3);
    assert.match(tracks[0]!.body, /Acme/);
    assert.match(tracks[1]!.detail, /never scrape/i);

    const normalized = normalizeContactInput({
      fullName: '  Pat Recruiter ',
      roleType: 'recruiter',
      profileUrl: 'https://linkedin.com/in/pat',
      email: 'Pat@Acme.Example',
      status: 'researched',
    });
    assert.equal(normalized.fullName, 'Pat Recruiter');
    assert.equal(normalized.email, 'pat@acme.example');
    assert.equal(normalized.status, 'researched');

    const hub = buildNetworkingHub({
      contacts: [],
      targets: [],
      talkTracks: tracks,
    });
    assert.match(hub.summary, /No LinkedIn scraping/);
  });
});
