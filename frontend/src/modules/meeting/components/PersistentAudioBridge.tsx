import React from 'react'
import { PersistentAudioTile } from './VideoTile'

interface PersistentAudioBridgeProps {
    remoteStreams: Record<string, MediaStream | null>
    localUserId: string
    backstageUserIds: string[]
    remoteMuteStates: Record<string, boolean>
    canManageParticipants: boolean
    isLocalHost: boolean
}

export const PersistentAudioBridge: React.FC<PersistentAudioBridgeProps> = ({
    remoteStreams,
    localUserId,
    backstageUserIds,
    remoteMuteStates,
    canManageParticipants,
    isLocalHost
}) => {
    return (
        <div
            style={{
                position: 'fixed',
                bottom: 0,
                right: 0,
                width: 2,
                height: 2,
                opacity: 0.01,
                overflow: 'hidden',
                pointerEvents: 'none',
                zIndex: -1
            }}
        >
            {Object.entries(remoteStreams).map(([peerId, rStream]) => {
                if (!rStream || peerId === 'me' || peerId === localUserId) return null
                const isPeerBackstage = backstageUserIds.includes(peerId)
                const shouldMuteAudio = remoteMuteStates[peerId] === true || (isPeerBackstage && !canManageParticipants && !isLocalHost)
                return (
                    <PersistentAudioTile
                        key={`global-audio-${peerId}`}
                        peerId={peerId}
                        stream={rStream}
                        isMuted={shouldMuteAudio}
                    />
                )
            })}
        </div>
    )
}
