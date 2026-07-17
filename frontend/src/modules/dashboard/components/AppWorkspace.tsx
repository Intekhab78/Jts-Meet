import React, { useState, useEffect, Suspense } from 'react'
import { useMeetingContext } from '../../meeting/context/MeetingContext'
import { API_BASE } from '../../../config'

const MeetingRoom = React.lazy(() => import('../../meeting/components/MeetingRoom').then(m => ({ default: m.MeetingRoom })))
const OrganizationSettingsPage = React.lazy(() => import('../../organization/OrganizationSettingsPage').then(m => ({ default: m.OrganizationSettingsPage })))
const TeamSettingsPage = React.lazy(() => import('../../team/TeamSettingsPage').then(m => ({ default: m.TeamSettingsPage })))
const ChannelSettingsPage = React.lazy(() => import('../../channel/ChannelSettingsPage').then(m => ({ default: m.ChannelSettingsPage })))
const MeetingTrendsChart = React.lazy(() => import('./MeetingTrendsChart').then(m => ({ default: m.MeetingTrendsChart })))

interface AppWorkspaceProps {
    token: string
    onLogout: () => void
}

function WorkspaceTabSkeleton() {
    return (
        <div style={{ padding: 40, width: '100%', display: 'flex', flexDirection: 'column', gap: 24, boxSizing: 'border-box' }}>
            <div className="skeleton" style={{ height: 100, width: '100%', borderRadius: 'var(--radius-xl)' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
                <div className="skeleton" style={{ height: 90, borderRadius: 'var(--radius-lg)' }} />
                <div className="skeleton" style={{ height: 90, borderRadius: 'var(--radius-lg)' }} />
                <div className="skeleton" style={{ height: 90, borderRadius: 'var(--radius-lg)' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 28 }}>
                <div className="skeleton" style={{ height: 260, borderRadius: 'var(--radius-xl)' }} />
                <div className="skeleton" style={{ height: 260, borderRadius: 'var(--radius-xl)' }} />
            </div>
        </div>
    )
}

export function AppWorkspace({ token, onLogout }: AppWorkspaceProps) {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'meeting' | 'history' | 'scheduled' | 'organization' | 'team' | 'channel' | 'profile'>(() => {
        const hash = window.location.hash.replace('#', '')
        const validTabs = ['dashboard', 'meeting', 'history', 'scheduled', 'organization', 'team', 'channel', 'profile']
        if (validTabs.includes(hash)) {
            return hash as any
        }
        return 'dashboard'
    })
    const [searchQuery, setSearchQuery] = useState('')
    const [historyFilter, setHistoryFilter] = useState<'all' | 'recorded' | 'regular'>('all')

    const { joined } = useMeetingContext()
    const [sidebarExpanded, setSidebarExpanded] = useState(false)
    const [isHovered, setIsHovered] = useState(false)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const showFullSidebar = !joined || sidebarExpanded || isHovered

    const [windowWidth, setWindowWidth] = useState(window.innerWidth)
    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth)
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    // Sync activeTab state to URL hash
    useEffect(() => {
        if (activeTab) {
            window.history.replaceState(null, '', `/#${activeTab}`)
        }
    }, [activeTab])

    // Listen for hash changes (e.g. browser back/forward button)
    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash.replace('#', '')
            const validTabs = ['dashboard', 'meeting', 'history', 'scheduled', 'organization', 'team', 'channel', 'profile']
            if (validTabs.includes(hash)) {
                setActiveTab(hash as any)
            }
        }
        window.addEventListener('hashchange', handleHashChange)
        return () => window.removeEventListener('hashchange', handleHashChange)
    }, [])

    // Profile States
    const [profileName, setProfileName] = useState('Team Member')
    const [profileEmail, setProfileEmail] = useState('member@jtsmeet.com')
    const [userId, setUserId] = useState('')

    // Dynamic Database meeting lists
    const [historyItems, setHistoryItems] = useState<any[]>([])
    const [scheduledItems, setScheduledItems] = useState<any[]>([])

    // Organization and Team workspace lists
    const [organizations, setOrganizations] = useState<any[]>([])
    const [currentOrgId, setCurrentOrgId] = useState<string>('')
    const [teams, setTeams] = useState<any[]>([])
    const [currentTeamId, setCurrentTeamId] = useState<string>('')

    // State for Scheduler form
    const [scheduleTitle, setScheduleTitle] = useState('')
    const [scheduleDate, setScheduleDate] = useState('')
    const [scheduleTime, setScheduleTime] = useState('')
    const [scheduleDuration, setScheduleDuration] = useState('30m')

    // Fetch user details & meetings from API
    const fetchProfile = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (response.status === 401) {
                onLogout()
                return
            }
            const data = await response.json()
            if (response.ok && data?.data) {
                setProfileName(data.data.fullName)
                setProfileEmail(data.data.email)
                setUserId(data.data._id || data.data.id || '')
            }
        } catch (err) {
            console.error('Failed to fetch profile:', err)
        }
    }

    const fetchMeetings = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/meeting/mine`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (response.status === 401) {
                onLogout()
                return
            }
            const data = await response.json()
            if (response.ok && data?.data) {
                const list = data.data as any[]

                // Map to history list
                const history = list.filter(m => m.status === 'ended').map(m => ({
                    id: m.meetingId,
                    title: m.title,
                    date: m.startedAt ? new Date(m.startedAt).toLocaleDateString() : new Date(m.createdAt).toLocaleDateString(),
                    time: m.startedAt ? new Date(m.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    duration: m.endedAt && m.startedAt ? `${Math.round((new Date(m.endedAt).getTime() - new Date(m.startedAt).getTime()) / 60000)}m` : '15m',
                    participants: m.participants?.length || 1,
                    recorded: false,
                    status: 'Completed'
                }))

                // Map to scheduled list
                const scheduled = list.filter(m => m.status === 'scheduled' || m.status === 'active').map(m => ({
                    id: m.meetingId,
                    title: m.title,
                    date: new Date(m.createdAt).toLocaleDateString(),
                    time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    duration: '30m',
                    host: m.host?.fullName || 'Host'
                }))

                setHistoryItems(history)
                setScheduledItems(scheduled)
            }
        } catch (err) {
            console.error('Failed to fetch meetings:', err)
        }
    }

    const fetchOrganizations = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/organization/mine`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (response.status === 401) {
                onLogout()
                return
            }
            const data = await response.json()
            if (response.ok && data?.data) {
                setOrganizations(data.data)
                if (data.data.length > 0 && !currentOrgId) {
                    setCurrentOrgId(data.data[0]._id)
                }
            }
        } catch (err) {
            console.error('Failed to load user organizations:', err)
        }
    }

    const fetchTeams = async (orgId: string) => {
        if (!orgId) return
        try {
            const response = await fetch(`${API_BASE}/api/team/organization/${orgId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (response.status === 401) {
                onLogout()
                return
            }
            const data = await response.json()
            if (response.ok && data?.data) {
                setTeams(data.data)
                if (data.data.length > 0) {
                    setCurrentTeamId(data.data[0]._id)
                } else {
                    setCurrentTeamId('')
                }
            }
        } catch (err) {
            console.error('Failed to load teams:', err)
        }
    }

    useEffect(() => {
        fetchProfile()
        fetchMeetings()
        fetchOrganizations()
    }, [token])

    useEffect(() => {
        if (currentOrgId) {
            fetchTeams(currentOrgId)
        } else {
            setTeams([])
            setCurrentTeamId('')
        }
    }, [currentOrgId])

    const handleScheduleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!scheduleTitle) return

        try {
            const response = await fetch(`${API_BASE}/api/meeting/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ title: scheduleTitle })
            })
            if (response.status === 401) {
                onLogout()
                return
            }
            const data = await response.json()
            if (response.ok) {
                fetchMeetings()
                setScheduleTitle('')
                setScheduleDate('')
                setScheduleTime('')
                setActiveTab('scheduled')
            } else {
                alert(data.message || 'Failed to schedule meeting')
            }
        } catch (err) {
            console.error('Error creating meeting:', err)
        }
    }

    useEffect(() => {
        setMobileMenuOpen(false)
    }, [activeTab])

    const filteredHistory = historyItems.filter(item => {
        const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || item.id.toLowerCase().includes(searchQuery.toLowerCase())
        if (historyFilter === 'all') return matchesSearch
        if (historyFilter === 'recorded') return matchesSearch && item.recorded
        return matchesSearch && !item.recorded
    })

    return (
        <div style={{ display: 'flex', height: '100vh', background: 'var(--color-bg-base)', overflow: 'hidden', position: 'relative' }}>
            <a href="#main-content" className="skip-link">Skip to main content</a>

            {/* Mobile Sidebar Backdrop Overlay */}
            {mobileMenuOpen && (
                <div
                    onClick={() => setMobileMenuOpen(false)}
                    className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[999]"
                />
            )}

            {/* Sidebar Navigation */}
            <aside
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="transition-transform duration-300 ease-in-out z-[1000]"
                style={{
                    position: windowWidth < 768 ? 'fixed' : 'static',
                    transform: (windowWidth >= 768 || mobileMenuOpen) ? 'translateX(0)' : 'translateX(-100%)',
                    width: windowWidth < 768 ? (mobileMenuOpen ? 240 : 0) : ((mobileMenuOpen || showFullSidebar) ? 240 : 72),
                    background: 'rgba(10,11,15,0.98)',
                    borderRight: '1px solid var(--color-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: (mobileMenuOpen || showFullSidebar) ? '24px 16px' : '24px 8px',
                    flexShrink: 0,
                    alignItems: (mobileMenuOpen || showFullSidebar) ? 'stretch' : 'center',
                    overflow: 'hidden',
                    top: 0,
                    bottom: 0,
                    left: 0
                }}
            >
                {/* Brand */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28, paddingLeft: (mobileMenuOpen || showFullSidebar) ? 8 : 0, justifyContent: (mobileMenuOpen || showFullSidebar) ? 'flex-start' : 'center' }}>
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

                {/* Workspace / Org Switcher Dropdown is now in the top navbar */}

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
                                    👥 {t.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Nav list */}
                {(() => {
                    const currentOrg = organizations.find(org => org._id === currentOrgId)
                    const userMemberEntry = currentOrg?.members?.find((m: any) =>
                        (m.userId?._id || m.userId || '').toString() === userId.toString()
                    )
                    const isOrgAdminOrOwner =
                        organizations.length === 0 ||
                        (currentOrg && userId && (currentOrg.ownerId?._id || currentOrg.ownerId || '').toString() === userId.toString()) ||
                        (userMemberEntry && (userMemberEntry.role === 'owner' || userMemberEntry.role === 'admin'))

                    return (
                        <nav style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, overflowY: 'auto', width: '100%', alignItems: (mobileMenuOpen || showFullSidebar) ? 'stretch' : 'center' }}>
                            {[
                                { id: 'dashboard', label: 'Dashboard', icon: '📊', adminOnly: false },
                                { id: 'meeting', label: 'Meeting Room', icon: '📹', adminOnly: false },
                                { id: 'history', label: 'History log', icon: '📜', adminOnly: false },
                                { id: 'scheduled', label: 'Scheduled', icon: '📅', adminOnly: false },
                                { id: 'organization', label: 'Organizations', icon: '🏢', adminOnly: true },
                                { id: 'team', label: 'Teams Settings', icon: '👥', adminOnly: true },
                                { id: 'channel', label: 'Channels Settings', icon: '💬', adminOnly: true },
                                { id: 'profile', label: 'User Profile', icon: '👤', adminOnly: false }
                            ].filter(item => !item.adminOnly || isOrgAdminOrOwner).map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id as any)}
                                    title={!(mobileMenuOpen || showFullSidebar) ? item.label : undefined}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 12, padding: (mobileMenuOpen || showFullSidebar) ? '10px 14px' : '10px 0',
                                        justifyContent: (mobileMenuOpen || showFullSidebar) ? 'flex-start' : 'center',
                                        width: '100%',
                                        border: 'none', background: activeTab === item.id ? 'var(--color-accent-light)' : 'transparent',
                                        color: activeTab === item.id ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                                        borderRadius: 'var(--radius-md)', fontSize: '0.875rem', fontWeight: 600,
                                        cursor: 'pointer', transition: 'all 0.15s ease'
                                    }}
                                >
                                    <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                                    {(mobileMenuOpen || showFullSidebar) && <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
                                </button>
                            ))}
                        </nav>
                    )
                })()}

                {/* Pin/Collapse lock button inside meeting */}
                {joined && (
                    <button
                        onClick={() => setSidebarExpanded(!sidebarExpanded)}
                        className="btn btn-ghost"
                        style={{
                            display: 'flex', alignItems: 'center', gap: 10, padding: (mobileMenuOpen || showFullSidebar) ? '10px 14px' : '10px 0',
                            justifyContent: (mobileMenuOpen || showFullSidebar) ? 'flex-start' : 'center',
                            border: 'none', color: 'var(--color-text-muted)',
                            borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', fontWeight: 600,
                            cursor: 'pointer', margin: '8px 0', width: '100%'
                        }}
                        title={sidebarExpanded ? "Collapse Sidebar" : "Pin Sidebar Open"}
                    >
                        <span>{(mobileMenuOpen || showFullSidebar) ? (sidebarExpanded ? '◀ Collapse' : '📌 Pin Sidebar') : '▶'}</span>
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
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)';
                        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
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

            {/* Main Content Pane */}
            <main id="main-content" tabIndex={-1} style={{ flex: 1, overflowY: activeTab === 'meeting' ? 'hidden' : 'auto', display: 'flex', flexDirection: 'column', position: 'relative', outline: 'none' }}>
                {activeTab !== 'meeting' && (
                    <header style={{
                        position: 'sticky',
                        top: 0,
                        height: '64px',
                        minHeight: '64px',
                        borderBottom: '1px solid var(--color-border)',
                        background: 'var(--color-bg-base)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 24px',
                        boxSizing: 'border-box',
                        zIndex: 50
                    }}>
                        {/* Left Side: Active Tab Title */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <button
                                onClick={() => setMobileMenuOpen(true)}
                                className="btn-ghost"
                                style={{
                                    border: 'none', background: 'transparent', color: '#fff', fontSize: '1.25rem',
                                    cursor: 'pointer', padding: '4px 8px', display: windowWidth < 768 ? 'flex' : 'none', 
                                    alignItems: 'center', marginRight: 4
                                }}
                                aria-label="Open navigation menu"
                            >
                                ☰
                            </button>
                            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                                {activeTab === 'dashboard' ? 'Dashboard' : 
                                 activeTab === 'history' ? 'History Log' :
                                 activeTab === 'scheduled' ? 'Scheduled' :
                                 activeTab === 'organization' ? 'Organizations' :
                                 activeTab === 'team' ? 'Teams' :
                                 activeTab === 'channel' ? 'Channels' :
                                 activeTab === 'profile' ? 'Profile' : activeTab}
                            </span>
                        </div>

                        {/* Right Side: Organization Switcher */}
                        {organizations.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
                                        padding: '4px 8px',
                                        color: '#fff',
                                        outline: 'none',
                                        fontSize: '0.75rem',
                                        cursor: 'pointer',
                                        maxWidth: '120px',
                                        textOverflow: 'ellipsis'
                                    }}
                                >
                                    {organizations.map((org: any) => (
                                        <option key={org._id} value={org._id} style={{ background: 'var(--color-surface-1)', color: '#fff' }}>
                                            🏢 {org.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </header>
                )}
                <Suspense fallback={<WorkspaceTabSkeleton />}>
                    {/* MEETING TAB */}
                    {activeTab === 'meeting' && (() => {
                        const currentOrg = organizations.find(org => org._id === currentOrgId)
                        const userMemberEntry = currentOrg?.members?.find((m: any) =>
                            (m.userId?._id || m.userId || '').toString() === userId.toString()
                        )
                        const isOrgAdminOrOwner =
                            organizations.length === 0 ||
                            (currentOrg && userId && (currentOrg.ownerId?._id || currentOrg.ownerId || '').toString() === userId.toString()) ||
                            (userMemberEntry && (userMemberEntry.role === 'owner' || userMemberEntry.role === 'admin'))

                        return (
                            <div style={{ width: '100%', height: '100%' }}>
                                <MeetingRoom initialToken={token} isAdminOrOwner={isOrgAdminOrOwner} />
                            </div>
                        )
                    })()}

                    {/* DASHBOARD TAB */}
                    {activeTab === 'dashboard' && (
                        <div className="anim-fade-in" style={{ padding: windowWidth < 768 ? '24px 16px' : '40px', maxWidth: 1100, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 32, boxSizing: 'border-box' }}>
                            {/* Welcome Banner */}
                            <div className="glass-card flex flex-col md:flex-row gap-6 md:items-center justify-between" style={{ padding: '28px 36px' }}>
                                <div>
                                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 6px', color: '#fff' }}>Welcome back, {profileName}!</h2>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', margin: 0 }}>Review scheduled calls, access past session recordings, and host secure instant room calls.</p>
                                </div>
                                <button onClick={() => setActiveTab('meeting')} className="btn btn-primary" style={{ padding: '12px 24px', alignSelf: 'flex-start' }}>
                                    Start New Meeting
                                </button>
                            </div>

                            {/* Stats Cards grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
                                {[
                                    { title: 'Ended Meetings', val: `${historyItems.length} sessions`, icon: '📹', desc: 'Secure database logs', trend: '+14.2%', trendUp: true },
                                    { title: 'Calendar Schedule', val: `${scheduledItems.length} planned`, icon: '📅', desc: 'Upcoming presentations', trend: '+8.4%', trendUp: true },
                                    { title: 'Storage quota', val: '1.4 GB / 10 GB', icon: '💾', desc: '14% capacity used', trend: 'Optimal', trendUp: null }
                                ].map((stat, i) => (
                                    <div key={i} className="glass-card-sm" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
                                        <div style={{ fontSize: '2rem', padding: 8, background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)' }}>{stat.icon}</div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>{stat.title}</span>
                                                {stat.trend && (
                                                    <span style={{
                                                        fontSize: '0.6875rem',
                                                        fontWeight: 700,
                                                        color: stat.trendUp === true ? '#4ade80' : stat.trendUp === false ? '#f87171' : 'var(--color-text-secondary)',
                                                        background: stat.trendUp === true ? 'rgba(34,197,94,0.1)' : stat.trendUp === false ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)',
                                                        padding: '2px 6px',
                                                        borderRadius: 'var(--radius-xs)',
                                                        border: '1px solid ' + (stat.trendUp === true ? 'rgba(34,197,94,0.15)' : stat.trendUp === false ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.08)')
                                                    }}>
                                                        {stat.trend}
                                                    </span>
                                                )}
                                            </div>
                                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '2px 0 4px', color: '#fff' }}>{stat.val}</h3>
                                            <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>{stat.desc}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Visual Analytics Chart Widget */}
                            <div className="flex flex-col lg:flex-row" style={{ gap: 20, alignItems: 'stretch' }}>
                                <MeetingTrendsChart meetings={historyItems} />
                            </div>

                            {/* Two Column Layout */}
                            <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr]" style={{ gap: 28, alignItems: 'start' }}>
                                {/* Upcoming Meetings List */}
                                <div className="glass-card" style={{ padding: 24 }}>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 16px', color: '#fff' }}>Upcoming Scheduled Conferences</h3>
                                    {scheduledItems.length === 0 ? (
                                        <div style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: '40px 20px',
                                            textAlign: 'center',
                                            background: 'rgba(255, 255, 255, 0.01)',
                                            border: '1px dashed var(--color-border)',
                                            borderRadius: 'var(--radius-lg)',
                                            margin: '10px 0'
                                        }}>
                                            <span style={{ fontSize: '2rem', marginBottom: 12 }}>📅</span>
                                            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff', margin: '0 0 4px' }}>No Scheduled Conferences</h4>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '0 0 16px', maxWidth: 280, lineHeight: 1.4 }}>
                                                Plan upcoming room sessions or schedule instant video conferences for your workspace.
                                            </p>
                                            <button onClick={() => {
                                                const inputEl = document.querySelector('input[placeholder*="sync"]') as HTMLInputElement;
                                                if (inputEl) inputEl.focus();
                                            }} className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '0.75rem' }}>
                                                Schedule Call
                                            </button>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                            {scheduledItems.map(item => (
                                                <div key={item.id} className="glass-card-sm" style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div>
                                                        <h4 style={{ fontSize: '0.875rem', fontWeight: 700, margin: '0 0 4px', color: '#fff' }}>{item.title}</h4>
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                                                            📅 Scheduled (ID: {item.id}) • Host: {item.host}
                                                        </span>
                                                    </div>
                                                    <button onClick={() => setActiveTab('meeting')} className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '0.75rem' }}>
                                                        Join Room
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Quick Scheduler form */}
                                <form onSubmit={handleScheduleSubmit} className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 4px', color: '#fff' }}>Quick Conference Scheduler</h3>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '0 0 8px' }}>Invite external members and reserve calendar spots.</p>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Topic / Title</label>
                                        <input
                                            type="text" required value={scheduleTitle} onChange={(e) => setScheduleTitle(e.target.value)}
                                            placeholder="e.g., Marketing sync"
                                            className="input py-2 px-3"
                                        />
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Date</label>
                                            <input
                                                type="date" required value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)}
                                                className="input py-2 px-3"
                                            />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Time</label>
                                            <input
                                                type="time" required value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)}
                                                className="input py-2 px-3"
                                            />
                                        </div>
                                    </div>

                                    <button type="submit" className="btn btn-primary" style={{ padding: '10px 14px', width: '100%', marginTop: 6 }}>
                                        Confirm and Schedule
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* HISTORY LOG TAB */}
                    {activeTab === 'history' && (
                        <div className="anim-fade-in" style={{ padding: windowWidth < 768 ? '24px 16px' : '40px', maxWidth: 1100, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24, boxSizing: 'border-box' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 4px', color: '#fff' }}>Conference History Log</h2>
                                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: 0 }}>Review summaries, download recordings, and inspect participant lists.</p>
                                </div>

                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search by ID or topic..."
                                    className="input py-2 px-3"
                                    style={{ width: 240 }}
                                />
                            </div>

                            {/* History filter tabs */}
                            <div style={{ display: 'flex', gap: 10 }}>
                                {[
                                    { id: 'all', label: 'All Sessions' },
                                    { id: 'recorded', label: 'Recorded Only' },
                                    { id: 'regular', label: 'No Recording' }
                                ].map(btn => (
                                    <button
                                        key={btn.id}
                                        onClick={() => setHistoryFilter(btn.id as any)}
                                        style={{
                                            border: 'none', background: historyFilter === btn.id ? 'rgba(255,255,255,0.06)' : 'transparent',
                                            color: historyFilter === btn.id ? '#fff' : 'var(--color-text-muted)',
                                            padding: '6px 14px', borderRadius: 'var(--radius-full)', fontSize: '0.8125rem',
                                            fontWeight: 600, cursor: 'pointer'
                                        }}
                                    >
                                        {btn.label}
                                    </button>
                                ))}
                            </div>

                            {/* Log Table */}
                            <div className="responsive-table-container" style={{ margin: 0 }}>
                                <table className="premium-table">
                                    <thead>
                                        <tr>
                                            <th>Topic / Session ID</th>
                                            <th>Date & Time</th>
                                            <th>Duration</th>
                                            <th>Members</th>
                                            <th>Status</th>
                                            <th>Backups</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredHistory.length === 0 ? (
                                            <tr className="empty-row">
                                                <td colSpan={6} style={{ padding: '60px 20px', textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                                        <span style={{ fontSize: '2rem' }}>📜</span>
                                                        <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff', margin: 0 }}>No matching sessions found</h4>
                                                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0, maxWidth: 300, lineHeight: 1.4 }}>
                                                            Check your search query or clear the active history filters to view past sessions.
                                                        </p>
                                                        {searchQuery && (
                                                            <button onClick={() => setSearchQuery('')} className="btn btn-secondary text-xs" style={{ marginTop: 8, padding: '4px 10px' }}>
                                                                Reset Search
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredHistory.map(item => (
                                                <tr key={item.id}>
                                                    <td>
                                                        <div style={{ fontWeight: 600, color: '#fff' }}>{item.title}</div>
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{item.id}</span>
                                                    </td>
                                                    <td style={{ color: 'var(--color-text-secondary)' }}>{item.date} at {item.time}</td>
                                                    <td style={{ color: 'var(--color-text-secondary)' }}>{item.duration}</td>
                                                    <td style={{ color: 'var(--color-text-secondary)' }}>👤 {item.participants} users</td>
                                                    <td>
                                                        <span className="badge badge-success">{item.status}</span>
                                                    </td>
                                                    <td>
                                                        {item.recorded ? (
                                                            <span className="badge badge-danger" style={{ display: 'inline-flex', gap: 4, cursor: 'pointer' }} title="Click to download file">
                                                                ⬇ MP4 Recording
                                                            </span>
                                                        ) : (
                                                            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>Unavailable</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* SCHEDULED CALENDAR TAB */}
                    {activeTab === 'scheduled' && (
                        <div className="anim-fade-in" style={{ padding: windowWidth < 768 ? '24px 16px' : '40px', maxWidth: 1100, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24, boxSizing: 'border-box' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 4px', color: '#fff' }}>Planned Conferences</h2>
                                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: 0 }}>Review schedules, share invites, and initiate meeting rooms.</p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {scheduledItems.map(item => (
                                    <div key={item.id} className="glass-card flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ padding: '20px' }}>
                                        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                                            <div style={{
                                                width: 48, height: 48, borderRadius: 'var(--radius-md)', background: 'var(--color-accent-light)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem'
                                            }}>
                                                📅
                                            </div>
                                            <div>
                                                <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 4px', color: '#fff' }}>{item.title}</h4>
                                                <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                                                    Scheduled (ID: {item.id}) • Created: {item.date} {item.time}
                                                </span>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                                                    Organized by: <span style={{ fontWeight: 600 }}>{item.host}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', width: '100%', maxWidth: 'max-content' }} className="w-full sm:w-auto">
                                            <button onClick={() => {
                                                const joinLink = `${window.location.origin}/meet/${item.id}`
                                                navigator.clipboard.writeText(`Join meeting "${item.title}" via JTS-Meet: ${joinLink}`)
                                                alert('Invite link copied to clipboard!')
                                            }} className="btn btn-secondary flex-1 sm:flex-none" style={{ padding: '8px 14px', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                                                Copy Invite
                                            </button>
                                            <button onClick={() => setActiveTab('meeting')} className="btn btn-primary flex-1 sm:flex-none" style={{ padding: '8px 14px', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                                                Start Room
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ORGANIZATIONS TAB */}
                    {activeTab === 'organization' && (
                        <div className="anim-fade-in" style={{ padding: windowWidth < 768 ? '24px 16px' : '40px', maxWidth: 1100, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 32, boxSizing: 'border-box' }}>
                            <OrganizationSettingsPage token={token} organizationId={currentOrgId || undefined} />
                        </div>
                    )}

                    {/* TEAMS SETTINGS TAB */}
                    {activeTab === 'team' && (
                        <div className="anim-fade-in" style={{ padding: windowWidth < 768 ? '24px 16px' : '40px', maxWidth: 1100, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 32, boxSizing: 'border-box' }}>
                            <TeamSettingsPage token={token} organizationId={currentOrgId || undefined} />
                        </div>
                    )}

                    {/* CHANNELS SETTINGS TAB */}
                    {activeTab === 'channel' && (
                        <div className="anim-fade-in" style={{ padding: windowWidth < 768 ? '24px 16px' : '40px', maxWidth: 1100, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 32, boxSizing: 'border-box' }}>
                            {currentTeamId ? (
                                <ChannelSettingsPage token={token} organizationId={currentOrgId || undefined} teamId={currentTeamId} />
                            ) : (
                                <div className="glass-card" style={{ padding: 40, margin: 32, textAlign: 'center' }}>
                                    <h3 style={{ color: '#fff', marginBottom: 12 }}>No Team Available</h3>
                                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                                        Please create a team in the "Teams Settings" tab first.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* USER PROFILE TAB */}
                    {activeTab === 'profile' && (
                        <div className="anim-fade-in" style={{ padding: 40, maxWidth: 800, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 28 }}>
                            <div>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 4px', color: '#fff' }}>User Profile & Settings</h2>
                                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: 0 }}>Configure personal details and global device defaults.</p>
                            </div>

                            <div className="glass-card" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                                    <div style={{
                                        width: 72, height: 72, borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '2rem', fontWeight: 700, color: '#fff', boxShadow: 'var(--shadow-md)'
                                    }}>
                                        {profileName.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 4px', color: '#fff' }}>{profileName}</h3>
                                        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: 0 }}>Active Organization: <span style={{ fontWeight: 600 }}>Default Org</span></p>
                                    </div>
                                </div>

                                <div style={{ width: '100%', height: 1, background: 'var(--color-border)' }} />

                                <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 16 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Display Name</label>
                                        <input
                                            type="text" value={profileName} onChange={(e) => setProfileName(e.target.value)}
                                            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: '#fff', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Email Address</label>
                                        <input
                                            type="email" value={profileEmail} disabled
                                            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', cursor: 'not-allowed' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="glass-card" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0, color: '#fff' }}>Connected Devices defaults</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: '0.8125rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span>🎥 Webcam default option</span>
                                        <span className="badge badge-success">Integrated Camera</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span>🎤 Audio Microphone default</span>
                                        <span className="badge badge-success">System Mic Input</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </Suspense>
            </main>
        </div>
    )
}
