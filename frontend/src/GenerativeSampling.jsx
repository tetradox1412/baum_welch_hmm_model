import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaMagic, FaPlay, FaStop, FaInfoCircle, FaStepForward } from 'react-icons/fa';
import { BlockMath, InlineMath } from 'react-katex';

const GenerativeSampling = ({ Pi, A, B, isDark }) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [sequence, setSequence] = useState([]);
    const [currentState, setCurrentState] = useState(null);
    const [targetLength, setTargetLength] = useState(20);
    const [showDetails, setShowDetails] = useState(false);
    const timerRef = useRef(null);
    const scrollRef = useRef(null);

    const sample = (probs) => {
        const rand = Math.random();
        let cumulative = 0;
        for (let i = 0; i < probs.length; i++) {
            cumulative += probs[i];
            if (rand <= cumulative) return i;
        }
        return probs.length - 1;
    };

    const stopGeneration = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        setIsGenerating(false);
    };

    const startGeneration = () => {
        setSequence([]);
        setCurrentState(null);
        setIsGenerating(true);
        let step = 0;
        let currSt = -1;

        timerRef.current = setInterval(() => {
            if (step >= targetLength) { stopGeneration(); return; }
            currSt = step === 0 ? sample(Pi) : sample(A[currSt]);
            const emittedSymbol = sample(B[currSt]);
            setSequence(prev => [...prev, { state: currSt, symbol: emittedSymbol, step }]);
            setCurrentState(currSt);
            step++;
        }, 400);
    };

    useEffect(() => () => stopGeneration(), []);
    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTo({ left: scrollRef.current.scrollWidth, behavior: 'smooth' });
    }, [sequence]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="feature-card"
        >
            <div className="feature-header">
                <div>
                    <h3 className="feature-title">
                        <span className="feature-icon feature-icon--pink"><FaMagic /></span>
                        Generative Sampling
                    </h3>
                    <p className="feature-description">
                        HMMs are <strong>Generative Models</strong> — once Baum-Welch learns the underlying probability structure, the model
                        can <em>hallucinate</em> entirely new observation sequences that statistically mirror the original training data.
                        Watch the Markov chain physically traverse states and emit symbols in real-time.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                    <div>
                        <label className="feature-label">Sequence Length</label>
                        <input
                            type="number"
                            value={targetLength}
                            onChange={(e) => setTargetLength(Math.max(1, Math.min(100, Number(e.target.value))))}
                            className="glass-input"
                            style={{ width: '80px', padding: '8px 12px' }}
                            min="1" max="100"
                            disabled={isGenerating}
                        />
                    </div>
                    {isGenerating ? (
                        <button className="feature-btn feature-btn--red" onClick={stopGeneration} title="Stop">
                            <FaStop /> Stop
                        </button>
                    ) : (
                        <button className="feature-btn feature-btn--pink" onClick={startGeneration} title="Generate">
                            <FaPlay /> Generate
                        </button>
                    )}
                </div>
            </div>

            {/* Sequence Tape */}
            <div ref={scrollRef} className="sequence-tape">
                {sequence.length === 0 && !isGenerating ? (
                    <div className="tape-placeholder">
                        Press <strong>Generate</strong> to watch the model hallucinate a new sequence…
                    </div>
                ) : (
                    <AnimatePresence>
                        {sequence.map((item) => (
                            <motion.div
                                key={item.step}
                                className="tape-step"
                                initial={{ opacity: 0, scale: 0.5, x: 20 }}
                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                            >
                                <div
                                    className="tape-orb"
                                    style={{
                                        background: `linear-gradient(135deg, hsl(${(item.state * 70) % 360}, 65%, 48%), hsl(${(item.state * 70 + 30) % 360}, 55%, 38%))`,
                                        boxShadow: `0 0 14px hsl(${(item.state * 70) % 360}, 65%, 48%, 0.35)`
                                    }}
                                >
                                    S{item.state}
                                </div>
                                <div className="tape-arrow">↓</div>
                                <div className="tape-obs">Obs {item.symbol}</div>
                            </motion.div>
                        ))}
                        {isGenerating && (
                            <motion.div
                                className="generating-indicator"
                                style={{ flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 10px' }}
                            >
                                <FaStepForward color="var(--text-muted)" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                )}
            </div>

            {/* Footer Explanation */}
            <div className="feature-footer">
                <FaInfoCircle size={16} className="feature-footer-icon" style={{ color: 'var(--pink)' }} />
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>
                            <strong>How it works:</strong> The model samples a starting state from <strong>π</strong>,
                            emits a symbol from <strong>B</strong>, transitions to the next state via <strong>A</strong>, and repeats.
                        </span>
                        <button className="learn-more-btn" onClick={() => setShowDetails(!showDetails)}>
                            {showDetails ? 'Show Less' : 'Learn More'}
                        </button>
                    </div>

                    <AnimatePresence>
                        {showDetails && (
                            <motion.div
                                initial={{ height: 0, opacity: 0, marginTop: 0 }}
                                animate={{ height: 'auto', opacity: 1, marginTop: '16px' }}
                                exit={{ height: 0, opacity: 0, marginTop: 0 }}
                                style={{ overflow: 'hidden' }}
                            >
                                <div style={{ paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '12px', lineHeight: '1.6', color: 'var(--text-primary)' }}>
                                    <h4 style={{ margin: 0, color: 'var(--accent)', fontSize: '1.05rem' }}>What is "Generative Sampling"?</h4>
                                    <p style={{ margin: 0 }}>
                                        In Machine Learning, models are broadly divided into two families: <strong>Discriminative</strong> and <strong>Generative</strong>.
                                    </p>
                                    <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <li><strong>Discriminative Models</strong> (e.g. logistic regression, SVMs) learn how to <em style={{ color: 'var(--accent-bright)', fontStyle: 'normal' }}>separate</em> classes. They can draw a decision boundary, but cannot generate new data.</li>
                                        <li><strong>Generative Models</strong> (e.g. ChatGPT, Stable Diffusion, HMMs) learn the <em style={{ color: 'var(--accent-bright)', fontStyle: 'normal' }}>blueprint</em> of the data itself. Because they understand how data was created, they can synthesize new data from scratch.</li>
                                    </ul>
                                    <h4 style={{ margin: '8px 0 0 0', color: 'var(--accent)', fontSize: '1.05rem' }}>Why is this significant?</h4>
                                    <p style={{ margin: 0 }}>
                                        Baum-Welch optimized the matrices without ever seeing the hidden states — purely through mathematical optimization. By pressing "Generate", you use those learned matrices to <strong>hallucinate</strong> a new sequence. If the model trained well, this synthetic data will exhibit the same statistical properties as the original observations.
                                    </p>

                                    <h4 style={{ margin: '12px 0 0 0', color: 'var(--accent)', fontSize: '1.05rem' }}>The Mathematics of Generation</h4>
                                    <p style={{ margin: 0 }}>The process stochastically samples from three categorical distributions:</p>
                                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '14px 16px', borderRadius: '10px', borderLeft: '3px solid var(--accent)' }}>
                                        <ol style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                            <li>
                                                <strong>Initial State Selection</strong> — At <InlineMath math="t=1" />, sample <InlineMath math="q_1" /> from the initial distribution:
                                                <div style={{ marginTop: '6px' }}><BlockMath math="q_1 \sim \text{Categorical}(\pi)" /></div>
                                            </li>
                                            <li>
                                                <strong>Observation Emission</strong> — In state <InlineMath math="i" />, emit <InlineMath math="O_t" /> from the emission row:
                                                <div style={{ marginTop: '6px' }}><BlockMath math="O_t \sim \text{Categorical}(B_i)" /></div>
                                            </li>
                                            <li>
                                                <strong>State Transition</strong> — Transition to <InlineMath math="q_{t+1}" /> via the transition row:
                                                <div style={{ marginTop: '6px' }}><BlockMath math="q_{t+1} \sim \text{Categorical}(A_i)" /></div>
                                            </li>
                                        </ol>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );
};

export default GenerativeSampling;
