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
            style={{ position: 'fixed', top: -9999, left: -9999, width: 1, height: 1, opacity: 0.001, pointerEvents: 'none' }}
            aria-hidden="true"
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
