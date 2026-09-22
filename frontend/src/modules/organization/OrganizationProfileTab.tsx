import React, { useState, useEffect } from 'react'
import type { Organization, UpdateOrganizationPayload } from './organization.types'
import { updateOrganization } from './organization.service'
import {
    IconBuilding,
    IconGlobe,
    IconShield,
    IconCheck,
    IconCopy,
    IconVideo,
    IconLock,
    IconAlertTriangle
} from '../../components/common/Icons'

interface OrganizationProfileTabProps {
    organization: Organization
    token: string
    onOrganizationUpdated: (updated: Organization) => void
}

const INDUSTRY_OPTIONS = [
    'Technology & Software',
    'Banking, Finance & Fintech',
    'Healthcare & Life Sciences',
    'Education & E-Learning',
    'Consulting & Professional Services',
    'Government & Public Sector',
    'Manufacturing & Industrial',
    'Media, Entertainment & Gaming',
    'Retail & E-Commerce',
    'Telecommunications',
    'Real Estate & Construction',
    'Non-Profit & NGO',
    'Legal Services',
    'Other Enterprise'
]

const COMPANY_SIZE_OPTIONS = [
    '1 - 10 Employees (Startup)',
    '11 - 50 Employees (Small Business)',
    '51 - 200 Employees (Mid-Market)',
    '201 - 500 Employees (Commercial)',
    '501 - 1,000 Employees (Enterprise)',
    '1,000+ Employees (Global Enterprise)'
]

