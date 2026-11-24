const test = require('node:test');
const assert = require('node:assert/strict');
const { isSuperAdminUser } = require('../dist/middleware/adminMiddleware');
const { deleteDirectMessage, undoDeleteDirectMessage } = require('../dist/modules/chat/chat.service');
const { User } = require('../dist/models/user.model');
const { parseCursorQuery, executeCursorQuery } = require('../dist/utils/paginationHelper');
const { isAllowedMimeType } = require('../dist/modules/file/file.validator');
const { generateCallRejectToken, verifyCallRejectToken } = require('../dist/modules/notification/notification.service');
const { DEFAULT_TIERS } = require('../dist/modules/plan/plan.model');
const { validateInviteMember } = require('../dist/modules/organization/organization.validator');
const { validateInviteTeamMember } = require('../dist/modules/team/team.validator');
const { generateRefreshToken, hashToken } = require('../dist/utils/tokenHelper');

test('isSuperAdminUser rejects arbitrary @jtsmiddleeast.com or generic admin role', () => {
  assert.equal(isSuperAdminUser({ email: 'attacker@jtsmiddleeast.com', isSuperAdmin: false }), false);
  assert.equal(isSuperAdminUser({ email: 'user@example.com', role: 'admin', isSuperAdmin: false }), false);
  assert.equal(isSuperAdminUser({ email: 'super@example.com', isSuperAdmin: true }), true);
  assert.equal(isSuperAdminUser({ email: 'super@example.com', role: 'superadmin' }), true);
});

test('deleteDirectMessage and undoDeleteDirectMessage safely ignore non-ObjectId local keys', async () => {
  const resDelete = await deleteDirectMessage('local-1793968311329', '6a4b91e95605a31697be0a71');
  assert.equal(resDelete, null);

  const resUndo = await undoDeleteDirectMessage('temp_12345', '6a4b91e95605a31697be0a71');
  assert.equal(resUndo, null);
});

test('User.toJSON strips password, otpCode, otpExpires, and refreshTokens', () => {
  const doc = new User({
    fullName: 'Alice Example',
    email: 'alice@example.com',
    password: 'hashed_password_secret',
    otpCode: '654321',
    otpExpires: new Date('2026-12-01T00:00:00.000Z'),
    refreshTokens: [
      {
        tokenHash: 'refresh_hash_secret',
        familyId: 'fam-1',
        createdAt: new Date(),
        expiresAt: new Date('2026-12-31T00:00:00.000Z')
      }
    ]
  });
  const json = doc.toJSON();
  assert.equal(json.fullName, 'Alice Example');
  assert.equal(json.email, 'alice@example.com');
  assert.equal('password' in json, false);
  assert.equal('otpCode' in json, false);
  assert.equal('otpExpires' in json, false);
  assert.equal('refreshTokens' in json, false);
});

test('parseCursorQuery clamps limit and executeCursorQuery preserves baseQuery.$or under $and', async () => {
  assert.equal(parseCursorQuery({ limit: 9999 }).limit, 100);
  assert.equal(parseCursorQuery({ limit: -5 }).limit, 1);

  let capturedQuery = null;
  let capturedLimit = null;
  const stubModel = {
    findById() {
      return {
        select() {
          return {
            async exec() {
              return { createdAt: new Date('2026-01-01T00:00:00.000Z') };
            }
          };
        }
      };
    },
    find(q) {
      capturedQuery = q;
      return {
        sort() {
          return {
            limit(n) {
              capturedLimit = n;
              return {
                async exec() {
                  return [];
                }
              };
            }
          };
        }
      };
    }
  };

  const baseOr = [{ senderId: 'u1' }, { receiverId: 'u1' }];
  await executeCursorQuery(
    stubModel,
    { $or: baseOr },
    {
      limit: 25,
      cursor: '6a4b91e95605a31697be0a71',
      search: 'hello',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    },
    ['content']
  );

  assert.deepEqual(capturedQuery.$or, baseOr);
  assert.ok(Array.isArray(capturedQuery.$and));
  assert.equal(capturedQuery.$and.length, 2);
  assert.ok(Array.isArray(capturedQuery.$and[0].$or));
  assert.ok(Array.isArray(capturedQuery.$and[1].$or));
  assert.equal(capturedLimit, 26);
});

