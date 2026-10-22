/**
 * ============================================================================
 * Enterprise Unified AppWorkspace Component
 * ============================================================================
 * 
 * Central layout hub and router orchestrator for JTS Meet:
 * - Dynamic responsive sidebar with collapsible and mobile drawer modes
 * - Sticky glassmorphism header with status presence, profile dropdown & workspace selector
 * - WebRTC real-time direct call signaling & ringing audio management
 * - Group conference call transitions with automatic screen/audio switching
 * - Unified routing across 11 workspace modules with lazy Suspense fallbacks
 * - System announcements & impersonation support notices
 * 
 * Modularized Architecture:
 * - Types: `../workspace.types.ts`
 * - Hooks: `../hooks/useWorkspaceData.ts`, `../hooks/useWorkspaceCalls.ts`
 * - Views: `WorkspaceSidebar.tsx`, `WorkspaceHeader.tsx`, `WorkspaceModals.tsx`
 * ============================================================================
 */

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useMeetingContext } from '../../meeting/context/MeetingContext'
import { pushNotificationService } from '../../../services/pushNotification.service'

// Unified Workspace Types
import { WorkspaceTab, AppWorkspaceProps } from '../workspace.types'

// Custom Hooks for State, Data & WebRTC Direct Calls
import { useWorkspaceData } from '../hooks/useWorkspaceData'
import { useWorkspaceCalls } from '../hooks/useWorkspaceCalls'

// Modular Subcomponents
import { WorkspaceSidebar } from './WorkspaceSidebar'
import { WorkspaceHeader } from './WorkspaceHeader'
import { WorkspaceModals } from './WorkspaceModals'

// Lazy-loaded workspace tab views (Code-split for performance)
const MeetingRoom = React.lazy(() => import('../../meeting/components/MeetingRoom').then(m => ({ default: m.MeetingRoom })))
const DirectMessagesHub = React.lazy(() => import('../../chat/components/DirectMessagesHub').then(m => ({ default: m.DirectMessagesHub })))
const OrganizationSettingsPage = React.lazy(() => import('../../organization/OrganizationSettingsPage').then(m => ({ default: m.OrganizationSettingsPage })))
const TeamSettingsPage = React.lazy(() => import('../../team/TeamSettingsPage').then(m => ({ default: m.TeamSettingsPage })))
const ChannelSettingsPage = React.lazy(() => import('../../channel/ChannelSettingsPage').then(m => ({ default: m.ChannelSettingsPage })))
const ConferenceHistoryPage = React.lazy(() => import('../../history/ConferenceHistoryPage').then(m => ({ default: m.ConferenceHistoryPage })))
const ScheduledMeetingsPage = React.lazy(() => import('../../scheduled/ScheduledMeetingsPage').then(m => ({ default: m.ScheduledMeetingsPage })))
const EnterpriseDashboardHub = React.lazy(() => import('./EnterpriseDashboardHub').then(m => ({ default: m.EnterpriseDashboardHub })))
const UserProfileSettingsHub = React.lazy(() => import('../../profile/UserProfileSettingsHub').then(m => ({ default: m.UserProfileSettingsHub })))
const AdminConsoleHub = React.lazy(() => import('../../admin/AdminConsoleHub').then(m => ({ default: m.AdminConsoleHub })))
const SuperAdminMasterHub = React.lazy(() => import('../../admin/SuperAdminMasterHub').then(m => ({ default: m.SuperAdminMasterHub })))

export type { AppWorkspaceProps }

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

