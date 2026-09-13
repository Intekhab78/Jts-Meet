export { SOCKET_URL } from '../../../config'

export const SocketEvents = {
    WEBRTC_JOIN: 'webrtc:join',
    WEBRTC_OFFER: 'webrtc:offer',
    WEBRTC_ANSWER: 'webrtc:answer',
    WEBRTC_ICE_CANDIDATE: 'webrtc:ice-candidate',
    WEBRTC_USER_JOINED: 'webrtc:user-joined',
    WEBRTC_USER_LEFT: 'webrtc:user-left',
    SCREEN_START: 'screen:start',
    SCREEN_STOP: 'screen:stop',
    SCREEN_CHANGED: 'screen:changed',
    MEETING_CHAT_SEND: 'meeting:chat:send',
    MEETING_CHAT_RECEIVE: 'meeting:chat:receive',
    MEETING_CHAT_TYPING: 'meeting:chat:typing',
    MEETING_CHAT_STOP_TYPING: 'meeting:chat:stopTyping',
    CHANNEL_CHAT_SEND: 'channel:chat:send',
    CHANNEL_CHAT_RECEIVE: 'channel:chat:receive',
    CHANNEL_CHAT_TYPING: 'channel:chat:typing',
    CHANNEL_CHAT_STOP_TYPING: 'channel:chat:stopTyping',
    MEETING_LEAVE: 'meeting:leave',
    MEETING_CHAT_REACTION_ADD: 'meeting:chat:reaction:add',
    MEETING_CHAT_REACTION_REMOVE: 'meeting:chat:reaction:remove',

    // Direct 1-on-1 Calling events
    CALL_INITIATE: 'call:initiate',
    CALL_INCOMING: 'call:incoming',
    CALL_ACCEPTED: 'call:accepted',
    CALL_REJECTED: 'call:rejected',
    CALL_CANCELLED: 'call:cancelled',

    // Collaborative Whiteboard events
    WHITEBOARD_DRAW: 'whiteboard:draw',
    WHITEBOARD_CLEAR: 'whiteboard:clear',

    // In-meeting Polls events
    POLL_CREATE: 'poll:create',
    POLL_VOTE: 'poll:vote',
    POLL_UPDATE: 'poll:update',
    POLL_CLOSE: 'poll:close',

    // Advanced meeting events
    MEETING_LOCK_TOGGLE: 'meeting:lock-toggle',
    MEETING_MUTE_ALL: 'meeting:mute-all',
    MEETING_CAPTION: 'meeting:caption',
    MEETING_NOTES_UPDATE: 'meeting:notes:update',
    MEETING_END_ALL: 'meeting:end-all',
    MEETING_REACTION: 'meeting:reaction',
    MEETING_WATERMARK_TOGGLE: 'meeting:toggle-watermark',
    MEETING_COHOST_PROMOTE: 'meeting:cohost-promote',
    MEETING_COHOST_DEMOTE: 'meeting:cohost-demote',

    // Screen Share Live Annotation events
    SCREEN_ANNOTATION_STROKE_START: 'screen:annotation:stroke-start',
    SCREEN_ANNOTATION_STROKE_POINT: 'screen:annotation:stroke-point',
    SCREEN_ANNOTATION_STROKE_END: 'screen:annotation:stroke-end',
    SCREEN_ANNOTATION_LASER: 'screen:annotation:laser',
    SCREEN_ANNOTATION_CLEAR: 'screen:annotation:clear',

    // Remote Desktop Control events
    REMOTE_CONTROL_REQUEST: 'remote-control:request',
    REMOTE_CONTROL_RESPONSE: 'remote-control:response',
    REMOTE_CONTROL_REVOKE: 'remote-control:revoke',
    REMOTE_CONTROL_MOUSE: 'remote-control:mouse',
    REMOTE_CONTROL_KEY: 'remote-control:key'
} as const

