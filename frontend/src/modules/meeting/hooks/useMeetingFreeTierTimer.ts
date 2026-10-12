import { useMeetingTimer } from './useMeetingTimer'

interface UseMeetingFreeTierTimerProps {
    currentPlanTier: string
    isGuest: boolean
}

export const useMeetingFreeTierTimer = ({
    currentPlanTier,
    isGuest
}: UseMeetingFreeTierTimerProps) => {
    // Meeting timer & Free Tier Limit (45 minutes = 2700s)
    // When the host has a paid plan (Starter, Pro, Enterprise), meetings have UNLIMITED duration for ALL attendees.
    const { timerStr, seconds: meetingSecondsElapsed } = useMeetingTimer()
    const FREE_PLAN_LIMIT_SECONDS = 2700
    const freeTimeRemaining = Math.max(0, FREE_PLAN_LIMIT_SECONDS - meetingSecondsElapsed)
    const isMeetingPaid = ['starter', 'pro', 'enterprise'].includes(currentPlanTier)
    const isTimeLimitExpired = !isMeetingPaid && freeTimeRemaining <= 0 && !isGuest
    const isLowTimeWarning = !isMeetingPaid && freeTimeRemaining <= 600 && freeTimeRemaining > 0

    const formatRemainingTime = (totalSec: number) => {
        const mins = Math.floor(totalSec / 60)
        const secs = totalSec % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    return {
        timerStr,
        meetingSecondsElapsed,
        freeTimeRemaining,
        isMeetingPaid,
        isTimeLimitExpired,
        isLowTimeWarning,
        formatRemainingTime
    }
}
