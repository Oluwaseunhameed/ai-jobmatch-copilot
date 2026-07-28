import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  normalizeAppRole,
  parseAdminEmails,
  userHasAdminAccess,
} from './admin';

describe('admin access helpers', () => {
  it('parses ADMIN_EMAILS allowlist', () => {
    assert.deepEqual(parseAdminEmails(' Ada@Example.com , bob@x.io '), [
      'ada@example.com',
      'bob@x.io',
    ]);
    assert.deepEqual(parseAdminEmails(''), []);
  });

  it('grants access by role or allowlisted email', () => {
    assert.equal(
      userHasAdminAccess({
        role: 'admin',
        email: 'x@y.com',
        adminEmails: [],
      }),
      true,
    );
    assert.equal(
      userHasAdminAccess({
        role: 'user',
        email: 'ops@jobmatch.dev',
        adminEmails: ['ops@jobmatch.dev'],
      }),
      true,
    );
    assert.equal(
      userHasAdminAccess({
        role: 'user',
        email: 'user@example.com',
        adminEmails: ['ops@jobmatch.dev'],
      }),
      false,
    );
  });

  it('normalizes app roles', () => {
    assert.equal(normalizeAppRole('Admin'), 'admin');
    assert.equal(normalizeAppRole('support'), 'support');
    assert.equal(normalizeAppRole('owner'), null);
  });
});
