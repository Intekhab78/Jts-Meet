import { useMeetingTimer } from './useMeetingTimer'

interface UseMeetingFreeTierTimerProps {
    currentPlanTier: string
    isGuest: boolean
    maxMeetingDurationMins?: number
}

export const useMeetingFreeTierTimer = ({
    currentPlanTier,
    maxMeetingDurationMins
}: UseMeetingFreeTierTimerProps) => {
    const { timerStr, seconds: meetingSecondsElapsed } = useMeetingTimer()
    const resolvedDurationMins = maxMeetingDurationMins !== undefined
        ? Number(maxMeetingDurationMins)
        : (['starter', 'pro', 'enterprise'].includes(currentPlanTier) ? 0 : 45)

    const limitSeconds = resolvedDurationMins > 0 ? resolvedDurationMins * 60 : 0
    const isMeetingPaid = limitSeconds === 0
    const freeTimeRemaining = limitSeconds > 0 ? Math.max(0, limitSeconds - meetingSecondsElapsed) : 0
    const isTimeLimitExpired = limitSeconds > 0 && freeTimeRemaining <= 0
    const lowThreshold = Math.min(600, Math.floor(limitSeconds / 3))
    const isLowTimeWarning = limitSeconds > 0 && freeTimeRemaining <= lowThreshold && freeTimeRemaining > 0

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