const TIMEZONE_OPTIONS = [
    { label: 'Asia/Kolkata (IST, UTC +5:30)', value: 'Asia/Kolkata' },
    { label: 'Asia/Dubai (GST, UTC +4:00)', value: 'Asia/Dubai' },
    { label: 'Asia/Riyadh (AST, UTC +3:00)', value: 'Asia/Riyadh' },
    { label: 'Asia/Singapore (SGT, UTC +8:00)', value: 'Asia/Singapore' },
    { label: 'Asia/Tokyo (JST, UTC +9:00)', value: 'Asia/Tokyo' },
    { label: 'Europe/London (GMT/BST, UTC +0/+1)', value: 'Europe/London' },
    { label: 'Europe/Berlin / Paris (CET, UTC +1/+2)', value: 'Europe/Berlin' },
    { label: 'America/New_York (EST/EDT, UTC -5/-4)', value: 'America/New_York' },
    { label: 'America/Chicago (CST/CDT, UTC -6/-5)', value: 'America/Chicago' },
    { label: 'America/Los_Angeles (PST/PDT, UTC -8/-7)', value: 'America/Los_Angeles' },
    { label: 'UTC (Universal Coordinated Time)', value: 'UTC' },
    { label: 'Australia/Sydney (AEST, UTC +10/+11)', value: 'Australia/Sydney' }
]

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function OrganizationProfileTab({
    organization,
    token,
    onOrganizationUpdated
}: OrganizationProfileTabProps) {
    const [saving, setSaving] = useState(false)
    const [successMessage, setSuccessMessage] = useState('')
    const [errorMessage, setErrorMessage] = useState('')
    const [activeSection, setActiveSection] = useState<'profile' | 'regional' | 'policies' | 'recording' | 'retention'>('profile')
    const [copiedSlug, setCopiedSlug] = useState(false)

    // Form States
    const [name, setName] = useState(organization.name || '')
    const [logo, setLogo] = useState(organization.logo || '')
    const [description, setDescription] = useState(organization.description || '')
    const [website, setWebsite] = useState(organization.website || '')
    const [supportEmail, setSupportEmail] = useState(organization.supportEmail || '')
    const [billingContactEmail, setBillingContactEmail] = useState(organization.billingContactEmail || '')
    const [industry, setIndustry] = useState(organization.industry || 'Technology & Software')
    const [companySize, setCompanySize] = useState(organization.companySize || '11 - 50 Employees (Small Business)')
    const [headquarters, setHeadquarters] = useState(organization.headquarters || '')
    const [country, setCountry] = useState(organization.country || 'India')

    // Regional & Localization
    const [timezone, setTimezone] = useState(organization.timezone || 'Asia/Kolkata')
    const [locale, setLocale] = useState(organization.locale || 'en-US')
    const [workingDays, setWorkingDays] = useState<string[]>(organization.workingDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])
    const [workingHoursStart, setWorkingHoursStart] = useState(organization.workingHoursStart || '09:00')
    const [workingHoursEnd, setWorkingHoursEnd] = useState(organization.workingHoursEnd || '18:00')
    const [dateFormat, setDateFormat] = useState(organization.dateFormat || 'DD/MM/YYYY')
    const [timeFormat, setTimeFormat] = useState(organization.timeFormat || '12h')

    // Enterprise Meeting Policies (Teams style)
    const [lobbyPolicy, setLobbyPolicy] = useState(organization.lobbyPolicy || 'guests_only')
    const [allowGuestAccess, setAllowGuestAccess] = useState(organization.allowGuestAccess !== false)
    const [recordingPolicy, setRecordingPolicy] = useState(organization.recordingPolicy || 'host_only')
    const [e2eeEnabledByDefault, setE2eeEnabledByDefault] = useState(!!organization.e2eeEnabledByDefault)
    const [watermarkingEnabled, setWatermarkingEnabled] = useState(!!organization.watermarkingEnabled)
    const [aiSummaryPolicy, setAiSummaryPolicy] = useState(organization.aiSummaryPolicy || 'host_controlled')
    const [cloudRetentionDays, setCloudRetentionDays] = useState(organization.cloudRetentionDays || 90)
    const [fileRetentionDays, setFileRetentionDays] = useState(organization.fileRetentionDays || 365)
    const [allowExternalSharing, setAllowExternalSharing] = useState(organization.allowExternalSharing !== false)
    const [requireMeetingPasscode, setRequireMeetingPasscode] = useState(!!organization.requireMeetingPasscode)

    useEffect(() => {
        setName(organization.name || '')
        setLogo(organization.logo || '')
        setDescription(organization.description || '')
        setWebsite(organization.website || '')
        setSupportEmail(organization.supportEmail || '')
        setBillingContactEmail(organization.billingContactEmail || '')
        setIndustry(organization.industry || 'Technology & Software')
        setCompanySize(organization.companySize || '11 - 50 Employees (Small Business)')
        setHeadquarters(organization.headquarters || '')
        setCountry(organization.country || 'India')
        setTimezone(organization.timezone || 'Asia/Kolkata')
        setLocale(organization.locale || 'en-US')
        setWorkingDays(organization.workingDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])
        setWorkingHoursStart(organization.workingHoursStart || '09:00')
        setWorkingHoursEnd(organization.workingHoursEnd || '18:00')
        setDateFormat(organization.dateFormat || 'DD/MM/YYYY')
        setTimeFormat(organization.timeFormat || '12h')
        setLobbyPolicy(organization.lobbyPolicy || 'guests_only')
        setAllowGuestAccess(organization.allowGuestAccess !== false)
        setRecordingPolicy(organization.recordingPolicy || 'host_only')
        setE2eeEnabledByDefault(!!organization.e2eeEnabledByDefault)
        setWatermarkingEnabled(!!organization.watermarkingEnabled)
        setAiSummaryPolicy(organization.aiSummaryPolicy || 'host_controlled')
        setCloudRetentionDays(organization.cloudRetentionDays || 90)
        setFileRetentionDays(organization.fileRetentionDays || 365)
        setAllowExternalSharing(organization.allowExternalSharing !== false)
        setRequireMeetingPasscode(!!organization.requireMeetingPasscode)
    }, [organization])

    const toggleWorkingDay = (day: string) => {
        if (workingDays.includes(day)) {
            if (workingDays.length > 1) {
                setWorkingDays(workingDays.filter(d => d !== day))
            }
        } else {
            setWorkingDays([...workingDays, day])
        }
    }

    const handleCopySlug = () => {
        const url = `${window.location.origin}/org/${organization.slug}`
        navigator.clipboard.writeText(url)
        setCopiedSlug(true)
        setTimeout(() => setCopiedSlug(false), 2000)
    }

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        setSaving(true)
        setErrorMessage('')
        setSuccessMessage('')

        try {
            const payload: UpdateOrganizationPayload = {
                name,
                logo,
                description,
                website,
                supportEmail,
                billingContactEmail,
                industry,
                companySize,
                headquarters,
                country,
                timezone,
                locale,
                workingDays,
                workingHoursStart,
                workingHoursEnd,
                dateFormat,
                timeFormat,
                lobbyPolicy,
                allowGuestAccess,
                recordingPolicy,
                e2eeEnabledByDefault,
                watermarkingEnabled,
                aiSummaryPolicy,
                cloudRetentionDays,
                fileRetentionDays,
                allowExternalSharing,
                requireMeetingPasscode
            }

            const updated = await updateOrganization(organization._id, payload, token)
            onOrganizationUpdated(updated)
            setSuccessMessage('Organization profile and enterprise workspace policies saved successfully!')
            setTimeout(() => setSuccessMessage(''), 4000)
        } catch (err: any) {
            setErrorMessage(err?.message || 'Failed to update organization settings')
        } finally {
            setSaving(false)
        }
    }

    const orgInitials = (name || organization.name || 'ORG')
        .split(' ')
        .map(w => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Enterprise Header Identity Card */}
            <div
                className="glass-card"
                style={{
                    padding: '22px 24px',
                    borderRadius: 14,
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    background: 'linear-gradient(135deg, rgba(30, 30, 45, 0.7) 0%, rgba(20, 20, 32, 0.9) 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    {logo ? (
                        <img
                            src={logo}
                            alt={name}
                            style={{
                                width: 56,
                                height: 56,
                                borderRadius: 12,
                                objectFit: 'cover',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                background: 'rgba(255, 255, 255, 0.05)'
                            }}
                            onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none'
                            }}
                        />
                    ) : (
                        <div
                            style={{
                                width: 56,
                                height: 56,
                                borderRadius: 12,
                                background: 'linear-gradient(135deg, #6366F1 0%, #a855f7 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.25rem',
                                fontWeight: 700,
                                color: '#fff',
                                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)'
                            }}
                        >
                            {orgInitials}
                        </div>
                    )}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                                {name || organization.name}
                            </h2>
                            <span
                                style={{
                                    fontSize: '0.6875rem',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    padding: '2px 8px',
                                    borderRadius: 999,
                                    background: organization.planTier === 'enterprise'
                                        ? 'rgba(168, 85, 247, 0.2)'
                                        : 'rgba(99, 102, 241, 0.2)',
                                    color: organization.planTier === 'enterprise' ? '#c084fc' : '#818cf8',
                                    border: `1px solid ${organization.planTier === 'enterprise' ? 'rgba(168, 85, 247, 0.35)' : 'rgba(99, 102, 241, 0.35)'}`
                                }}
                            >
                                {organization.planTier || 'Enterprise Standard'}
                            </span>
                        </div>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>Workspace Slug:</span>
                            <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: 4, color: '#e4e4e7', fontSize: '0.75rem' }}>
                                /{organization.slug}
                            </code>
                            <button
                                type="button"
                                onClick={handleCopySlug}
                                title="Copy Workspace URL"
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: copiedSlug ? '#4ade80' : 'var(--color-text-muted)',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    padding: 2
                                }}
                            >
                                {copiedSlug ? <IconCheck size={14} /> : <IconCopy size={14} />}
                            </button>
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                        type="button"
                        onClick={() => handleSave()}
                        disabled={saving}
                        className="btn btn-primary"
                        style={{
                            height: 38,
                            padding: '0 20px',
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            borderRadius: 8,
                            cursor: 'pointer',
                            background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                            border: 'none',
                            color: '#fff',
                            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                        }}
                    >
                        {saving ? (
                            <>
                                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{ width: 14, height: 14 }} />
                                Saving...
                            </>
                        ) : (
                            <>
                                <IconCheck size={16} />
                                Save All Settings
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Notification Banners */}
            {successMessage && (
                <div
                    style={{
                        padding: '12px 16px',
                        borderRadius: 8,
                        background: 'rgba(34, 197, 94, 0.15)',
                        border: '1px solid rgba(34, 197, 94, 0.3)',
                        color: '#4ade80',
                        fontSize: '0.8125rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8
                    }}
                >
                    <IconCheck size={16} color="#4ade80" />
                    <span>{successMessage}</span>
                </div>
            )}

            {errorMessage && (
                <div
                    style={{
                        padding: '12px 16px',
                        borderRadius: 8,
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#f87171',
                        fontSize: '0.8125rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8
                    }}
                >
                    <IconAlertTriangle size={16} color="#f87171" />
                    <span>{errorMessage}</span>
                </div>
            )}

            {/* Sub-Section Navigation Pills (Inline Single Row) */}
            <div
                style={{
                    display: 'flex',
                    flexWrap: 'nowrap',
                    alignItems: 'center',
                    gap: 8,
                    overflowX: 'auto',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    paddingBottom: 12,
                    WebkitOverflowScrolling: 'touch'
                }}
            >
                {[
                    { id: 'profile', label: 'Company Profile & Branding', icon: <IconBuilding size={15} /> },
                    { id: 'regional', label: 'Regional & Schedule', icon: <IconGlobe size={15} /> },
                    { id: 'policies', label: 'Meeting Governance', icon: <IconShield size={15} /> },
                    { id: 'recording', label: 'Recording & AI Policies', icon: <IconVideo size={15} /> },
                    { id: 'retention', label: 'Retention & Compliance', icon: <IconLock size={15} /> }
                ].map(tab => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveSection(tab.id as any)}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 7,
                            padding: '7px 13px',
                            borderRadius: 8,
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                            cursor: 'pointer',
                            border: activeSection === tab.id
                                ? '1px solid rgba(99, 102, 241, 0.55)'
                                : '1px solid rgba(255, 255, 255, 0.08)',
                            background: activeSection === tab.id
                                ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.22) 0%, rgba(79, 70, 229, 0.18) 100%)'
                                : 'rgba(255, 255, 255, 0.03)',
                            color: activeSection === tab.id ? '#a5b4fc' : 'var(--color-text-secondary)',
                            boxShadow: activeSection === tab.id ? '0 2px 8px rgba(99, 102, 241, 0.25)' : 'none',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        {tab.icon}
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Section 1: Company Profile & Branding */}
            {activeSection === 'profile' && (
                <div className="glass-card" style={{ padding: '22px 24px', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 18 }}>
                    <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', margin: 0 }}>Company Profile & Brand Identity</h3>
                        <p style={{ fontSize: '0.78125rem', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
                            Configure your corporate branding, contact channels, industry classification, and public workspace metadata.
                        </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Organization Legal Name *</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                placeholder="e.g. Acme Corporation"
                                style={inputStyle}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Company Logo URL</label>
                            <input
                                type="url"
                                value={logo}
                                onChange={(e) => setLogo(e.target.value)}
                                placeholder="https://yourcompany.com/logo.png"
                                style={inputStyle}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Corporate Website</label>
                            <input
                                type="url"
                                value={website}
                                onChange={(e) => setWebsite(e.target.value)}
                                placeholder="https://acmecorp.com"
                                style={inputStyle}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Support & Helpdesk Email</label>
                            <input
                                type="email"
                                value={supportEmail}
                                onChange={(e) => setSupportEmail(e.target.value)}
                                placeholder="support@acmecorp.com"
                                style={inputStyle}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Finance / Billing Contact Email</label>
                            <input
                                type="email"
                                value={billingContactEmail}
                                onChange={(e) => setBillingContactEmail(e.target.value)}
                                placeholder="finance@acmecorp.com"
                                style={inputStyle}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Industry Vertical</label>
                            <select
                                value={industry}
                                onChange={(e) => setIndustry(e.target.value)}
                                style={selectStyle}
                            >
                                {INDUSTRY_OPTIONS.map(opt => (
                                    <option key={opt} value={opt} style={{ background: '#18181b', color: '#fff' }}>{opt}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Company Size</label>
                            <select
                                value={companySize}
                                onChange={(e) => setCompanySize(e.target.value)}
                                style={selectStyle}
                            >
                                {COMPANY_SIZE_OPTIONS.map(opt => (
                                    <option key={opt} value={opt} style={{ background: '#18181b', color: '#fff' }}>{opt}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Headquarters Location</label>
                            <input
                                type="text"
                                value={headquarters}
                                onChange={(e) => setHeadquarters(e.target.value)}
                                placeholder="e.g. Dubai Silicon Oasis / Cyber City, Gurugram"
                                style={inputStyle}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Country of Operation</label>
                            <input
                                type="text"
                                value={country}
                                onChange={(e) => setCountry(e.target.value)}
                                placeholder="e.g. India, UAE, United States"
                                style={inputStyle}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Company Description & Public Bio</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            placeholder="Provide a concise summary of your enterprise mission, team functions, and public directory bio..."
                            style={{ ...inputStyle, resize: 'vertical' }}
                        />
                    </div>
                </div>
            )}

            {/* Section 2: Regional & Work Schedule */}
            {activeSection === 'regional' && (
                <div className="glass-card" style={{ padding: '22px 24px', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 18 }}>
                    <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', margin: 0 }}>Regional Localization & Business Schedule</h3>
                        <p style={{ fontSize: '0.78125rem', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
                            Specify your organization's primary timezone, operating business days, and time formats for automated calendar scheduling.
                        </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Default Organization Timezone</label>
                            <select
                                value={timezone}
                                onChange={(e) => setTimezone(e.target.value)}
                                style={selectStyle}
                            >
                                {TIMEZONE_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value} style={{ background: '#18181b', color: '#fff' }}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Primary Display Language / Locale</label>
                            <select
                                value={locale}
                                onChange={(e) => setLocale(e.target.value)}
                                style={selectStyle}
                            >
                                <option value="en-US" style={{ background: '#18181b', color: '#fff' }}>English (US)</option>
                                <option value="en-GB" style={{ background: '#18181b', color: '#fff' }}>English (UK)</option>
                                <option value="hi-IN" style={{ background: '#18181b', color: '#fff' }}>Hindi (हिन्दी)</option>
                                <option value="ar-AE" style={{ background: '#18181b', color: '#fff' }}>Arabic (العربية)</option>
                                <option value="es-ES" style={{ background: '#18181b', color: '#fff' }}>Spanish (Español)</option>
                                <option value="fr-FR" style={{ background: '#18181b', color: '#fff' }}>French (Français)</option>
                                <option value="de-DE" style={{ background: '#18181b', color: '#fff' }}>German (Deutsch)</option>
                                <option value="ja-JP" style={{ background: '#18181b', color: '#fff' }}>Japanese (日本語)</option>
                            </select>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Preferred Date Format</label>
                            <select
                                value={dateFormat}
                                onChange={(e) => setDateFormat(e.target.value)}
                                style={selectStyle}
                            >
                                <option value="DD/MM/YYYY" style={{ background: '#18181b', color: '#fff' }}>DD/MM/YYYY (e.g. 21/09/2026)</option>
                                <option value="MM/DD/YYYY" style={{ background: '#18181b', color: '#fff' }}>MM/DD/YYYY (e.g. 09/21/2026)</option>
                                <option value="YYYY-MM-DD" style={{ background: '#18181b', color: '#fff' }}>YYYY-MM-DD (ISO 8601)</option>
                            </select>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Time Display Format</label>
                            <select
                                value={timeFormat}
                                onChange={(e) => setTimeFormat(e.target.value)}
                                style={selectStyle}
                            >
                                <option value="12h" style={{ background: '#18181b', color: '#fff' }}>12-Hour Clock (e.g. 02:30 PM)</option>
                                <option value="24h" style={{ background: '#18181b', color: '#fff' }}>24-Hour Clock (e.g. 14:30)</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                            Standard Business Working Days
                        </label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {ALL_DAYS.map(day => {
                                const isSelected = workingDays.includes(day)
                                return (
                                    <button
                                        key={day}
                                        type="button"
                                        onClick={() => toggleWorkingDay(day)}
                                        style={{
                                            padding: '7px 16px',
                                            borderRadius: 8,
                                            fontSize: '0.8125rem',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            border: isSelected ? '1px solid #6366F1' : '1px solid rgba(255,255,255,0.1)',
                                            background: isSelected ? 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)' : 'rgba(255,255,255,0.03)',
                                            color: isSelected ? '#fff' : 'var(--color-text-secondary)',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        {day}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Working Hours Start</label>
                            <input
                                type="time"
                                value={workingHoursStart}
                                onChange={(e) => setWorkingHoursStart(e.target.value)}
                                style={inputStyle}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Working Hours End</label>
                            <input
                                type="time"
                                value={workingHoursEnd}
                                onChange={(e) => setWorkingHoursEnd(e.target.value)}
                                style={inputStyle}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Section 3: Teams Meeting Governance & Security */}
            {activeSection === 'policies' && (
                <div className="glass-card" style={{ padding: '22px 24px', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', margin: 0 }}>Microsoft Teams-Style Meeting Governance</h3>
                        <p style={{ fontSize: '0.78125rem', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
                            Enforce enterprise-wide security policies, waiting room rules, guest participant access, and encryption standards.
                        </p>
                    </div>

                    {/* Policy Card 1: Lobby / Waiting Room */}
                    <div style={policyRowStyle}>
                        <div>
                            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff', margin: 0 }}>Meeting Lobby & Waiting Room Policy</h4>
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                                Control who can directly join meetings versus who waits in the lobby for host approval.
                            </p>
                        </div>
                        <select
                            value={lobbyPolicy}
                            onChange={(e) => setLobbyPolicy(e.target.value)}
                            style={{ ...selectStyle, maxWidth: 260 }}
                        >
                            <option value="guests_only" style={{ background: '#18181b', color: '#fff' }}>Guests & External Only (Recommended)</option>
                            <option value="everyone" style={{ background: '#18181b', color: '#fff' }}>Everyone Waits in Lobby</option>
                            <option value="disabled" style={{ background: '#18181b', color: '#fff' }}>Disabled (Direct Admittance)</option>
                        </select>
                    </div>

                    {/* Policy Card 2: Allow Guest Access */}
                    <div style={policyRowStyle}>
                        <div>
                            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff', margin: 0 }}>Allow External / Guest Access</h4>
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                                Allow external callers and anonymous guests outside your organization to join conference links.
                            </p>
                        </div>
                        <label className="toggle-switch" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                            <input
                                type="checkbox"
                                checked={allowGuestAccess}
                                onChange={(e) => setAllowGuestAccess(e.target.checked)}
                                style={{ display: 'none' }}
                            />
                            <div
                                style={{
                                    width: 44,
                                    height: 24,
                                    borderRadius: 12,
                                    background: allowGuestAccess ? '#6366F1' : 'rgba(255,255,255,0.15)',
                                    position: 'relative',
                                    transition: 'background 0.2s ease'
                                }}
                            >
                                <div
                                    style={{
                                        width: 18,
                                        height: 18,
                                        borderRadius: '50%',
                                        background: '#fff',
                                        position: 'absolute',
                                        top: 3,
                                        left: allowGuestAccess ? 23 : 3,
                                        transition: 'left 0.2s ease'
                                    }}
                                />
                            </div>
                        </label>
                    </div>

                    {/* Policy Card 3: Room Passcode Enforcement */}
                    <div style={policyRowStyle}>
                        <div>
                            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff', margin: 0 }}>Enforce Mandatory Meeting Passcodes</h4>
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                                Require all newly generated meetings to have an encrypted alphanumeric passcode or 6-digit PIN.
                            </p>
                        </div>
                        <label className="toggle-switch" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                            <input
                                type="checkbox"
                                checked={requireMeetingPasscode}
                                onChange={(e) => setRequireMeetingPasscode(e.target.checked)}
                                style={{ display: 'none' }}
                            />
                            <div
                                style={{
                                    width: 44,
                                    height: 24,
                                    borderRadius: 12,
                                    background: requireMeetingPasscode ? '#6366F1' : 'rgba(255,255,255,0.15)',
                                    position: 'relative',
                                    transition: 'background 0.2s ease'
                                }}
                            >
                                <div
                                    style={{
                                        width: 18,
                                        height: 18,
                                        borderRadius: '50%',
                                        background: '#fff',
                                        position: 'absolute',
                                        top: 3,
                                        left: requireMeetingPasscode ? 23 : 3,
                                        transition: 'left 0.2s ease'
                                    }}
                                />
                            </div>
                        </label>
                    </div>

                    {/* Policy Card 4: End-to-End Encryption (E2EE) */}
                    <div style={policyRowStyle}>
                        <div>
                            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff', margin: 0 }}>Default End-to-End Encryption (E2EE)</h4>
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                                Enforce AES-GCM 256-bit client-side media encryption on all peer-to-peer room connections.
                            </p>
                        </div>
                        <label className="toggle-switch" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                            <input
                                type="checkbox"
                                checked={e2eeEnabledByDefault}
                                onChange={(e) => setE2eeEnabledByDefault(e.target.checked)}
                                style={{ display: 'none' }}
                            />
                            <div
                                style={{
                                    width: 44,
                                    height: 24,
                                    borderRadius: 12,
                                    background: e2eeEnabledByDefault ? '#6366F1' : 'rgba(255,255,255,0.15)',
                                    position: 'relative',
                                    transition: 'background 0.2s ease'
                                }}
                            >
                                <div
                                    style={{
                                        width: 18,
                                        height: 18,
                                        borderRadius: '50%',
                                        background: '#fff',
                                        position: 'absolute',
                                        top: 3,
                                        left: e2eeEnabledByDefault ? 23 : 3,
                                        transition: 'left 0.2s ease'
                                    }}
                                />
                            </div>
                        </label>
                    </div>

                    {/* Policy Card 5: Dynamic Video Watermarking */}
                    <div style={policyRowStyle}>
                        <div>
                            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff', margin: 0 }}>Dynamic Video & Screen Watermarking</h4>
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                                Superimpose attendee email address watermark over shared screens and videos to deter leaks.
                            </p>
                        </div>
                        <label className="toggle-switch" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                            <input
                                type="checkbox"
                                checked={watermarkingEnabled}
                                onChange={(e) => setWatermarkingEnabled(e.target.checked)}
                                style={{ display: 'none' }}
                            />
                            <div
                                style={{
                                    width: 44,
                                    height: 24,
                                    borderRadius: 12,
                                    background: watermarkingEnabled ? '#6366F1' : 'rgba(255,255,255,0.15)',
                                    position: 'relative',
                                    transition: 'background 0.2s ease'
                                }}
                            >
                                <div
                                    style={{
                                        width: 18,
                                        height: 18,
                                        borderRadius: '50%',
                                        background: '#fff',
                                        position: 'absolute',
                                        top: 3,
                                        left: watermarkingEnabled ? 23 : 3,
                                        transition: 'left 0.2s ease'
                                    }}
                                />
                            </div>
                        </label>
                    </div>
                </div>
            )}

            {/* Section 4: Recording & AI Governance */}
            {activeSection === 'recording' && (
                <div className="glass-card" style={{ padding: '22px 24px', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', margin: 0 }}>Cloud Recording & Gemini AI Governance</h3>
                        <p style={{ fontSize: '0.78125rem', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
                            Configure automated cloud recording behaviors and Google Gemini AI summarization policies.
                        </p>
                    </div>

                    <div style={policyRowStyle}>
                        <div>
                            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff', margin: 0 }}>Meeting Recording Permission</h4>
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                                Specify who can trigger video recordings and whether recording initiates automatically.
                            </p>
                        </div>
                        <select
                            value={recordingPolicy}
                            onChange={(e) => setRecordingPolicy(e.target.value)}
                            style={{ ...selectStyle, maxWidth: 280 }}
                        >
                            <option value="host_only" style={{ background: '#18181b', color: '#fff' }}>Host & Co-Host Permission Only</option>
                            <option value="automatic" style={{ background: '#18181b', color: '#fff' }}>Auto-Record All Meetings on Start</option>
                            <option value="disabled" style={{ background: '#18181b', color: '#fff' }}>Disabled Org-Wide (Restricted)</option>
                        </select>
                    </div>

                    <div style={policyRowStyle}>
                        <div>
                            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff', margin: 0 }}>AI Meeting Summaries & Action Items</h4>
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                                Powered by Google Gemini Multi-Model Intelligence engine with failover ladders.
                            </p>
                        </div>
                        <select
                            value={aiSummaryPolicy}
                            onChange={(e) => setAiSummaryPolicy(e.target.value)}
                            style={{ ...selectStyle, maxWidth: 280 }}
                        >
                            <option value="host_controlled" style={{ background: '#18181b', color: '#fff' }}>Host Discretion / On-Demand</option>
                            <option value="auto" style={{ background: '#18181b', color: '#fff' }}>Auto-Generate Summary on Meeting End</option>
                            <option value="disabled" style={{ background: '#18181b', color: '#fff' }}>Disabled (No AI Processing)</option>
                        </select>
                    </div>
                </div>
            )}

            {/* Section 5: Data Retention & Compliance */}
            {activeSection === 'retention' && (
                <div className="glass-card" style={{ padding: '22px 24px', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', margin: 0 }}>Data Retention & Enterprise Compliance</h3>
                        <p style={{ fontSize: '0.78125rem', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
                            Automate lifecycle purge schedules for cloud recordings, chat attachments, and external file sharing rules.
                        </p>
                    </div>

                    <div style={policyRowStyle}>
                        <div>
                            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff', margin: 0 }}>Cloud Recording Storage Retention</h4>
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                                Recordings older than this limit are automatically pruned to save storage quota.
                            </p>
                        </div>
                        <select
                            value={cloudRetentionDays}
                            onChange={(e) => setCloudRetentionDays(Number(e.target.value))}
                            style={{ ...selectStyle, maxWidth: 240 }}
                        >
                            <option value={30} style={{ background: '#18181b', color: '#fff' }}>30 Days</option>
                            <option value={60} style={{ background: '#18181b', color: '#fff' }}>60 Days</option>
                            <option value={90} style={{ background: '#18181b', color: '#fff' }}>90 Days (Default)</option>
                            <option value={180} style={{ background: '#18181b', color: '#fff' }}>180 Days (6 Months)</option>
                            <option value={365} style={{ background: '#18181b', color: '#fff' }}>365 Days (1 Year)</option>
                            <option value={0} style={{ background: '#18181b', color: '#fff' }}>Never (Permanent Retention)</option>
                        </select>
                    </div>

                    <div style={policyRowStyle}>
                        <div>
                            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff', margin: 0 }}>Channel & Chat File Retention</h4>
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                                Retain chat files and uploaded whiteboard snapshots in cloud storage.
                            </p>
                        </div>
                        <select
                            value={fileRetentionDays}
                            onChange={(e) => setFileRetentionDays(Number(e.target.value))}
                            style={{ ...selectStyle, maxWidth: 240 }}
                        >
                            <option value={30} style={{ background: '#18181b', color: '#fff' }}>30 Days</option>
                            <option value={90} style={{ background: '#18181b', color: '#fff' }}>90 Days</option>
                            <option value={180} style={{ background: '#18181b', color: '#fff' }}>180 Days</option>
                            <option value={365} style={{ background: '#18181b', color: '#fff' }}>365 Days (1 Year)</option>
                            <option value={0} style={{ background: '#18181b', color: '#fff' }}>Never (Indefinite)</option>
                        </select>
                    </div>

                    <div style={policyRowStyle}>
                        <div>
                            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff', margin: 0 }}>Allow External File Sharing</h4>
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                                Allow team members to share chat file attachments with guest participants during calls.
                            </p>
                        </div>
                        <label className="toggle-switch" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                            <input
                                type="checkbox"
                                checked={allowExternalSharing}
                                onChange={(e) => setAllowExternalSharing(e.target.checked)}
                                style={{ display: 'none' }}
                            />
                            <div
                                style={{
                                    width: 44,
                                    height: 24,
                                    borderRadius: 12,
                                    background: allowExternalSharing ? '#6366F1' : 'rgba(255,255,255,0.15)',
                                    position: 'relative',
                                    transition: 'background 0.2s ease'
                                }}
                            >
                                <div
                                    style={{
                                        width: 18,
                                        height: 18,
                                        borderRadius: '50%',
                                        background: '#fff',
                                        position: 'absolute',
                                        top: 3,
                                        left: allowExternalSharing ? 23 : 3,
                                        transition: 'left 0.2s ease'
                                    }}
                                />
                            </div>
                        </label>
                    </div>
                </div>
            )}

            {/* Bottom Save Action Bar */}
            <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 10, marginTop: 6 }}>
                <button
                    type="button"
                    onClick={() => handleSave()}
                    disabled={saving}
                    className="btn btn-primary"
                    style={{
                        height: 40,
                        padding: '0 24px',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        borderRadius: 8,
                        cursor: 'pointer',
                        background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                        border: 'none',
                        color: '#fff',
                        boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8
                    }}
                >
                    {saving ? 'Saving Changes...' : 'Save All Changes'}
                </button>
            </div>
        </div>
    )
}

const inputStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: '9px 12px',
    fontSize: '0.8125rem',
    color: '#fff',
    outline: 'none',
    width: '100%',
    transition: 'border-color 0.15s ease'
}

const selectStyle: React.CSSProperties = {
    background: 'rgba(20, 20, 30, 0.95)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: 8,
    padding: '9px 12px',
    fontSize: '0.8125rem',
    color: '#fff',
    outline: 'none',
    width: '100%',
    cursor: 'pointer'
}

const policyRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    padding: '14px 16px',
    borderRadius: 10,
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.05)'
}
