import { useState } from 'react'
import { e2eeService } from '../services/e2ee.service'
import type { MeetingLayoutMode } from '../components/LayoutSwitcherModal'

export const useMeetingModalStates = () => {
    // Professional Suite modals
    const [showWhiteboard, setShowWhiteboard] = useState(false)
    const [showPolls, setShowPolls] = useState(false)
    const [showCaptions, setShowCaptions] = useState(false)
    const [showDeviceSettings, setShowDeviceSettings] = useState(false)
    const [showSummary, setShowSummary] = useState(false)
    const [showShortcuts, setShowShortcuts] = useState(false)
    const [isWarningDismissed, setIsWarningDismissed] = useState(false)

    // Security & connectivity modals
    const [showVirtualBgModal, setShowVirtualBgModal] = useState(false)
    const [showE2EEModal, setShowE2EEModal] = useState(false)
    const [isE2EEActive, setIsE2EEActive] = useState<boolean>(() => e2eeService.isEnabled())
    const [showDialInModal, setShowDialInModal] = useState(false)
    const [showLiveStreamModal, setShowLiveStreamModal] = useState(false)
    const [isInviteOpen, setIsInviteOpen] = useState(false)
    const [showMoMModal, setShowMoMModal] = useState(false)

    // Layout, lighting & tile focus states
    const [layoutMode, setLayoutMode] = useState<MeetingLayoutMode>('auto')
    const [isLayoutModalOpen, setIsLayoutModalOpen] = useState(false)
    const [maxGridTiles, setMaxGridTiles] = useState(16)
    const [isStudioLightingEnabled, setIsStudioLightingEnabled] = useState(false)
    const [isHdBoostEnabled, setIsHdBoostEnabled] = useState(true)
    const [pinnedUserId, setPinnedUserId] = useState<string | null>(null)
    const [spotlightUserId, setSpotlightUserId] = useState<string | null>(null)
    const [fullScreenUserId, setFullScreenUserId] = useState<string | null>(null)
    const [hoveredTile, setHoveredTile] = useState<string | null>(null)

    // Annotation & enterprise features
    const [isAnnotationActive, setIsAnnotationActive] = useState(false)
    const [isAttendeeAnnotationActive, setIsAttendeeAnnotationActive] = useState(false)
    const [lowBandwidthMode, setLowBandwidthMode] = useState(false)
    const [isWatermarkEnabled, setIsWatermarkEnabled] = useState(false)

    return {
        showWhiteboard, setShowWhiteboard,
        showPolls, setShowPolls,
        showCaptions, setShowCaptions,
        showDeviceSettings, setShowDeviceSettings,
        showSummary, setShowSummary,
        showShortcuts, setShowShortcuts,
        isWarningDismissed, setIsWarningDismissed,
        showVirtualBgModal, setShowVirtualBgModal,
        showE2EEModal, setShowE2EEModal,
        isE2EEActive, setIsE2EEActive,
        showDialInModal, setShowDialInModal,
        showLiveStreamModal, setShowLiveStreamModal,
        isInviteOpen, setIsInviteOpen,
        showMoMModal, setShowMoMModal,
        layoutMode, setLayoutMode,
        isLayoutModalOpen, setIsLayoutModalOpen,
        maxGridTiles, setMaxGridTiles,
        isStudioLightingEnabled, setIsStudioLightingEnabled,
        isHdBoostEnabled, setIsHdBoostEnabled,
        pinnedUserId, setPinnedUserId,
        spotlightUserId, setSpotlightUserId,
        fullScreenUserId, setFullScreenUserId,
        hoveredTile, setHoveredTile,
        isAnnotationActive, setIsAnnotationActive,
        isAttendeeAnnotationActive, setIsAttendeeAnnotationActive,
        lowBandwidthMode, setLowBandwidthMode,
        isWatermarkEnabled, setIsWatermarkEnabled
    }
}
