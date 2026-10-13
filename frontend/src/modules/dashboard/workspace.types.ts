export type WorkspaceTab =
    | 'dashboard'
    | 'meeting'
    | 'chat'
    | 'history'
    | 'scheduled'
    | 'organization'
    | 'team'
    | 'channel'
    | 'admin'
    | 'super-admin'
    | 'profile'

export interface AppWorkspaceProps {
    token: string
    initialMeetingId?: string
    onClearMeetingUrl?: () => void
    onLogout: () => void
}

export interface BroadcastNotice {
    message: string
    severity: 'info' | 'warning' | 'critical'
    active: boolean
}
