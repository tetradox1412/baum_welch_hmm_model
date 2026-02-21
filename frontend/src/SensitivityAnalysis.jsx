import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FaSlidersH, FaInfoCircle, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';

const logSumExp = (logs) => {
    const maxLog = Math.max(...logs);
    if (maxLog === -Infinity) return -Infinity;
    let sum = 0;
    for (let i = 0; i < logs.length; i++) sum += Math.exp(logs[i] - maxLog);
    return maxLog + Math.log(sum);
};

const calculateLogLikelihood = (Pi, A, B, observationSequences) => {
    const N = A.length;
    let totalLL = 0;
    for (const seq of observationSequences) {
        const T = seq.length;
        if (T === 0) continue;
        let alpha = new Float64Array(N);
        let nextAlpha = new Float64Array(N);
        for (let i = 0; i < N; i++)
            alpha[i] = Math.log(Math.max(Pi[i], 1e-10)) + Math.log(Math.max(B[i][seq[0]], 1e-10));
        for (let t = 1; t < T; t++) {
            for (let j = 0; j < N; j++) {
                const logs = new Float64Array(N);
                for (let i = 0; i < N; i++) logs[i] = alpha[i] + Math.log(Math.max(A[i][j], 1e-10));
                nextAlpha[j] = logSumExp(logs) + Math.log(Math.max(B[j][seq[t]], 1e-10));
            }
            alpha.set(nextAlpha);
        }
        totalLL += logSumExp(alpha);
    }
    return totalLL;
};

