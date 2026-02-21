import React, { useState, useEffect, useRef } from 'react'
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    Dot
} from 'recharts'
import { motion } from 'framer-motion'
import { FaClock, FaChartLine, FaInfoCircle } from 'react-icons/fa'

const OptimizationChart = ({ history, executionTime, isDark }) => {
    const [hoveredPoint, setHoveredPoint] = useState(null)
    const [visibleCount, setVisibleCount] = useState(0)
    const animFrameRef = useRef(null)
    const prevHistoryRef = useRef(null)

    if (!history || history.length === 0) return null

    const initialLL = history[0].logLikelihood
    const finalLL = history[history.length - 1].logLikelihood
    const improvement = ((finalLL - initialLL) / Math.abs(initialLL) * 100).toFixed(1)
    const iterations = history.length

    // Calculate trend
    const allData = history.map((h, idx) => ({
        ...h,
        iter: idx + 1,
        trend: idx > 0 ? h.logLikelihood - history[idx - 1].logLikelihood : 0
    }))

    // Progressive reveal animation – replay whenever history changes
    const historyKey = history.map(h => h.logLikelihood).join(',')
    useEffect(() => {
        setVisibleCount(1)
        const total = history.length
        // Aim for ~1.5s total animation, min 30ms per point, max 150ms
        const delay = Math.max(30, Math.min(150, 1500 / total))
        let count = 1
        const timer = setInterval(() => {
            count++
            setVisibleCount(count)
            if (count >= total) clearInterval(timer)
        }, delay)
        return () => clearInterval(timer)
    }, [historyKey])

    const data = allData.slice(0, visibleCount)

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const value = payload[0].value
            const prevValue = label > 1 ? history[label - 2]?.logLikelihood : value
            const change = label > 1 ? ((value - prevValue) / Math.abs(prevValue) * 100).toFixed(3) : 0

            return (
                <div style={{
                    background: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                    border: `1px solid ${isDark ? '#6366f1' : '#e2e8f0'}`,
                    padding: '12px',
                    borderRadius: '12px',
                    color: isDark ? '#e2e8f0' : '#1e293b',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                    backdropFilter: 'blur(10px)',
                    minWidth: '180px'
                }}>
                    <div style={{
                        fontWeight: 700,
                        marginBottom: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: 'var(--primary)'
                    }}>
                        <FaChartLine size={14} />
                        Iteration {label}
                    </div>
                    <div style={{ marginBottom: '4px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Log-Likelihood: </span>
                        <span style={{ fontWeight: 700, color: 'var(--success)' }}>
                            {Number(value).toFixed(4)}
                        </span>
                    </div>
                    {label > 1 && (
                        <div style={{ fontSize: '0.85em' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Δ Change: </span>
                            <span style={{
                                color: change > 0 ? 'var(--success)' : 'var(--error)',
                                fontWeight: 600
                            }}>
                                {change > 0 ? '+' : ''}{change}%
                            </span>
                        </div>
                    )}
                </div>
            )
        }
        return null
    }

    const CustomDot = (props) => {
        const { cx, cy, payload, index } = props
        const isHovered = hoveredPoint === index
        const isMax = payload.logLikelihood === finalLL

        if (!isHovered && !isMax && index % Math.ceil(history.length / 10) !== 0) return null

        return (
            <Dot
                cx={cx}
                cy={cy}
                r={isHovered ? 6 : isMax ? 5 : 3}
                fill={isMax ? '#ec4899' : isHovered ? '#10b981' : '#6366f1'}
                stroke={isDark ? '#0f172a' : '#fff'}
                strokeWidth={2}
                onMouseEnter={() => setHoveredPoint(index)}
                onMouseLeave={() => setHoveredPoint(null)}
                style={{ cursor: 'pointer' }}
            />
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            style={{
                background: isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(255, 255, 255, 0.6)',
                backdropFilter: 'blur(20px)',
                borderRadius: '20px',
                padding: '24px',
                marginTop: '24px',
                border: '1px solid var(--border-glass)',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
        >
            {/* Header Stats */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '20px',
                flexWrap: 'wrap',
                gap: '12px'
            }}>
                <div>
                    <h3 style={{
                        margin: 0,
                        color: 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '1.25rem'
                    }}>
                        <FaChartLine color="var(--primary)" />
                        Optimization Convergence
                    </h3>
                    <p style={{
                        margin: '4px 0 0 0',
                        color: 'var(--text-muted)',
                        fontSize: '0.9rem'
                    }}>
                        Baum-Welch algorithm convergence over {iterations} iterations
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{
                        background: 'rgba(99, 102, 241, 0.1)',
                        color: 'var(--primary)',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}>
                        <FaClock size={12} />
                        {(executionTime * 1000).toFixed(1)}ms
                    </div>
                    <div style={{
                        background: improvement > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: improvement > 0 ? 'var(--success)' : 'var(--error)',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: 600
                    }}>
                        {improvement > 0 ? '+' : ''}{improvement}% improvement
                    </div>
                    <div style={{
                        background: 'rgba(236, 72, 153, 0.1)',
                        color: 'var(--secondary)',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: 600
                    }}>
                        Final: {finalLL.toFixed(2)}
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer>
                    <AreaChart
                        data={data}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        onMouseMove={(e) => {
                            if (e.activeTooltipIndex !== undefined) {
                                setHoveredPoint(e.activeTooltipIndex)
                            }
                        }}
                        onMouseLeave={() => setHoveredPoint(null)}
                    >
                        <defs>
                            <linearGradient id="colorLL" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorLLDark" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#34d399" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke={isDark ? '#334155' : '#e2e8f0'}
                            vertical={false}
                        />
                        <XAxis
                            dataKey="iter"
                            stroke={isDark ? '#64748b' : '#94a3b8'}
                            tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }}
                            axisLine={{ stroke: isDark ? '#475569' : '#cbd5e1' }}
                            tickLine={false}
                            label={{
                                value: 'Iteration',
                                position: 'insideBottomRight',
                                offset: -10,
                                fill: isDark ? '#94a3b8' : '#64748b',
                                fontSize: 12
                            }}
                        />
                        <YAxis
                            domain={[
                                Math.min(...allData.map(d => d.logLikelihood)) - Math.abs(finalLL - initialLL) * 0.05,
                                Math.max(...allData.map(d => d.logLikelihood)) + Math.abs(finalLL - initialLL) * 0.05
                            ]}
                            stroke={isDark ? '#64748b' : '#94a3b8'}
                            tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(value) => value.toFixed(0)}
                            label={{
                                value: 'Log-Likelihood',
                                angle: -90,
                                position: 'insideLeft',
                                fill: isDark ? '#94a3b8' : '#64748b',
                                fontSize: 12
                            }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <ReferenceLine
                            y={finalLL}
                            stroke="#ec4899"
                            strokeDasharray="5 5"
                            label={{
                                value: 'Converged',
                                position: 'right',
                                fill: '#ec4899',
                                fontSize: 12
                            }}
                        />
                        <Area
                            type="monotone"
                            dataKey="logLikelihood"
                            stroke="#10b981"
                            strokeWidth={3}
                            fill={`url(#colorLL${isDark ? 'Dark' : ''})`}
                            isAnimationActive={false}
                            dot={<CustomDot />}
                            activeDot={{ r: 8, strokeWidth: 0, fill: '#10b981' }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            <div style={{
                marginTop: '16px',
                padding: '12px',
                background: isDark ? 'rgba(15, 23, 42, 0.5)' : 'rgba(248, 250, 252, 0.8)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.85rem',
                color: 'var(--text-muted)'
            }}>
                <FaInfoCircle size={14} />
                <span>
                    The curve shows log-likelihood maximization. Steeper slopes indicate rapid learning phases.
                    Hover over points to see iteration details.
                </span>
            </div>
        </motion.div>
    )
}

export default OptimizationChart