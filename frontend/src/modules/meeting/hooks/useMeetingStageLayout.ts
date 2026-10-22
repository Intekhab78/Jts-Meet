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
    // Robust screen sharer identification with case-insensitive and connection-resilient fallback
    const effectiveRemoteSharerId = screenSharingUserId && screenSharingUserId !== 'me'
        ? (remoteStreams[screenSharingUserId]
            ? screenSharingUserId
            : Object.keys(remoteStreams).find(k => k.toLowerCase() === screenSharingUserId.toLowerCase()) || screenSharingUserId)
        : screenSharingUserId

    const activePresenterId = effectiveRemoteSharerId
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
        : (
            remoteStreams[primaryUser] ||
            Object.entries(remoteStreams).find(([k]) => k.toLowerCase() === primaryUser.toLowerCase())?.[1] ||
            (effectiveRemoteSharerId ? remoteStreams[effectiveRemoteSharerId] : null) ||
            (effectiveRemoteSharerId ? Object.entries(remoteStreams).find(([k]) => k.toLowerCase() === effectiveRemoteSharerId.toLowerCase())?.[1] : null) ||
            null
        )

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
    // Dynamic grid configuration for Smart Meeting Layout
    const count = displayedUsers.length || allUsers.length
    let gridStyle: React.CSSProperties = {}
    if (count <= 1) {
        gridStyle = {
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            gap: 16
        }
    } else if (count === 2) {
        gridStyle = {
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gridTemplateRows: isMobile ? '1fr 1fr' : '1fr',
            height: '100%',
            gap: 16
        }
    } else if (count === 3) {
        gridStyle = {
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))',
            gridTemplateRows: isMobile ? 'repeat(3, 1fr)' : '1fr',
            height: '100%',
            gap: 16
        }
    } else if (count === 4) {
        gridStyle = {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: '1fr 1fr',
            height: '100%',
            gap: 16
        }
    } else if (count === 5) {
        gridStyle = {
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(6, minmax(0, 1fr))',
            gridTemplateRows: isMobile ? 'repeat(3, minmax(0, 1fr))' : 'repeat(2, minmax(0, 1fr))',
            height: '100%',
            gap: 16
        }
    } else if (count === 6) {
        gridStyle = {
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, minmax(0, 1fr))',
            gridTemplateRows: isMobile ? 'repeat(3, minmax(0, 1fr))' : 'repeat(2, minmax(0, 1fr))',
            height: '100%',
            gap: 16
        }
    } else if (count === 7) {
        gridStyle = {
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(8, minmax(0, 1fr))',
            gridTemplateRows: isMobile ? 'repeat(4, minmax(0, 1fr))' : 'repeat(2, minmax(0, 1fr))',
            height: '100%',
            gap: 16
        }
    } else if (count === 8) {
        gridStyle = {
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, minmax(0, 1fr))',
            gridTemplateRows: isMobile ? 'repeat(4, minmax(0, 1fr))' : 'repeat(2, minmax(0, 1fr))',
            height: '100%',
            gap: 16
        }
    } else {
        const cols = count <= 9 ? 3 : count <= 16 ? 4 : count <= 25 ? 5 : 6
        gridStyle = {
            display: 'grid',
            justifyContent: 'center',
            alignItems: 'center',
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${Math.ceil(count / cols)}, minmax(0, 1fr))`,
            height: '100%',
            gap: 12
        }
    }

    const layoutStyle: React.CSSProperties = isMobile
        ? { display: 'flex', flexDirection: 'column', height: '100%', width: '100%', gap: 12, overflow: 'hidden' }
        : isTablet
            ? { display: 'flex', flexDirection: 'column', height: '100%', width: '100%', gap: 16, overflow: 'hidden' }
            : { display: 'flex', flexDirection: 'row', height: '100%', width: '100%', gap: 20, overflow: 'hidden' }

    return {
        isScreenSharerLive: isScreenShareActive,
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

export function getBalancedGridTileStyle(index: number, totalCount: number, isMobile: boolean): React.CSSProperties {
    if (isMobile) {
        if (totalCount === 3 && index === 2) {
            return { gridColumn: 'span 2' }
        }
        if (totalCount === 5 && index === 4) {
            return { gridColumn: 'span 2' }
        }
        if (totalCount === 7 && index === 6) {
            return { gridColumn: 'span 2' }
        }
        return {}
    }

    // Desktop
    if (totalCount === 5) {
        // 6-column grid:
        // Row 1 (3 tiles): indices 0, 1, 2 -> span 2 columns each (cols 1-2, 3-4, 5-6)
        // Row 2 (2 tiles): index 3 (cols 2-3), index 4 (cols 4-5)
        // Col 1 and Col 6 are empty margins, perfectly centering the 2 tiles in Row 2!
        if (index === 0) return { gridColumn: '1 / span 2', gridRow: '1' }
        if (index === 1) return { gridColumn: '3 / span 2', gridRow: '1' }
        if (index === 2) return { gridColumn: '5 / span 2', gridRow: '1' }
        if (index === 3) return { gridColumn: '2 / span 2', gridRow: '2' }
        if (index === 4) return { gridColumn: '4 / span 2', gridRow: '2' }
    }

    if (totalCount === 7) {
        // 8-column grid:
        // Row 1 (4 tiles): indices 0, 1, 2, 3 -> span 2 columns each (cols 1-2, 3-4, 5-6, 7-8)
        // Row 2 (3 tiles): index 4 (cols 2-3), index 5 (cols 4-5), index 6 (cols 6-7)
        // Col 1 and Col 8 are empty margins, perfectly centering the 3 tiles in Row 2!
        if (index === 0) return { gridColumn: '1 / span 2', gridRow: '1' }
        if (index === 1) return { gridColumn: '3 / span 2', gridRow: '1' }
        if (index === 2) return { gridColumn: '5 / span 2', gridRow: '1' }
        if (index === 3) return { gridColumn: '7 / span 2', gridRow: '1' }
        if (index === 4) return { gridColumn: '2 / span 2', gridRow: '2' }
        if (index === 5) return { gridColumn: '4 / span 2', gridRow: '2' }
        if (index === 6) return { gridColumn: '6 / span 2', gridRow: '2' }
    }

    return {}
}

