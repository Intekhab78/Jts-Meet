import React, { useState, useEffect, useMemo } from 'react'
import { API_BASE } from '../../../config'
import { parseJwt } from '../utils/meetingHelpers'

interface UseMeetingPlanEntitlementsProps {
    token: string
    initialToken?: string
    isGuest: boolean
    meetingInfo?: any
    planTier?: string
    socket?: any
}

export interface UpgradeModalFeature {
    title: string
    requiredPlan: string
    icon: string | React.ReactNode
    description: string
}

interface PlanFeatures {
    aiSummary: boolean
    cloudRecording: boolean
    whiteboard: boolean
    customBranding: boolean
    ssoLogin: boolean
    prioritySupport: boolean
}

interface LivePlanLimits {
    planTier?: string
    isPaid?: boolean
    maxMeetingDurationMins?: number
    maxParticipantsPerCall?: number
    features?: Partial<PlanFeatures>
}

export const useMeetingPlanEntitlements = ({
    token,
    initialToken,
    isGuest,
    meetingInfo,
    planTier,
    socket
}: UseMeetingPlanEntitlementsProps) => {
    const [fetchedOrgPlanTier, setFetchedOrgPlanTier] = useState<string>('')
    const [catalogPlans, setCatalogPlans] = useState<any[]>([])
    const [liveSocketPlanLimits, setLiveSocketPlanLimits] = useState<LivePlanLimits | null>(null)

    // Fetch dynamic SaaS plan catalog from /api/plans
    useEffect(() => {
        let isMounted = true
        fetch(`${API_BASE}/api/plans`)
            .then(res => res.ok ? res.json() : null)
            .then(json => {
                if (isMounted && json?.success && Array.isArray(json.data)) {
                    setCatalogPlans(json.data)
                }
            })
            .catch(() => {})
        return () => { isMounted = false }
    }, [])

    // Listen for authoritative plan limits emitted by the meeting socket on join
    useEffect(() => {
        if (!socket) return
        const handlePlanLimits = (payload: LivePlanLimits) => {
            if (payload) setLiveSocketPlanLimits(payload)
        }
        socket.on('meeting:plan-limits', handlePlanLimits)
        return () => {
            socket.off('meeting:plan-limits', handlePlanLimits)
        }
    }, [socket])

    // Fetch user's active organization plan if logged in
    useEffect(() => {
        const activeToken = token || initialToken || localStorage.getItem('jts_token') || localStorage.getItem('token') || ''
        if (!activeToken || isGuest) return

        let isMounted = true
        fetch(`${API_BASE}/api/organization/mine`, {
            headers: { 'Authorization': `Bearer ${activeToken}` }
        })
            .then(res => {
                if (!res.ok) return null
                const ct = res.headers.get('content-type') || ''
                if (!ct.includes('application/json')) return null
                return res.json()
            })
            .then(data => {
                if (!data) return
                if (isMounted && data?.data && data.data.length > 0) {
                    const savedOrgId = localStorage.getItem('jts_current_org_id')
                    const matched = data.data.find((o: any) => o._id === savedOrgId)
                        || data.data.find((o: any) => o?.planTier && o.planTier.toLowerCase() !== 'free')
                        || data.data[0]
                    if (matched?.planTier) {
                        setFetchedOrgPlanTier(matched.planTier.toLowerCase())
                    }
                }
            })
            .catch(err => console.warn('[MeetingRoom] Failed to fetch organization plan tier:', err))

        return () => { isMounted = false }
    }, [token, initialToken, isGuest])

    // Check if current authenticated user is a Platform SuperAdmin (unrestricted Enterprise access)
    const isSuperAdmin = useMemo(() => {
        try {
            const activeToken = token || initialToken || localStorage.getItem('jts_token') || ''
            if (!activeToken || isGuest) return false
            const decoded = parseJwt(activeToken)
            return Boolean(decoded?.isSuperAdmin === true || decoded?.role === 'superadmin')
        } catch {
            return false
        }
    }, [token, initialToken, isGuest])

    // Resolve authoritative planTier without trusting client localStorage for privilege elevation
    const currentPlanTier = useMemo(() => {
        if (isSuperAdmin) {
            return 'enterprise'
        }
        if (liveSocketPlanLimits?.planTier) {
            return liveSocketPlanLimits.planTier.toLowerCase().trim()
        }
        if (meetingInfo?.planLimits?.planTier) {
            return String(meetingInfo.planLimits.planTier).toLowerCase().trim()
        }

        const getPlanRank = (slug: string): number => {
            const s = slug.toLowerCase().trim()
            if (s === 'enterprise') return 3
            if (s === 'pro') return 2
            if (s === 'starter') return 1
            if (s === 'free') return 0
            const cat = catalogPlans.find((p: any) => (p.planId || '').toLowerCase() === s)
            if (cat) {
                if ((cat.limits?.maxSeats ?? 0) >= 200 || cat.features?.ssoLogin) return 3
                if (Number(cat.priceMonthly || 0) > 0 || Number(cat.priceYearly || 0) > 0) return 1
            }
            return s ? 1 : 0
        }

        const orgPlanFromMeeting = typeof meetingInfo?.organizationId === 'object'
            ? meetingInfo?.organizationId?.planTier
            : undefined

        const candidates = [
            meetingInfo?.planTier,
            orgPlanFromMeeting,
            meetingInfo?.host?.planTier,
            planTier,
            fetchedOrgPlanTier
        ]
            .filter((t): t is string => typeof t === 'string' && !!t.trim())
            .map(t => t.toLowerCase().trim())

        let bestTier = 'free'
        let bestRank = 0

        for (const tier of candidates) {
            const rank = getPlanRank(tier)
            if (rank > bestRank) {
                bestRank = rank
                bestTier = tier
            }
        }

        return bestTier
    }, [liveSocketPlanLimits, planTier, meetingInfo, fetchedOrgPlanTier, catalogPlans])

    const matchedCatalogPlan = useMemo(() => {
        return catalogPlans.find((p: any) => (p.planId || '').toLowerCase() === currentPlanTier) || null
    }, [catalogPlans, currentPlanTier])

    const effectiveFeatures = useMemo<PlanFeatures>(() => {
        if (isSuperAdmin) {
            return {
                aiSummary: true,
                cloudRecording: true,
                whiteboard: true,
                customBranding: true,
                ssoLogin: true,
                prioritySupport: true
            }
        }
        const isPaidFallback = currentPlanTier !== 'free'
        const catFeat = matchedCatalogPlan?.features
        const infoFeat = meetingInfo?.planLimits?.features
        const sockFeat = liveSocketPlanLimits?.features

        return {
            aiSummary: sockFeat?.aiSummary ?? infoFeat?.aiSummary ?? catFeat?.aiSummary ?? isPaidFallback,
            cloudRecording: sockFeat?.cloudRecording ?? infoFeat?.cloudRecording ?? catFeat?.cloudRecording ?? isPaidFallback,
            whiteboard: sockFeat?.whiteboard ?? infoFeat?.whiteboard ?? catFeat?.whiteboard ?? true,
            customBranding: sockFeat?.customBranding ?? infoFeat?.customBranding ?? catFeat?.customBranding ?? isPaidFallback,
            ssoLogin: sockFeat?.ssoLogin ?? infoFeat?.ssoLogin ?? catFeat?.ssoLogin ?? (currentPlanTier === 'enterprise'),
            prioritySupport: sockFeat?.prioritySupport ?? infoFeat?.prioritySupport ?? catFeat?.prioritySupport ?? (currentPlanTier === 'enterprise')
        }
    }, [liveSocketPlanLimits, meetingInfo, matchedCatalogPlan, currentPlanTier])

    const effectiveLimits = useMemo(() => {
        if (isSuperAdmin) {
            return {
                maxMeetingDurationMins: 0,
                maxParticipantsPerCall: 500
            }
        }
        const isPaidFallback = currentPlanTier !== 'free'
        const catLim = matchedCatalogPlan?.limits
        const infoLim = meetingInfo?.planLimits?.limits

        return {
            maxMeetingDurationMins: Number(
                liveSocketPlanLimits?.maxMeetingDurationMins ??
                infoLim?.maxMeetingDurationMins ??
                catLim?.maxMeetingDurationMins ??
                (isPaidFallback ? 0 : 45)
            ),
            maxParticipantsPerCall: Number(
                liveSocketPlanLimits?.maxParticipantsPerCall ??
                infoLim?.maxParticipantsPerCall ??
                catLim?.maxParticipantsPerCall ??
                (currentPlanTier === 'enterprise' ? 500 : isPaidFallback ? 100 : 25)
            )
        }
    }, [liveSocketPlanLimits, meetingInfo, matchedCatalogPlan, currentPlanTier])

    const isPaidTier = useMemo(() => {
        if (liveSocketPlanLimits?.isPaid !== undefined) return Boolean(liveSocketPlanLimits.isPaid)
        if (meetingInfo?.planLimits?.isPaid !== undefined) return Boolean(meetingInfo.planLimits.isPaid)
        if (matchedCatalogPlan) {
            return Number(matchedCatalogPlan.priceMonthly || 0) > 0 ||
                Number(matchedCatalogPlan.priceYearly || 0) > 0 ||
                currentPlanTier !== 'free'
        }
        return currentPlanTier !== 'free'
    }, [liveSocketPlanLimits, meetingInfo, matchedCatalogPlan, currentPlanTier])

    const isEnterpriseTier = useMemo(() => {
        return currentPlanTier === 'enterprise' ||
            Boolean(effectiveFeatures.ssoLogin) ||
            (matchedCatalogPlan?.limits?.maxSeats ?? 0) >= 200
    }, [currentPlanTier, effectiveFeatures.ssoLogin, matchedCatalogPlan])

    const canAccessCloudRecording = effectiveFeatures.cloudRecording
    const canAccessRecording = effectiveFeatures.cloudRecording
    const canAccessAI = effectiveFeatures.aiSummary
    const canAccessWhiteboard = effectiveFeatures.whiteboard
    const canAccessRTMP = isEnterpriseTier
    const canAccessBreakout = isPaidTier
    const canAccessDialIn = isEnterpriseTier
    const canAccessE2EE = isEnterpriseTier
    const canAccessWebinar = isEnterpriseTier
    const canAccessAttendance = isPaidTier

    const [upgradeModalFeature, setUpgradeModalFeature] = useState<UpgradeModalFeature | null>(null)

    return {
        fetchedOrgPlanTier,
        currentPlanTier,
        maxMeetingDurationMins: effectiveLimits.maxMeetingDurationMins,
        maxParticipantsPerCall: effectiveLimits.maxParticipantsPerCall,
        effectiveFeatures,
        canAccessRecording,
        canAccessCloudRecording,
        canAccessAI,
        canAccessWhiteboard,
        canAccessRTMP,
        canAccessBreakout,
        canAccessDialIn,
        canAccessE2EE,
        canAccessWebinar,
        canAccessAttendance,
        upgradeModalFeature,
        setUpgradeModalFeature
    }
}
