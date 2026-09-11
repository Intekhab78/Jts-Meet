import React, { useState } from 'react'

/* ──────────────────────────────────────────────────────────
   Inline SVG Icons for Landing Page
   ────────────────────────────────────────────────────────── */
const IconVideo = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
)
const IconShield = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
)
const IconUsers = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
)
const IconZap = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
)
const IconArrowRight = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
    </svg>
)
const IconCheck = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
)
const IconFolder = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
)
const IconTwitter = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
)
const IconGithub = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
)
const IconLinkedin = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
    </svg>
)

interface LandingPageProps {
    onNavigate: (view: 'login' | 'register' | 'forgot-password' | 'reset-password' | 'email-verification' | 'otp-verification' | 'app') => void
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
    const [faqOpen, setFaqOpen] = useState<Record<number, boolean>>({})
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [meetingCodeInput, setMeetingCodeInput] = useState('')
    const [activeAiTab, setActiveAiTab] = useState<'summary' | 'action' | 'transcript'>('summary')
    const [hostPromptOpen, setHostPromptOpen] = useState(false)

    const toggleFaq = (index: number) => {
        setFaqOpen(prev => ({ ...prev, [index]: !prev[index] }))
    }

    const handleQuickJoin = (e: React.FormEvent) => {
        e.preventDefault()
        const trimmed = meetingCodeInput.trim()
        if (!trimmed) return
        const match = trimmed.match(/\/meet\/([a-zA-Z0-9\-_]+)/) || trimmed.match(/[?&]id=([a-zA-Z0-9\-_]+)/)
        const code = match ? match[1] : trimmed.replace(/[^a-zA-Z0-9\-_]/g, '')
        if (code) {
            window.location.href = `/meet/${code}`
        }
    }

    const handleInstantMeeting = () => {
        const token = localStorage.getItem('jts_token')
        if (token) {
            onNavigate('app')
        } else {
            setHostPromptOpen(true)
        }
    }

