import React, { useState } from 'react'

interface MeetingTrendsChartProps {
    meetings: any[]
}

export function MeetingTrendsChart({ meetings }: MeetingTrendsChartProps) {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

    // Compute last 7 days (including today)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date()
        d.setDate(d.getDate() - (6 - i))
        return d
    })

    const chartData = last7Days.map((date) => {
        const dateStr = date.toLocaleDateString()
        const count = meetings.filter(m => {
            const meetingDate = m.date || new Date(m.createdAt).toLocaleDateString()
            return meetingDate === dateStr
        }).length

        return {
            label: date.toLocaleDateString([], { weekday: 'short' }),
            fullDate: dateStr,
            value: count
        }
    })

    const values = chartData.map(d => d.value)
    const maxVal = Math.max(...values, 4) // minimum height scale of 4 to prevent flat line

    // SVG coordinates setup
    const svgWidth = 600
    const svgHeight = 180
    const paddingLeft = 40
    const paddingRight = 20
    const paddingTop = 25
    const paddingBottom = 30

    const chartWidth = svgWidth - paddingLeft - paddingRight
    const chartHeight = svgHeight - paddingTop - paddingBottom

    const points = chartData.map((d, i) => {
        const x = paddingLeft + (i * (chartWidth / 6))
        const y = (svgHeight - paddingBottom) - ((d.value / maxVal) * chartHeight)
        return { x, y, label: d.label, fullDate: d.fullDate, value: d.value }
    })

    // Construct SVG Line and Area path strings
    let linePath = ''
    let areaPath = ''
    points.forEach((p, idx) => {
        if (idx === 0) {
            linePath += `M ${p.x} ${p.y}`
            areaPath += `M ${p.x} ${svgHeight - paddingBottom} L ${p.x} ${p.y}`
        } else {
            linePath += ` L ${p.x} ${p.y}`
            areaPath += ` L ${p.x} ${p.y}`
        }
        if (idx === points.length - 1) {
            areaPath += ` L ${p.x} ${svgHeight - paddingBottom} Z`
        }
    })

    return (
        <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 4px', color: '#fff' }}>Weekly Call Volume</h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>Active video conferences conducted daily</p>
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-accent)', display: 'inline-block' }} />
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Sessions</span>
                    </div>
                </div>
            </div>

            <div style={{ position: 'relative', width: '100%', overflowX: 'auto' }}>
                <svg
                    viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                    width="100%"
                    height="100%"
                    style={{ overflow: 'visible', display: 'block' }}
                >
                    <defs>
                        <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.00" />
                        </linearGradient>
                    </defs>

                    {/* Dotted Grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                        const y = paddingTop + (ratio * chartHeight)
                        return (
                            <line
                                key={idx}
                                x1={paddingLeft}
                                y1={y}
                                x2={svgWidth - paddingRight}
                                y2={y}
                                stroke="rgba(255,255,255,0.04)"
                                strokeDasharray="3,3"
                                strokeWidth="1"
                            />
                        )
                    })}

                    {/* Area path */}
                    {points.length > 0 && (
                        <path
                            d={areaPath}
                            fill="url(#chart-area-grad)"
                            style={{ transition: 'all 0.3s ease' }}
                        />
                    )}

                    {/* Line path */}
                    {points.length > 0 && (
                        <path
                            d={linePath}
                            fill="none"
                            stroke="var(--color-accent)"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ transition: 'all 0.3s ease' }}
                        />
                    )}

                    {/* interactive hover columns */}
                    {points.map((p, idx) => (
                        <rect
                            key={idx}
                            x={p.x - 20}
                            y={paddingTop}
                            width="40"
                            height={chartHeight}
                            fill="transparent"
                            style={{ cursor: 'pointer' }}
                            onMouseEnter={() => setHoveredIndex(idx)}
                            onMouseLeave={() => setHoveredIndex(null)}
                        />
                    ))}

                    {/* Interactive dots */}
                    {points.map((p, idx) => {
                        const isHovered = hoveredIndex === idx
                        return (
                            <g key={idx} style={{ pointerEvents: 'none' }}>
                                <circle
                                    cx={p.x}
                                    cy={p.y}
                                    r={isHovered ? 6 : 4}
                                    fill={isHovered ? '#fff' : 'var(--color-accent)'}
                                    stroke={isHovered ? 'var(--color-accent)' : 'rgba(255,255,255,0.1)'}
                                    strokeWidth={isHovered ? 3 : 1.5}
                                    style={{
                                        transition: 'r 0.15s ease, fill 0.15s ease, stroke-width 0.15s ease',
                                        willChange: 'r'
                                    }}
                                />
                            </g>
                        )
                    })}

                    {/* Axis Labels */}
                    {points.map((p, idx) => (
                        <text
                            key={idx}
                            x={p.x}
                            y={svgHeight - 10}
                            textAnchor="middle"
                            fill="var(--color-text-muted)"
                            style={{ fontSize: '0.6875rem', fontFamily: 'var(--font-sans)', fontWeight: 500 }}
                        >
                            {p.label}
                        </text>
                    ))}
                </svg>

                {/* Tooltip Overlay */}
                {hoveredIndex !== null && (
                    <div style={{
                        position: 'absolute',
                        top: 8,
                        left: `${(points[hoveredIndex].x / svgWidth) * 100}%`,
                        transform: 'translateX(-50%)',
                        background: 'rgba(15, 17, 24, 0.95)',
                        border: '1px solid var(--color-border-strong)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '8px 12px',
                        boxShadow: 'var(--shadow-lg)',
                        pointerEvents: 'none',
                        zIndex: 10,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        minWidth: 100,
                        animation: 'jts-fade-in 150ms var(--ease-out) both'
                    }}>
                        <span style={{ fontSize: '0.625rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>{points[hoveredIndex].fullDate}</span>
                        <span style={{ fontSize: '0.8125rem', color: '#fff', fontWeight: 800 }}>{points[hoveredIndex].value} {points[hoveredIndex].value === 1 ? 'Session' : 'Sessions'}</span>
                    </div>
                )}
            </div>
        </div>
    )
}
