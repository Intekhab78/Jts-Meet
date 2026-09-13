import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
    children: ReactNode
    fallbackTitle?: string
}

interface State {
    hasError: boolean
    error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    }

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('[ErrorBoundary caught error]:', error, errorInfo)
    }

    private handleReload = () => {
        window.location.reload()
    }

    private handleGoHome = () => {
        window.location.href = '/'
    }

    private handleResetState = () => {
        this.setState({ hasError: false, error: null })
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    minHeight: '100vh',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'radial-gradient(ellipse at 50% 20%, rgba(99, 102, 241, 0.15), rgba(10, 11, 15, 0.98) 70%)',
                    color: '#f8fafc',
                    padding: 24,
                    boxSizing: 'border-box',
                    fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
                }}>
                    <div style={{
                        maxWidth: 520,
                        width: '100%',
                        background: 'rgba(23, 23, 33, 0.82)',
                        backdropFilter: 'blur(24px)',
                        WebkitBackdropFilter: 'blur(24px)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: 20,
                        padding: 36,
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(99, 102, 241, 0.15)',
                        textAlign: 'center'
                    }}>
                        <div style={{
                            width: 64,
                            height: 64,
                            borderRadius: '50%',
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 20px',
                            fontSize: 28
                        }}>
                            🛡️
                        </div>

                        <h2 style={{
                            fontSize: '1.4rem',
                            fontWeight: 700,
                            margin: '0 0 10px',
                            background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}>
                            {this.props.fallbackTitle || 'Session Protected'}
                        </h2>

                        <p style={{
                            fontSize: '0.9rem',
                            color: '#94a3b8',
                            lineHeight: 1.6,
                            margin: '0 0 24px'
                        }}>
                            An unexpected interface issue occurred. Your audio/video connection was protected from crashing the whole browser tab.
                        </p>

                        {this.state.error?.message && (
                            <div style={{
                                background: 'rgba(0, 0, 0, 0.4)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: 8,
                                padding: '10px 14px',
                                fontSize: '0.78rem',
                                color: '#fda4af',
                                fontFamily: 'monospace',
                                textAlign: 'left',
                                marginBottom: 24,
                                maxHeight: 100,
                                overflowY: 'auto'
                            }}>
                                {this.state.error.message}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button
                                onClick={this.handleResetState}
                                style={{
                                    padding: '10px 20px',
                                    borderRadius: 10,
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                    color: '#fff',
                                    fontWeight: 600,
                                    fontSize: '0.875rem',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
                                    transition: 'transform 0.15s ease'
                                }}
                            >
                                🔄 Try Recovering
                            </button>

                            <button
                                onClick={this.handleReload}
                                style={{
                                    padding: '10px 18px',
                                    borderRadius: 10,
                                    border: '1px solid rgba(255, 255, 255, 0.14)',
                                    background: 'rgba(255, 255, 255, 0.06)',
                                    color: '#e2e8f0',
                                    fontWeight: 600,
                                    fontSize: '0.875rem',
                                    cursor: 'pointer'
                                }}
                            >
                                ⚡ Reload Tab
                            </button>

                            <button
                                onClick={this.handleGoHome}
                                style={{
                                    padding: '10px 18px',
                                    borderRadius: 10,
                                    border: '1px solid rgba(255, 255, 255, 0.14)',
                                    background: 'transparent',
                                    color: '#94a3b8',
                                    fontWeight: 600,
                                    fontSize: '0.875rem',
                                    cursor: 'pointer'
                                }}
                            >
                                🏠 Home
                            </button>
                        </div>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}
