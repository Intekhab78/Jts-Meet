import React from 'react'
import { UserStatusSelectorPopover } from '../../../components/common/UserStatusSelectorPopover'
import { UserAvatar } from '../../../components/common/UserAvatar'
import { WorkspaceTab } from '../workspace.types'

interface WorkspaceHeaderProps {
    token: string
    activeTab: WorkspaceTab
    setActiveTab: (tab: WorkspaceTab) => void
    setMobileMenuOpen: (open: boolean) => void
    windowWidth: number
    userId: string
    profileName: string
    profileImage: string
    organizations: any[]
    currentOrgId: string
    setCurrentOrgId: (id: string) => void
}

export function WorkspaceHeader({
    token,
    activeTab,
    setActiveTab,
    setMobileMenuOpen,
    windowWidth,
    userId,
    profileName,
    profileImage,
    organizations,
    currentOrgId,
    setCurrentOrgId
}: WorkspaceHeaderProps) {
    if (activeTab === 'meeting') return null

    return (
        <header style={{
            position: 'sticky',
            top: 0,
            height: '56px',
            minHeight: '56px',
            borderBottom: '1px solid var(--color-border)',
            background: 'rgba(10, 11, 15, 0.95)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: windowWidth < 480 ? '0 12px' : '0 20px',
            boxSizing: 'border-box',
            zIndex: 50
        }}>
            {/* Left Side: Active Tab Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                    onClick={() => setMobileMenuOpen(true)}
                    className="btn-ghost"
                    style={{
                        border: 'none', background: 'transparent', color: '#fff',
                        cursor: 'pointer', padding: '6px 8px', display: windowWidth < 768 ? 'flex' : 'none', 
                        alignItems: 'center', marginRight: 2
                    }}
                    aria-label="Open navigation menu"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <line x1="3" y1="12" x2="21" y2="12" />
                        <line x1="3" y1="18" x2="21" y2="18" />
                    </svg>
                </button>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                    {activeTab === 'dashboard' ? 'Dashboard' : 
                     activeTab === 'chat' ? 'Direct Messages' :
                     activeTab === 'history' ? 'History Log' :
                     activeTab === 'scheduled' ? 'Scheduled' :
                     activeTab === 'organization' ? 'Organizations' :
                     activeTab === 'team' ? 'Teams' :
                     activeTab === 'channel' ? 'Channels' :
                     activeTab === 'admin' ? 'Admin Console' :
                     activeTab === 'super-admin' ? 'Master Platform Center' :
                     activeTab === 'profile' ? 'Profile' : activeTab}
                </span>
            </div>

            {/* Right Side: Status Indicator, Organization Switcher & User Profile Pill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* Live Presence & Custom Status Popover */}
                <UserStatusSelectorPopover
                    token={token}
                    currentUserId={userId}
                    userName={profileName}
                />
                {organizations.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="hidden sm:inline" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                            Workspace:
                        </span>
                        <select
                            value={currentOrgId}
                            onChange={(e) => setCurrentOrgId(e.target.value)}
                            style={{
                                background: 'var(--color-surface-2)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-md)',
                                padding: '5px 10px',
                                color: '#fff',
                                outline: 'none',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                minWidth: 150,
                                maxWidth: windowWidth < 480 ? '160px' : 'none',
                                width: 'auto'
                            }}
                        >
                            {organizations.map((org: any) => (
                                <option key={org._id} value={org._id} style={{ background: 'var(--color-surface-1)', color: '#fff' }}>
                                    {org.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* User Profile Pill button */}
                <button
                    onClick={() => setActiveTab('profile')}
                    title={`Signed in as ${profileName} - Settings Hub`}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        background: activeTab === 'profile' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        border: activeTab === 'profile' ? '1px solid rgba(99, 102, 241, 0.6)' : '1px solid rgba(255, 255, 255, 0.08)',
                        padding: '3px 10px 3px 4px',
                        borderRadius: 9999,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                    }}
                >
                    <UserAvatar src={profileImage} name={profileName} size={26} fontSize="0.72rem" />
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#fff', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} className="hidden sm:inline">
                        {profileName.split(' ')[0]}
                    </span>
                </button>
            </div>
        </header>
    )
}
