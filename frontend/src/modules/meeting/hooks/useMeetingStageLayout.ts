import React from 'react'
import { MeetingLayoutMode } from '../components/LayoutSwitcherModal'

interface UseMeetingStageLayoutProps {
    screenSharingUserId: string | null
    screenSharingUserIds: string[]
    localStream: MediaStream | null
    activeLocalStream: MediaStream | null
    remoteStreams: Record<string, MediaStream>
    backstageUserIds: string[]
    canManageParticipants: boolean
    isLocalHost: boolean
    localUserId?: string
    participants: string[]
    layoutMode: MeetingLayoutMode
    fullScreenUserId: string | null
    pinnedUserId: string | null
    activeSpeaker: string | null
    maxGridTiles: number
    windowWidth: number
    getUserDisplayName: (userId: string) => string
}

export const useMeetingStageLayout = ({
    screenSharingUserId,
    screenSharingUserIds,
    localStream,
    activeLocalStream,
    remoteStreams,
    backstageUserIds,
    canManageParticipants,
    isLocalHost,
    localUserId,
    participants,
    layoutMode,
    fullScreenUserId,
    pinnedUserId,
    activeSpeaker,
    maxGridTiles,
    windowWidth,
    getUserDisplayName
}: UseMeetingStageLayoutProps) => {
    // Self-healing check: verify if screenSharingUserId actually has an active live video track.
    let isScreenSharerLive = false
    if (screenSharingUserId) {
        if (screenSharingUserId === 'me') {
            const vTracks = localStream?.getVideoTracks() || []
            isScreenSharerLive = vTracks.length > 0 && vTracks.some(t => t.readyState === 'live' && !(t as any).isDummy)
        } else {
            const rStream = remoteStreams[screenSharingUserId]
            if (rStream) {
                const vTracks = rStream.getVideoTracks()
                isScreenSharerLive = vTracks.length > 0 && vTracks.some(t => t.readyState === 'live')
            }
        }
    }

    const activePresenterId = isScreenSharerLive ? screenSharingUserId : null
    const isScreenShareActive = !!activePresenterId

    // If screen sharer is backstage, only Host/Co-host or the sharer can see the shared screen
    const effectiveScreenSharer = activePresenterId && (
        !backstageUserIds.includes(activePresenterId) ||
        canManageParticipants ||
        isLocalHost ||
        activePresenterId === localUserId ||
        activePresenterId === 'me'
    ) ? activePresenterId : null
    const effectiveScreenShareActive = isScreenShareActive && !!effectiveScreenSharer

    // All active users in the room
    const allUsers = ['me', ...participants]

    // Backstage Virtual Green Room filter: Audience attendees (!canManageParticipants)
    // cannot see backstage presenters until Host brings them live to the stage.
    const visibleUsers = allUsers.filter(u => {
        const actualUid = u === 'me' ? (localUserId || 'me') : u
        const isUserBackstage = backstageUserIds.includes(actualUid)
        if (!isUserBackstage) return true
        // If user is backstage: only Host, Co-hosts, or the user themselves can see them
        return canManageParticipants || isLocalHost || u === 'me' || actualUid === localUserId
    })

    const isStageLayoutActive = layoutMode === 'tiled'
        ? (!!fullScreenUserId || !!pinnedUserId)
        : layoutMode === 'spotlight' || layoutMode === 'sidebar'
            ? true
            : (effectiveScreenShareActive || !!pinnedUserId || !!fullScreenUserId)

    // The main participant shown enlarged in focus zone
    const primaryUser = fullScreenUserId || effectiveScreenSharer || pinnedUserId || (
        activeSpeaker && activeSpeaker !== 'me' ? activeSpeaker : (visibleUsers.length > 0 ? visibleUsers[0] : 'me')
    )

    // Stream to display in the main enlarged slot
    const isLocalSharing = screenSharingUserId === 'me' || screenSharingUserIds.includes('me')
    const primaryStream = primaryUser === 'me'
        ? (isLocalSharing ? localStream : (activeLocalStream || localStream))
        : remoteStreams[primaryUser]

    // Presenter details
    const presenterName = primaryUser === 'me' ? 'You' : getUserDisplayName(primaryUser)

    const displayedUsers = layoutMode === 'tiled' ? visibleUsers.slice(0, maxGridTiles) : visibleUsers

    // All other users rendered in the right filmstrip when in presenter mode
    const stripUsers = visibleUsers
        .filter(u => u !== primaryUser)
        // Sort active speaker to the top of the strip
        .sort((a, b) => {
            if (a === activeSpeaker) return -1
            if (b === activeSpeaker) return 1
            return 0
        })

    const isMobile = windowWidth < 640
    const isTablet = windowWidth >= 640 && windowWidth < 1024

    // Dynamic grid configuration for Smart Meeting Layout
    let gridStyle: React.CSSProperties = {}
    if (layoutMode === 'tiled') {
        const count = displayedUsers.length
        const cols = count <= 1 ? 1 : count <= 4 ? 2 : count <= 9 ? 3 : count <= 16 ? 4 : count <= 25 ? 5 : 6
        gridStyle = {
            display: count <= 1 ? 'flex' : 'grid',
            justifyContent: 'center',
            alignItems: 'center',
            gridTemplateColumns: count > 1 ? `repeat(${cols}, minmax(0, 1fr))` : undefined,
            gridTemplateRows: count > 1 ? `repeat(${Math.ceil(count / cols)}, minmax(0, 1fr))` : undefined,
            height: '100%',
            gap: 12
        }
    } else if (allUsers.length === 1) {
        gridStyle = {
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            gap: 16
        }
    } else if (allUsers.length === 2) {
        gridStyle = {
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gridTemplateRows: isMobile ? '1fr 1fr' : '1fr',
            height: '100%',
            gap: 16
        }
    } else if (allUsers.length <= 4) {
        gridStyle = {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: '1fr 1fr',
            height: '100%',
            gap: 16
        }
    } else {
        gridStyle = {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gridTemplateRows: 'repeat(auto-fit, minmax(200px, 1fr))',
            height: '100%',
            gap: 16
        }
    }

    const layoutStyle: React.CSSProperties = isMobile
        ? { display: 'flex', flexDirection: 'column', height: '100%', width: '100%', gap: 12, overflow: 'hidden' }
        : isTablet
            ? { display: 'flex', flexDirection: 'column', height: '100%', width: '100%', gap: 16, overflow: 'hidden' }
            : { display: 'flex', flexDirection: 'row', height: '100%', width: '100%', gap: 20, overflow: 'hidden' }

    return {
        isScreenSharerLive,
        activePresenterId,
        isScreenShareActive,
        effectiveScreenSharer,
        effectiveScreenShareActive,
        allUsers,
        visibleUsers,
        isStageLayoutActive,
        primaryUser,
        primaryStream,
        presenterName,
        displayedUsers,
        stripUsers,
        isMobile,
        isTablet,
        gridStyle,
        layoutStyle
    }
}
