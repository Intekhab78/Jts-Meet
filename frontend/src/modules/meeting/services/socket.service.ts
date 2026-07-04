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
    MEETING_LEAVE: 'meeting:leave'
} as const
