import React, { useEffect, useRef, useState } from 'react';

const LandingPage = ({ onStart }) => {
    const matrixCanvasRef = useRef(null);
    const particlesRef = useRef(null);
    const stateCanvasRef = useRef(null);
    const glassPanelRef = useRef(null);
    const [miniState, setMiniState] = useState(0);
    const [obsText, setObsText] = useState('O₁: Low Emission');
    const [obsVisible, setObsVisible] = useState(true);
    const [glowCell, setGlowCell] = useState(4); // Index of glowing matrix cell

    // ── Matrix Rain ──
    useEffect(() => {
        const canvas = matrixCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        const chars = '01λπαβγδ∑∏∫';
        const fontSize = 14;
        const columns = Math.ceil(canvas.width / fontSize);
        const drops = Array.from({ length: columns }, () => Math.random() * -100);

        const draw = () => {
            ctx.fillStyle = 'rgba(10, 10, 15, 0.04)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#6366f1';
            ctx.font = `${fontSize}px monospace`;
            for (let i = 0; i < drops.length; i++) {
                const ch = chars[Math.floor(Math.random() * chars.length)];
                ctx.fillText(ch, i * fontSize, drops[i] * fontSize);
                if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
                drops[i]++;
            }
        };
        const id = setInterval(draw, 50);
        return () => { clearInterval(id); window.removeEventListener('resize', resize); };
    }, []);

    // ── Floating Particles ──
    useEffect(() => {
        const el = particlesRef.current;
        if (!el) return;
        el.innerHTML = '';
        for (let i = 0; i < 30; i++) {
            const p = document.createElement('div');
            p.style.cssText = `
                position: absolute;
                width: ${3 + Math.random() * 4}px;
                height: ${3 + Math.random() * 4}px;
                background: ${['rgba(99,102,241,0.5)', 'rgba(168,85,247,0.4)', 'rgba(236,72,153,0.35)'][Math.floor(Math.random() * 3)]};
                border-radius: 50%;
                pointer-events: none;
                left: ${Math.random() * 100}%;
                animation: lp-float ${15 + Math.random() * 15}s ${Math.random() * 20}s infinite linear;
            `;
            el.appendChild(p);
        }
    }, []);

    // ── Background state visualization ──
    useEffect(() => {
        const canvas = stateCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let w, h, animId;
        let states = [];
        let transitions = [];
        let particles = [];

        const initStates = () => {
            states = [
                { x: w * 0.15, y: h * 0.25, r: 42, color: '#6366f1', label: 'S₁' },
                { x: w * 0.45, y: h * 0.15, r: 42, color: '#a855f7', label: 'S₂' },
                { x: w * 0.82, y: h * 0.35, r: 42, color: '#ec4899', label: 'S₃' },
                { x: w * 0.25, y: h * 0.72, r: 36, color: '#3b82f6', label: 'S₄' },
            ];
            transitions = [
                { from: 0, to: 1, prob: 0.6 }, { from: 1, to: 2, prob: 0.7 },
                { from: 2, to: 3, prob: 0.5 }, { from: 3, to: 0, prob: 0.4 },
                { from: 0, to: 0, prob: 0.3 }, { from: 1, to: 1, prob: 0.2 },
            ];
        };

        const resize = () => {
            w = window.innerWidth;
            h = window.innerHeight;
            canvas.width = w;
            canvas.height = h;
            initStates();
        };
        window.addEventListener('resize', resize);
        resize();

        class P {
            constructor(s, e) {
                this.sx = states[s].x; this.sy = states[s].y;
                this.ex = states[e].x; this.ey = states[e].y;
                this.t = 0;
                this.speed = 0.008 + Math.random() * 0.008;
                this.color = states[s].color;
                this.cx = (this.sx + this.ex) / 2 + (Math.random() - 0.5) * 120;
                this.cy = (this.sy + this.ey) / 2 - 60 - Math.random() * 40;
            }
            update() {
                this.t += this.speed;
                if (this.t >= 1) return false;
                const t = this.t;
                this.x = (1 - t) * (1 - t) * this.sx + 2 * (1 - t) * t * this.cx + t * t * this.ex;
                this.y = (1 - t) * (1 - t) * this.sy + 2 * (1 - t) * t * this.cy + t * t * this.ey;
                return true;
            }
            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.shadowBlur = 12;
                ctx.shadowColor = this.color;
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }

        const drawStates = () => {
            transitions.forEach(({ from, to, prob }) => {
                const f = states[from], t_s = states[to];
                ctx.beginPath();
                if (from === to) {
                    ctx.arc(f.x, f.y - f.r, 16, 0, Math.PI * 2);
                } else {
                    ctx.moveTo(f.x, f.y);
                    ctx.quadraticCurveTo((f.x + t_s.x) / 2, (f.y + t_s.y) / 2 - 40, t_s.x, t_s.y);
                }
                ctx.strokeStyle = `rgba(255,255,255,${prob * 0.25})`;
                ctx.lineWidth = 1.5;
                ctx.stroke();
            });
            states.forEach(s => {
                // outer glow ring
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.r + 12, 0, Math.PI * 2);
                ctx.fillStyle = s.color + '10';
                ctx.fill();
                // main
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                ctx.fillStyle = s.color + '25';
                ctx.strokeStyle = s.color + '60';
                ctx.lineWidth = 2;
                ctx.fill();
                ctx.stroke();
                // label
                ctx.fillStyle = '#ffffff80';
                ctx.font = 'bold 15px "JetBrains Mono", monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(s.label, s.x, s.y);
            });
        };

        const animate = () => {
            ctx.clearRect(0, 0, w, h);
            if (Math.random() < 0.04) {
                const tr = transitions[Math.floor(Math.random() * transitions.length)];
                particles.push(new P(tr.from, tr.to));
            }
            particles = particles.filter(p => { const ok = p.update(); if (ok) p.draw(); return ok; });
            drawStates();
            animId = requestAnimationFrame(animate);
        };
        animate();
        return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(animId); };
    }, []);

    // ── Mini Viz cycle ──
    useEffect(() => {
        const obs = ['O₁: Low Emission', 'O₂: Medium Emission', 'O₃: High Emission'];
        const id = setInterval(() => {
            setObsVisible(false);
            setTimeout(() => {
                setMiniState(prev => {
                    const next = (prev + 1) % 3;
                    setObsText(obs[next]);
                    setGlowCell(Math.floor(Math.random() * 9));
                    return next;
                });
                setObsVisible(true);
            }, 250);
        }, 2500);
        return () => clearInterval(id);
    }, []);

    // ── Parallax on card ──
    useEffect(() => {
        const handler = (e) => {
            if (!glassPanelRef.current) return;
            const x = (e.clientX / window.innerWidth - 0.5) * 10;
            const y = (e.clientY / window.innerHeight - 0.5) * 10;
            glassPanelRef.current.style.transform = `perspective(1200px) rotateY(${x * 0.15}deg) rotateX(${-y * 0.15}deg)`;
        };
        window.addEventListener('mousemove', handler);
        return () => window.removeEventListener('mousemove', handler);
    }, []);

    const miniPos = [{ left: 80, top: 100 }, { left: 150, top: 60 }, { left: 220, top: 100 }];
    const matrixVals = [0.7, 0.2, 0.1, 0.3, 0.6, 0.1, 0.2, 0.3, 0.5];

    return (
        <>
            <style>{`
                @keyframes lp-float {
                    0%   { transform: translateY(100vh) translateX(0); opacity: 0; }
                    10%  { opacity: 1; }
                    90%  { opacity: 1; }
                    100% { transform: translateY(-100vh) translateX(${60 + Math.random() * 80}px); opacity: 0; }
                }
                @keyframes lp-pulse-gradient {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50%      { opacity: 0.7; transform: scale(1.08); }
                }
                @keyframes lp-reveal {
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes lp-pulse-dot {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50%      { opacity: 0.4; transform: scale(1.3); }
                }
                @keyframes lp-shimmer {
                    0%   { left: -100%; }
                    100% { left: 100%; }
                }
                .lp-reveal {
                    opacity: 0;
                    transform: translateY(30px);
                    animation: lp-reveal 1s cubic-bezier(0.77,0,0.175,1) forwards;
                }
                .lp-d1 { animation-delay: .1s; }
                .lp-d2 { animation-delay: .2s; }
                .lp-d3 { animation-delay: .35s; }
                .lp-d5 { animation-delay: .55s; }
                .lp-d7 { animation-delay: .75s; }

                .lp-btn-primary {
                    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
                    position: relative;
                    overflow: hidden;
                    transition: all 0.3s ease;
                    border: none;
                    box-shadow: 0 4px 24px rgba(99, 102, 241, 0.4);
                }
                .lp-btn-primary::after {
                    content: '';
                    position: absolute;
                    top: 0; left: -100%;
                    width: 100%; height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent);
                    animation: lp-shimmer 3s infinite;
                }
                .lp-btn-primary:hover {
                    transform: translateY(-3px) !important;
                    box-shadow: 0 8px 32px rgba(99, 102, 241, 0.6);
                }

                .lp-glass {
                    background: rgba(15, 23, 42, 0.55);
                    backdrop-filter: blur(24px) saturate(1.5);
                    -webkit-backdrop-filter: blur(24px) saturate(1.5);
                    border: 1px solid rgba(255,255,255,0.08);
                    box-shadow: 0 32px 64px -12px rgba(0, 0, 0, 0.6);
                }

                .lp-glow-text {
                    text-shadow: 0 0 24px rgba(99,102,241,0.5), 0 0 48px rgba(99,102,241,0.25);
                }

                .lp-cell-glow {
                    box-shadow: 0 0 16px rgba(99,102,241,0.4), inset 0 0 12px rgba(99,102,241,0.15);
                    color: #a5b4fc !important;
                }

                .lp-feature-card {
                    background: rgba(15, 23, 42, 0.5);
                    backdrop-filter: blur(16px);
                    border: 1px solid rgba(255,255,255,0.06);
                    transition: all 0.35s cubic-bezier(0.4,0,0.2,1);
                }
                .lp-feature-card:hover {
                    background: rgba(30, 41, 59, 0.6);
                    border-color: rgba(255,255,255,0.12);
                    transform: translateY(-4px);
                    box-shadow: 0 20px 40px -12px rgba(0,0,0,0.5);
                }
            `}</style>

            <div style={{
                fontFamily: '"Space Grotesk", sans-serif',
                background: '#0a0a0f',
                color: '#e2e8f0',
                minHeight: '100vh',
                overflow: 'hidden',
                position: 'relative',
                width: '100vw',
            }}>
                {/* ── Backgrounds ── */}
                {/* Grid */}
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 0,
                    backgroundImage: 'linear-gradient(rgba(99,102,241,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.035) 1px, transparent 1px)',
                    backgroundSize: '50px 50px',
                }} />
                {/* Radial glow */}
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 0,
                    background: 'radial-gradient(ellipse at 15% 85%, rgba(99,102,241,0.18) 0%, transparent 50%), radial-gradient(ellipse at 85% 15%, rgba(168,85,247,0.18) 0%, transparent 50%), radial-gradient(ellipse at 50% 50%, rgba(59,130,246,0.12) 0%, transparent 70%)',
                    animation: 'lp-pulse-gradient 8s ease-in-out infinite',
                }} />
                {/* Matrix rain (very subtle) */}
                <canvas ref={matrixCanvasRef} style={{ position: 'fixed', inset: 0, opacity: 0.035, pointerEvents: 'none', zIndex: 0 }} />
                {/* Particles */}
                <div ref={particlesRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }} />
                {/* State graph */}
                <canvas ref={stateCanvasRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} />

                {/* ── Nav ── */}
                <nav className="lp-glass" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
                    padding: '14px 28px',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex', justifyContent: 'center',
                }}>
                    <div style={{ maxWidth: 1200, width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                                width: 34, height: 34,
                                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                                borderRadius: 10,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 0 16px rgba(99,102,241,0.4)',
                            }}>
                                <span style={{ color: '#fff', fontWeight: 700, fontSize: 11, fontFamily: 'sans-serif' }}>HMM</span>
                            </div>
                            <span style={{ fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>Hidden Markov Model</span>
                        </div>

                    </div>
                </nav>

                {/* ── Hero ── */}
                <main style={{
                    position: 'relative', zIndex: 1,
                    minHeight: '100vh',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '100px 32px 60px',
                }}>
                    <div style={{
                        maxWidth: 1200, width: '100%',
                        display: 'grid', gridTemplateColumns: '1fr 1fr',
                        gap: 48, alignItems: 'center',
                    }}>
                        {/* Left */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                            {/* Badge */}
                            <div className="lp-reveal" style={{
                                display: 'inline-flex', alignItems: 'center', alignSelf: 'flex-start',
                                padding: '6px 14px', borderRadius: 999,
                                background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
                                color: '#a5b4fc', fontSize: 11, fontWeight: 600,
                                fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.05em',
                            }}>
                                <span style={{
                                    width: 10, height: 10, borderRadius: '50%', background: '#818cf8',
                                    marginRight: 8, animation: 'lp-pulse-dot 2s infinite',
                                }} />
                                STOCHASTIC PROCESSES
                            </div>

                            {/* Heading */}
                            <h1 className="lp-reveal lp-d1" style={{
                                fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
                                fontWeight: 700, lineHeight: 1.08, color: '#fff',
                                margin: 0, background: 'none',
                                WebkitBackgroundClip: 'unset', WebkitTextFillColor: 'unset',
                                textAlign: 'left', letterSpacing: '-0.03em',
                            }}>
                                Decoding the{' '}
                                <span style={{
                                    display: 'block',
                                    background: 'linear-gradient(135deg, #818cf8, #a78bfa, #c084fc, #f472b6)',
                                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                }} className="lp-glow-text">
                                    Hidden States
                                </span>
                            </h1>

                            {/* Subtext */}
                            <p className="lp-reveal lp-d2" style={{
                                fontSize: 17, lineHeight: 1.7, color: '#94a3b8',
                                maxWidth: 480,
                            }}>
                                Explore the mathematical elegance of Hidden Markov Models.
                                Visualize state transitions, emission probabilities, and the
                                Baum-Welch algorithm in real-time.
                            </p>

                            {/* Buttons */}
                            <div className="lp-reveal lp-d3" style={{ display: 'flex', gap: 16 }}>
                                <button onClick={onStart} className="lp-btn-primary" style={{
                                    padding: '16px 36px', borderRadius: 14,
                                    color: '#fff', fontWeight: 600, fontSize: 14,
                                    letterSpacing: '0.02em',
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    cursor: 'pointer',
                                    fontFamily: '"Space Grotesk", sans-serif',
                                }}>
                                    Start Exploration
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                </button>
                            </div>

                            {/* Stats */}
                            <div className="lp-reveal lp-d5" style={{
                                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                                gap: 24, paddingTop: 28,
                                borderTop: '1px solid rgba(255,255,255,0.08)',
                            }}>
                                {[
                                    { val: '3', label: 'States' },
                                    { val: '0.85', label: 'Accuracy' },
                                    { val: '∞', label: 'Sequences' },
                                ].map(({ val, label }) => (
                                    <div key={label}>
                                        <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', fontFamily: '"JetBrains Mono", monospace' }}>{val}</div>
                                        <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>{label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right – Interactive Card */}
                        <div className="lp-reveal lp-d7" style={{ position: 'relative' }}>
                            <div ref={glassPanelRef} className="lp-glass" style={{
                                borderRadius: 20, padding: '28px 28px 24px',
                                position: 'relative', overflow: 'hidden',
                                transition: 'transform 0.15s ease-out',
                            }}>
                                {/* Blurred orbs */}
                                <div style={{ position: 'absolute', top: -40, right: -40, width: 120, height: 120, background: 'rgba(99,102,241,0.2)', borderRadius: '50%', filter: 'blur(40px)' }} />
                                <div style={{ position: 'absolute', bottom: -40, left: -40, width: 120, height: 120, background: 'rgba(168,85,247,0.2)', borderRadius: '50%', filter: 'blur(40px)' }} />

                                <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
                                    {/* Header */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>Live State Machine</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#f87171', animation: 'lp-pulse-dot 1.5s infinite' }} />
                                            <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: '"JetBrains Mono", monospace', fontWeight: 600 }}>LIVE</span>
                                        </div>
                                    </div>

                                    {/* Mini SVG Diagram */}
                                    <div style={{
                                        background: 'rgba(0,0,0,0.35)', borderRadius: 14,
                                        padding: '20px', border: '1px solid rgba(255,255,255,0.04)',
                                        position: 'relative', height: 220, overflow: 'hidden',
                                    }}>
                                        <svg viewBox="0 0 300 200" style={{ width: '100%', height: '100%' }}>
                                            <defs>
                                                <marker id="arr" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
                                                    <polygon points="0 0, 8 3, 0 6" fill="#6366f1" opacity="0.5" />
                                                </marker>
                                                <filter id="sg"><feGaussianBlur stdDeviation="3" /></filter>
                                            </defs>
                                            {/* Transition arrows */}
                                            <path d="M 100 90 Q 125 72 130 68" fill="none" stroke="#6366f1" strokeWidth="1.5" opacity="0.5" markerEnd="url(#arr)" />
                                            <path d="M 170 68 Q 195 82 200 88" fill="none" stroke="#a855f7" strokeWidth="1.5" opacity="0.5" markerEnd="url(#arr)" />
                                            <path d="M 200 112 Q 175 128 170 132" fill="none" stroke="#ec4899" strokeWidth="1.5" opacity="0.5" markerEnd="url(#arr)" />
                                            <path d="M 130 132 Q 105 118 100 112" fill="none" stroke="#ec4899" strokeWidth="1.5" opacity="0.5" markerEnd="url(#arr)" />
                                            {/* Self loops */}
                                            <path d="M 58 98 Q 52 68 80 68 Q 108 68 102 98" fill="none" stroke="#6366f1" strokeWidth="1" opacity="0.3" />
                                            <path d="M 128 58 Q 132 28 150 28 Q 168 28 172 58" fill="none" stroke="#a855f7" strokeWidth="1" opacity="0.3" />
                                            {/* State circles with glow */}
                                            {[
                                                { cx: 80, cy: 100, c: '#6366f1', l: 'S₁' },
                                                { cx: 150, cy: 60, c: '#a855f7', l: 'S₂' },
                                                { cx: 220, cy: 100, c: '#ec4899', l: 'S₃' },
                                            ].map(({ cx, cy, c, l }, i) => (
                                                <g key={i}>
                                                    <circle cx={cx} cy={cy} r="28" fill={c} opacity="0.08" filter="url(#sg)" />
                                                    <circle cx={cx} cy={cy} r="24" fill={`${c}20`} stroke={c} strokeWidth="1.5" />
                                                    <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="11" fontFamily="JetBrains Mono" fontWeight="600">{l}</text>
                                                </g>
                                            ))}
                                        </svg>
                                        {/* Tracker dot */}
                                        <div style={{
                                            position: 'absolute',
                                            left: miniPos[miniState].left, top: miniPos[miniState].top,
                                            width: 12, height: 12, borderRadius: '50%',
                                            background: '#fff',
                                            boxShadow: '0 0 16px rgba(99,102,241,0.8), 0 0 32px rgba(99,102,241,0.4)',
                                            transform: 'translate(-50%, -50%)',
                                            transition: 'all 0.6s cubic-bezier(0.4,0,0.2,1)',
                                        }} />
                                    </div>

                                    {/* Matrix */}
                                    <div>
                                        <div style={{
                                            display: 'flex', justifyContent: 'space-between', marginBottom: 8,
                                            fontSize: 11, color: '#64748b', fontFamily: '"JetBrains Mono", monospace',
                                        }}>
                                            <span>Transition Matrix</span>
                                            <span style={{ color: '#818cf8', fontWeight: 700 }}>A</span>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                                            {matrixVals.map((v, i) => (
                                                <div key={i} className={i === glowCell ? 'lp-cell-glow' : ''} style={{
                                                    background: 'rgba(255,255,255,0.04)',
                                                    padding: '8px 0', borderRadius: 8,
                                                    textAlign: 'center',
                                                    fontSize: 12, fontFamily: '"JetBrains Mono", monospace',
                                                    color: '#cbd5e1',
                                                    transition: 'all 0.4s ease',
                                                }}>
                                                    {v.toFixed(1)}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Observation */}
                                    <div style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        background: 'rgba(99,102,241,0.08)', borderRadius: 10,
                                        padding: '10px 14px', border: '1px solid rgba(99,102,241,0.15)',
                                    }}>
                                        <span style={{ fontSize: 11, color: '#64748b', fontFamily: '"JetBrains Mono", monospace' }}>Current Observation</span>
                                        <span style={{
                                            fontSize: 13, fontWeight: 700, color: '#a5b4fc',
                                            fontFamily: '"JetBrains Mono", monospace',
                                            opacity: obsVisible ? 1 : 0,
                                            transition: 'opacity 0.25s ease',
                                        }}>{obsText}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Floating badge */}
                            <div className="lp-glass" style={{
                                position: 'absolute', bottom: -14, right: -10,
                                padding: '8px 16px', borderRadius: 999,
                                display: 'flex', alignItems: 'center', gap: 8,
                                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                            }}>
                                <div style={{ width: 7, height: 7, background: '#34d399', borderRadius: '50%', animation: 'lp-pulse-dot 2s infinite' }} />
                                <span style={{ fontSize: 11, fontWeight: 600, color: '#cbd5e1' }}>Algorithm: Baum-Welch</span>
                            </div>
                        </div>
                    </div>
                </main>

                {/* ── Features ── */}
                <section style={{
                    position: 'relative', zIndex: 1,
                    padding: '80px 32px',
                    borderTop: '1px solid rgba(255,255,255,0.04)',
                    background: 'rgba(0,0,0,0.15)',
                }}>
                    <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
                        {[
                            { icon: '📊', title: 'Forward-Backward', desc: 'Compute posterior marginals with dynamic programming precision.', accent: '#6366f1' },
                            { icon: '⚡', title: 'Viterbi Decoding', desc: 'Find the most likely sequence of hidden states in polynomial time.', accent: '#a855f7' },
                            { icon: '🔧', title: 'Baum-Welch', desc: 'Expectation-maximization for unsupervised parameter learning.', accent: '#ec4899' },
                        ].map(({ icon, title, desc, accent }) => (
                            <div key={title} className="lp-feature-card" style={{ padding: 28, borderRadius: 16, cursor: 'pointer' }}>
                                <div style={{
                                    width: 48, height: 48, borderRadius: 12,
                                    background: `${accent}1a`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 22, marginBottom: 16,
                                }}>
                                    {icon}
                                </div>
                                <h3 style={{ fontSize: 17, fontWeight: 600, color: '#fff', marginBottom: 8 }}>{title}</h3>
                                <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>{desc}</p>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </>
    );
};

export default LandingPage;
