import React from 'react'
import { WorkspaceTab } from '../workspace.types'

interface WorkspaceSidebarProps {
    activeTab: WorkspaceTab
    setActiveTab: (tab: WorkspaceTab) => void
    mobileMenuOpen: boolean
    setMobileMenuOpen: (open: boolean) => void
    showFullSidebar: boolean
    toggleSidebarCollapse: () => void
    joined: boolean
    sidebarExpanded: boolean
    setSidebarExpanded: (expanded: boolean) => void
    setIsHovered: (hovered: boolean) => void
    windowWidth: number
    isSuperAdmin: boolean
    isOrgAdminOrOwner: boolean
    teams: any[]
    currentTeamId: string
    setCurrentTeamId: (id: string) => void
    onLogout: () => void
}

export function WorkspaceSidebar({
    activeTab,
    setActiveTab,
    mobileMenuOpen,
    setMobileMenuOpen,
    showFullSidebar,
    toggleSidebarCollapse,
    joined,
    sidebarExpanded,
    setSidebarExpanded,
    setIsHovered,
    windowWidth,
    isSuperAdmin,
    isOrgAdminOrOwner,
    teams,
    currentTeamId,
    setCurrentTeamId,
    onLogout
}: WorkspaceSidebarProps) {
    return (
        <aside
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="z-[1000]"
            style={{
                position: windowWidth < 768 ? 'fixed' : 'static',
                transform: (windowWidth >= 768 || mobileMenuOpen) ? 'translateX(0)' : 'translateX(-100%)',
                width: windowWidth < 768 ? (mobileMenuOpen ? 240 : 0) : ((mobileMenuOpen || showFullSidebar) ? 240 : 72),
                background: 'rgba(10,11,15,0.98)',
                borderRight: '1px solid var(--color-border)',
                display: 'flex',
                flexDirection: 'column',
                padding: (mobileMenuOpen || showFullSidebar) ? '22px 16px' : '22px 8px',
                flexShrink: 0,
                alignItems: (mobileMenuOpen || showFullSidebar) ? 'stretch' : 'center',
                overflowX: 'hidden',
                overflowY: 'auto',
                top: 0,
                bottom: 0,
                left: 0,
                transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1), padding 0.25s ease, transform 0.3s ease-in-out'
            }}
        >
            {/* Brand & Collapse / Expand Toggle */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: (mobileMenuOpen || showFullSidebar) ? 24 : 14,
                paddingLeft: (mobileMenuOpen || showFullSidebar) ? 4 : 0,
                paddingRight: (mobileMenuOpen || showFullSidebar) ? 4 : 0,
                justifyContent: (mobileMenuOpen || showFullSidebar) ? 'space-between' : 'center',
                width: '100%'
            }}>
                <div
                    onClick={() => { if (!showFullSidebar) toggleSidebarCollapse() }}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        cursor: !showFullSidebar ? 'pointer' : 'default'
                    }}
                    title={!showFullSidebar ? "Click to expand sidebar" : undefined}
                >
                    <div style={{
                        width: 32, height: 32, background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                        borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: 'var(--shadow-glow-accent)', color: '#fff', flexShrink: 0
                    }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                        </svg>
                    </div>
                    {(mobileMenuOpen || showFullSidebar) && (
                        <span style={{ fontSize: '1.125rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>
                            JTS<span className="gradient-text">Meet</span>
                        </span>
                    )}
                </div>

                {/* Collapse Button (Shown when expanded) */}
                {(mobileMenuOpen || showFullSidebar) && (
                    <button
                        type="button"
                        onClick={toggleSidebarCollapse}
                        title="Collapse sidebar (Shrink)"
                        aria-label="Collapse sidebar"
                        style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: 8,
                            color: 'var(--color-text-secondary)',
                            width: 28,
                            height: 28,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.18s ease',
                            flexShrink: 0
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)'
                            e.currentTarget.style.color = '#fff'
                            e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                            e.currentTarget.style.color = 'var(--color-text-secondary)'
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                        }}
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <line x1="9" y1="3" x2="9" y2="21" />
                            <path d="m14 9-3 3 3 3" />
                        </svg>
                    </button>
                )}
            </div>

            {/* Expand Button (Shown below logo when collapsed) */}
            {!(mobileMenuOpen || showFullSidebar) && (
                <button
                    type="button"
                    onClick={toggleSidebarCollapse}
                    title="Expand sidebar"
                    aria-label="Expand sidebar"
                    style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 8,
                        color: 'var(--color-text-secondary)',
                        width: 32,
                        height: 28,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        marginBottom: 18,
                        transition: 'all 0.18s ease',
                        flexShrink: 0
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)'
                        e.currentTarget.style.color = '#fff'
                        e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)'
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                        e.currentTarget.style.color = 'var(--color-text-secondary)'
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                    }}
                >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <line x1="9" y1="3" x2="9" y2="21" />
                        <path d="m13 15 3-3-3-3" />
                    </svg>
                </button>
            )}

            {/* Team Switcher Dropdown */}
            {activeTab === 'channel' && teams.length > 0 && (mobileMenuOpen || showFullSidebar) && (
                <div style={{ marginBottom: 16, padding: '0 8px' }}>
                    <label style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                        Active Team
                    </label>
                    <select
                        value={currentTeamId}
                        onChange={(e) => setCurrentTeamId(e.target.value)}
                        className="input py-2"
                        style={{ background: 'var(--color-surface-2)', color: '#fff', outline: 'none', fontSize: '0.8125rem' }}
                    >
                        {teams.map((t: any) => (
                            <option key={t._id} value={t._id} style={{ background: 'var(--color-surface-1)', color: '#fff' }}>
                                {t.name}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Nav list */}
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, overflowY: 'auto', width: '100%', alignItems: (mobileMenuOpen || showFullSidebar) ? 'stretch' : 'center' }}>
                {[
                    {
                        id: 'dashboard',
                        label: 'Dashboard',
                        adminOnly: false,
                        superAdminOnly: false,
                        icon: () => (
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="7" height="9" rx="1.5" />
                                <rect x="14" y="3" width="7" height="5" rx="1.5" />
                                <rect x="14" y="12" width="7" height="9" rx="1.5" />
                                <rect x="3" y="16" width="7" height="5" rx="1.5" />
                            </svg>
                        )
                    },
                    {
                        id: 'meeting',
                        label: 'Meeting Room',
                        adminOnly: false,
                        superAdminOnly: false,
                        icon: () => (
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="23 7 16 12 23 17 23 7" />
                                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                            </svg>
                        )
                    },
                    {
                        id: 'chat',
                        label: 'Direct Messages',
                        adminOnly: false,
                        superAdminOnly: false,
                        icon: () => (
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                            </svg>
                        )
                    },
                    {
                        id: 'history',
                        label: 'History log',
                        adminOnly: false,
                        superAdminOnly: false,
                        icon: () => (
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="9" />
                                <polyline points="12 7 12 12 15 15" />
                            </svg>
                        )
                    },
                    {
                        id: 'scheduled',
                        label: 'Scheduled',
                        adminOnly: false,
                        superAdminOnly: false,
                        icon: () => (
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                        )
                    },
                    {
                        id: 'organization',
                        label: 'Organizations',
                        adminOnly: false,
                        superAdminOnly: false,
                        icon: () => (
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
                                <path d="M6 12H4a2 2 0 0 0-2 2v8h4" />
                                <path d="M18 9h2a2 2 0 0 1 2 2v11h-4" />
                                <line x1="10" y1="6" x2="14" y2="6" />
                                <line x1="10" y1="10" x2="14" y2="10" />
                                <line x1="10" y1="14" x2="14" y2="14" />
                            </svg>
                        )
                    },
                    {
                        id: 'team',
                        label: 'Teams Settings',
                        adminOnly: true,
                        superAdminOnly: false,
                        icon: () => (
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                        )
                    },
                    {
                        id: 'channel',
                        label: 'Channels Settings',
                        adminOnly: true,
                        superAdminOnly: false,
                        icon: () => (
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                        )
                    },
                    {
                        id: 'admin',
                        label: 'Admin Console',
                        adminOnly: true,
                        superAdminOnly: false,
                        icon: () => (
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg>
                        )
                    },
                    {
                        id: 'super-admin',
                        label: 'Platform Center',
                        adminOnly: false,
                        superAdminOnly: true,
                        icon: () => (
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="2" y1="12" x2="22" y2="12" />
                                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                            </svg>
                        )
                    },
                    {
                        id: 'profile',
                        label: 'User Profile',
                        adminOnly: false,
                        superAdminOnly: false,
                        icon: () => (
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                        )
                    }
                ].filter(item => {
                    if (item.superAdminOnly) return isSuperAdmin
                    if (item.adminOnly) return isOrgAdminOrOwner
                    return true
                }).map(item => {
                    const isActive = activeTab === item.id
                    return (
                        <button
                            key={item.id}
                            onClick={() => {
                                setActiveTab(item.id as any)
                                window.location.hash = `#${item.id}`
                                try {
                                    sessionStorage.setItem('jts_active_tab', item.id)
                                    localStorage.setItem('jts_active_tab', item.id)
                                } catch (_) {}
                                setMobileMenuOpen(false)
                            }}
                            title={!(mobileMenuOpen || showFullSidebar) ? item.label : undefined}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 12, padding: (mobileMenuOpen || showFullSidebar) ? '9px 12px' : '9px 0',
                                justifyContent: (mobileMenuOpen || showFullSidebar) ? 'flex-start' : 'center',
                                width: '100%',
                                border: 'none',
                                background: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                                color: isActive ? '#818cf8' : 'var(--color-text-secondary)',
                                borderRadius: 'var(--radius-md)', fontSize: '0.875rem', fontWeight: 600,
                                cursor: 'pointer', transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                                if (!isActive) {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                                    e.currentTarget.style.color = '#fff'
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isActive) {
                                    e.currentTarget.style.background = 'transparent'
                                    e.currentTarget.style.color = 'var(--color-text-secondary)'
                                }
                            }}
                        >
                            <span style={{
                                width: 28,
                                height: 28,
                                borderRadius: 7,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                background: isActive ? 'rgba(99, 102, 241, 0.22)' : 'rgba(255, 255, 255, 0.04)',
                                color: isActive ? '#a5b4fc' : '#94a3b8',
                                transition: 'all 0.15s ease'
                            }}>
                                {item.icon()}
                            </span>
                            {(mobileMenuOpen || showFullSidebar) && <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
                        </button>
                    )
                })}
            </nav>

            {/* Pin/Collapse lock button inside meeting */}
            {joined && (
                <button
                    onClick={() => setSidebarExpanded(!sidebarExpanded)}
                    className="btn btn-ghost"
                    style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: (mobileMenuOpen || showFullSidebar) ? '9px 12px' : '9px 0',
                        justifyContent: (mobileMenuOpen || showFullSidebar) ? 'flex-start' : 'center',
                        border: 'none', color: 'var(--color-text-muted)',
                        borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', fontWeight: 600,
                        cursor: 'pointer', margin: '8px 0', width: '100%',
                        transition: 'all 0.15s ease'
                    }}
                    title={sidebarExpanded ? "Collapse Sidebar" : "Pin Sidebar Open"}
                >
                    <span style={{
                        width: 26,
                        height: 26,
                        borderRadius: 6,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(255, 255, 255, 0.04)',
                        color: '#94a3b8',
                        flexShrink: 0
                    }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: sidebarExpanded ? 'rotate(-45deg)' : 'none', transition: 'transform 0.2s ease' }}>
                            <line x1="12" y1="17" x2="12" y2="22"/>
                            <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.89A2 2 0 0 1 15 10.77V5a3 3 0 0 0-6 0v5.77a2 2 0 0 1-1.11 1.79l-1.78.89A2 2 0 0 0 5 15.24Z"/>
                        </svg>
                    </span>
                    {(mobileMenuOpen || showFullSidebar) && (
                        <span style={{ whiteSpace: 'nowrap' }}>
                            {sidebarExpanded ? 'Collapse Sidebar' : 'Pin Sidebar'}
                        </span>
                    )}
                </button>
            )}

            {/* Footer sign out */}
            <button
                onClick={onLogout}
                title={!(mobileMenuOpen || showFullSidebar) ? "Sign Out" : undefined}
                style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: (mobileMenuOpen || showFullSidebar) ? '10px 14px' : '10px 0',
                    justifyContent: (mobileMenuOpen || showFullSidebar) ? 'flex-start' : 'center',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    background: 'rgba(239, 68, 68, 0.05)',
                    color: '#f87171',
                    borderRadius: 'var(--radius-md)', fontSize: '0.875rem', fontWeight: 600,
                    cursor: 'pointer', marginTop: joined ? '0' : 'auto', width: '100%',
                    transition: 'all 0.2s ease',
                    boxSizing: 'border-box'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'
                    e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)'
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)'
                    e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)'
                }}
            >
                <span style={{ display: 'flex', color: '#ef4444' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                </span>
                {(mobileMenuOpen || showFullSidebar) && <span style={{ whiteSpace: 'nowrap', color: '#f87171' }}>Sign Out</span>}
            </button>
        </aside>
    )
}