export function AppWorkspace({ token, initialMeetingId, onClearMeetingUrl, onLogout }: AppWorkspaceProps) {
    const [activeTab, setActiveTab] = useState<WorkspaceTab>(() => {
        const pathnameMatch = window.location.pathname.match(/^\/(?:meet|join)\/([a-zA-Z0-9\-_]+)/)
        const hash = window.location.hash.replace(/^#\/?/, '').split('?')[0].trim()
        const searchParams = new URLSearchParams(window.location.search)
        const hasMeetingInUrl = !!initialMeetingId || !!pathnameMatch || hash === 'meeting' || searchParams.has('id') || searchParams.has('meetingId')
        if (hasMeetingInUrl) {
            return 'meeting'
        }

        const validTabs: WorkspaceTab[] = ['dashboard', 'meeting', 'chat', 'history', 'scheduled', 'organization', 'team', 'channel', 'admin', 'super-admin', 'profile']
        if (validTabs.includes(hash as any)) {
            return hash as WorkspaceTab
        }
        try {
            const saved = sessionStorage.getItem('jts_active_tab') || localStorage.getItem('jts_active_tab')
            if (saved && validTabs.includes(saved as any)) {
                return saved as WorkspaceTab
            }
        } catch (_) {}
        return 'dashboard'
    })

    // Keep URL hash & storage synced
    useEffect(() => {
        if (activeTab) {
            const currentHash = window.location.hash.replace(/^#\/?/, '').split('?')[0].trim()
            if (currentHash !== activeTab) {
                window.location.hash = `#${activeTab}`
            }
            try {
                sessionStorage.setItem('jts_active_tab', activeTab)
                localStorage.setItem('jts_active_tab', activeTab)
            } catch (_) {}
        }
    }, [activeTab])

    // Listen for browser back/forward and hash changes
    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash.replace(/^#\/?/, '').split('?')[0].trim()
            const validTabs: WorkspaceTab[] = ['dashboard', 'meeting', 'chat', 'history', 'scheduled', 'organization', 'team', 'channel', 'admin', 'super-admin', 'profile']
            if (validTabs.includes(hash as any)) {
                setActiveTab(hash as WorkspaceTab)
            }
        }
        window.addEventListener('hashchange', handleHashChange)
        return () => window.removeEventListener('hashchange', handleHashChange)
    }, [])

    const { joined, setMeetingId, meetingId } = useMeetingContext()

    const [activeMeetingRoomId, setActiveMeetingRoomId] = useState<string>(() => {
        if (initialMeetingId) return initialMeetingId
        try {
            const pathnameMatch = window.location.pathname.match(/^\/(?:meet|join)\/([a-zA-Z0-9\-_]+)/)
            if (pathnameMatch) return pathnameMatch[1]

            const searchParams = new URLSearchParams(window.location.search)
            const queryId = searchParams.get('id') || searchParams.get('meetingId')
            if (queryId) return queryId

            const hashParts = window.location.hash.split('?')
            if (hashParts.length > 1) {
                const params = new URLSearchParams(hashParts[1])
                const qId = params.get('id') || params.get('meetingId')
                if (qId) return qId
            }
            return sessionStorage.getItem('jts_active_meeting_id') || ''
        } catch {
            return ''
        }
    })

    const userLeftMeetingRef = useRef(false)

    // Workspace Data & Roles
    const data = useWorkspaceData({ token, activeTab })

    // Workspace Calls & Ringing Signaling
    const calls = useWorkspaceCalls({
        token,
        profileName: data.profileName,
        profileImage: data.profileImage,
        activeTab,
        setActiveTab,
        setActiveMeetingRoomId
    })

    // If initialMeetingId changes, activate meeting tab
    useEffect(() => {
        if (userLeftMeetingRef.current) return
        const targetId = initialMeetingId || window.location.pathname.match(/^\/(?:meet|join)\/([a-zA-Z0-9\-_]+)/)?.[1]
        if (targetId) {
            setActiveMeetingRoomId(targetId)
            setMeetingId(targetId)
            setActiveTab('meeting')
            sessionStorage.setItem('jts_active_meeting_id', targetId)
        }
    }, [initialMeetingId, setMeetingId])

    const handleLaunchMeeting = useCallback((targetMeetingId?: string) => {
        userLeftMeetingRef.current = false
        const cleanId = (targetMeetingId || `room-${Math.random().toString(36).substring(2, 8)}`).trim()
        try {
            sessionStorage.setItem('jts_active_meeting_id', cleanId)
            sessionStorage.setItem(`jts_created_meeting_${cleanId}`, 'true')
            sessionStorage.setItem('jts_auto_open_invite', 'true')
            localStorage.setItem('jts_last_meeting_id', cleanId)
        } catch (e) { }
        setMeetingId(cleanId)
        setActiveMeetingRoomId(cleanId)
        window.history.replaceState(null, '', `/#meeting?id=${encodeURIComponent(cleanId)}`)
        setActiveTab('meeting')
    }, [setMeetingId])

    const handleLeaveMeetingRoom = useCallback(() => {
        userLeftMeetingRef.current = true
        setActiveMeetingRoomId('')
        setMeetingId('')
        if (onClearMeetingUrl) onClearMeetingUrl()
        try {
            sessionStorage.removeItem('jts_active_meeting_id')
            sessionStorage.removeItem('jts_meeting_joined')
        } catch (e) { }
        window.history.replaceState(null, '', '/#meeting')
        window.location.hash = '#meeting'
        setActiveTab('meeting')

        // If a logout was deferred while the user was inside the meeting, process it now
        try {
            if (sessionStorage.getItem('jts_pending_logout') === 'true') {
                sessionStorage.removeItem('jts_pending_logout')
                if (onLogout) onLogout()
            }
        } catch (_) {}
    }, [setMeetingId, onClearMeetingUrl, onLogout])

    // Sidebar state
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
        try {
            return localStorage.getItem('jts_sidebar_collapsed') === 'true'
        } catch (_) {
            return false
        }
    })
    const [sidebarExpanded, setSidebarExpanded] = useState(false)
    const [isHovered, setIsHovered] = useState(false)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    const toggleSidebarCollapse = () => {
        setIsSidebarCollapsed(prev => {
            const next = !prev
            try {
                localStorage.setItem('jts_sidebar_collapsed', String(next))
            } catch (_) {}
            return next
        })
    }

    const showFullSidebar = joined ? (sidebarExpanded || isHovered) : !isSidebarCollapsed

    const [windowWidth, setWindowWidth] = useState(window.innerWidth)
    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth)
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    useEffect(() => {
        setMobileMenuOpen(false)
    }, [activeTab])

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
            <WorkspaceSidebar
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                mobileMenuOpen={mobileMenuOpen}
                setMobileMenuOpen={setMobileMenuOpen}
                showFullSidebar={showFullSidebar}
                toggleSidebarCollapse={toggleSidebarCollapse}
                joined={joined}
                sidebarExpanded={sidebarExpanded}
                setSidebarExpanded={setSidebarExpanded}
                setIsHovered={setIsHovered}
                windowWidth={windowWidth}
                isSuperAdmin={data.isSuperAdmin}
                isOrgAdminOrOwner={data.isOrgAdminOrOwner}
                teams={data.teams}
                currentTeamId={data.currentTeamId}
                setCurrentTeamId={data.setCurrentTeamId}
                onLogout={onLogout}
            />

            {/* Main Content Pane */}
            <main id="main-content" tabIndex={-1} style={{ flex: 1, overflowY: (activeTab === 'meeting' || activeTab === 'channel' || activeTab === 'chat') ? 'hidden' : 'auto', display: 'flex', flexDirection: 'column', position: 'relative', outline: 'none' }}>
                <WorkspaceHeader
                    token={token}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    setMobileMenuOpen={setMobileMenuOpen}
                    windowWidth={windowWidth}
                    userId={data.userId}
                    profileName={data.profileName}
                    profileImage={data.profileImage}
                    organizations={data.organizations}
                    currentOrgId={data.currentOrgId}
                    setCurrentOrgId={data.setCurrentOrgId}
                />

                <WorkspaceModals
                    impersonatedOrgName={data.impersonatedOrgName}
                    onExitSupportMode={data.handleExitSupportMode}
                    activeBroadcast={data.activeBroadcast}
                    dismissedBroadcast={data.dismissedBroadcast}
                    onDismissBroadcast={() => data.setDismissedBroadcast(true)}
                    showDirectDialModal={calls.showDirectDialModal}
                    onCloseDirectDial={() => calls.setShowDirectDialModal(false)}
                    directDialTarget={calls.directDialTarget}
                    setDirectDialTarget={calls.setDirectDialTarget}
                    onStartDirectCall={calls.handleStartDirectCall}
                    outgoingCall={calls.outgoingCall}
                    onCancelOutgoingCall={calls.handleCancelOutgoingCall}
                    incomingCall={calls.incomingCall}
                    onAcceptCall={calls.handleAcceptCall}
                    onDeclineCall={calls.handleDeclineCall}
                    activeAudioCall={calls.activeAudioCall}
                    onEndActiveAudioCall={calls.handleEndActiveAudioCall}
                    onUpgradeToVideo={() => {
                        if (calls.activeAudioCall) {
                            const mId = calls.activeAudioCall.meetingId
                            calls.handleEndActiveAudioCall()
                            handleLaunchMeeting(mId)
                        }
                    }}
                    showNotificationPrompt={calls.showNotificationPrompt}
                    onDismissPrompt={() => {
                        calls.setShowNotificationPrompt(false)
                        localStorage.setItem('jts_push_prompt_dismissed', 'true')
                    }}
                    onSubscribePrompt={async () => {
                        calls.setShowNotificationPrompt(false)
                        await pushNotificationService.subscribeUser(token)
                    }}
                />

                <Suspense fallback={<WorkspaceTabSkeleton />}>
                    {/* MEETING TAB */}
                    {activeTab === 'meeting' && (
                        <div style={{ width: '100%', height: '100%' }}>
                            <MeetingRoom
                                key={userLeftMeetingRef.current ? 'lobby' : (activeMeetingRoomId || meetingId || 'lobby')}
                                initialToken={token}
                                initialMeetingId={userLeftMeetingRef.current ? undefined : (activeMeetingRoomId || meetingId || undefined)}
                                autoJoin={Boolean(!userLeftMeetingRef.current && (activeMeetingRoomId || meetingId))}
                                isAdminOrOwner={data.isOrgAdminOrOwner}
                                planTier={data.currentOrg?.planTier || localStorage.getItem('jts_active_plan_tier') || 'free'}
                                onUpgradePlanRequest={() => setActiveTab('organization')}
                                onLeave={handleLeaveMeetingRoom}
                            />
                        </div>
                    )}

                    {/* DASHBOARD TAB */}
                    {activeTab === 'dashboard' && (
                        <div className="anim-fade-in" style={{ padding: windowWidth < 768 ? '16px 12px' : 'clamp(20px, 3vw, 32px)', maxWidth: 1220, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
                            <EnterpriseDashboardHub
                                profileName={data.profileName}
                                profileEmail={data.profileEmail}
                                profileImage={data.profileImage}
                                userId={data.userId}
                                token={token}
                                historyItems={data.historyItems}
                                scheduledItems={data.scheduledItems}
                                organizations={data.organizations}
                                currentOrgId={data.currentOrgId}
                                teams={data.teams}
                                currentTeamId={data.currentTeamId}
                                onStartMeeting={handleLaunchMeeting}
                                onNavigateTab={(tab) => setActiveTab(tab)}
                                onOpenDirectDial={(targetId) => {
                                    if (targetId) {
                                        calls.handleStartDirectCall(targetId)
                                    } else {
                                        calls.setShowDirectDialModal(true)
                                    }
                                }}
                            />
                        </div>
                    )}

                    {/* DIRECT MESSAGES HUB */}
                    {activeTab === 'chat' && (
                        <div className="anim-fade-in" style={{ flex: 1, height: 'calc(100vh - 56px)', minHeight: 0, overflow: 'hidden' }}>
                            <DirectMessagesHub
                                token={token}
                                currentUserId={data.userId}
                                currentUserName={data.profileName}
                                userPlan={data.organizations.find(o => o._id === data.currentOrgId)?.planTier || 'free'}
                                onStartCall={(targetUserId, targetName, callType, targetAvatar, screenStream) => calls.handleStartDirectCall(targetUserId, callType || 'audio', targetName, targetAvatar, screenStream)}
                                onStartMeeting={(roomId: string) => handleLaunchMeeting(roomId)}
                            />
                        </div>
                    )}

                    {/* HISTORY LOG TAB */}
                    {activeTab === 'history' && (
                        <Suspense fallback={<WorkspaceTabSkeleton />}>
                            <ConferenceHistoryPage
                                historyItems={data.historyItems}
                                token={token}
                                currentUserId={data.userId}
                                onStartMeeting={handleLaunchMeeting}
                                onRefresh={data.fetchMeetings}
                                onDeleteSuccess={(mId) => {
                                    data.setHistoryItems(prev => prev.filter(item => item.id !== mId))
                                }}
                            />
                        </Suspense>
                    )}

                    {/* SCHEDULED CALENDAR TAB */}
                    {activeTab === 'scheduled' && (
                        <Suspense fallback={<WorkspaceTabSkeleton />}>
                            <ScheduledMeetingsPage
                                scheduledItems={data.scheduledItems}
                                token={token}
                                currentUserId={data.userId}
                                currentOrgId={data.currentOrgId || undefined}
                                teams={data.teams}
                                onStartMeeting={handleLaunchMeeting}
                                onRefresh={data.fetchMeetings}
                                onMeetingCreated={data.fetchMeetings}
                            />
                        </Suspense>
                    )}

                    {/* ORGANIZATIONS TAB */}
                    {activeTab === 'organization' && (
                        <div className="anim-fade-in" style={{ padding: windowWidth < 768 ? '16px 12px' : 'clamp(20px, 3vw, 32px)', maxWidth: 1140, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20, boxSizing: 'border-box' }}>
                            <OrganizationSettingsPage
                                token={token}
                                organizationId={data.currentOrgId || undefined}
                                organizations={data.organizations}
                                onSelectOrganization={(id) => data.setCurrentOrgId(id)}
                                onOrganizationCreated={(newOrg) => {
                                    data.setOrganizations(prev => [...prev, newOrg])
                                    data.setCurrentOrgId(newOrg._id)
                                    data.fetchOrganizations()
                                }}
                            />
                        </div>
                    )}

                    {/* TEAMS SETTINGS TAB */}
                    {activeTab === 'team' && (
                        <div className="anim-fade-in" style={{ padding: windowWidth < 768 ? '16px 12px' : 'clamp(20px, 3vw, 32px)', maxWidth: 1140, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20, boxSizing: 'border-box' }}>
                            <TeamSettingsPage token={token} organizationId={data.currentOrgId || undefined} currentUserId={data.userId} />
                        </div>
                    )}

                    {/* CHANNELS SETTINGS TAB */}
                    {activeTab === 'channel' && (
                        <div className="anim-fade-in" style={{ padding: windowWidth < 768 ? '6px' : '10px 14px', maxWidth: 1440, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', flex: 1, height: 'calc(100vh - 56px)', minHeight: 0, boxSizing: 'border-box', overflow: 'hidden' }}>
                            {data.currentTeamId ? (
                                <ChannelSettingsPage
                                    token={token}
                                    organizationId={data.currentOrgId || undefined}
                                    teamId={data.currentTeamId}
                                    currentUserId={data.userId}
                                    teams={data.teams}
                                    onSelectTeam={(newTeamId: string) => data.setCurrentTeamId(newTeamId)}
                                    onStartMeeting={handleLaunchMeeting}
                                    onStartGroupCall={calls.handleStartGroupCall}
                                />
                            ) : (data.loadingOrgs || data.loadingTeams) ? (
                                <WorkspaceTabSkeleton />
                            ) : (
                                <div className="glass-card" style={{ padding: 'clamp(24px, 4vw, 36px)', margin: '16px 0', textAlign: 'center' }}>
                                    <h3 style={{ color: '#fff', marginBottom: 8 }}>No Team Available</h3>
                                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                                        Please create a team in the "Teams Settings" tab first.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ENTERPRISE ADMIN CONSOLE HUB */}
                    {activeTab === 'admin' && (
                        <div className="anim-fade-in" style={{ padding: windowWidth < 768 ? '16px 12px' : 'clamp(20px, 3vw, 32px)', maxWidth: 1320, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
                            <AdminConsoleHub
                                token={token}
                                currentUserId={data.userId}
                                currentOrgId={data.currentOrgId || undefined}
                                organizations={data.organizations}
                            />
                        </div>
                    )}

                    {/* SUPER ADMIN MASTER PLATFORM CENTER */}
                    {activeTab === 'super-admin' && data.isSuperAdmin && (
                        <div className="anim-fade-in" style={{ padding: windowWidth < 768 ? '16px 12px' : 'clamp(20px, 3vw, 32px)', maxWidth: 1320, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
                            <SuperAdminMasterHub token={token} currentUserId={data.userId} />
                        </div>
                    )}

                    {/* USER PROFILE & PREFERENCES HUB */}
                    {activeTab === 'profile' && (
                        <div className="anim-fade-in" style={{ padding: windowWidth < 768 ? '16px 12px' : 'clamp(20px, 3vw, 32px)', maxWidth: 1100, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
                            <UserProfileSettingsHub
                                token={token}
                                userId={data.userId}
                                profileName={data.profileName}
                                setProfileName={data.setProfileName}
                                profileEmail={data.profileEmail}
                                profileImage={data.profileImage}
                                onProfileUpdated={(updated) => {
                                    if (updated.fullName) data.setProfileName(updated.fullName)
                                    if (updated.profileImage) data.setProfileImage(updated.profileImage)
                                }}
                            />
                        </div>
                    )}
                </Suspense>
            </main>
        </div>
    )
}
