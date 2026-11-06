import React, { useState } from 'react'
import {
    IconX,
    IconCheck,
    IconCopy,
    IconZap,
    IconVideo
} from '../../../../components/common/Icons'
import { API_BASE } from '../../../../config'

interface IntegrationsQuickKitModalProps {
    show: boolean
    onClose: () => void
    inboundUrl: string
    secretToken: string
}

export const IntegrationsQuickKitModal: React.FC<IntegrationsQuickKitModalProps> = ({
    show,
    onClose,
    inboundUrl,
    secretToken
}) => {
    const [activeTab, setActiveTab] = useState<'tester' | 'snippets' | 'embed'>('tester')
    const [snippetLang, setSnippetLang] = useState<'js' | 'curl' | 'php' | 'python'>('js')
    
    // Live Tester State
    const [testRoomTitle, setTestRoomTitle] = useState('Customer Support Consultation')
    const [testHostName, setTestHostName] = useState('Dr. / Support Agent')
    const [isTesting, setIsTesting] = useState(false)
    const [testResult, setTestResult] = useState<any>(null)
    const [copiedSnippet, setCopiedSnippet] = useState(false)

    if (!show) return null

    const runLiveRoomCreationTest = async () => {
        setIsTesting(true)
        setTestResult(null)
        const start = Date.now()

        try {
            const res = await fetch(`${API_BASE}/api/integrations/webhook`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${secretToken}`
                },
                body: JSON.stringify({
                    action: 'create_room',
                    title: testRoomTitle,
                    hostName: testHostName
                })
            })

            const durationMs = Date.now() - start
            const data = await res.json()

            if (res.ok && data.success) {
                const roomData = { ...data.room }
                if (typeof window !== 'undefined' && roomData.joinUrl) {
                    // Normalize backend port 4000 to current browser host (e.g. localhost:3000)
                    roomData.joinUrl = roomData.joinUrl.replace(/localhost:4000/g, window.location.host)
                }
                setTestResult({
                    success: true,
                    statusCode: res.status,
                    durationMs,
                    room: roomData
                })
            } else {
                setTestResult({
                    success: false,
                    statusCode: res.status,
                    durationMs,
                    error: data.error || 'Server rejected room creation'
                })
            }
        } catch (err: any) {
            setTestResult({
                success: false,
                statusCode: 502,
                durationMs: Date.now() - start,
                error: err.message || 'Network connection failed'
            })
        } finally {
            setIsTesting(false)
        }
    }

    const copyCode = (text: string) => {
        navigator.clipboard.writeText(text)
        setCopiedSnippet(true)
        setTimeout(() => setCopiedSnippet(false), 2000)
    }

    const jsSnippet = `// 1. Call JTS Meet Room Creation API from your frontend or Node.js backend
async function startVideoMeeting() {
  const response = await fetch('${inboundUrl}', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ${secretToken}'
    },
    body: JSON.stringify({
      action: 'create_room',
      title: 'Client Support Call',
      hostName: 'Support Agent'
    })
  });

  const result = await response.json();
  if (result.success && result.room?.joinUrl) {
    // Open the meeting room in a new browser tab or iframe
    window.open(result.room.joinUrl, '_blank');
  }
}`

    const curlSnippet = `curl -X POST "${inboundUrl}" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${secretToken}" \\
  -d '{
    "action": "create_room",
    "title": "Client Support Consultation",
    "hostName": "Support Executive"
  }'`

    const phpSnippet = `<?php
// Call JTS Meet API from PHP / WordPress backend
$url = "${inboundUrl}";
$token = "${secretToken}";

$payload = json_encode([
    "action" => "create_room",
    "title" => "Patient / Client Video Consultation",
    "hostName" => "Executive"
]);

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Content-Type: application/json",
    "Authorization: Bearer " . $token
]);

$response = curl_exec($ch);
$result = json_decode($response, true);
curl_close($ch);

if (!empty($result['success'])) {
    $joinUrl = $result['room']['joinUrl'];
    echo "Video room ready: " . $joinUrl;
}
?>`

    const pythonSnippet = `import requests

url = "${inboundUrl}"
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer ${secretToken}"
}

payload = {
    "action": "create_room",
    "title": "Enterprise Client Strategy",
    "hostName": "Manager"
}

response = requests.post(url, json=payload, headers=headers)
data = response.json()

if data.get("success"):
    print("Video Room URL:", data["room"]["joinUrl"])`

    const embedHtmlSnippet = `<!-- JTS Meet Floating Instant Video Call Widget -->
<!-- Paste anywhere in your website HTML, WordPress, Shopify, or Webflow -->
<div id="jts-meet-widget" style="position: fixed; bottom: 24px; right: 24px; z-index: 999999; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <button 
    id="jts-meet-btn" 
    onclick="launchJtsVideoCall()" 
    onmouseenter="expandJtsBtn(true)" 
    onmouseleave="expandJtsBtn(false)" 
    title="Start Video Call"
    style="display: inline-flex; align-items: center; justify-content: center; height: 52px; min-width: 52px; padding: 0 14px; border-radius: 26px; background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); color: #ffffff; border: none; cursor: pointer; box-shadow: 0 8px 24px rgba(37, 99, 235, 0.45); transition: all 0.28s cubic-bezier(0.16, 1, 0.3, 1); outline: none; overflow: hidden;"
  >
    <!-- Crisp Vector SVG Video Camera Icon -->
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;">
      <path d="M23 7l-7 5 7 5V7z"></path>
      <rect x="1" y="5" width="15" height="14" rx="3" ry="3"></rect>
    </svg>
    <!-- Sleek Compact Text (Revealed on Hover) -->
    <span 
      id="jts-meet-text" 
      style="max-width: 0px; opacity: 0; margin-left: 0px; white-space: nowrap; overflow: hidden; transition: all 0.28s ease; font-size: 13px; font-weight: 600; letter-spacing: 0.2px;"
    >
      Start Video Call
    </span>
  </button>
</div>

<script>
function expandJtsBtn(expand) {
  const btn = document.getElementById('jts-meet-btn');
  const text = document.getElementById('jts-meet-text');
  if (!text || btn.dataset.loading === 'true') return;
  if (expand) {
    text.style.maxWidth = '140px';
    text.style.opacity = '1';
    text.style.marginLeft = '8px';
  } else {
    text.style.maxWidth = '0px';
    text.style.opacity = '0';
    text.style.marginLeft = '0px';
  }
}

async function launchJtsVideoCall() {
  const btn = document.getElementById('jts-meet-btn');
  const text = document.getElementById('jts-meet-text');
  btn.dataset.loading = 'true';
  text.innerText = 'Connecting...';
  text.style.maxWidth = '140px';
  text.style.opacity = '1';
  text.style.marginLeft = '8px';

  try {
    const res = await fetch('${inboundUrl}', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Website Video Consultation' })
    });
    const json = await res.json();
    if (json.room?.joinUrl) {
      window.open(json.room.joinUrl, '_blank');
    } else {
      alert('Could not start video call: Server did not return a valid room.');
    }
  } catch (e) {
    alert('Unable to launch video room. Please verify connection.');
  } finally {
    btn.dataset.loading = 'false';
    text.innerText = 'Start Video Call';
    expandJtsBtn(false);
  }
}
</script>`

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed',
                top: '57px',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 99999,
                background: 'rgba(0, 0, 0, 0.78)',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                padding: '1px 16px 20px 16px',
                overflowY: 'auto'
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: 'linear-gradient(135deg, #111827 0%, #0f172a 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: 20,
                    width: '100%',
                    maxWidth: 760,
                    maxHeight: 'calc(100vh - 57px - 24px)',
                    display: 'flex',
                    flexDirection: 'column',
                    color: '#fff',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
                    margin: '1px auto 20px auto',
                    overflow: 'hidden',
                    position: 'relative'
                }}
            >
                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '18px 24px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    flexShrink: 0
                }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: '1.25rem' }}>🚀</span>
                            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                                Universal Website Integration Kit & Tester
                            </h3>
                        </div>
                        <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                            Connect any website, customer portal, or custom app to JTS Meet in 2 minutes.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        title="Close"
                        style={{
                            background: 'rgba(255, 255, 255, 0.06)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: 8,
                            width: 32,
                            height: 32,
                            color: '#94a3b8',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        <IconX size={16} color="#94a3b8" />
                    </button>
                </div>

                {/* Navigation Tabs */}
                <div style={{
                    display: 'flex',
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    padding: '0 24px'
                }}>
                    <button
                        onClick={() => setActiveTab('tester')}
                        style={{
                            padding: '12px 18px',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: activeTab === 'tester' ? '2px solid #3b82f6' : '2px solid transparent',
                            color: activeTab === 'tester' ? '#fff' : '#94a3b8',
                            fontWeight: 700,
                            fontSize: '0.84rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                        }}
                    >
                        <span>🧪 Live In-Browser Tester</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('snippets')}
                        style={{
                            padding: '12px 18px',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: activeTab === 'snippets' ? '2px solid #3b82f6' : '2px solid transparent',
                            color: activeTab === 'snippets' ? '#fff' : '#94a3b8',
                            fontWeight: 700,
                            fontSize: '0.84rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                        }}
                    >
                        <span>💻 Code Snippets (API)</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('embed')}
                        style={{
                            padding: '12px 18px',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: activeTab === 'embed' ? '2px solid #3b82f6' : '2px solid transparent',
                            color: activeTab === 'embed' ? '#fff' : '#94a3b8',
                            fontWeight: 700,
                            fontSize: '0.84rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                        }}
                    >
                        <span>🌐 1-Click Embed HTML Button</span>
                    </button>
                </div>

                {/* Tab Content Body */}
                <div style={{
                    padding: '20px 24px 24px',
                    overflowY: 'auto',
                    flex: 1
                }}>
                    {/* TAB 1: LIVE TESTER */}
                    {activeTab === 'tester' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div style={{
                                padding: '12px 16px',
                                background: 'rgba(59, 130, 246, 0.1)',
                                border: '1px solid rgba(59, 130, 246, 0.25)',
                                borderRadius: 10,
                                fontSize: '0.82rem',
                                color: '#93c5fd',
                                lineHeight: 1.45
                            }}>
                                <strong>Interactive End-to-End Test:</strong> Test creating a real JTS Meet video conference room right here. When you click the button below, JTS Meet's room creation API is executed in real-time and provides a live joinable room URL.
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>
                                        Meeting Room Title:
                                    </label>
                                    <input
                                        type="text"
                                        value={testRoomTitle}
                                        onChange={(e) => setTestRoomTitle(e.target.value)}
                                        style={{
                                            width: '100%',
                                            boxSizing: 'border-box',
                                            padding: '8px 12px',
                                            borderRadius: 8,
                                            background: 'rgba(0,0,0,0.4)',
                                            border: '1px solid rgba(255,255,255,0.12)',
                                            color: '#fff',
                                            fontSize: '0.84rem'
                                        }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>
                                        Host / Agent Display Name:
                                    </label>
                                    <input
                                        type="text"
                                        value={testHostName}
                                        onChange={(e) => setTestHostName(e.target.value)}
                                        style={{
                                            width: '100%',
                                            boxSizing: 'border-box',
                                            padding: '8px 12px',
                                            borderRadius: 8,
                                            background: 'rgba(0,0,0,0.4)',
                                            border: '1px solid rgba(255,255,255,0.12)',
                                            color: '#fff',
                                            fontSize: '0.84rem'
                                        }}
                                    />
                                </div>
                            </div>

                            <button
                                onClick={runLiveRoomCreationTest}
                                disabled={isTesting}
                                style={{
                                    padding: '10px 20px',
                                    background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
                                    border: 'none',
                                    borderRadius: 10,
                                    color: '#fff',
                                    fontWeight: 700,
                                    fontSize: '0.88rem',
                                    cursor: isTesting ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8,
                                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)'
                                }}
                            >
                                <IconZap size={15} color="#fff" />
                                <span>{isTesting ? 'Calling JTS Meet API...' : '⚡ Test Room Creation API Now'}</span>
                            </button>

                            {/* Live Test Result Box */}
                            {testResult && (
                                <div style={{
                                    padding: '16px 18px',
                                    borderRadius: 12,
                                    background: testResult.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                    border: `1px solid ${testResult.success ? 'rgba(34, 197, 94, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 12
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ fontSize: '1.2rem' }}>{testResult.success ? '✅' : '❌'}</span>
                                            <span style={{ fontWeight: 800, color: testResult.success ? '#4ade80' : '#f87171', fontSize: '0.92rem' }}>
                                                {testResult.success ? 'HTTP 200 OK — Room Created Successfully!' : 'Test Failed'}
                                            </span>
                                        </div>
                                        <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                                            Roundtrip Latency: {testResult.durationMs}ms
                                        </span>
                                    </div>

                                    {testResult.success && testResult.room && (
                                        <div style={{
                                            background: 'rgba(0,0,0,0.3)',
                                            padding: 12,
                                            borderRadius: 8,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 8
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Room ID: <code style={{ color: '#fff' }}>{testResult.room.id}</code></span>
                                                <button
                                                    onClick={() => copyCode(testResult.room.joinUrl)}
                                                    style={{
                                                        padding: '4px 10px',
                                                        background: copiedSnippet ? '#16a34a' : 'rgba(255,255,255,0.08)',
                                                        border: 'none',
                                                        borderRadius: 6,
                                                        color: '#fff',
                                                        fontSize: '0.72rem',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    {copiedSnippet ? 'Copied Link!' : 'Copy Room Link'}
                                                </button>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <code style={{
                                                    flex: 1,
                                                    fontSize: '0.8rem',
                                                    color: '#38bdf8',
                                                    background: 'rgba(0,0,0,0.4)',
                                                    padding: '6px 10px',
                                                    borderRadius: 6,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {testResult.room.joinUrl}
                                                </code>
                                                <a
                                                    href={testResult.room.joinUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        padding: '6px 14px',
                                                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                        borderRadius: 6,
                                                        color: '#fff',
                                                        fontWeight: 700,
                                                        fontSize: '0.78rem',
                                                        textDecoration: 'none',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 6
                                                    }}
                                                >
                                                    <IconVideo size={14} color="#fff" />
                                                    <span>Open Test Room ↗</span>
                                                </a>
                                            </div>
                                        </div>
                                    )}

                                    {!testResult.success && (
                                        <p style={{ margin: 0, fontSize: '0.82rem', color: '#f87171' }}>
                                            Error: {testResult.error}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 2: CODE SNIPPETS */}
                    {activeTab === 'snippets' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    {[
                                        { id: 'js', label: 'JavaScript / Node.js' },
                                        { id: 'curl', label: 'cURL / Postman' },
                                        { id: 'php', label: 'PHP / WordPress' },
                                        { id: 'python', label: 'Python' }
                                    ].map(lang => (
                                        <button
                                            key={lang.id}
                                            onClick={() => setSnippetLang(lang.id as any)}
                                            style={{
                                                padding: '5px 12px',
                                                background: snippetLang === lang.id ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                                                border: snippetLang === lang.id ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.1)',
                                                borderRadius: 6,
                                                color: snippetLang === lang.id ? '#fff' : '#94a3b8',
                                                fontSize: '0.76rem',
                                                fontWeight: 600,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {lang.label}
                                        </button>
                                    ))}
                                </div>

                                <button
                                    onClick={() => copyCode(
                                        snippetLang === 'js' ? jsSnippet :
                                        snippetLang === 'curl' ? curlSnippet :
                                        snippetLang === 'php' ? phpSnippet : pythonSnippet
                                    )}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: copiedSnippet ? '#4ade80' : '#818cf8',
                                        fontSize: '0.78rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 5
                                    }}
                                >
                                    {copiedSnippet ? <IconCheck size={14} color="#4ade80" /> : <IconCopy size={14} color="#818cf8" />}
                                    <span>{copiedSnippet ? 'Copied!' : 'Copy Code'}</span>
                                </button>
                            </div>

                            <pre style={{
                                margin: 0,
                                padding: '14px 18px',
                                borderRadius: 10,
                                background: '#0a0f1d',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                color: '#38bdf8',
                                fontSize: '0.8rem',
                                fontFamily: 'Consolas, monospace',
                                overflowX: 'auto',
                                maxHeight: 280,
                                lineHeight: 1.45
                            }}>
                                {snippetLang === 'js' ? jsSnippet :
                                 snippetLang === 'curl' ? curlSnippet :
                                 snippetLang === 'php' ? phpSnippet : pythonSnippet}
                            </pre>
                        </div>
                    )}

                    {/* TAB 3: EMBED HTML BUTTON */}
                    {activeTab === 'embed' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div style={{
                                padding: '12px 16px',
                                background: 'rgba(99, 102, 241, 0.1)',
                                border: '1px solid rgba(99, 102, 241, 0.25)',
                                borderRadius: 10,
                                fontSize: '0.82rem',
                                color: '#a5b4fc',
                                lineHeight: 1.45
                            }}>
                                <strong>Zero-Code Website Embed:</strong> Copy and paste this single HTML & JavaScript snippet into your website, WordPress page, Webflow, or Shopify theme. It creates an instant video meeting call button with zero backend setup!
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                                    Ready-to-Paste HTML Widget
                                </span>
                                <button
                                    onClick={() => copyCode(embedHtmlSnippet)}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: copiedSnippet ? '#4ade80' : '#818cf8',
                                        fontSize: '0.78rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 5
                                    }}
                                >
                                    {copiedSnippet ? <IconCheck size={14} color="#4ade80" /> : <IconCopy size={14} color="#818cf8" />}
                                    <span>{copiedSnippet ? 'Copied HTML!' : 'Copy HTML'}</span>
                                </button>
                            </div>

                            <pre style={{
                                margin: 0,
                                padding: '14px 18px',
                                borderRadius: 10,
                                background: '#0a0f1d',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                color: '#38bdf8',
                                fontSize: '0.8rem',
                                fontFamily: 'Consolas, monospace',
                                overflowX: 'auto',
                                maxHeight: 280,
                                lineHeight: 1.45
                            }}>
                                {embedHtmlSnippet}
                            </pre>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

