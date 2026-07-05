export const SocketEvents = {
    CONNECTION: 'connection',
    DISCONNECT: 'disconnect',
    USER_ONLINE: 'user:online',
    USER_OFFLINE: 'user:offline',
    CHAT_SEND: 'chat:send',
    CHAT_RECEIVE: 'chat:receive',
    CHAT_DELIVERED: 'chat:delivered',
    CHAT_SEEN: 'chat:seen',
    MEETING_CREATE: 'meeting:create',
    MEETING_JOIN: 'meeting:join',
    MEETING_LEAVE: 'meeting:leave',
    MEETING_END: 'meeting:end',
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

    // Interactive Meeting controls
    MEETING_MUTE_USER: 'meeting:mute-user',
    MEETING_REMOVE_USER: 'meeting:remove-user',
    MEETING_RAISE_HAND: 'meeting:raise-hand',
    MEETING_REACTION: 'meeting:reaction',
    MEETING_COHOST_PROMOTE: 'meeting:cohost-promote',
    MEETING_COHOST_DEMOTE: 'meeting:cohost-demote',
    MEETING_WAITING_APPROVE: 'meeting:waiting-approve',

    // Thread events
    THREAD_CREATED: 'thread:created',
    THREAD_UPDATED: 'thread:updated',

    // Message reactions events
    REACTION_ADD: 'reaction:add',
    REACTION_REMOVE: 'reaction:remove',

    // Meeting Chat reaction events
    MEETING_CHAT_REACTION_ADD: 'meeting:chat:reaction:add',
    MEETING_CHAT_REACTION_REMOVE: 'meeting:chat:reaction:remove',

    // Message status events
    MESSAGE_DELIVERED: 'message:delivered',
    MESSAGE_READ: 'message:read',

    // Generic Typing indicator events
    TYPING_START: 'typing:start',
    TYPING_STOP: 'typing:stop'
} as const
