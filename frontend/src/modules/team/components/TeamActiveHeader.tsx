import React from 'react'
import type { Team } from '../team.types'
import {
    IconUsers, IconUserPlus, IconHash, IconGlobe, IconLock,
    IconVideo, IconPlus, IconTrash
} from '../../../components/common/Icons'

interface TeamActiveHeaderProps {
    selectedTeam: Team
    teamChannelsCount: number
    isMember: boolean
    isOwnerOrAdmin: boolean
    updating: boolean
    onStartMeeting: () => void
    onOpenCreateChannel: () => void
    onOpenInviteModal: () => void
    onJoinTeam: () => void
    onLeaveTeam: () => void
}

export function TeamActiveHeader({
    selectedTeam,
    teamChannelsCount,
    isMember,
    isOwnerOrAdmin,
    updating,
    onStartMeeting,
    onOpenCreateChannel,
    onOpenInviteModal,
    onJoinTeam,
    onLeaveTeam
}: TeamActiveHeaderProps) {
    return (
        <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
            background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0, flex: 1 }}>
                <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: `linear-gradient(135deg, ${selectedTeam.color || '#6366F1'} 0%, ${selectedTeam.color || '#4338CA'}dd 100%)`,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.05rem',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    border: '1px solid rgba(255, 255, 255, 0.16)',
                    boxShadow: `0 8px 20px -4px ${selectedTeam.color || '#6366F1'}40`,
                    flexShrink: 0
                }}>
                    {selectedTeam.name.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#f4f4f5', letterSpacing: '-0.02em' }}>
                            {selectedTeam.name}
                        </h2>
                        <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: 9999,
                            background: selectedTeam.visibility === 'public' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(99, 102, 241, 0.12)',
                            color: selectedTeam.visibility === 'public' ? '#34d399' : '#a5b4fc',
                            border: `1px solid ${selectedTeam.visibility === 'public' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(99, 102, 241, 0.25)'}`,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                        }}>
                            {selectedTeam.visibility === 'public' ? <><IconGlobe size={11} /> Public</> : <><IconLock size={11} /> Private</>}
                        </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 500,
                            padding: '2px 9px',
                            borderRadius: 9999,
                            background: 'rgba(255, 255, 255, 0.04)',
                            color: '#a1a1aa',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5
                        }}>
                            <IconUsers size={12} style={{ color: '#71717a' }} />
                            <span style={{ color: '#f4f4f5', fontWeight: 600 }}>{selectedTeam.members.length}</span> members
                        </span>
                        <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 500,
                            padding: '2px 9px',
                            borderRadius: 9999,
                            background: 'rgba(255, 255, 255, 0.04)',
                            color: '#a1a1aa',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5
                        }}>
                            <IconHash size={12} style={{ color: '#71717a' }} />
                            <span style={{ color: '#f4f4f5', fontWeight: 600 }}>{teamChannelsCount}</span> channels
                        </span>
                        {selectedTeam.description && (
                            <span style={{
                                fontSize: '0.8rem',
                                color: '#94a3b8',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: 420
                            }}>
                                • {selectedTeam.description}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Meet Now Button */}
                <button
                    type="button"
                    onClick={onStartMeeting}
                    style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 10px rgba(16, 185, 129, 0.3)',
                        transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)'
                        e.currentTarget.style.boxShadow = '0 4px 14px rgba(16, 185, 129, 0.45)'
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'none'
                        e.currentTarget.style.boxShadow = '0 2px 10px rgba(16, 185, 129, 0.3)'
                    }}
                    title="Meet Now (Start instant conference)"
                    aria-label="Meet Now"
                >
                    <IconVideo size={18} />
                </button>

                {/* Add Channel Button */}
                <button
                    type="button"
                    onClick={onOpenCreateChannel}
                    style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#e4e4e7',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                        e.currentTarget.style.color = '#ffffff'
                        e.currentTarget.style.transform = 'translateY(-1px)'
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)'
                        e.currentTarget.style.color = '#e4e4e7'
                        e.currentTarget.style.transform = 'none'
                    }}
                    title="Create Channel"
                    aria-label="Create Channel"
                >
                    <IconPlus size={18} />
                </button>

                {/* Invite Member Button */}
                <button
                    type="button"
                    onClick={onOpenInviteModal}
                    style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                        border: '1px solid rgba(255, 255, 255, 0.18)',
                        color: '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 10px rgba(99, 102, 241, 0.35)',
                        transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)'
                        e.currentTarget.style.boxShadow = '0 4px 14px rgba(99, 102, 241, 0.5)'
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'none'
                        e.currentTarget.style.boxShadow = '0 2px 10px rgba(99, 102, 241, 0.35)'
                    }}
                    title="Invite Member"
                    aria-label="Invite Member"
                >
                    <IconUserPlus size={18} />
                </button>

                {/* Join Team if public and not member */}
                {!isMember && selectedTeam.visibility === 'public' && (
                    <button
                        type="button"
                        onClick={onJoinTeam}
                        disabled={updating}
                        style={{
                            width: 38,
                            height: 38,
                            borderRadius: 10,
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            color: '#e4e4e7',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease'
                        }}
                        title="Join Team"
                        aria-label="Join Team"
                    >
                        <IconUsers size={17} />
                    </button>
                )}

                {/* Leave Team if member and not owner */}
                {isMember && !isOwnerOrAdmin && (
                    <button
                        type="button"
                        onClick={onLeaveTeam}
                        disabled={updating}
                        style={{
                            width: 38,
                            height: 38,
                            borderRadius: 10,
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            color: '#f87171',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease'
                        }}
                        title="Leave Team"
                        aria-label="Leave Team"
                    >
                        <IconTrash size={16} />
                    </button>
                )}
            </div>
        </div>
    )
}