test('isAllowedMimeType blocks XSS, scriptable, binary, and empty MIME types', () => {
  assert.equal(isAllowedMimeType('image/svg+xml'), false);
  assert.equal(isAllowedMimeType('image/svg+xml; charset=utf-8'), false);
  assert.equal(isAllowedMimeType('text/html'), false);
  assert.equal(isAllowedMimeType('text/javascript'), false);
  assert.equal(isAllowedMimeType('application/octet-stream'), false);
  assert.equal(isAllowedMimeType(''), false);
  assert.equal(isAllowedMimeType(undefined), false);

  assert.equal(isAllowedMimeType('image/png'), true);
  assert.equal(isAllowedMimeType('image/webp'), true);
  assert.equal(isAllowedMimeType('application/pdf'), true);
  assert.equal(isAllowedMimeType('video/mp4'), true);
});

test('generateCallRejectToken and verifyCallRejectToken validate signed push tokens cleanly', () => {
  const token = generateCallRejectToken('meet-123', 'user-456');
  assert.equal(verifyCallRejectToken('meet-123', 'user-456', token), true);
  assert.equal(verifyCallRejectToken('meet-123', 'user-999', token), false);
  assert.equal(verifyCallRejectToken('meet-other', 'user-456', token), false);
  assert.equal(verifyCallRejectToken('meet-123', 'user-456', `${token.slice(0, -1)}x`), false);
});

test('User schema persists twoFactorEnabled and exposes it in toJSON()', () => {
  const doc = new User({
    fullName: 'Two Factor User',
    email: '2fa@example.com',
    password: 'hashed_password_secret',
    twoFactorEnabled: true
  });
  const json = doc.toJSON();
  assert.equal(json.twoFactorEnabled, true);
});

test('DEFAULT_TIERS enforces plan-based duration, participant capacity, and feature entitlements', () => {
  const free = DEFAULT_TIERS.find(t => t.planId === 'free');
  const starter = DEFAULT_TIERS.find(t => t.planId === 'starter');
  const enterprise = DEFAULT_TIERS.find(t => t.planId === 'enterprise');

  assert.ok(free);
  assert.equal(free.limits.maxMeetingDurationMins, 45);
  assert.equal(free.features.cloudRecording, false);
  assert.equal(free.features.aiSummary, false);
  assert.equal(free.features.ssoLogin, false);

  assert.ok(starter);
  assert.equal(starter.features.cloudRecording, true);
  assert.equal(starter.features.aiSummary, true);
  assert.equal(starter.features.ssoLogin, false);

  assert.ok(enterprise);
  assert.equal(enterprise.features.cloudRecording, true);
  assert.equal(enterprise.features.aiSummary, true);
  assert.equal(enterprise.features.ssoLogin, true);
});

test('Organization and Team invite-member validators accept both userId and email address', () => {
  assert.equal(validateInviteMember({ organizationId: 'org-1', userId: '6a4b91e95605a31697be0a71', role: 'member' }).valid, true);
  assert.equal(validateInviteMember({ organizationId: 'org-1', email: 'colleague@company.com', role: 'admin' }).valid, true);
  assert.equal(validateInviteMember({ organizationId: 'org-1', role: 'member' }).valid, false);

  assert.equal(validateInviteTeamMember({ teamId: 'team-1', userId: '6a4b91e95605a31697be0a71', role: 'member' }).valid, true);
  assert.equal(validateInviteTeamMember({ teamId: 'team-1', email: 'teammate@company.com', role: 'admin' }).valid, true);
  assert.equal(validateInviteTeamMember({ teamId: 'team-1', role: 'member' }).valid, false);
});

test('generateRefreshToken produces deterministic SHA-256 tokenHash separate from raw token', () => {
  const { token, hash } = generateRefreshToken();
  assert.ok(token.length >= 64);
  assert.notEqual(token, hash);
  assert.equal(hashToken(token), hash);
});
