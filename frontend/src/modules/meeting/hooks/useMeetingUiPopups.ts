import { useState, useRef, useEffect } from 'react'

interface UseMeetingUiPopupsProps {
    messages: any[]
    activePanel: string | null
}

export const useMeetingUiPopups = ({
    messages,
    activePanel
}: UseMeetingUiPopupsProps) => {
    const [showEndMeetingModal, setShowEndMeetingModal] = useState(false)
    const [isLocked, setIsLocked] = useState(false)
    const [showMoreMenu, setShowMoreMenu] = useState(false)
    const [unreadChatCount, setUnreadChatCount] = useState(0)
    const [showPushToTalkHud, setShowPushToTalkHud] = useState(false)

    const moreMenuRef = useRef<HTMLDivElement>(null)
    const moreBtnRef = useRef<HTMLButtonElement>(null)
    const lastSeenMessageCountRef = useRef(0)

    // Ensure Push-To-Talk HUD auto-hides after exactly 1 second
    useEffect(() => {
        if (!showPushToTalkHud) return
        const t = setTimeout(() => {
            setShowPushToTalkHud(false)
        }, 1000)
        return () => clearTimeout(t)
    }, [showPushToTalkHud])

    // Close "More Options" menu when clicking outside
    useEffect(() => {
        if (!showMoreMenu) return
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node
            if (
                moreMenuRef.current &&
                !moreMenuRef.current.contains(target) &&
                moreBtnRef.current &&
                !moreBtnRef.current.contains(target)
            ) {
                setShowMoreMenu(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [showMoreMenu])

    // Track unread chat messages
    useEffect(() => {
        if (activePanel === 'chat') {
            setUnreadChatCount(0)
            lastSeenMessageCountRef.current = messages.length
        } else {
            const diff = messages.length - lastSeenMessageCountRef.current
            if (diff > 0) {
                setUnreadChatCount(diff)
            }
        }
    }, [messages.length, activePanel])

    return {
        showEndMeetingModal,
        setShowEndMeetingModal,
        isLocked,
        setIsLocked,
        showMoreMenu,
        setShowMoreMenu,
        unreadChatCount,
        setUnreadChatCount,
        showPushToTalkHud,
        setShowPushToTalkHud,
        moreMenuRef,
        moreBtnRef
    }
}
