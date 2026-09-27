import React, { useEffect, useState } from 'react'
import { isElectron } from '../services/screen.service'

export interface DesktopCaptureSource {
    id: string
    name: string
    thumbnail: string
    appIcon?: string | null
}

interface ScreenPickerModalProps {
    isOpen: boolean
    onClose: () => void
    onSelectSource: (source: DesktopCaptureSource, includeAudio: boolean) => void
    initialSources?: DesktopCaptureSource[]
}

export function ScreenPickerModal({
    isOpen,
    onClose,
    onSelectSource,
    initialSources
}: ScreenPickerModalProps) {
    const [activeTab, setActiveTab] = useState<'screen' | 'window'>('screen')
    const [sources, setSources] = useState<DesktopCaptureSource[]>(initialSources || [])
    const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null)
    const [includeAudio, setIncludeAudio] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [searchFilter, setSearchFilter] = useState('')

    // Fetch sources from Electron desktopCapturer
    const loadSources = async () => {
        if (!isElectron() || !window.electronAPI?.getScreenSources) return
        setIsLoading(true)
        try {
            const rawSources = await window.electronAPI.getScreenSources()
            setSources(rawSources || [])
            // Auto-select first screen source if nothing selected
            if (rawSources && rawSources.length > 0) {
                const firstScreen = rawSources.find(s => s.id.startsWith('screen'))
                setSelectedSourceId(firstScreen ? firstScreen.id : rawSources[0].id)
            }
        } catch (err) {
            console.error('[ScreenPickerModal] Failed to load sources:', err)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        if (isOpen) {
            loadSources()
        } else {
            setSelectedSourceId(null)
            setSearchFilter('')
        }
    }, [isOpen])

    if (!isOpen) return null

    // Categorize sources
    const screenSources = sources.filter(s => s.id.startsWith('screen'))
    const windowSources = sources.filter(s => s.id.startsWith('window') || !s.id.startsWith('screen'))

    const currentList = activeTab === 'screen' ? screenSources : windowSources
    const filteredList = searchFilter.trim()
        ? currentList.filter(s => s.name.toLowerCase().includes(searchFilter.toLowerCase().trim()))
        : currentList

    const selectedSource = sources.find(s => s.id === selectedSourceId) || null

    const handleConfirm = () => {
        if (!selectedSource) return
        onSelectSource(selectedSource, includeAudio)
        onClose()
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose()
        } else if (e.key === 'Enter' && selectedSource) {
            handleConfirm()
        }
    }

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="screen-picker-title"
            tabIndex={-1}
            onKeyDown={handleKeyDown}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 99999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                padding: 16
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose()
            }}
        >
            <div
                style={{
                    backgroundColor: '#12141a',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: 20,
                    width: '100%',
                    maxWidth: 780,
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 30px rgba(59, 130, 246, 0.15)',
                    overflow: 'hidden',
                    animation: 'screenPickerPop 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
            >
                {/* Header */}
                <div
                    style={{
                        padding: '20px 24px 16px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 12,
                                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(99, 102, 241, 0.2))',
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#60a5fa'
                            }}
                        >
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="3" width="20" height="14" rx="2" />
                                <line x1="8" y1="21" x2="16" y2="21" />
                                <line x1="12" y1="17" x2="12" y2="21" />
                            </svg>
                        </div>
                        <div>
                            <h2
                                id="screen-picker-title"
                                style={{
                                    margin: 0,
                                    fontSize: '1.125rem',
                                    fontWeight: 700,
                                    color: '#ffffff',
                                    letterSpacing: '-0.01em'
                                }}
                            >
                                Share your screen
                            </h2>
                            <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', color: '#94a3b8' }}>
                                Choose a screen or application window to share with everyone in the meeting
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        title="Close (Esc)"
                        style={{
                            background: 'rgba(255, 255, 255, 0.06)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: 10,
                            width: 36,
                            height: 36,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'
                            e.currentTarget.style.color = '#fff'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'
                            e.currentTarget.style.color = '#94a3b8'
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* Navigation Tabs & Actions */}
                <div
                    style={{
                        padding: '14px 24px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 16,
                        flexWrap: 'wrap',
                        backgroundColor: 'rgba(255, 255, 255, 0.02)'
                    }}
                >
                    <div style={{ display: 'flex', gap: 8, background: 'rgba(0, 0, 0, 0.35)', padding: 4, borderRadius: 12, border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                        {/* Entire Screen Tab */}
                        <button
                            type="button"
                            onClick={() => {
                                setActiveTab('screen')
                                const first = screenSources[0]
                                if (first) setSelectedSourceId(first.id)
                            }}
                            style={{
                                padding: '8px 16px',
                                borderRadius: 8,
                                border: 'none',
                                background: activeTab === 'screen' ? '#2563eb' : 'transparent',
                                color: activeTab === 'screen' ? '#fff' : '#94a3b8',
                                fontSize: '0.8125rem',
                                fontWeight: activeTab === 'screen' ? 600 : 500,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                transition: 'all 0.15s ease'
                            }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="2" y="3" width="20" height="14" rx="2" />
                                <line x1="8" y1="21" x2="16" y2="21" />
                                <line x1="12" y1="17" x2="12" y2="21" />
                            </svg>
                            <span>Entire Screen</span>
                            <span
                                style={{
                                    fontSize: '0.6875rem',
                                    padding: '1px 6px',
                                    borderRadius: 999,
                                    background: activeTab === 'screen' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                                    color: activeTab === 'screen' ? '#fff' : '#cbd5e1'
                                }}
                            >
                                {screenSources.length}
                            </span>
                        </button>

                        {/* Application Window Tab */}
                        <button
                            type="button"
                            onClick={() => {
                                setActiveTab('window')
                                const first = windowSources[0]
                                if (first) setSelectedSourceId(first.id)
                            }}
                            style={{
                                padding: '8px 16px',
                                borderRadius: 8,
                                border: 'none',
                                background: activeTab === 'window' ? '#2563eb' : 'transparent',
                                color: activeTab === 'window' ? '#fff' : '#94a3b8',
                                fontSize: '0.8125rem',
                                fontWeight: activeTab === 'window' ? 600 : 500,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                transition: 'all 0.15s ease'
                            }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                <path d="M3 9h18" />
                                <circle cx="6" cy="6" r="1" fill="currentColor" />
                                <circle cx="9" cy="6" r="1" fill="currentColor" />
                            </svg>
                            <span>Window</span>
                            <span
                                style={{
                                    fontSize: '0.6875rem',
                                    padding: '1px 6px',
                                    borderRadius: 999,
                                    background: activeTab === 'window' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                                    color: activeTab === 'window' ? '#fff' : '#cbd5e1'
                                }}
                            >
                                {windowSources.length}
                            </span>
                        </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {activeTab === 'window' && windowSources.length > 4 && (
                            <input
                                type="text"
                                placeholder="Search windows..."
                                value={searchFilter}
                                onChange={(e) => setSearchFilter(e.target.value)}
                                style={{
                                    background: 'rgba(0, 0, 0, 0.4)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: 8,
                                    padding: '6px 12px',
                                    fontSize: '0.8125rem',
                                    color: '#fff',
                                    outline: 'none',
                                    width: 160
                                }}
                            />
                        )}

                        {/* Reload / Refresh Button */}
                        <button
                            type="button"
                            onClick={loadSources}
                            disabled={isLoading}
                            title="Refresh available screens and windows"
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: 8,
                                padding: '6px 12px',
                                color: '#94a3b8',
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                cursor: isLoading ? 'default' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                                if (!isLoading) {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                                    e.currentTarget.style.color = '#fff'
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                                e.currentTarget.style.color = '#94a3b8'
                            }}
                        >
                            <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                style={{
                                    animation: isLoading ? 'spin 1s linear infinite' : 'none'
                                }}
                            >
                                <polyline points="23 4 23 10 17 10" />
                                <polyline points="1 20 1 14 7 14" />
                                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                            </svg>
                            <span>{isLoading ? 'Scanning...' : 'Refresh'}</span>
                        </button>
                    </div>
                </div>

                {/* Sources Card Grid */}
                <div
                    style={{
                        padding: 24,
                        overflowY: 'auto',
                        flex: 1,
                        minHeight: 280,
                        maxHeight: '52vh'
                    }}
                >
                    {filteredList.length === 0 ? (
                        <div
                            style={{
                                height: 240,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#64748b',
                                textAlign: 'center'
                            }}
                        >
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: 12, opacity: 0.6 }}>
                                <rect x="2" y="3" width="20" height="14" rx="2" />
                                <line x1="8" y1="21" x2="16" y2="21" />
                                <line x1="12" y1="17" x2="12" y2="21" />
                            </svg>
                            <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#94a3b8' }}>
                                No {activeTab === 'screen' ? 'screens' : 'application windows'} found
                            </div>
                            <div style={{ fontSize: '0.8125rem', marginTop: 4 }}>
                                Click &quot;Refresh&quot; above to re-scan open applications
                            </div>
                        </div>
                    ) : (
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                                gap: 16
                            }}
                        >
                            {filteredList.map((source) => {
                                const isSelected = selectedSourceId === source.id

                                return (
                                    <div
                                        key={source.id}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => setSelectedSourceId(source.id)}
                                        onDoubleClick={() => {
                                            setSelectedSourceId(source.id)
                                            onSelectSource(source, includeAudio)
                                            onClose()
                                        }}
                                        style={{
                                            position: 'relative',
                                            backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                                            border: isSelected
                                                ? '2px solid #3b82f6'
                                                : '2px solid rgba(255, 255, 255, 0.08)',
                                            borderRadius: 14,
                                            padding: 10,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 8,
                                            transition: 'all 0.18s ease',
                                            boxShadow: isSelected
                                                ? '0 0 16px rgba(59, 130, 246, 0.4), inset 0 0 12px rgba(59, 130, 246, 0.15)'
                                                : '0 4px 12px rgba(0, 0, 0, 0.2)'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isSelected) {
                                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.22)'
                                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)'
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isSelected) {
                                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'
                                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)'
                                            }
                                        }}
                                    >
                                        {/* Selected Badge */}
                                        {isSelected && (
                                            <div
                                                style={{
                                                    position: 'absolute',
                                                    top: 8,
                                                    right: 8,
                                                    zIndex: 2,
                                                    width: 22,
                                                    height: 22,
                                                    borderRadius: '50%',
                                                    backgroundColor: '#2563eb',
                                                    color: '#fff',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.4)'
                                                }}
                                            >
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                            </div>
                                        )}

                                        {/* Thumbnail Container (16:9 ratio) */}
                                        <div
                                            style={{
                                                position: 'relative',
                                                width: '100%',
                                                paddingTop: '56.25%',
                                                borderRadius: 8,
                                                overflow: 'hidden',
                                                backgroundColor: '#0a0b0e',
                                                border: '1px solid rgba(255, 255, 255, 0.06)'
                                            }}
                                        >
                                            {source.thumbnail ? (
                                                <img
                                                    src={source.thumbnail}
                                                    alt={source.name}
                                                    style={{
                                                        position: 'absolute',
                                                        inset: 0,
                                                        width: '100%',
                                                        height: '100%',
                                                        objectFit: 'cover'
                                                    }}
                                                />
                                            ) : (
                                                <div
                                                    style={{
                                                        position: 'absolute',
                                                        inset: 0,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: '#475569'
                                                    }}
                                                >
                                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                        <rect x="2" y="3" width="20" height="14" rx="2" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>

                                        {/* Source Title & App Icon */}
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                padding: '2px 4px'
                                            }}
                                        >
                                            {source.appIcon ? (
                                                <img
                                                    src={source.appIcon}
                                                    alt=""
                                                    style={{
                                                        width: 18,
                                                        height: 18,
                                                        borderRadius: 4,
                                                        flexShrink: 0
                                                    }}
                                                />
                                            ) : (
                                                <div
                                                    style={{
                                                        width: 18,
                                                        height: 18,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: isSelected ? '#60a5fa' : '#94a3b8',
                                                        flexShrink: 0
                                                    }}
                                                >
                                                    {activeTab === 'screen' ? (
                                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <rect x="2" y="3" width="20" height="14" rx="2" />
                                                        </svg>
                                                    ) : (
                                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <rect x="3" y="3" width="18" height="18" rx="2" />
                                                        </svg>
                                                    )}
                                                </div>
                                            )}

                                            <span
                                                title={source.name}
                                                style={{
                                                    fontSize: '0.8125rem',
                                                    fontWeight: isSelected ? 600 : 500,
                                                    color: isSelected ? '#ffffff' : '#cbd5e1',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    flex: 1
                                                }}
                                            >
                                                {source.name}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Footer Controls & Actions */}
                <div
                    style={{
                        padding: '16px 24px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                        backgroundColor: 'rgba(0, 0, 0, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 16
                    }}
                >
                    {/* Share System Audio Option */}
                    <label
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            cursor: 'pointer',
                            userSelect: 'none',
                            fontSize: '0.8125rem',
                            color: '#cbd5e1'
                        }}
                    >
                        <input
                            type="checkbox"
                            checked={includeAudio}
                            onChange={(e) => setIncludeAudio(e.target.checked)}
                            style={{
                                width: 16,
                                height: 16,
                                accentColor: '#2563eb',
                                cursor: 'pointer'
                            }}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                            </svg>
                            <span>Share system audio</span>
                        </div>
                    </label>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                padding: '9px 18px',
                                borderRadius: 10,
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                background: 'rgba(255, 255, 255, 0.06)',
                                color: '#e2e8f0',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'
                            }}
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            onClick={handleConfirm}
                            disabled={!selectedSource}
                            style={{
                                padding: '9px 24px',
                                borderRadius: 10,
                                border: 'none',
                                background: selectedSource
                                    ? 'linear-gradient(135deg, #2563eb, #3b82f6)'
                                    : 'rgba(255, 255, 255, 0.08)',
                                color: selectedSource ? '#ffffff' : '#64748b',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                cursor: selectedSource ? 'pointer' : 'not-allowed',
                                boxShadow: selectedSource ? '0 4px 14px rgba(37, 99, 235, 0.4)' : 'none',
                                transition: 'all 0.15s ease',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8
                            }}
                        >
                            <span>Share</span>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="5" y1="12" x2="19" y2="12" />
                                <polyline points="12 5 19 12 12 19" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes screenPickerPop {
                    from {
                        opacity: 0;
                        transform: scale(0.96) translateY(8px);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    )
}
