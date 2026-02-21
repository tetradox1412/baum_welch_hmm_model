import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaProjectDiagram, FaPlay, FaInfoCircle, FaCheckCircle, FaRoute } from 'react-icons/fa';

const ViterbiDecoding = ({ Pi, A, B, isDark }) => {
    const [obsString, setObsString] = useState('0, 1, 0, 0, 1');
    const [isDecoding, setIsDecoding] = useState(false);
    const [decodedResult, setDecodedResult] = useState(null);

    const N = A.length;
    const M = B[0].length;

    const O = useMemo(() => {
        return obsString.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n >= 0 && n < M);
    }, [obsString, M]);

    const runViterbi = () => {
        if (O.length === 0) return;
        setIsDecoding(true);
        setDecodedResult(null);

        const T = O.length;
        const v = Array.from({ length: N }, () => new Float64Array(T).fill(-Infinity));
        const ptr = Array.from({ length: N }, () => new Int32Array(T).fill(0));

        for (let i = 0; i < N; i++)
            v[i][0] = Math.log(Math.max(Pi[i], 1e-10)) + Math.log(Math.max(B[i][O[0]], 1e-10));

        for (let t = 1; t < T; t++) {
            for (let j = 0; j < N; j++) {
                let maxVal = -Infinity, argMax = 0;
                for (let i = 0; i < N; i++) {
                    const prob = v[i][t - 1] + Math.log(Math.max(A[i][j], 1e-10));
                    if (prob > maxVal) { maxVal = prob; argMax = i; }
                }
                v[j][t] = maxVal + Math.log(Math.max(B[j][O[t]], 1e-10));
                ptr[j][t] = argMax;
            }
        }

        let bestVal = -Infinity, bestLast = 0;
        for (let i = 0; i < N; i++) if (v[i][T - 1] > bestVal) { bestVal = v[i][T - 1]; bestLast = i; }

        const path = new Array(T);
        path[T - 1] = bestLast;
        for (let t = T - 2; t >= 0; t--) path[t] = ptr[path[t + 1]][t + 1];

        setTimeout(() => {
            setDecodedResult({ path, v, ptr, bestVal });
            setIsDecoding(false);
        }, 400);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="feature-card"
        >
            <div className="feature-header">
                <div>
                    <h3 className="feature-title">
                        <span className="feature-icon feature-icon--amber"><FaRoute /></span>
                        Viterbi Decoding
                    </h3>
                    <p className="feature-description">
                        While Baum-Welch <em>trains</em> the model, the <strong>Viterbi algorithm</strong> <em>uses</em> it.
                        Enter a new observation sequence below, and Viterbi will construct a Trellis graph and perform
                        dynamic-programming traceback to uncover the single most probable sequence of hidden states
                        — the <strong>"Golden Path"</strong>.
                    </p>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', marginBottom: '20px', flexWrap: 'wrap' }}>
                <div className="floating-input-wrap">
                    <span className="floating-label">Observation Sequence</span>
                    <input
                        type="text"
                        value={obsString}
                        onChange={(e) => setObsString(e.target.value)}
                        className="glass-input"
                        style={{ width: '100%', padding: '12px 16px', fontSize: '1rem', letterSpacing: '2px' }}
                        placeholder="e.g. 0, 1, 0…"
                    />
                </div>
                <button
                    className="feature-btn feature-btn--amber"
                    onClick={runViterbi}
                    disabled={isDecoding || O.length === 0}
                >
                    {isDecoding ? 'Decoding…' : <><FaPlay /> Decode</>}
                </button>
            </div>

            {/* Trellis */}
            <div className="trellis-container">
                {O.length === 0 ? (
                    <div className="trellis-placeholder">Enter a valid observation sequence to visualize the Trellis graph.</div>
                ) : (
                    <div style={{ position: 'relative', minWidth: `${O.length * 80 + 100}px`, height: `${N * 60 + 60}px` }}>

                        {/* Time labels */}
                        <div style={{ display: 'flex', position: 'absolute', top: 0, left: '60px' }}>
                            {O.map((obs, t) => (
                                <div key={t} style={{ width: '80px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 600 }}>
                                    <div>t = {t}</div>
                                    <div style={{ color: 'var(--text-primary)', marginTop: '4px', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '6px', display: 'inline-block', fontSize: '0.8rem' }}>Obs {obs}</div>
                                </div>
                            ))}
                        </div>

                        {/* State labels */}
                        <div style={{ display: 'flex', flexDirection: 'column', position: 'absolute', top: '60px', left: 0 }}>
                            {Array.from({ length: N }).map((_, i) => (
                                <div key={i} style={{ height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.85rem' }}>
                                    S{i}
                                </div>
                            ))}
                        </div>

                        {/* SVG Edges */}
                        <svg style={{ position: 'absolute', top: '60px', left: '60px', width: '100%', height: '100%', pointerEvents: 'none' }}>
                            {/* Background edges */}
                            {Array.from({ length: O.length - 1 }).map((_, t) =>
                                Array.from({ length: N }).map((_, i) =>
                                    Array.from({ length: N }).map((_, j) => (
                                        <line
                                            key={`bg-${t}-${i}-${j}`}
                                            x1={t * 80 + 40} y1={i * 60 + 30}
                                            x2={(t + 1) * 80 + 40} y2={j * 60 + 30}
                                            stroke="rgba(255,255,255,0.03)"
                                            strokeWidth={1}
                                        />
                                    ))
                                )
                            )}
                            {/* Golden path edges */}
                            {decodedResult && Array.from({ length: O.length - 1 }).map((_, t) => {
                                const fromState = decodedResult.path[t];
                                const toState = decodedResult.path[t + 1];
                                return (
                                    <motion.line
                                        key={`gold-${t}`}
                                        x1={t * 80 + 40} y1={fromState * 60 + 30}
                                        x2={(t + 1) * 80 + 40} y2={toState * 60 + 30}
                                        stroke="#fbbf24"
                                        strokeWidth={4}
                                        strokeLinecap="round"
                                        initial={{ pathLength: 0, opacity: 0 }}
                                        animate={{ pathLength: 1, opacity: 1 }}
                                        transition={{ duration: 0.4, delay: t * 0.25 }}
                                        style={{ filter: 'drop-shadow(0 0 8px rgba(251,191,36,0.5))' }}
                                    />
                                );
                            })}
                        </svg>

                        {/* Nodes */}
                        <div style={{ position: 'absolute', top: '60px', left: '60px' }}>
                            {Array.from({ length: O.length }).map((_, t) =>
                                Array.from({ length: N }).map((_, i) => {
                                    const isGolden = decodedResult?.path[t] === i;
                                    return (
                                        <motion.div
                                            key={`n-${t}-${i}`}
                                            style={{
                                                position: 'absolute',
                                                left: `${t * 80 + 28}px`,
                                                top: `${i * 60 + 18}px`,
                                                width: '24px',
                                                height: '24px',
                                                borderRadius: '50%',
                                                background: isGolden ? '#fbbf24' : 'rgba(51, 65, 85, 0.8)',
                                                border: `3px solid ${isGolden ? 'rgba(251,191,36,0.3)' : 'rgba(15,23,42,0.8)'}`,
                                                boxShadow: isGolden ? '0 0 16px rgba(251,191,36,0.6)' : 'none',
                                                zIndex: isGolden ? 10 : 1,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }}
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={isGolden ? { type: 'spring', delay: t * 0.25 + 0.15 } : { type: 'spring' }}
                                        />
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Golden Path Result */}
            <AnimatePresence>
                {decodedResult && (
                    <motion.div
                        className="golden-result"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: O.length * 0.25 + 0.5 }}
                    >
                        <div className="golden-result-icon"><FaRoute size={18} /></div>
                        <div>
                            <div className="golden-result-label">Most Probable Hidden State Sequence</div>
                            <div className="golden-path-chain">
                                {decodedResult.path.map((state, t) => (
                                    <React.Fragment key={t}>
                                        <span className="golden-path-node">S{state}</span>
                                        {t < decodedResult.path.length - 1 && <span className="golden-path-arrow">→</span>}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="feature-footer">
                <FaInfoCircle size={16} className="feature-footer-icon" style={{ color: 'var(--amber)' }} />
                <div>
                    <strong>How Viterbi works:</strong> It constructs a dynamic programming table across time, tracking the maximum
                    probability path to each state at every timestep. After the forward sweep, a traceback reveals the
                    single most probable sequence of hidden states that could have produced the observations.
                </div>
            </div>
        </motion.div>
    );
};

export default ViterbiDecoding;