const SensitivityAnalysis = ({ Pi, A, B, originalLL, observationsText, isDark }) => {
    const [matrixType, setMatrixType] = useState('A');
    const [selectedRow, setSelectedRow] = useState(0);
    const [selectedCol, setSelectedCol] = useState(0);
    const [sliderValue, setSliderValue] = useState(0);

    const N = A.length;
    const M = B[0].length;

    const parsedObs = useMemo(() => {
        return observationsText.map(line =>
            line.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
        ).filter(seq => seq.length > 0);
    }, [observationsText]);

    const [modA, setModA] = useState(A.map(row => [...row]));
    const [modB, setModB] = useState(B.map(row => [...row]));

    useEffect(() => {
        setModA(A.map(row => [...row]));
        setModB(B.map(row => [...row]));
        setSliderValue(matrixType === 'A' ? A[selectedRow][selectedCol] : B[selectedRow][selectedCol]);
    }, [A, B, matrixType, selectedRow, selectedCol]);

    const currentLL = useMemo(() => calculateLogLikelihood(Pi, modA, modB, parsedObs), [Pi, modA, modB, parsedObs]);

    const handleSliderChange = (e) => {
        const val = parseFloat(e.target.value);
        setSliderValue(val);
        const cols = matrixType === 'A' ? N : M;
        const src = matrixType === 'A' ? modA : modB;
        const newMat = src.map(row => [...row]);
        const oldVal = newMat[selectedRow][selectedCol];
        const diff = val - oldVal;
        newMat[selectedRow][selectedCol] = val;
        let sumOthers = 0;
        for (let j = 0; j < cols; j++) if (j !== selectedCol) sumOthers += newMat[selectedRow][j];
        if (sumOthers > 0) {
            for (let j = 0; j < cols; j++) if (j !== selectedCol) newMat[selectedRow][j] -= diff * (newMat[selectedRow][j] / sumOthers);
        } else if (diff < 0) {
            const rem = -diff / (cols - 1);
            for (let j = 0; j < cols; j++) if (j !== selectedCol) newMat[selectedRow][j] = rem;
        }
        for (let j = 0; j < cols; j++) newMat[selectedRow][j] = Math.max(0, Math.min(1, newMat[selectedRow][j]));
        let finalSum = newMat[selectedRow].reduce((a, b) => a + b, 0);
        if (finalSum > 0) for (let j = 0; j < cols; j++) newMat[selectedRow][j] /= finalSum;
        matrixType === 'A' ? setModA(newMat) : setModB(newMat);
    };

    const deltaLL = currentLL - originalLL;
    const dropPct = originalLL !== 0 ? ((currentLL - originalLL) / Math.abs(originalLL) * 100) : 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="feature-card"
        >
            <div className="feature-header">
                <div>
                    <h3 className="feature-title">
                        <span className="feature-icon feature-icon--cyan"><FaSlidersH /></span>
                        Sensitivity Topography
                    </h3>
                    <p className="feature-description">
                        Did Baum-Welch truly find the optimal parameters? <strong>Test it yourself.</strong> Select any cell
                        in the converged Transition (<strong>A</strong>) or Emission (<strong>B</strong>) matrix and drag the probability slider.
                        The log-likelihood gauge responds instantly — almost any manual deviation will cause the score to <em>plummet</em>,
                        proving the algorithm found a mathematical peak.
                    </p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                {/* Controls */}
                <div className="feature-panel">
                    {/* Custom Dropdown Component inline */}
                    {(() => {
                        const GlassDropdown = ({ label, value, options, onChange, accentColor = 'var(--cyan)' }) => {
                            const [open, setOpen] = React.useState(false);
                            const ref = React.useRef(null);
                            const selectedOption = options.find(o => o.value === value);

                            React.useEffect(() => {
                                const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
                                document.addEventListener('mousedown', handler);
                                return () => document.removeEventListener('mousedown', handler);
                            }, []);

                            return (
                                <div ref={ref} style={{ position: 'relative', flex: 1 }}>
                                    <label className="feature-label">{label}</label>
                                    <button
                                        onClick={() => setOpen(!open)}
                                        style={{
                                            width: '100%',
                                            padding: '10px 14px',
                                            borderRadius: '10px',
                                            border: open ? `1.5px solid ${accentColor}` : '1.5px solid rgba(148,163,184,0.12)',
                                            background: open ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
                                            color: 'var(--text-primary)',
                                            fontWeight: 600,
                                            fontSize: '0.88rem',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            textAlign: 'left',
                                            boxShadow: open ? `0 0 12px ${accentColor}15` : 'none'
                                        }}
                                    >
                                        <span>{selectedOption?.label || '—'}</span>
                                        <span style={{
                                            fontSize: '0.55rem',
                                            transition: 'transform 0.25s',
                                            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                                            color: 'var(--text-muted)'
                                        }}>▼</span>
                                    </button>

                                    {open && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -6, scale: 0.97 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            transition={{ duration: 0.15 }}
                                            style={{
                                                position: 'absolute',
                                                top: 'calc(100% + 6px)',
                                                left: 0, right: 0,
                                                zIndex: 50,
                                                background: 'linear-gradient(145deg, rgba(30,41,59,0.95), rgba(15,23,42,0.98))',
                                                backdropFilter: 'blur(20px)',
                                                border: `1px solid rgba(148,163,184,0.12)`,
                                                borderRadius: '12px',
                                                padding: '4px',
                                                boxShadow: '0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03) inset',
                                                maxHeight: '200px',
                                                overflowY: 'auto'
                                            }}
                                        >
                                            {options.map(opt => (
                                                <button
                                                    key={opt.value}
                                                    onClick={() => { onChange(opt.value); setOpen(false); }}
                                                    style={{
                                                        width: '100%',
                                                        padding: '9px 12px',
                                                        borderRadius: '8px',
                                                        border: 'none',
                                                        background: opt.value === value
                                                            ? `linear-gradient(135deg, ${accentColor}18, ${accentColor}08)`
                                                            : 'transparent',
                                                        color: opt.value === value ? accentColor : 'var(--text-secondary)',
                                                        fontWeight: opt.value === value ? 700 : 500,
                                                        fontSize: '0.85rem',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.15s',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        textAlign: 'left'
                                                    }}
                                                    onMouseEnter={e => { if (opt.value !== value) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                                                    onMouseLeave={e => { if (opt.value !== value) e.currentTarget.style.background = 'transparent'; }}
                                                >
                                                    <span>{opt.label}</span>
                                                    {opt.value === value && <span style={{ fontSize: '0.75rem' }}>✓</span>}
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </div>
                            );
                        };

                        const matrixOpts = [
                            { value: 'A', label: 'Transition (A)' },
                            { value: 'B', label: 'Emission (B)' }
                        ];
                        const rowOpts = Array.from({ length: N }, (_, i) => ({ value: i, label: `State ${i}` }));
                        const colOpts = Array.from({ length: matrixType === 'A' ? N : M }, (_, i) => ({
                            value: i, label: matrixType === 'A' ? `State ${i}` : `Symbol ${i}`
                        }));

                        return (
                            <>
                                <div style={{ marginBottom: '16px' }}>
                                    <GlassDropdown label="Matrix" value={matrixType} options={matrixOpts} onChange={(v) => { setMatrixType(v); setSelectedCol(0); }} accentColor="#22d3ee" />
                                </div>
                                <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                                    <GlassDropdown label="Row (State)" value={selectedRow} options={rowOpts} onChange={setSelectedRow} accentColor="#22d3ee" />
                                    <GlassDropdown label={`Column (${matrixType === 'A' ? 'State' : 'Symbol'})`} value={selectedCol} options={colOpts} onChange={setSelectedCol} accentColor="#a78bfa" />
                                </div>
                            </>
                        );
                    })()}

                    {(() => {
                        const optimalVal = matrixType === 'A' ? A[selectedRow][selectedCol] : B[selectedRow][selectedCol];
                        const deviation = Math.abs(sliderValue - optimalVal);
                        const deviationPct = (deviation * 100).toFixed(1);
                        const currentRow = matrixType === 'A' ? modA[selectedRow] : modB[selectedRow];
                        const hue = Math.max(0, 160 - deviation * 500);

                        return (
                            <div style={{ marginBottom: '6px' }}>
                                {/* Label + Value */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <label className="feature-label" style={{ marginBottom: 0 }}>
                                        <span style={{ color: 'var(--cyan)' }}>{matrixType}</span>[{selectedRow}][{selectedCol}]
                                    </label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        {deviation > 0.005 && (
                                            <span style={{
                                                fontSize: '0.72rem',
                                                fontWeight: 700,
                                                padding: '2px 8px',
                                                borderRadius: '10px',
                                                background: deviation > 0.15 ? 'rgba(248,113,113,0.15)' : 'rgba(251,191,36,0.15)',
                                                color: deviation > 0.15 ? 'var(--red)' : 'var(--amber)',
                                                letterSpacing: '0.03em'
                                            }}>
                                                {deviation > 0.15 ? '⚠' : '△'} {deviationPct}% off
                                            </span>
                                        )}
                                        <span style={{
                                            fontWeight: 800,
                                            fontFamily: "'JetBrains Mono', monospace",
                                            color: `hsl(${hue}, 70%, 55%)`,
                                            fontSize: '1.05rem',
                                            transition: 'color 0.2s'
                                        }}>
                                            {sliderValue.toFixed(4)}
                                        </span>
                                    </div>
                                </div>

                                {/* Custom Slider Track */}
                                <div style={{ position: 'relative', height: '40px', marginBottom: '8px' }}>
                                    {/* Track background with gradient fill */}
                                    <div style={{
                                        position: 'absolute', top: '16px', left: 0, right: 0, height: '8px',
                                        borderRadius: '4px', overflow: 'hidden',
                                        background: 'rgba(255,255,255,0.06)'
                                    }}>
                                        <div style={{
                                            width: `${sliderValue * 100}%`, height: '100%',
                                            background: `linear-gradient(90deg, hsl(${hue}, 70%, 45%), hsl(${hue}, 65%, 55%))`,
                                            transition: 'width 0.05s, background 0.2s',
                                            boxShadow: `0 0 10px hsl(${hue}, 70%, 50%, 0.3)`
                                        }} />
                                    </div>

                                    {/* Optimal value diamond marker */}
                                    <div style={{
                                        position: 'absolute',
                                        left: `calc(${optimalVal * 100}% - 6px)`,
                                        top: '14px',
                                        width: '12px', height: '12px',
                                        background: 'var(--cyan)',
                                        transform: 'rotate(45deg)',
                                        borderRadius: '2px',
                                        boxShadow: '0 0 8px rgba(34, 211, 238, 0.5)',
                                        zIndex: 2,
                                        transition: 'left 0.2s'
                                    }} />

                                    {/* Optimal label */}
                                    <div style={{
                                        position: 'absolute',
                                        left: `calc(${optimalVal * 100}% - 16px)`,
                                        top: '-12px',
                                        fontSize: '0.6rem',
                                        color: 'var(--cyan)',
                                        fontWeight: 700,
                                        letterSpacing: '0.05em',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        OPTIMAL
                                    </div>

                                    {/* Hidden native range for interaction */}
                                    <input
                                        type="range" min="0" max="1" step="0.001"
                                        value={sliderValue} onChange={handleSliderChange}
                                        style={{
                                            position: 'absolute', top: '8px', left: 0,
                                            width: '100%', height: '24px',
                                            opacity: 0, cursor: 'pointer', zIndex: 5
                                        }}
                                    />

                                    {/* Visual thumb */}
                                    <div style={{
                                        position: 'absolute',
                                        left: `calc(${sliderValue * 100}% - 10px)`,
                                        top: '10px',
                                        width: '20px', height: '20px',
                                        borderRadius: '50%',
                                        background: `hsl(${hue}, 70%, 55%)`,
                                        boxShadow: `0 0 14px hsl(${hue}, 70%, 50%, 0.5), 0 2px 6px rgba(0,0,0,0.3)`,
                                        border: '3px solid rgba(255,255,255,0.9)',
                                        zIndex: 3,
                                        pointerEvents: 'none',
                                        transition: 'left 0.05s, background 0.2s, box-shadow 0.2s'
                                    }} />
                                </div>

                                {/* Live Row Distribution Bar */}
                                <div style={{ marginTop: '14px' }}>
                                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>
                                        Row {selectedRow} Distribution
                                    </div>
                                    <div style={{ display: 'flex', gap: '2px', height: '24px', borderRadius: '6px', overflow: 'hidden' }}>
                                        {currentRow.map((prob, idx) => (
                                            <div
                                                key={idx}
                                                style={{
                                                    flex: Math.max(prob, 0.005),
                                                    background: idx === selectedCol
                                                        ? `hsl(${hue}, 70%, 50%)`
                                                        : 'rgba(148, 163, 184, 0.15)',
                                                    transition: 'flex 0.15s, background 0.2s',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '0.6rem',
                                                    fontWeight: 700,
                                                    color: idx === selectedCol ? '#fff' : 'var(--text-muted)',
                                                    overflow: 'hidden',
                                                    whiteSpace: 'nowrap'
                                                }}
                                                title={`${matrixType === 'A' ? 'S' : 'Obs '}${idx}: ${prob.toFixed(4)}`}
                                            >
                                                {prob > 0.08 ? prob.toFixed(2) : ''}
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'right', marginTop: '4px', opacity: 0.7 }}>
                                        Σ = {currentRow.reduce((a, b) => a + b, 0).toFixed(4)}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </div>

                {/* Live Gauge */}
                <div className="gauge-container">
                    <div className="gauge-label" style={{ color: 'var(--cyan)' }}>Current Log-Likelihood</div>
                    <div className="gauge-value" style={{ color: deltaLL < -0.01 ? 'var(--red)' : deltaLL > 0.01 ? 'var(--green)' : 'var(--text-primary)' }}>
                        {currentLL.toFixed(4)}
                    </div>
                    <div className="gauge-delta" style={{ color: deltaLL < -0.01 ? 'var(--red)' : deltaLL > 0.01 ? 'var(--green)' : 'var(--text-muted)' }}>
                        {deltaLL < -0.01 ? <FaExclamationTriangle /> : deltaLL > 0.01 ? <FaCheckCircle /> : null}
                        <span>
                            {deltaLL > 0 ? '+' : ''}{deltaLL.toFixed(4)}
                            <span style={{ opacity: 0.6, fontSize: '0.8em', marginLeft: '6px' }}>({dropPct > 0 ? '+' : ''}{dropPct.toFixed(2)}%)</span>
                        </span>
                    </div>
                    {deltaLL > 0.001 && (
                        <div style={{ marginTop: '10px', fontSize: '0.75rem', color: 'var(--green)', fontWeight: 600 }}>
                            You found a better peak! (Rare — may indicate a local maximum.)
                        </div>
                    )}
                </div>
            </div>

            <div className="feature-footer">
                <FaInfoCircle size={16} className="feature-footer-icon" style={{ color: 'var(--cyan)' }} />
                <div>
                    <strong>Why does the score drop?</strong> The Forward Algorithm evaluates how well the model explains the observed data.
                    Baum-Welch climbs the gradient to find a peak in likelihood space. Moving the slider forcefully pushes the model off that peak,
                    immediately degrading the fit — proving the algorithm found mathematically optimal parameters.
                </div>
            </div>
        </motion.div>
    );
};

export default SensitivityAnalysis;
