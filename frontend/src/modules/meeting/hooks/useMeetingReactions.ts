import { useState, useRef, useEffect } from 'react'
import { soundEffects } from '../../../utils/soundEffects'
import { SocketEvents } from '../services/socket.service'

export interface FloatingReactionItem {
    id: number
    emoji: string
    left: number
    scale?: number
    swayType?: number
    delayMs?: number
    senderName?: string
    isPrimary?: boolean
}

export interface UseMeetingReactionsProps {
    socket: any
    meetingId: string
    meetingInput: string
    myDisplayName: string
    addToast: (msg: string, type?: any) => void
}

export function useMeetingReactions({
    socket,
    meetingId,
    meetingInput,
    myDisplayName,
    addToast
}: UseMeetingReactionsProps) {
    const [showReactionsPopover, setShowReactionsPopover] = useState(false)
    const [floatingReactions, setFloatingReactions] = useState<FloatingReactionItem[]>([])
    const reactionBtnRef = useRef<HTMLButtonElement>(null)
    const reactionsPopoverRef = useRef<HTMLDivElement>(null)

    const spawnReaction = (emoji: string, senderName?: string) => {
        const cleanName = senderName ? senderName.split(' ')[0] : ''

        // Origin X position: erupt from the Reaction button in the bottom bar, or natural position
        let baseLeft = 50
        if (reactionBtnRef.current) {
            const rect = reactionBtnRef.current.getBoundingClientRect()
            if (rect && rect.width > 0 && window.innerWidth > 0) {
                baseLeft = Math.round((rect.left + rect.width / 2) / window.innerWidth * 100)
            }
        }
        if (senderName && senderName !== 'You' && senderName !== myDisplayName) {
            baseLeft = 25 + Math.random() * 50
        }

        // Celebratory stream of 4 buoyant particles
        const batchId = Date.now() + Math.floor(Math.random() * 1000)
        const particles: FloatingReactionItem[] = [
            {
                id: batchId,
                emoji,
                left: Math.max(8, Math.min(92, baseLeft)),
                scale: 1.25,
                swayType: 1,
                delayMs: 0,
                senderName: cleanName,
                isPrimary: true
            },
            {
                id: batchId + 1,
                emoji,
                left: Math.max(6, Math.min(94, baseLeft - 3 + (Math.random() * 2))),
                scale: 0.85,
                swayType: 2,
                delayMs: 80,
                isPrimary: false
            },
            {
                id: batchId + 2,
                emoji,
                left: Math.max(6, Math.min(94, baseLeft + 3 + (Math.random() * 2))),
                scale: 0.95,
                swayType: 3,
                delayMs: 160,
                isPrimary: false
            },
            {
                id: batchId + 3,
                emoji,
                left: Math.max(6, Math.min(94, baseLeft - 1 + (Math.random() * 3))),
                scale: 0.72,
                swayType: 1,
                delayMs: 240,
                isPrimary: false
            }
        ]

        setFloatingReactions(prev => [...prev.slice(-25), ...particles])
        soundEffects.playReactionPop()

        setTimeout(() => {
            setFloatingReactions(prev => prev.filter(r => r.id < batchId || r.id > batchId + 3))
        }, 3200)
    }

    const sendReaction = (emoji: string) => {
        const sender = myDisplayName || 'You'
        spawnReaction(emoji, sender)
        if (socket && (meetingId || meetingInput)) {
            socket.emit(SocketEvents.MEETING_REACTION, {
                meetingId: meetingId || meetingInput,
                emoji,
                senderName: sender
            })
        }
    }

    const handleTriggerSoundboard = (soundType: 'applause' | 'drumroll' | 'cheer' | 'bell') => {
        if (soundType === 'applause') {
            soundEffects.playApplause()
            spawnReaction('👏', 'You')
        } else if (soundType === 'drumroll') {
            soundEffects.playDrumroll()
            spawnReaction('🥁', 'You')
        } else if (soundType === 'cheer') {
            soundEffects.playCheer()
            spawnReaction('🎉', 'You')
        } else if (soundType === 'bell') {
            soundEffects.playBell()
            spawnReaction('🔔', 'You')
        }

        const sender = myDisplayName || 'You'
        if (socket && (meetingId || meetingInput)) {
            socket.emit('meeting:soundboard', {
                meetingId: meetingId || meetingInput,
                sound: soundType,
                soundType,
                senderName: sender
            })
        }
    }

    // Socket listeners for Reactions and Soundboard
    useEffect(() => {
        if (!socket) return

        const handleReaction = (payload: { emoji: string; senderName?: string }) => {
            spawnReaction(payload.emoji, payload.senderName)
        }

        const handleSoundboard = (payload: { soundType?: string; sound?: string; senderName?: string }) => {
            const sType = payload.soundType || payload.sound
            if (sType === 'applause') {
                soundEffects.playApplause()
                spawnReaction('👏', payload.senderName)
            } else if (sType === 'drumroll') {
                soundEffects.playDrumroll()
                spawnReaction('🥁', payload.senderName)
            } else if (sType === 'cheer') {
                soundEffects.playCheer()
                spawnReaction('🎉', payload.senderName)
            } else if (sType === 'bell') {
                soundEffects.playBell()
                spawnReaction('🔔', payload.senderName)
            }

            if (payload.senderName && payload.senderName !== 'You' && payload.senderName !== myDisplayName) {
                const label = sType === 'applause' ? 'Clap 👏' : sType === 'cheer' ? 'Cheer 🎉' : sType === 'drumroll' ? 'Drumroll 🥁' : 'Bell 🔔'
                addToast(`${payload.senderName} played ${label}!`, 'info')
            }
        }

        socket.on('meeting:reaction', handleReaction)
        socket.on('meeting:soundboard', handleSoundboard)

        return () => {
            socket.off('meeting:reaction', handleReaction)
            socket.off('meeting:soundboard', handleSoundboard)
        }
    }, [socket, myDisplayName, addToast])

    useEffect(() => {
        if (!showReactionsPopover) return
        const handleClickOutside = (e: MouseEvent) => {
            if (
                reactionBtnRef.current && !reactionBtnRef.current.contains(e.target as Node) &&
                reactionsPopoverRef.current && !reactionsPopoverRef.current.contains(e.target as Node)
            ) {
                setShowReactionsPopover(false)
            }
        }
        window.addEventListener('mousedown', handleClickOutside)
        return () => window.removeEventListener('mousedown', handleClickOutside)
    }, [showReactionsPopover])

    return {
        showReactionsPopover,
        setShowReactionsPopover,
        floatingReactions,
        setFloatingReactions,
        reactionBtnRef,
        reactionsPopoverRef,
        spawnReaction,
        sendReaction,
        handleTriggerSoundboard
    }
}
