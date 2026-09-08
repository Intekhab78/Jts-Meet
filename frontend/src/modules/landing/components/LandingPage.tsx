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

interface LandingPageProps {
    onNavigate: (view: 'login' | 'register' | 'forgot-password' | 'reset-password' | 'email-verification' | 'otp-verification' | 'app') => void
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
    const [faqOpen, setFaqOpen] = useState<Record<number, boolean>>({})
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    const toggleFaq = (index: number) => {
        setFaqOpen(prev => ({ ...prev, [index]: !prev[index] }))
    }

    return (
        <div style={{ minHeight: '100dvh', background: 'var(--color-bg-base)', overflowX: 'hidden' }}>
            {/* ── Navigation ── */}
            <nav className="px-4 md:px-6" style={{
                position: 'fixed', top: 0, left: 0, right: 0, height: 64,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'rgba(10,11,15,0.85)',
                backdropFilter: 'blur(20px) saturate(1.5)', WebkitBackdropFilter: 'blur(20px) saturate(1.5)',
                borderBottom: '1px solid var(--color-border)', zIndex: 100
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 34, height: 34, background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                        borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: 'var(--shadow-glow-accent)', color: '#fff'
                    }}>
                        <IconVideo />
                    </div>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--color-text-primary)' }}>
                        JTS<span className="gradient-text">Meet</span>
                    </span>
                </div>

                {/* Desktop Nav Links */}
                <div className="hidden md:flex" style={{ gap: 28, alignItems: 'center' }}>
                    <a href="#features" style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-secondary)', transition: 'color var(--duration-fast)' }} className="hover:text-white">Features</a>
                    <a href="#pricing" style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-secondary)', transition: 'color var(--duration-fast)' }} className="hover:text-white">Pricing</a>
                    <a href="#faq" style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-secondary)', transition: 'color var(--duration-fast)' }} className="hover:text-white">FAQ</a>
                </div>

                {/* Desktop Action Buttons */}
                <div className="hidden sm:flex" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button onClick={() => onNavigate('login')} className="btn btn-ghost px-3 py-1.5 text-sm">
                        Sign In
                    </button>
                    <button onClick={() => onNavigate('register')} className="btn btn-primary px-4 py-1.5 text-sm" style={{ borderRadius: 'var(--radius-md)' }}>
                        Sign Up
                    </button>
                </div>

                {/* Mobile Menu Toggle Button */}
                <div className="flex sm:hidden" style={{ alignItems: 'center', gap: 6 }}>
                    <button
                        onClick={() => onNavigate('login')}
                        className="btn btn-ghost"
                        style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                    >
                        Sign In
                    </button>
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        aria-label="Toggle navigation menu"
                        style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '6px 8px',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            cursor: 'pointer'
                        }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                    className="sm:hidden anim-fade-in"
                    style={{
                        position: 'fixed', top: 64, left: 0, right: 0,
                        background: 'rgba(12, 14, 20, 0.98)',
                        backdropFilter: 'blur(20px)',
                        borderBottom: '1px solid var(--color-border)',
                        padding: '16px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 14,
                        zIndex: 99
                    }}
                >
                    <a
                        href="#features"
                        onClick={() => setMobileMenuOpen(false)}
                        style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', fontWeight: 500, padding: '4px 0' }}
                    >
                        Features
                    </a>
                    <a
                        href="#pricing"
                        onClick={() => setMobileMenuOpen(false)}
                        style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', fontWeight: 500, padding: '4px 0' }}
                    >
                        Pricing
                    </a>
                    <a
                        href="#faq"
                        onClick={() => setMobileMenuOpen(false)}
                        style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', fontWeight: 500, padding: '4px 0' }}
                    >
                        FAQ
                    </a>
                    <div style={{ display: 'flex', gap: 10, paddingTop: 8, borderTop: '1px solid var(--color-border)' }}>
                        <button
                            onClick={() => { setMobileMenuOpen(false); onNavigate('login') }}
                            className="btn btn-secondary"
                            style={{ flex: 1, justifyContent: 'center', fontSize: '0.875rem', padding: '10px 14px' }}
                        >
                            Sign In
                        </button>
                        <button
                            onClick={() => { setMobileMenuOpen(false); onNavigate('register') }}
                            className="btn btn-primary"
                            style={{ flex: 1, justifyContent: 'center', fontSize: '0.875rem', padding: '10px 14px' }}
                        >
                            Sign Up
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
                    <div className="glass-card" style={{ padding: 'clamp(20px, 3vw, 26px)', display: 'flex', flexDirection: 'column', gap: 12, transition: 'transform var(--duration-normal)', cursor: 'default' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
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

            {/* ── Footer ── */}
            <footer style={{ borderTop: '1px solid var(--color-border)', padding: 'clamp(36px, 6vw, 48px) clamp(16px, 4vw, 24px) 28px', background: 'var(--color-bg-base)' }}>
                <div style={{ maxWidth: 1040, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 28 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 24 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 300 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{
                                    width: 26, height: 26, background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                    borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#fff'
                                }}>
                                    <IconVideo />
                                </div>
                                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>JTS<span className="gradient-text">Meet</span></span>
                            </div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
                                Professional-grade glassmorphic video conferencing for high-performing remote teams.
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: 'clamp(24px, 5vw, 48px)', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Product</span>
                                <a href="#features" style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }} className="hover:text-white">Features</a>
                                <a href="#pricing" style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }} className="hover:text-white">Pricing</a>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Company</span>
                                <a href="#" style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }} className="hover:text-white">About</a>
                                <a href="#" style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }} className="hover:text-white">Security</a>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 18, gap: 12 }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>&copy; 2026 JTS Meet. All rights reserved.</span>
                        <div style={{ display: 'flex', gap: 14 }}>
                            <a href="#" style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }} className="hover:text-white">Privacy Policy</a>
                            <a href="#" style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }} className="hover:text-white">Terms of Service</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    )
}
