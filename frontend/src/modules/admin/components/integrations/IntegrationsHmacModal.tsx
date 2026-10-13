import React, { useState } from 'react'
import {
    IconX,
    IconCheck,
    IconCopy
} from '../../../../components/common/Icons'

interface IntegrationsHmacModalProps {
    showHmacModal: boolean
    onClose: () => void
    copyToClipboard: (text: string) => void
}

export const IntegrationsHmacModal: React.FC<IntegrationsHmacModalProps> = ({
    showHmacModal,
    onClose,
    copyToClipboard
}) => {
    const [hmacTab, setHmacTab] = useState<'nodejs' | 'python' | 'curl'>('nodejs')
    const [copiedSnippet, setCopiedSnippet] = useState(false)

    if (!showHmacModal) return null

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(0, 0, 0, 0.78)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
        }}>
            <div style={{
                background: 'linear-gradient(135deg, #111827 0%, #0f172a 100%)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: 20,
                width: '100%',
                maxWidth: 680,
                color: '#fff',
                padding: 26,
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                            🛡️ Webhook HMAC SHA-256 Verification Guide
                        </h3>
                        <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                            Every webhook sent from JTS Meet includes the <code style={{ color: '#a5b4fc' }}>x-jts-signature</code> HTTP header.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                        <IconX size={18} color="#94a3b8" />
                    </button>
                </div>

                {/* Code Language Tabs */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 8 }}>
                    {[
                        { id: 'nodejs', label: 'Node.js (Express)' },
                        { id: 'python', label: 'Python (Flask / FastAPI)' },
                        { id: 'curl', label: 'cURL Signature Test' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setHmacTab(tab.id as any)}
                            style={{
                                padding: '6px 14px',
                                borderRadius: 8,
                                border: 'none',
                                background: hmacTab === tab.id ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
                                color: hmacTab === tab.id ? '#a5b4fc' : '#94a3b8',
                                fontSize: '0.82rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div style={{ position: 'relative' }}>
                    <pre style={{
                        margin: 0,
                        padding: '16px',
                        borderRadius: 10,
                        background: '#0a0f1d',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        color: '#38bdf8',
                        fontSize: '0.82rem',
                        fontFamily: 'Consolas, monospace',
                        overflowX: 'auto',
                        maxHeight: 260,
                        lineHeight: 1.45
                    }}>
                        {hmacTab === 'nodejs' ? (
`const crypto = require('crypto');

// Express Middleware to verify JTS Meet webhooks
function verifyJtsWebhook(req, res, next) {
    const signature = req.headers['x-jts-signature'];
    const secret = process.env.JTS_WEBHOOK_SECRET;

    if (!signature) {
        return res.status(401).json({ error: 'Missing x-jts-signature header' });
    }

    // Compute expected HMAC SHA-256 hash using raw request body
    const expected = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(req.body))
        .digest('hex');

    if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
        return next(); // Webhook is authentic!
    }

    return res.status(403).json({ error: 'Invalid webhook signature' });
}`
                        ) : hmacTab === 'python' ? (
`import hmac
import hashlib
from fastapi import Request, HTTPException

async def verify_jts_signature(request: Request, secret: str):
    signature = request.headers.get("x-jts-signature")
    if not signature:
        raise HTTPException(status_code=401, detail="Missing signature header")

    body_bytes = await request.body()
    expected = hmac.new(
        secret.encode(),
        body_bytes,
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(signature, expected):
        raise HTTPException(status_code=403, detail="Signature mismatch")
    return True`
                        ) : (
`# Test payload validation via cURL
curl -X POST https://yourcompany.com/api/webhooks \\
  -H "Content-Type: application/json" \\
  -H "x-jts-signature: 8f9b23a10e82c7..." \\
  -d '{"event":"meeting.started","id":"evt_9812"}'`
                        )}
                    </pre>

                    <button
                        onClick={() => {
                            const snippet = hmacTab === 'nodejs' 
                                ? "const crypto = require('crypto');\nfunction verifyJtsWebhook(req, res, next) {\n  const signature = req.headers['x-jts-signature'];\n  const expected = crypto.createHmac('sha256', process.env.JTS_WEBHOOK_SECRET).update(JSON.stringify(req.body)).digest('hex');\n  if (signature === expected) return next();\n  return res.status(403).json({ error: 'Invalid signature' });\n}"
                                : "import hmac, hashlib\n# verify x-jts-signature header"
                            copyToClipboard(snippet)
                            setCopiedSnippet(true)
                            setTimeout(() => setCopiedSnippet(false), 2000)
                        }}
                        style={{
                            position: 'absolute',
                            top: 10,
                            right: 10,
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: 6,
                            padding: '4px 10px',
                            color: copiedSnippet ? '#4ade80' : '#fff',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5
                        }}
                    >
                        {copiedSnippet ? <IconCheck size={12} color="#4ade80" /> : <IconCopy size={12} color="#fff" />}
                        <span>{copiedSnippet ? 'Copied Snippet' : 'Copy'}</span>
                    </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '8px 18px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: 8,
                            color: '#fff',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        Close Guide
                    </button>
                </div>
            </div>
        </div>
    )
}