    return (
        <div style={{ minHeight: '100dvh', background: 'var(--color-bg-base)', overflowX: 'hidden' }}>
            {/* ── Host Sign-In Required Modal (JTS Meet Enterprise Standard) ── */}
            {hostPromptOpen && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.78)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    zIndex: 2000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 20
                }} onClick={() => setHostPromptOpen(false)}>
                    <div className="glass-card anim-scale-in" style={{
                        maxWidth: 440,
                        width: '100%',
                        padding: '32px 28px',
                        borderRadius: 20,
                        background: 'rgba(15, 18, 28, 0.97)',
                        border: '1px solid rgba(99, 102, 241, 0.35)',
                        boxShadow: '0 25px 60px rgba(0,0,0,0.7), 0 0 50px rgba(99, 102, 241, 0.2)',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 18
                    }} onClick={(e) => e.stopPropagation()}>
                        <div style={{
                            width: 56,
                            height: 56,
                            borderRadius: 14,
                            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(139, 92, 246, 0.25) 100%)',
                            border: '1px solid rgba(99, 102, 241, 0.4)',
                            color: '#a5b4fc',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto',
                            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)'
                        }}>
                            <IconVideo />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
                                Host Sign-In Required
                            </h3>
                            <p style={{ fontSize: '0.88rem', color: '#94a3b8', margin: 0, lineHeight: 1.6 }}>
                                Sign in to your <strong style={{ color: '#ffffff' }}>JTS Meet</strong> account to launch an instant room with full organizer controls, cloud recording, and attendee management.
                            </p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
                            <button
                                type="button"
                                onClick={() => { setHostPromptOpen(false); onNavigate('login'); }}
                                className="landing-btn-cta"
                                style={{ justifyContent: 'center', padding: '12px', fontSize: '0.92rem' }}
                            >
                                Sign In to Start Meeting →
                            </button>
                            <button
                                type="button"
                                onClick={() => { setHostPromptOpen(false); onNavigate('register'); }}
                                className="landing-btn-signin"
                                style={{ justifyContent: 'center', padding: '11px' }}
                            >
                                Create Free Host Account
                            </button>
                            <button
                                type="button"
                                onClick={() => setHostPromptOpen(false)}
                                style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.82rem', cursor: 'pointer', padding: '6px' }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <style>{`
                .landing-navbar {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    width: 100%;
                    height: 68px;
                    z-index: 1000;
                    background: rgba(10, 13, 20, 0.88);
                    backdrop-filter: blur(24px) saturate(180%);
                    -webkit-backdrop-filter: blur(24px) saturate(180%);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 0 !important;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0 clamp(20px, 4vw, 56px);
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
                    box-sizing: border-box;
                }
                .landing-left-brand {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    cursor: pointer;
                    user-select: none;
                }
                .landing-nav-links {
                    display: flex;
                    align-items: center;
                    gap: 32px;
                }
                .landing-nav-link {
                    color: #94a3b8;
                    font-size: 0.9rem;
                    font-weight: 500;
                    text-decoration: none;
                    transition: color 0.2s ease;
                    padding: 6px 2px;
                    position: relative;
                }
                .landing-nav-link:hover {
                    color: #ffffff;
                }
                .landing-right-actions {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .landing-btn-signin {
                    background: transparent;
                    border: 1px solid rgba(255, 255, 255, 0.16);
                    color: #f1f5f9;
                    font-size: 0.88rem;
                    font-weight: 600;
                    padding: 8px 18px;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    white-space: nowrap;
                }
                .landing-btn-signin:hover {
                    background: rgba(255, 255, 255, 0.08);
                    border-color: rgba(255, 255, 255, 0.3);
                    color: #ffffff;
                }
                .landing-btn-cta {
                    background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
                    border: 1px solid rgba(165, 180, 252, 0.35);
                    color: #ffffff;
                    font-size: 0.88rem;
                    font-weight: 600;
                    padding: 8px 20px;
                    border-radius: 8px;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 7px;
                    box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
                    transition: all 0.2s ease;
                    white-space: nowrap;
                }
                .landing-btn-cta:hover {
                    background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%);
                    box-shadow: 0 6px 20px rgba(99, 102, 241, 0.55);
                    transform: translateY(-1px);
                }
                .landing-mobile-toggle {
                    display: none;
                    background: rgba(255, 255, 255, 0.07);
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    border-radius: 8px;
                    padding: 6px 8px;
                    color: #fff;
                    align-items: center;
                    cursor: pointer;
                }
                @media (max-width: 880px) {
                    .landing-nav-links { display: none !important; }
                    .landing-desktop-cta { display: none !important; }
                    .landing-mobile-toggle { display: flex !important; }
                    .landing-navbar { height: 62px; padding: 0 16px; }
                }
                @media (min-width: 881px) {
                    .landing-mobile-toggle { display: none !important; }
                    .landing-mobile-drawer { display: none !important; }
                }

                /* ── Enterprise Footer Styles ── */
                .landing-footer {
                    border-top: 1px solid rgba(255, 255, 255, 0.08);
                    background: linear-gradient(180deg, rgba(10, 13, 20, 0.7) 0%, rgba(5, 7, 12, 0.98) 100%);
                    padding: clamp(52px, 7vw, 76px) clamp(20px, 4vw, 56px) 32px;
                    position: relative;
                    overflow: hidden;
                }
                .landing-footer-top-accent {
                    position: absolute;
                    top: 0;
                    left: 15%;
                    right: 15%;
                    height: 1px;
                    background: linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.5), rgba(168, 85, 247, 0.5), transparent);
                    pointer-events: none;
                }
                .landing-footer-inner {
                    max-width: 1200px;
                    margin: 0 auto;
                    display: flex;
                    flex-direction: column;
                    gap: 44px;
                }
                .landing-footer-grid {
                    display: grid;
                    grid-template-columns: 1.5fr 1fr 1fr 1fr 1fr;
                    gap: clamp(28px, 4vw, 48px);
                }
                .landing-footer-brand-col {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }
                .landing-footer-col {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                .landing-footer-col-title {
                    font-size: 0.78rem;
                    font-weight: 700;
                    color: #f1f5f9;
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                    margin-bottom: 2px;
                }
                .landing-footer-link {
                    color: #94a3b8;
                    font-size: 0.86rem;
                    font-weight: 400;
                    text-decoration: none;
                    transition: all 0.2s ease;
                    width: fit-content;
                    line-height: 1.4;
                }
                .landing-footer-link:hover {
                    color: #ffffff;
                    transform: translateX(3px);
                }
                .landing-footer-social-btn {
                    width: 36px;
                    height: 36px;
                    border-radius: 8px;
                    background: rgba(255, 255, 255, 0.04);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    color: #94a3b8;
                    text-decoration: none;
                    transition: all 0.2s ease;
                }
                .landing-footer-social-btn:hover {
                    background: rgba(99, 102, 241, 0.15);
                    border-color: rgba(99, 102, 241, 0.4);
                    color: #ffffff;
                    transform: translateY(-2px);
                }
                .landing-footer-bottom {
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: space-between;
                    align-items: center;
                    border-top: 1px solid rgba(255, 255, 255, 0.07);
                    padding-top: 24px;
                    gap: 16px;
                }
                @media (max-width: 1040px) {
                    .landing-footer-grid {
                        grid-template-columns: 1fr 1fr 1fr;
                    }
                    .landing-footer-brand-col {
                        grid-column: 1 / -1;
                        max-width: 520px;
                    }
                }
                @media (max-width: 640px) {
                    .landing-footer-grid {
                        grid-template-columns: 1fr 1fr;
                        gap: 28px;
                    }
                    .landing-footer-brand-col {
                        grid-column: 1 / -1;
                    }
                    .landing-footer-bottom {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 14px;
                    }
                }

                /* ── 1. Quick Join Bar ── */
                .quick-join-container {
                    margin-top: 24px;
                    width: 100%;
                    max-width: 620px;
                    z-index: 2;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 14px;
                }
                .quick-join-box {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background: rgba(15, 18, 28, 0.85);
                    border: 1px solid rgba(255, 255, 255, 0.14);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border-radius: 12px;
                    padding: 6px 6px 6px 14px;
                    width: 100%;
                    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.1);
                    transition: all 0.25s ease;
                }
                .quick-join-box:focus-within {
                    border-color: rgba(99, 102, 241, 0.7);
                    box-shadow: 0 16px 44px rgba(99, 102, 241, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.15);
                }
                .quick-join-input {
                    flex: 1;
                    background: transparent;
                    border: none;
                    outline: none;
                    color: #ffffff;
                    font-size: 0.92rem;
                    min-width: 140px;
                }
                .quick-join-input::placeholder {
                    color: #64748b;
                }
                .quick-join-divider {
                    width: 1px;
                    height: 24px;
                    background: rgba(255, 255, 255, 0.1);
                }
                .quick-join-instant-btn {
                    background: transparent;
                    border: none;
                    color: #a5b4fc;
                    font-size: 0.84rem;
                    font-weight: 600;
                    padding: 8px 12px;
                    border-radius: 6px;
                    cursor: pointer;
                    white-space: nowrap;
                    transition: all 0.2s ease;
                }
                .quick-join-instant-btn:hover {
                    background: rgba(99, 102, 241, 0.15);
                    color: #ffffff;
                }
                @media (max-width: 640px) {
                    .quick-join-box {
                        flex-direction: column;
                        align-items: stretch;
                        padding: 10px;
                    }
                    .quick-join-divider {
                        display: none;
                    }
                }

                /* ── 2. Logos Section ── */
                .logos-banner {
                    padding: 38px 20px;
                    border-top: 1px solid rgba(255, 255, 255, 0.06);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
                    background: rgba(8, 10, 16, 0.6);
                    text-align: center;
                }
                .logos-grid {
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: center;
                    align-items: center;
                    gap: clamp(24px, 5vw, 60px);
                    margin-top: 16px;
                }
                .logo-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: #64748b;
                    font-weight: 700;
                    font-size: 1.05rem;
                    letter-spacing: -0.02em;
                    transition: all 0.25s ease;
                    user-select: none;
                }
                .logo-item:hover {
                    color: #e2e8f0;
                    transform: translateY(-2px);
                }

                /* ── 3. AI Intelligence Section ── */
                .ai-feature-section {
                    padding: clamp(64px, 9vw, 96px) clamp(16px, 4vw, 24px);
                    position: relative;
                    overflow: hidden;
                    background: radial-gradient(circle at 50% 30%, rgba(99, 102, 241, 0.07) 0%, transparent 65%);
                    border-top: 1px solid rgba(255, 255, 255, 0.06);
                }
                .ai-grid {
                    display: grid;
                    grid-template-columns: 1fr 1.15fr;
                    gap: clamp(28px, 5vw, 56px);
                    max-width: 1100px;
                    margin: 40px auto 0;
                    align-items: center;
                }
                .ai-tab-card {
                    text-align: left;
                    padding: 18px 20px;
                    border-radius: 12px;
                    background: rgba(255, 255, 255, 0.02);
                    border: 1px solid rgba(255, 255, 255, 0.07);
                    cursor: pointer;
                    transition: all 0.25s ease;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                .ai-tab-card:hover {
                    background: rgba(255, 255, 255, 0.05);
                    border-color: rgba(99, 102, 241, 0.3);
                }
                .ai-tab-card-active {
                    background: rgba(99, 102, 241, 0.12) !important;
                    border-color: rgba(99, 102, 241, 0.5) !important;
                    box-shadow: 0 8px 28px rgba(99, 102, 241, 0.15);
                }
                @media (max-width: 900px) {
                    .ai-grid {
                        grid-template-columns: 1fr;
                    }
                }

                /* ── 4. How It Works ── */
                .how-it-works-section {
                    padding: clamp(64px, 8vw, 96px) clamp(16px, 4vw, 24px);
                    background: var(--color-bg-elevated);
                    border-top: 1px solid var(--color-border);
                }
                .how-steps-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                    gap: clamp(20px, 3.5vw, 32px);
                    max-width: 1080px;
                    margin: 44px auto 0;
                }
                .how-step-card {
                    background: rgba(255, 255, 255, 0.02);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 16px;
                    padding: clamp(24px, 4vw, 32px);
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    transition: all 0.3s ease;
                    position: relative;
                }
                .how-step-card:hover {
                    background: rgba(255, 255, 255, 0.04);
                    border-color: rgba(99, 102, 241, 0.4);
                    transform: translateY(-4px);
                    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.35);
                }
                .how-step-number {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 44px;
                    height: 44px;
                    border-radius: 10px;
                    background: linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(168, 85, 247, 0.25) 100%);
                    border: 1px solid rgba(99, 102, 241, 0.4);
                    color: #c7d2fe;
                    font-weight: 800;
                    font-size: 1.15rem;
                }
            `}</style>

            {/* ── Enterprise Full-Width Top Navbar ── */}
            <nav className="landing-navbar">
                {/* 1. Left Side: Brand Logo & Name */}
                <div className="landing-left-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                    <div style={{
                        width: 36,
                        height: 36,
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #4f46e5 100%)',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 3px 12px rgba(99, 102, 241, 0.45)',
                        color: '#fff'
                    }}>
                        <IconVideo />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <span style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
                            JTS<span style={{
                                background: 'linear-gradient(135deg, #818cf8 0%, #c084fc 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent'
                            }}>Meet</span>
                        </span>
                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 6,
                            background: 'rgba(99, 102, 241, 0.12)',
                            border: '1px solid rgba(99, 102, 241, 0.25)',
                            color: '#a5b4fc',
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase'
                        }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                            Enterprise
                        </span>
                    </div>
                </div>

                {/* 2. Center: Navigation Links */}
                <div className="landing-nav-links">
                    <a href="#features" className="landing-nav-link">
                        Features
                    </a>
                    <a href="#security" className="landing-nav-link">
                        Security
                    </a>
                    <a href="#pricing" className="landing-nav-link">
                        Pricing
                    </a>
                    <a href="#faq" className="landing-nav-link">
                        FAQ
                    </a>
                </div>

                {/* 3. Right Side: Sign In and Get Started Free */}
                <div className="landing-right-actions">
                    <button
                        type="button"
                        onClick={() => onNavigate('login')}
                        className="landing-btn-signin"
                    >
                        Sign In
                    </button>
                    <button
                        type="button"
                        onClick={() => onNavigate('register')}
                        className="landing-btn-cta landing-desktop-cta"
                    >
                        Get Started Free
                        <IconArrowRight />
                    </button>
                    <button
                        type="button"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="landing-mobile-toggle"
                        aria-label="Toggle navigation menu"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            {mobileMenuOpen ? (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                            )}
                        </svg>
                    </button>
                </div>
            </nav>

            {/* Mobile Nav Drawer */}
            {mobileMenuOpen && (
                <div
                    className="landing-mobile-drawer anim-fade-in"
                    style={{
                        position: 'fixed',
                        top: 68,
                        left: 0,
                        right: 0,
                        background: 'rgba(10, 13, 20, 0.98)',
                        backdropFilter: 'blur(24px)',
                        WebkitBackdropFilter: 'blur(24px)',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                        padding: '18px 24px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 14,
                        zIndex: 999,
                        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)'
                    }}
                >
                    <a
                        href="#features"
                        onClick={() => setMobileMenuOpen(false)}
                        className="landing-nav-link"
                        style={{ fontSize: '1rem', padding: '8px 0' }}
                    >
                        Features
                    </a>
                    <a
                        href="#security"
                        onClick={() => setMobileMenuOpen(false)}
                        className="landing-nav-link"
                        style={{ fontSize: '1rem', padding: '8px 0' }}
                    >
                        Security & Compliance
                    </a>
                    <a
                        href="#pricing"
                        onClick={() => setMobileMenuOpen(false)}
                        className="landing-nav-link"
                        style={{ fontSize: '1rem', padding: '8px 0' }}
                    >
                        Pricing Plans
                    </a>
                    <a
                        href="#faq"
                        onClick={() => setMobileMenuOpen(false)}
                        className="landing-nav-link"
                        style={{ fontSize: '1rem', padding: '8px 0' }}
                    >
                        FAQ
                    </a>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 10, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <button
                            type="button"
                            onClick={() => { setMobileMenuOpen(false); onNavigate('register') }}
                            className="landing-btn-cta"
                            style={{ width: '100%', justifyContent: 'center', padding: '11px' }}
                        >
                            Get Started Free →
                        </button>
                    </div>
                </div>
            )}

            {/* ── Hero Section ── */}
            <header className="anim-fade-in" style={{
                paddingTop: 'clamp(90px, 12vw, 130px)',
                paddingBottom: 'clamp(40px, 6vw, 70px)',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                paddingLeft: 'clamp(14px, 4vw, 24px)',
                paddingRight: 'clamp(14px, 4vw, 24px)'
            }}>
                {/* Background glow orbs */}
                <div aria-hidden="true" style={{
                    position: 'absolute', width: 'clamp(300px, 60vw, 600px)', height: 'clamp(300px, 60vw, 600px)', borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
                    top: '5%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 0
                }} />

                <div className="badge badge-accent anim-slide-up" style={{ marginBottom: 16, zIndex: 1, fontSize: '0.75rem', padding: '4px 10px' }}>
                    <span className="badge-dot accent pulse" />
                    Now with E2E Encrypted File Sharing
                </div>

                <h1 className="anim-slide-up anim-delay-100" style={{
                    fontSize: 'clamp(2rem, 5.5vw, 4rem)', fontWeight: 800, letterSpacing: '-0.04em',
                    lineHeight: 1.15, maxWidth: 850, margin: '0 auto 18px', zIndex: 1
                }}>
                    Crystal-Clear Video.<br />
                    <span className="gradient-text">Seamless Collaboration.</span>
                </h1>

                <p className="anim-slide-up anim-delay-150" style={{
                    fontSize: 'clamp(0.9375rem, 2vw, 1.15rem)', color: 'var(--color-text-secondary)',
                    maxWidth: 620, margin: '0 auto 28px', lineHeight: 1.6, zIndex: 1
                }}>
                    JTS Meet gives your enterprise secure video meetings, real-time team chats, and cloud file sharing — all inside a single glassmorphic interface.
                </p>

                <div className="anim-slide-up anim-delay-200" style={{
                    display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 12,
                    justifyContent: 'center', zIndex: 1, width: '100%', maxWidth: 440
                }}>
                    <button onClick={() => onNavigate('register')} className="btn btn-primary" style={{ flex: '1 1 180px', padding: '12px 22px', fontSize: '0.9375rem', gap: 8, justifyContent: 'center' }}>
                        Get Started Free
                        <IconZap />
                    </button>
                    <button onClick={() => onNavigate('app')} className="btn btn-secondary" style={{ flex: '1 1 180px', padding: '12px 22px', fontSize: '0.9375rem', gap: 8, justifyContent: 'center' }}>
                        Join Demo Room
                        <IconArrowRight />
                    </button>
                </div>

                {/* ── 1. Quick Join Bar ── */}
                <div className="quick-join-container anim-slide-up anim-delay-250">
                    <form onSubmit={handleQuickJoin} className="quick-join-box">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, paddingLeft: 4 }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <input
                                type="text"
                                value={meetingCodeInput}
                                onChange={(e) => setMeetingCodeInput(e.target.value)}
                                placeholder="Enter meeting code or link (e.g. room-901)"
                                className="quick-join-input"
                            />
                        </div>
                        <button
                            type="submit"
                            className="landing-btn-cta"
                            style={{ padding: '8px 16px', fontSize: '0.86rem', borderRadius: 8 }}
                        >
                            Join Meeting
                        </button>
                        <div className="quick-join-divider" />
                        <button
                            type="button"
                            onClick={handleInstantMeeting}
                            className="quick-join-instant-btn"
                        >
                            + Instant Meet
                        </button>
                    </form>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: '0.74rem', color: '#64748b', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <span>🔒 100% Encrypted</span>
                        <span>•</span>
                        <span>⚡ Zero Install Needed</span>
                        <span>•</span>
                        <span>👥 Free for up to 100 Participants</span>
                    </div>
                </div>

                {/* Glassmorphic App Mockup/Preview Screenshot */}
                <div className="anim-scale-in anim-delay-300" style={{
                    marginTop: 'clamp(28px, 4.5vw, 56px)', width: '100%', maxWidth: 1040, background: 'rgba(255,255,255,0.01)',
                    borderRadius: 'var(--radius-2xl)', border: '1px solid rgba(255,255,255,0.06)',
                    padding: 'clamp(4px, 1.5vw, 8px)', boxShadow: 'var(--shadow-xl), 0 0 80px rgba(99,102,241,0.15)', zIndex: 1, position: 'relative'
                }}>
                    <div style={{
                        width: '100%', aspectRatio: '16/10', borderRadius: 'var(--radius-xl)',
                        background: 'linear-gradient(135deg, #0f111a 0%, #151824 100%)', overflow: 'hidden',
                        position: 'relative', border: '1px solid rgba(255,255,255,0.04)', display: 'flex', flexDirection: 'column'
                    }}>
                        {/* Mock App Header */}
                        <div style={{
                            height: 42, background: 'rgba(10,11,15,0.9)', display: 'flex', alignItems: 'center',
                            justifyContent: 'space-between', padding: '0 14px', borderBottom: '1px solid rgba(255,255,255,0.05)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>jts-meet.saas/room/x9b2-3kd</span>
                            <div style={{ width: 40 }} />
                        </div>
                        {/* Mock Video Grid & Sidebar */}
                        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                            <div style={{ flex: 1, padding: 'clamp(8px, 2vw, 14px)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'clamp(8px, 1.5vw, 12px)' }}>
                                <div className="glass-card" style={{ position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.03)', minHeight: 120 }}>
                                    <div className="avatar avatar-lg">JD</div>
                                    <div style={{ position: 'absolute', bottom: 6, left: 6, padding: '2px 6px', borderRadius: 4, background: 'rgba(0,0,0,0.6)', fontSize: '0.65rem' }}>John Doe (Host)</div>
                                </div>
                                <div className="glass-card" style={{ position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.03)', minHeight: 120 }}>
                                    <div className="avatar avatar-lg">SC</div>
                                    <div style={{ position: 'absolute', bottom: 6, left: 6, padding: '2px 6px', borderRadius: 4, background: 'rgba(0,0,0,0.6)', fontSize: '0.65rem' }}>Sarah Connor</div>
                                </div>
                            </div>
                            {/* Mock Sidebar Chat */}
                            <div className="hidden sm:flex" style={{ width: 220, borderLeft: '1px solid rgba(255,255,255,0.05)', background: 'rgba(10,11,15,0.5)', padding: 10, flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: 8, display: 'block' }}>Meeting Chat</span>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <div style={{ background: 'rgba(255,255,255,0.04)', padding: 6, borderRadius: 6, fontSize: '0.7rem' }}>
                                        <span style={{ fontWeight: 600, display: 'block' }}>Sarah Connor</span>
                                        Did you upload the presentation?
                                    </div>
                                    <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', padding: 6, borderRadius: 6, fontSize: '0.7rem', alignSelf: 'flex-end' }}>
                                        <span style={{ fontWeight: 600, display: 'block', color: '#a5b4fc' }}>You</span>
                                        Yes, added to the Files panel!
                                    </div>
                                </div>
                                <div style={{ height: 26, background: 'rgba(255,255,255,0.04)', borderRadius: 6, display: 'flex', alignItems: 'center', padding: '0 8px', fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>Send a message...</div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* ── 2. Trusted By Logos Banner ── */}
            <div className="logos-banner">
                <span style={{ fontSize: '0.74rem', fontWeight: 700, letterSpacing: '0.12em', color: '#64748b', textTransform: 'uppercase' }}>
                    Trusted by 5,000+ high-performing engineering & product teams
                </span>
                <div className="logos-grid">
                    <div className="logo-item">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697.5 12.541.5 6.845.5 3.013 3.614 3.013 8.35c0 4.975 3.968 6.782 7.848 8.169 2.502.894 3.398 1.611 3.398 2.593 0 .918-.844 1.487-2.227 1.487-2.584 0-5.32-1.127-7.25-2.282l-.95 5.567c1.78.966 4.795 1.616 8.28 1.616 5.86 0 9.873-2.906 9.873-7.97 0-4.996-3.882-6.862-8.006-8.38z"/></svg>
                        <span>Stripe</span>
                    </div>
                    <div className="logo-item">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M24 22.525H0l12-21.05 12 21.05z"/></svg>
                        <span>Vercel</span>
                    </div>
                    <div className="logo-item">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
                        <span>GitHub</span>
                    </div>
                    <div className="logo-item">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.04c-5.5 0-9.96 4.46-9.96 9.96 0 4.4 2.86 8.13 6.84 9.46l.2-.21c.21-.21.32-.5.32-.8 0-.31-.12-.6-.32-.81-.97-.97-1.5-2.25-1.5-3.64 0-2.85 2.31-5.16 5.16-5.16 1.39 0 2.67.53 3.64 1.5.21.21.5.32.81.32.3 0 .59-.11.8-.32l.21-.2c-1.33-3.98-5.06-6.84-9.46-6.84z"/></svg>
                        <span>Linear</span>
                    </div>
                    <div className="logo-item">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M21.362 9.354H12V.5L2.638 14.646H12v8.854l9.362-14.146z"/></svg>
                        <span>Supabase</span>
                    </div>
                    <div className="logo-item">
                        <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor"><path d="M15.332 8.668a3.333 3.333 0 0 0-3.332-3.334H8.668A3.333 3.333 0 0 0 5.334 8.67a3.333 3.333 0 0 0 3.334 3.333h3.332a3.333 3.333 0 0 0 3.332-3.334zm0 6.666a3.333 3.333 0 0 0-3.332-3.333H8.668a3.333 3.333 0 0 0-3.334 3.333 3.333 3.333 0 0 0 3.334 3.333h3.332a3.333 3.333 0 0 0 3.332-3.333z"/></svg>
                        <span>Figma</span>
                    </div>
                </div>
            </div>

            {/* ── Statistics Section ── */}
            <section style={{ borderTop: '1px solid var(--color-border)', padding: 'clamp(36px, 6vw, 56px) clamp(16px, 4vw, 24px)', background: 'var(--color-bg-elevated)' }}>
                <div style={{ maxWidth: 1040, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'clamp(20px, 4vw, 32px)', textAlign: 'center' }}>
                    <div>
                        <div style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 800, color: '#fff', marginBottom: 2 }} className="gradient-text">10M+</div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Meetings Hosted Daily</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 800, color: '#fff', marginBottom: 2 }} className="gradient-text">99.99%</div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Service Uptime</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 800, color: '#fff', marginBottom: 2 }} className="gradient-text">&lt; 50ms</div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Global Media Latency</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 800, color: '#fff', marginBottom: 2 }} className="gradient-text">E2EE</div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>End-to-End Encryption</div>
                    </div>
                </div>
            </section>

            {/* ── Features Grid Section ── */}
            <section id="features" style={{ padding: 'clamp(48px, 8vw, 80px) clamp(16px, 4vw, 24px)', maxWidth: 1040, margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: 'clamp(32px, 5vw, 48px)' }}>
                    <h2 style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2rem)', fontWeight: 800, marginBottom: 12 }}>Everything you need for collaboration.</h2>
                    <p style={{ color: 'var(--color-text-secondary)', maxWidth: 580, margin: '0 auto', fontSize: '0.9rem', lineHeight: 1.5 }}>
                        Built with cutting-edge WebRTC technology for seamless audio, video, and data communication directly inside the browser.
                    </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'clamp(14px, 2vw, 20px)' }}>
                    {/* Feature 1 */}
                    <div className="glass-card" style={{ padding: 'clamp(20px, 3vw, 26px)', display: 'flex', flexDirection: 'column', gap: 12, transition: 'transform var(--duration-normal)', cursor: 'default' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                        <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'var(--color-accent-light)', color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <IconVideo />
                        </div>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0 }}>HD Video & Audio</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>
                            Experience crystal-clear video and high-fidelity audio meetings with automated bandwidth scaling and latency correction.
                        </p>
                    </div>

                    {/* Feature 2 */}
                    <div className="glass-card" style={{ padding: 'clamp(20px, 3vw, 26px)', display: 'flex', flexDirection: 'column', gap: 12, transition: 'transform var(--duration-normal)', cursor: 'default' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                        <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'rgba(34,197,94,0.15)', color: '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <IconZap />
                        </div>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0 }}>Instant Screen Share</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>
                            Share your entire screen or individual app windows with single-click ease. Fully responsive layout updates for other users instantly.
                        </p>
                    </div>

                    {/* Feature 3 */}
                    <div className="glass-card" style={{ padding: 'clamp(20px, 3vw, 26px)', display: 'flex', flexDirection: 'column', gap: 12, transition: 'transform var(--duration-normal)', cursor: 'default' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                        <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'rgba(239,68,68,0.15)', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <IconFolder />
                        </div>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0 }}>Secure File Sharing</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>
                            Upload documents, slides, or images directly to your meeting room. Securely saved, stored in the cloud, and easily downloadable.
                        </p>
                    </div>

                    {/* Feature 4 */}
                    <div className="glass-card" style={{ padding: 'clamp(20px, 3vw, 26px)', display: 'flex', flexDirection: 'column', gap: 12, transition: 'transform var(--duration-normal)', cursor: 'default' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                        <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'rgba(245,158,11,0.15)', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <IconUsers />
                        </div>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0 }}>Real-time Text Chat</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>
                            Exchange messages with typing indicators and smooth enter-exit animations to keep alignment active without interrupting speakers.
                        </p>
                    </div>

                    {/* Feature 5 */}
                    <div id="security" className="glass-card" style={{ padding: 'clamp(20px, 3vw, 26px)', display: 'flex', flexDirection: 'column', gap: 12, transition: 'transform var(--duration-normal)', cursor: 'default' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                        <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'var(--color-accent-light)', color: '#a5b4fc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <IconShield />
                        </div>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0 }}>Enterprise Security</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>
                            All calls use TLS encryption and WebRTC security context, with token authentication ensuring unauthorized guests cannot access rooms.
                        </p>
                    </div>

                    {/* Feature 6 */}
                    <div className="glass-card" style={{ padding: 'clamp(20px, 3vw, 26px)', display: 'flex', flexDirection: 'column', gap: 12, transition: 'transform var(--duration-normal)', cursor: 'default' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                        <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <IconZap />
                        </div>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0 }}>Zero Installs Required</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>
                            Works natively in any modern web browser. Generate a link, share it, and jump right into the meeting room instantly.
                        </p>
                    </div>
                </div>
            </section>

            {/* ── 3. AI Meeting Intelligence (Gemini 1.5 Pro) ── */}
            <section className="ai-feature-section">
                <div style={{ textAlign: 'center', maxWidth: 800, margin: '0 auto' }}>
                    <div className="badge badge-accent" style={{ marginBottom: 14, fontSize: '0.74rem', padding: '4px 12px', letterSpacing: '0.04em' }}>
                        <span className="badge-dot accent pulse" />
                        POWERED BY GEMINI 1.5 PRO
                    </div>
                    <h2 style={{ fontSize: 'clamp(1.7rem, 4vw, 2.5rem)', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 14 }}>
                        Meeting intelligence that takes notes <span className="gradient-text">so you don't have to.</span>
                    </h2>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.94rem', lineHeight: 1.6, maxWidth: 640, margin: '0 auto' }}>
                        Turn audio streams into actionable enterprise assets. Automatically transcribe speakers, summarize critical decisions, and assign follow-ups in real-time.
                    </p>
                </div>

                <div className="ai-grid">
                    {/* Left Tabs Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div
                            onClick={() => setActiveAiTab('summary')}
                            className={`ai-tab-card ${activeAiTab === 'summary' ? 'ai-tab-card-active' : ''}`}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                                    ✨
                                </div>
                                <span style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
                                    Executive TL;DR Summaries
                                </span>
                            </div>
                            <p style={{ fontSize: '0.84rem', color: '#94a3b8', margin: 0, lineHeight: 1.5, paddingLeft: 42 }}>
                                Instant 10-second summaries capturing major agreements, key decisions, and product strategy without rewatching recordings.
                            </p>
                        </div>

                        <div
                            onClick={() => setActiveAiTab('action')}
                            className={`ai-tab-card ${activeAiTab === 'action' ? 'ai-tab-card-active' : ''}`}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                                    🎯
                                </div>
                                <span style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
                                    Automatic Action Items
                                </span>
                            </div>
                            <p style={{ fontSize: '0.84rem', color: '#94a3b8', margin: 0, lineHeight: 1.5, paddingLeft: 42 }}>
                                AI automatically detects assigned deliverables, responsible team members, and targets to ensure zero task drop-off.
                            </p>
                        </div>

                        <div
                            onClick={() => setActiveAiTab('transcript')}
                            className={`ai-tab-card ${activeAiTab === 'transcript' ? 'ai-tab-card-active' : ''}`}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(236, 72, 153, 0.2)', color: '#f472b6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                                    🎙️
                                </div>
                                <span style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
                                    Speaker-Identified Live Transcripts
                                </span>
                            </div>
                            <p style={{ fontSize: '0.84rem', color: '#94a3b8', margin: 0, lineHeight: 1.5, paddingLeft: 42 }}>
                                High-precision speech-to-text with multi-speaker diarization, searchable keywords, and exact time-coded timestamps.
                            </p>
                        </div>
                    </div>

                    {/* Right Interactive Preview Card */}
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(15, 18, 28, 0.95) 0%, rgba(20, 24, 38, 0.9) 100%)',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        borderRadius: 18,
                        padding: 24,
                        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 40px rgba(99, 102, 241, 0.15)',
                        position: 'relative'
                    }}>
                        {/* Header bar */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: 14, marginBottom: 18 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                                <div style={{ width: 28, height: 28, borderRadius: 6, background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.85rem' }}>
                                    ✨
                                </div>
                                <div>
                                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ffffff', display: 'block' }}>Sprint Sync & Roadmap Review</span>
                                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Gemini AI Model 1.5 Pro • 34m 12s Duration</span>
                                </div>
                            </div>
                            <span style={{ fontSize: '0.68rem', fontWeight: 600, padding: '3px 8px', borderRadius: 4, background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                                Synced
                            </span>
                        </div>

                        {/* Dynamic tab content preview */}
                        {activeAiTab === 'summary' && (
                            <div className="anim-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                <div style={{ background: 'rgba(99, 102, 241, 0.06)', border: '1px solid rgba(99, 102, 241, 0.18)', borderRadius: 10, padding: 14 }}>
                                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 8 }}>
                                        🎯 Executive Summary
                                    </span>
                                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.84rem', color: '#e2e8f0', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        <li>Team approved migration to WebRTC SFU mesh for 4K video feeds.</li>
                                        <li>Security team confirmed SOC2 Type II compliance audit readiness.</li>
                                        <li>Target launch set for Q3 with zero-downtime rolling update schedule.</li>
                                    </ul>
                                </div>

                                <div style={{ display: 'flex', gap: 10 }}>
                                    <div style={{ flex: 1, background: 'rgba(255, 255, 255, 0.03)', borderRadius: 8, padding: 10, border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>Key Sentiment</span>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#38bdf8' }}>96% Positive / Aligned</span>
                                    </div>
                                    <div style={{ flex: 1, background: 'rgba(255, 255, 255, 0.03)', borderRadius: 8, padding: 10, border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>Meeting Efficiency</span>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#4ade80' }}>High (Top 5%)</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeAiTab === 'action' && (
                            <div className="anim-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    Extracted Action Items
                                </span>
                                {[
                                    { text: "Deploy SFU media routing patch to EU cluster", person: "Alex (Infra)", status: "In Progress", due: "Friday" },
                                    { text: "Send enterprise security whitepaper to LinearTech", person: "Sarah (Sales)", status: "Pending", due: "Today" },
                                    { text: "Verify admin audit log export in CSV and JSON", person: "Marcus (Backend)", status: "Done", due: "Yesterday" }
                                ].map((task, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: 8 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ color: task.status === 'Done' ? '#4ade80' : '#818cf8' }}>
                                                {task.status === 'Done' ? '☑' : '☐'}
                                            </span>
                                            <span style={{ fontSize: '0.82rem', color: '#e2e8f0', textDecoration: task.status === 'Done' ? 'line-through' : 'none' }}>
                                                {task.text}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{task.person}</span>
                                            <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: 4, background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc' }}>{task.due}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeAiTab === 'transcript' && (
                            <div className="anim-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f472b6', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    Searchable Smart Transcript
                                </span>
                                {[
                                    { time: "08:14", speaker: "Alex (Host)", text: "Let's ensure zero-packet-loss audio is validated for the upcoming enterprise demo." },
                                    { time: "08:32", speaker: "Sarah Connor", text: "I've uploaded the product slide deck directly to the meeting room's encrypted files tab." },
                                    { time: "09:05", speaker: "Marcus K.", text: "Audio bitrates are automatically scaling down to 24kbps on low-bandwidth mobile devices without drops." }
                                ].map((line, i) => (
                                    <div key={i} style={{ padding: '8px 10px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 6, fontSize: '0.8rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                                            <span style={{ fontSize: '0.7rem', color: '#818cf8', fontWeight: 600 }}>{line.time}</span>
                                            <span style={{ fontSize: '0.75rem', color: '#ffffff', fontWeight: 700 }}>{line.speaker}</span>
                                        </div>
                                        <p style={{ margin: 0, color: '#94a3b8', lineHeight: 1.4 }}>"{line.text}"</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* ── 4. How It Works (3 Simple Steps) ── */}
            <section className="how-it-works-section">
                <div style={{ maxWidth: 1080, margin: '0 auto', textAlign: 'center' }}>
                    <div className="badge badge-accent" style={{ marginBottom: 14, fontSize: '0.74rem', padding: '4px 12px', letterSpacing: '0.04em' }}>
                        ⚡ EFFORTLESS WORKFLOW
                    </div>
                    <h2 style={{ fontSize: 'clamp(1.7rem, 4vw, 2.4rem)', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 14 }}>
                        Start meeting in <span className="gradient-text">3 simple steps</span>
                    </h2>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.94rem', maxWidth: 600, margin: '0 auto' }}>
                        No clunky software installations, no forced signups for guests, and no browser extensions required.
                    </p>

                    <div className="how-steps-grid">
                        <div className="how-step-card">
                            <div className="how-step-number">01</div>
                            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                                Create or Schedule
                            </h3>
                            <p style={{ fontSize: '0.88rem', color: '#94a3b8', margin: 0, lineHeight: 1.6 }}>
                                Click "+ Instant Meet" or create a persistent room for your team. Set optional waiting rooms, passwords, or end-to-end encryption keys.
                            </p>
                            <div style={{ marginTop: 'auto', paddingTop: 8, fontSize: '0.78rem', color: '#818cf8', fontWeight: 600 }}>
                                ⚡ Ready in under 5 seconds
                            </div>
                        </div>

                        <div className="how-step-card">
                            <div className="how-step-number">02</div>
                            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                                Share 1-Click Link
                            </h3>
                            <p style={{ fontSize: '0.88rem', color: '#94a3b8', margin: 0, lineHeight: 1.6 }}>
                                Copy the generated URL and send it to clients, candidates, or teammates. They click and join immediately from Chrome, Safari, or mobile.
                            </p>
                            <div style={{ marginTop: 'auto', paddingTop: 8, fontSize: '0.78rem', color: '#818cf8', fontWeight: 600 }}>
                                🌐 Works across all modern browsers
                            </div>
                        </div>

                        <div className="how-step-card">
                            <div className="how-step-number">03</div>
                            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                                Collaborate with AI
                            </h3>
                            <p style={{ fontSize: '0.88rem', color: '#94a3b8', margin: 0, lineHeight: 1.6 }}>
                                Enjoy high-definition video, low-latency audio, real-time file sharing, screen sharing, and automatic Gemini meeting notes.
                            </p>
                            <div style={{ marginTop: 'auto', paddingTop: 8, fontSize: '0.78rem', color: '#818cf8', fontWeight: 600 }}>
                                ✨ AI intelligence built right in
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Testimonials Section ── */}
            <section style={{ background: 'var(--color-bg-elevated)', padding: 'clamp(48px, 8vw, 80px) clamp(16px, 4vw, 24px)', borderTop: '1px solid var(--color-border)' }}>
                <div style={{ maxWidth: 1040, margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: 'clamp(32px, 5vw, 48px)' }}>
                        <h2 style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2rem)', fontWeight: 800, marginBottom: 12 }}>Trusted by leaders worldwide</h2>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>Hear from teams that upgraded their workflows with JTS Meet.</p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'clamp(14px, 2vw, 20px)' }}>
                        <div className="glass-card" style={{ padding: 'clamp(18px, 3vw, 24px)', background: 'rgba(255,255,255,0.02)' }}>
                            <p style={{ fontSize: '0.875rem', fontStyle: 'italic', marginBottom: 16, lineHeight: 1.6 }}>
                                "The quality of video and audio is exceptional. Transitioning to browser-based, zero-install meetings saved our IT department dozens of hours weekly."
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div className="avatar avatar-md">EH</div>
                                <div>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block' }}>Evelyn Harper</span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>VP of IT, LinearTech</span>
                                </div>
                            </div>
                        </div>

                        <div className="glass-card" style={{ padding: 'clamp(18px, 3vw, 24px)', background: 'rgba(255,255,255,0.02)' }}>
                            <p style={{ fontSize: '0.875rem', fontStyle: 'italic', marginBottom: 16, lineHeight: 1.6 }}>
                                "Security is paramount for our enterprise. With JTS Meet's private key authentication and local processing, we feel fully secure sharing critical slide files."
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div className="avatar avatar-md">MK</div>
                                <div>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block' }}>Marcus Kaelen</span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Security Director, Vercelify</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Pricing Section ── */}
            <section id="pricing" style={{ padding: 'clamp(48px, 8vw, 80px) clamp(16px, 4vw, 24px)', maxWidth: 1040, margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: 'clamp(32px, 5vw, 48px)' }}>
                    <h2 style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2rem)', fontWeight: 800, marginBottom: 12 }}>Simple, transparent pricing.</h2>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>Start for free and scale as your organization grows.</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'clamp(14px, 2vw, 20px)' }}>
                    {/* Plan 1 */}
                    <div className="glass-card" style={{ padding: 'clamp(20px, 3vw, 28px)', display: 'flex', flexDirection: 'column', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Free</span>
                        <div style={{ margin: '12px 0 18px' }}>
                            <span style={{ fontSize: '2.2rem', fontWeight: 800, color: '#fff' }}>$0</span>
                            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}> / month</span>
                        </div>
                        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                            <li style={{ fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: 8 }}><IconCheck /> Up to 10 participants</li>
                            <li style={{ fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: 8 }}><IconCheck /> 40 minutes limit per call</li>
                            <li style={{ fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: 8 }}><IconCheck /> High-definition audio/video</li>
                            <li style={{ fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: 8 }}><IconCheck /> Drag & drop file sharing</li>
                        </ul>
                        <button onClick={() => onNavigate('register')} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '10px 16px' }}>Get Started</button>
                    </div>

                    {/* Plan 2 - Pro (Popular) */}
                    <div className="glass-card" style={{ padding: 'clamp(20px, 3vw, 28px)', display: 'flex', flexDirection: 'column', border: '2px solid var(--color-accent)', boxShadow: 'var(--shadow-glow-accent)', position: 'relative' }}>
                        <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)' }} className="badge badge-accent">POPULAR</div>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pro</span>
                        <div style={{ margin: '12px 0 18px' }}>
                            <span style={{ fontSize: '2.2rem', fontWeight: 800, color: '#fff' }}>$12</span>
                            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}> / user / mo</span>
                        </div>
                        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                            <li style={{ fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: 8 }}><IconCheck /> Up to 100 participants</li>
                            <li style={{ fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: 8 }}><IconCheck /> Unlimited meeting duration</li>
                            <li style={{ fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: 8 }}><IconCheck /> Screen sharing & recording</li>
                            <li style={{ fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: 8 }}><IconCheck /> Advanced file uploading (25MB)</li>
                            <li style={{ fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: 8 }}><IconCheck /> Organization/Team creation</li>
                        </ul>
                        <button onClick={() => onNavigate('register')} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '10px 16px' }}>Upgrade Now</button>
                    </div>

                    {/* Plan 3 */}
                    <div className="glass-card" style={{ padding: 'clamp(20px, 3vw, 28px)', display: 'flex', flexDirection: 'column', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Enterprise</span>
                        <div style={{ margin: '12px 0 18px' }}>
                            <span style={{ fontSize: '2.2rem', fontWeight: 800, color: '#fff' }}>Custom</span>
                        </div>
                        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                            <li style={{ fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: 8 }}><IconCheck /> Unlimited participants</li>
                            <li style={{ fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: 8 }}><IconCheck /> Custom domain hosting</li>
                            <li style={{ fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: 8 }}><IconCheck /> Dedicated support manager</li>
                            <li style={{ fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: 8 }}><IconCheck /> SSO & SAML integrations</li>
                        </ul>
                        <button onClick={() => onNavigate('register')} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '10px 16px' }}>Contact Sales</button>
                    </div>
                </div>
            </section>

            {/* ── FAQ Section ── */}
            <section id="faq" style={{ padding: 'clamp(48px, 8vw, 80px) clamp(16px, 4vw, 24px)', background: 'var(--color-bg-elevated)', borderTop: '1px solid var(--color-border)' }}>
                <div style={{ maxWidth: 800, margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: 'clamp(32px, 5vw, 48px)' }}>
                        <h2 style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2rem)', fontWeight: 800, marginBottom: 12 }}>Frequently Asked Questions</h2>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>Everything you need to know about the platform.</p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {[
                            {
                                q: "Do I need to install any software or app extensions?",
                                a: "No. JTS Meet is built using HTML5 and WebRTC, which means it runs entirely inside any modern web browser on desktop, tablet, and mobile. Just open the link and start."
                            },
                            {
                                q: "How secure is file sharing and communication?",
                                a: "All communication streams are encrypted end-to-end. Uploaded files are securely kept in enterprise cloud storage with authorization headers, and access permissions are validated through our secure backend middleware."
                            },
                            {
                                q: "Can I manage organizations and teams?",
                                a: "Yes! Once authenticated, users can create organizations, invite members, segment them into different teams, and create scoped communication channels with ease."
                            },
                            {
                                q: "Is there a limit on file sharing?",
                                a: "For free accounts, files up to 10MB can be uploaded. Pro and Enterprise accounts support up to 25MB file sizes with broad MIME-type support including images, PDFs, spreadsheets, and zip folders."
                            }
                        ].map((item, index) => (
                            <div key={index} className="glass-card-sm" style={{ padding: '14px 18px', cursor: 'pointer' }} onClick={() => toggleFaq(index)}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{item.q}</span>
                                    <span style={{ fontSize: '1.2rem', color: 'var(--color-text-muted)', transform: faqOpen[index] ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform var(--duration-fast)' }}>+</span>
                                </div>
                                {faqOpen[index] && (
                                    <p style={{ marginTop: 10, fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: '10px 0 0', lineHeight: 1.5 }} className="anim-fade-in">
                                        {item.a}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Enterprise Clean & Professional Footer ── */}
            <footer className="landing-footer">
                <div className="landing-footer-top-accent" />
                <div className="landing-footer-inner">
                    {/* Top Grid: Brand Info + 4 Structured Columns */}
                    <div className="landing-footer-grid">
                        {/* Brand Column */}
                        <div className="landing-footer-brand-col">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                    width: 34,
                                    height: 34,
                                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #4f46e5 100%)',
                                    borderRadius: 8,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 3px 12px rgba(99, 102, 241, 0.45)',
                                    color: '#fff'
                                }}>
                                    <IconVideo />
                                </div>
                                <span style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
                                    JTS<span style={{
                                        background: 'linear-gradient(135deg, #818cf8 0%, #c084fc 100%)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent'
                                    }}>Meet</span>
                                </span>
                                <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    fontSize: '0.64rem',
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: 6,
                                    background: 'rgba(99, 102, 241, 0.12)',
                                    border: '1px solid rgba(99, 102, 241, 0.25)',
                                    color: '#a5b4fc',
                                    letterSpacing: '0.04em',
                                    textTransform: 'uppercase'
                                }}>
                                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                                    Enterprise
                                </span>
                            </div>

                            <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0, lineHeight: 1.6, maxWidth: 360 }}>
                                Next-generation WebRTC video conferencing, end-to-end encrypted messaging, and AI-powered collaboration for high-performing teams worldwide.
                            </p>

                            {/* System Status Pill */}
                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '6px 12px',
                                background: 'rgba(34, 197, 94, 0.08)',
                                border: '1px solid rgba(34, 197, 94, 0.22)',
                                borderRadius: 8,
                                width: 'fit-content'
                            }}>
                                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e', display: 'inline-block' }} />
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#4ade80', letterSpacing: '0.01em' }}>
                                    All Systems Operational
                                </span>
                            </div>

                            {/* Social Icons */}
                            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                                <a href="https://github.com" target="_blank" rel="noreferrer" className="landing-footer-social-btn" aria-label="GitHub">
                                    <IconGithub />
                                </a>
                                <a href="https://twitter.com" target="_blank" rel="noreferrer" className="landing-footer-social-btn" aria-label="Twitter">
                                    <IconTwitter />
                                </a>
                                <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="landing-footer-social-btn" aria-label="LinkedIn">
                                    <IconLinkedin />
                                </a>
                            </div>
                        </div>

                        {/* Column 1: Platform */}
                        <div className="landing-footer-col">
                            <span className="landing-footer-col-title">Platform</span>
                            <a href="#features" className="landing-footer-link">HD Video & Audio</a>
                            <a href="#features" className="landing-footer-link">Screen Sharing</a>
                            <a href="#features" className="landing-footer-link">Cloud Recording</a>
                            <a href="#features" className="landing-footer-link">Virtual Backgrounds</a>
                            <a href="#features" className="landing-footer-link">Interactive Whiteboard</a>
                            <a href="#features" className="landing-footer-link">AI Meeting Summaries</a>
                        </div>

                        {/* Column 2: Security */}
                        <div className="landing-footer-col">
                            <span className="landing-footer-col-title">Security</span>
                            <a href="#security" className="landing-footer-link">E2E Encryption</a>
                            <a href="#security" className="landing-footer-link">Role-Based Access (RBAC)</a>
                            <a href="#security" className="landing-footer-link">Audit & Activity Logs</a>
                            <a href="#security" className="landing-footer-link">GDPR & HIPAA Ready</a>
                            <a href="#security" className="landing-footer-link">SSO & SAML 2.0</a>
                            <a href="#security" className="landing-footer-link">Security Whitepaper</a>
                        </div>

                        {/* Column 3: Solutions */}
                        <div className="landing-footer-col">
                            <span className="landing-footer-col-title">Solutions</span>
                            <a href="#pricing" className="landing-footer-link">Enterprise Organizations</a>
                            <a href="#pricing" className="landing-footer-link">Remote & Hybrid Teams</a>
                            <a href="#pricing" className="landing-footer-link">Education & Universities</a>
                            <a href="#pricing" className="landing-footer-link">Healthcare & Telehealth</a>
                            <a href="#pricing" className="landing-footer-link">Financial Services</a>
                        </div>

                        {/* Column 4: Company & Support */}
                        <div className="landing-footer-col">
                            <span className="landing-footer-col-title">Company</span>
                            <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('login'); }} className="landing-footer-link">Sign In to Portal</a>
                            <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('register'); }} className="landing-footer-link">Get Started Free</a>
                            <a href="#pricing" className="landing-footer-link">Pricing Plans</a>
                            <a href="#faq" className="landing-footer-link">Help Center & FAQ</a>
                            <a href="mailto:support@jtsmeet.com" className="landing-footer-link">Contact Support</a>
                            <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="landing-footer-link">Back to Top ↑</a>
                        </div>
                    </div>

                    {/* Bottom Bar: Copyright & Legal */}
                    <div className="landing-footer-bottom">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                © {new Date().getFullYear()} JTS Meet. All rights reserved.
                            </span>
                            <span style={{ color: 'rgba(255, 255, 255, 0.15)' }}>•</span>
                            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                Powered by WebRTC & AES-256 GCM
                            </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                            <a href="#privacy" onClick={(e) => e.preventDefault()} className="landing-footer-link" style={{ fontSize: '0.8rem' }}>Privacy Policy</a>
                            <a href="#terms" onClick={(e) => e.preventDefault()} className="landing-footer-link" style={{ fontSize: '0.8rem' }}>Terms of Service</a>
                            <a href="#cookies" onClick={(e) => e.preventDefault()} className="landing-footer-link" style={{ fontSize: '0.8rem' }}>Cookie Preferences</a>
                            <a href="#security" className="landing-footer-link" style={{ fontSize: '0.8rem' }}>Security Center</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    )
}
