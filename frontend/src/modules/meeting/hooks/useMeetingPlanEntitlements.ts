import React, { useState, useEffect, useMemo } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

interface UseMeetingPlanEntitlementsProps {
    token: string
    initialToken?: string
    isGuest: boolean
    meetingInfo?: any
    planTier?: string
}

export interface UpgradeModalFeature {
    title: string
    requiredPlan: string
    icon: string | React.ReactNode
    description: string
}

export const useMeetingPlanEntitlements = ({
    token,
    initialToken,
    isGuest,
    meetingInfo,
    planTier
}: UseMeetingPlanEntitlementsProps) => {
    // Live organization plan tier for logged-in users
    const [fetchedOrgPlanTier, setFetchedOrgPlanTier] = useState<string>(() => {
        try {
            return localStorage.getItem('jts_active_plan_tier') || ''
        } catch (_) {
            return ''
        }
    })

    // Fetch user's active organization plan if logged in
    useEffect(() => {
        const activeToken = token || initialToken || localStorage.getItem('jts_token') || localStorage.getItem('token') || ''
        if (!activeToken || isGuest) return

        let isMounted = true
        fetch(`${API_BASE}/api/organization/mine`, {
            headers: { 'Authorization': `Bearer ${activeToken}` }
        })
            .then(res => res.json())
            .then(data => {
                if (isMounted && data?.data && data.data.length > 0) {
                    const savedOrgId = localStorage.getItem('jts_current_org_id')
                    const matched = data.data.find((o: any) => o._id === savedOrgId)
                        || data.data.find((o: any) => ['enterprise', 'pro', 'starter'].includes(o?.planTier?.toLowerCase()))
                        || data.data[0]
                    if (matched?.planTier) {
                        setFetchedOrgPlanTier(matched.planTier.toLowerCase())
                        try { localStorage.setItem('jts_active_plan_tier', matched.planTier) } catch (_) {}
                    }
                }
            })
            .catch(err => console.warn('[MeetingRoom] Failed to fetch organization plan tier:', err))

        return () => { isMounted = false }
    }, [token, initialToken, isGuest])

    // Workspace Plan Tier Entitlements
    const currentPlanTier = useMemo(() => {
        const PLAN_RANK: Record<string, number> = {
            enterprise: 3,
            pro: 2,
            starter: 1,
            free: 0
        }

        const orgPlanFromMeeting = typeof meetingInfo?.organizationId === 'object'
            ? meetingInfo?.organizationId?.planTier
            : undefined

        const candidates = [
            meetingInfo?.planTier,
            orgPlanFromMeeting,
            meetingInfo?.host?.planTier,
            planTier,
            fetchedOrgPlanTier,
            (() => {
                try { return localStorage.getItem('jts_active_plan_tier') } catch (_) { return null }
            })()
        ]
            .filter((t): t is string => typeof t === 'string' && !!t.trim())
            .map(t => t.toLowerCase().trim())

        let bestTier = 'free'
        let bestRank = 0

        for (const tier of candidates) {
            const rank = PLAN_RANK[tier] ?? 0
            if (rank > bestRank) {
                bestRank = rank
                bestTier = tier
            }
        }

        return bestTier
    }, [planTier, meetingInfo, fetchedOrgPlanTier])

    const canAccessRecording = useMemo(() => {
        return ['starter', 'pro', 'enterprise'].includes(currentPlanTier)
    }, [currentPlanTier])

    const canAccessCloudRecording = useMemo(() => {
        return ['starter', 'pro', 'enterprise'].includes(currentPlanTier)
    }, [currentPlanTier])

    const canAccessAI = useMemo(() => {
        return ['starter', 'pro', 'enterprise'].includes(currentPlanTier)
    }, [currentPlanTier])

    const canAccessRTMP = useMemo(() => {
        return ['enterprise', 'pro'].includes(currentPlanTier)
    }, [currentPlanTier])

    const canAccessBreakout = useMemo(() => {
        return ['starter', 'pro', 'enterprise'].includes(currentPlanTier)
    }, [currentPlanTier])

    const canAccessDialIn = useMemo(() => {
        return ['enterprise'].includes(currentPlanTier)
    }, [currentPlanTier])

    const canAccessE2EE = useMemo(() => {
        return ['enterprise', 'pro'].includes(currentPlanTier)
    }, [currentPlanTier])

    const canAccessWebinar = useMemo(() => {
        return ['enterprise'].includes(currentPlanTier)
    }, [currentPlanTier])

    const canAccessAttendance = useMemo(() => {
        return ['starter', 'pro', 'enterprise'].includes(currentPlanTier)
    }, [currentPlanTier])

    const [upgradeModalFeature, setUpgradeModalFeature] = useState<UpgradeModalFeature | null>(null)

    return {
        fetchedOrgPlanTier,
        currentPlanTier,
        canAccessRecording,
        canAccessCloudRecording,
        canAccessAI,
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
