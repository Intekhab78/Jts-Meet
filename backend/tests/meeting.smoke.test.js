const test = require('node:test');
const assert = require('node:assert/strict');
const {
  addPeerSession,
  getMeetingPeersInfo,
  clearMeetingPeerSessions
} = require('../dist/modules/webrtc/peer.manager');
const {
  saveMeetingState,
  loadMeetingState,
  deleteMeetingState
} = require('../dist/services/meetingStateStore');
const { sfuService } = require('../dist/services/sfu.service');
const { Meeting } = require('../dist/modules/meeting/meeting.model');

test('Multi-room peer manager strictly isolates concurrent rooms and prevents cross-room leak on switch', () => {
  const roomA = 'smoke-room-a';
  const roomB = 'smoke-room-b';
  clearMeetingPeerSessions(roomA);
  clearMeetingPeerSessions(roomB);

  addPeerSession('user-1', roomA, 'sock-1', 'Alice');
  addPeerSession('user-2', roomA, 'sock-2', 'Bob');
  addPeerSession('user-3', roomB, 'sock-3', 'Charlie');

  const peersA = getMeetingPeersInfo(roomA);
  const peersB = getMeetingPeersInfo(roomB);
  assert.deepEqual(peersA.map(p => p.userId).sort(), ['user-1', 'user-2']);
  assert.deepEqual(peersB.map(p => p.userId), ['user-3']);

  // User-2 switches from roomA to roomB; roomA must never retain stale user-2
  addPeerSession('user-2', roomB, 'sock-2b', 'Bob');
  const updatedPeersA = getMeetingPeersInfo(roomA);
  const updatedPeersB = getMeetingPeersInfo(roomB);
  assert.deepEqual(updatedPeersA.map(p => p.userId), ['user-1']);
  assert.deepEqual(updatedPeersB.map(p => p.userId).sort(), ['user-2', 'user-3']);

  clearMeetingPeerSessions(roomA);
  clearMeetingPeerSessions(roomB);
});

test('meetingStateStore degrades gracefully without throwing when Redis is offline', async () => {
  await assert.doesNotReject(async () => {
    await saveMeetingState('notes', 'smoke-room-store', 'Test meeting note');
    const loaded = await loadMeetingState('notes', 'smoke-room-store');
    assert.ok(loaded === null || loaded === 'Test meeting note');
    await deleteMeetingState('notes', 'smoke-room-store');
  });
});

test('sfuService generates signed LiveKit participant access tokens', async () => {
  assert.equal(sfuService.isConfigured(), true);
  const creds = await sfuService.generateParticipantToken({
    meetingId: 'smoke-sfu-room',
    userId: 'user-sfu-1',
    displayName: 'Tester',
    isHost: true
  });
  assert.ok(creds);
  assert.equal(creds.sfuEnabled, true);
  assert.equal(typeof creds.token, 'string');
  assert.equal(creds.token.split('.').length, 3);
  assert.ok(creds.livekitUrl);
});

test('Meeting model supports sharedNotes, coHosts, screenSharePolicy, and isWebinarMode', () => {
  const doc = new Meeting({
    title: 'Smoke Test Meeting',
    meetingId: 'smoke-room-model',
    host: '6a4b91e95605a31697be0a71',
    coHosts: ['6a4b91e95605a31697be0a72'],
    sharedNotes: '• Follow up on deployment',
    screenSharePolicy: 'host_only',
    isWebinarMode: true
  });

  assert.equal(doc.sharedNotes, '• Follow up on deployment');
  assert.equal(doc.coHosts.length, 1);
  assert.equal(doc.screenSharePolicy, 'host_only');
  assert.equal(doc.isWebinarMode, true);
});

test('Live local API health & SFU status endpoints respond cleanly when backend is running', async (t) => {
  let healthRes;
  try {
    healthRes = await fetch('http://localhost:4000/api/health');
  } catch {
    t.skip('Local backend server is not running on port 4000');
    return;
  }
  assert.equal(healthRes.status, 200);

  const sfuRes = await fetch('http://localhost:4000/api/webrtc/sfu/status');
  assert.equal(sfuRes.status, 200);
  const sfuJson = await sfuRes.json();
  assert.equal(sfuJson.success, true);
  assert.equal(typeof sfuJson.sfuConfigured, 'boolean');
  assert.equal(typeof sfuJson.sfuReachable, 'boolean');
});
