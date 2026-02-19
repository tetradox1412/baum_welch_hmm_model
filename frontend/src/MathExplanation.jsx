import React from 'react';
import { BlockMath, InlineMath } from 'react-katex';
import { motion } from 'framer-motion';
import { FaCalculator, FaLightbulb, FaArrowRight, FaEye, FaEyeSlash, FaRedo, FaChartLine, FaSyncAlt } from 'react-icons/fa';
import 'katex/dist/katex.min.css';

const MathExplanation = ({ N, M, observations = [], result }) => {
    const n = parseInt(N) || 2;
    const m = parseInt(M) || 2;
    const states = Array.from({ length: n }, (_, i) => `S_{${i}}`).join(', ');
    const symbols = Array.from({ length: m }, (_, i) => `V_{${i}}`).join(', ');

    const rawObs = observations.length > 0 ? observations[0] : '0,1,0';
    const exampleObs =
        typeof rawObs === 'string'
            ? rawObs.split(',').map(s => parseInt(s.trim())).filter(v => !isNaN(v))
            : Array.isArray(rawObs) ? rawObs : [0, 1, 0];
    const T = exampleObs.length;
    const obsStr = exampleObs.map(o => `V_{${o}}`).join(',\\; ');

    const fadeUp = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } };

    return (
        <motion.div
            className="math-deep-dive"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-40px' }}
            transition={{ staggerChildren: 0.12 }}
        >
            {/* ── Title ── */}
            <motion.div className="math-title-bar" variants={fadeUp}>
                <FaCalculator className="math-title-icon" />
                <h2>Mathematical Deep Dive</h2>
                <span className="math-subtitle">Personalized to your model</span>
            </motion.div>

            {/* ═══════════════════ Section 1 ═══════════════════ */}
            <motion.section className="math-card" variants={fadeUp}>
                <div className="math-card-header">
                    <span className="step-badge">1</span>
                    <h3>What is an HMM?</h3>
                </div>

                <div className="analogy-box">
                    <FaLightbulb className="analogy-icon" />
                    <p>
                        <strong>Analogy:</strong> Imagine you're listening to someone talk through a wall.
                        You can hear the <em>words</em> (observations) but can't see their <em>mood</em> (hidden states).
                        An HMM lets you <strong>guess their mood sequence</strong> from the words alone.
                    </p>
                </div>

                <p>
                    An HMM is fully described by three things, written as{' '}
                    <InlineMath math="\lambda = (A,\; B,\; \pi)" />:
                </p>

                <div className="param-grid">
                    {/* Hidden States */}
                    <div className="param-card param-card--purple">
                        <div className="param-card-head">
                            <FaEyeSlash />
                            <h4>Hidden States</h4>
                        </div>
                        <p className="param-card-value">
                            <InlineMath math={`N = ${n}`} />
                        </p>
                        <p>
                            The system secretly occupies one of{' '}
                            <InlineMath math={`\\{${states}\\}`} /> at each time step—you never directly see which one.
                        </p>
                    </div>

                    {/* Observable Symbols */}
                    <div className="param-card param-card--cyan">
                        <div className="param-card-head">
                            <FaEye />
                            <h4>Observable Symbols</h4>
                        </div>
                        <p className="param-card-value">
                            <InlineMath math={`M = ${m}`} />
                        </p>
                        <p>
                            At every time step, the system <em>emits</em> one of{' '}
                            <InlineMath math={`\\{${symbols}\\}`} />. This is all you can actually observe.
                        </p>
                    </div>
                </div>

                {/* The three parameter matrices */}
                <h4 className="math-section-subtitle">The Three Parameter Matrices</h4>
                <div className="matrix-explain-grid">
                    <div className="matrix-explain-item">
                        <div className="matrix-label">A</div>
                        <div>
                            <strong>Transition Matrix</strong> (<InlineMath math={`${n}\\times${n}`} />)
                            <p>
                                <InlineMath math="A_{ij}" /> = probability of jumping from state{' '}
                                <InlineMath math="S_i" /> to <InlineMath math="S_j" />.
                            </p>
                            <div className="formula-highlight">
                                <BlockMath math="A_{ij} = P\!\left(q_{t+1}=S_j \;\middle|\; q_t=S_i\right)" />
                            </div>
                            <p className="text-subtle">Each row sums to 1.</p>
                        </div>
                    </div>

                    <div className="matrix-explain-item">
                        <div className="matrix-label matrix-label--pink">B</div>
                        <div>
                            <strong>Emission Matrix</strong> (<InlineMath math={`${n}\\times${m}`} />)
                            <p>
                                <InlineMath math="B_{ik}" /> = probability of emitting symbol{' '}
                                <InlineMath math="V_k" /> while in state <InlineMath math="S_i" />.
                            </p>
                            <div className="formula-highlight">
                                <BlockMath math="B_{ik} = P\!\left(O_t=V_k \;\middle|\; q_t=S_i\right)" />
                            </div>
                            <p className="text-subtle">Each row sums to 1.</p>
                        </div>
                    </div>

                    <div className="matrix-explain-item">
                        <div className="matrix-label matrix-label--green">π</div>
                        <div>
                            <strong>Initial Distribution</strong> (length {n})
                            <p>
                                <InlineMath math="\pi_i" /> = probability of <em>starting</em> in state{' '}
                                <InlineMath math="S_i" />.
                            </p>
                            <div className="formula-highlight">
                                <BlockMath math="\pi_i = P\!\left(q_1 = S_i\right)" />
                            </div>
                            <p className="text-subtle">All entries sum to 1.</p>
                        </div>
                    </div>
                </div>
            </motion.section>

            {/* ═══════════════════ Section 2 ═══════════════════ */}
            <motion.section className="math-card" variants={fadeUp}>
                <div className="math-card-header">
                    <span className="step-badge step-badge--pink">2</span>
                    <h3>The Learning Problem</h3>
                </div>

                <div className="analogy-box analogy-box--pink">
                    <FaLightbulb className="analogy-icon" />
                    <p>
                        <strong>Goal:</strong> Given only the words you heard{' '}
                        (<InlineMath math={`O = (${obsStr})`} />),
                        find the best model <InlineMath math="\lambda" /> that makes those words most likely.
                    </p>
                </div>

                <p>Mathematically, we want to maximize:</p>
                <div className="formula-highlight formula-highlight--wide">
                    <BlockMath math="P(O \mid \lambda) = \sum_{\text{all possible state paths}\;Q}\; P(O \mid Q, \lambda)\; P(Q \mid \lambda)" />
                </div>

                <div className="callout-warning">
                    <strong>⚠️ Problem:</strong> Brute-forcing every path means checking{' '}
                    <InlineMath math={`N^T = ${n}^{${T}} = ${Math.pow(n, T)}`} /> combinations—this
                    explodes for longer sequences! That's why we need the <strong>Baum-Welch algorithm</strong>.
                </div>
            </motion.section>

            {/* ═══════════════════ Section 3 ═══════════════════ */}
            <motion.section className="math-card" variants={fadeUp}>
                <div className="math-card-header">
                    <span className="step-badge step-badge--green">3</span>
                    <h3>Baum-Welch Algorithm</h3>
                </div>

                <p className="text-subtle" style={{ marginBottom: '1.5rem' }}>
                    An Expectation-Maximization (EM) approach: <em>guess → measure → improve → repeat</em>.
                </p>

                {/* Step 3a – Forward/Backward */}
                <div className="bw-step">
                    <div className="bw-step-header">
                        <FaArrowRight className="bw-step-icon" />
                        <h4>Step A — Forward & Backward Pass</h4>
                    </div>

                    <p>
                        For your sequence of <strong>{T} observations</strong>{' '}
                        (<InlineMath math={`${obsStr}`} />), we sweep through time in two directions:
                    </p>

                    <div className="dual-card-row">
                        <div className="dual-card dual-card--purple">
                            <h5>Forward <InlineMath math="\alpha_t(i)" /></h5>
                            <p>
                                "What is the chance of seeing <InlineMath math="O_1 \dots O_t" /> and landing in state{' '}
                                <InlineMath math="S_i" /> at time <InlineMath math="t" />?"
                            </p>
                            <div className="formula-highlight formula-highlight--compact">
                                <BlockMath math="\alpha_1(i) = \pi_i \cdot B_i(O_1)" />
                                <BlockMath math="\alpha_{t+1}(j) = \left[\sum_{i=0}^{N-1} \alpha_t(i)\,A_{ij}\right] B_j(O_{t+1})" />
                            </div>
                        </div>

                        <div className="dual-card dual-card--cyan">
                            <h5>Backward <InlineMath math="\beta_t(i)" /></h5>
                            <p>
                                "If I'm in state <InlineMath math="S_i" /> at time <InlineMath math="t" />,
                                what is the chance of seeing the <em>remaining</em> observations?"
                            </p>
                            <div className="formula-highlight formula-highlight--compact">
                                <BlockMath math="\beta_T(i) = 1" />
                                <BlockMath math="\beta_t(i) = \sum_{j=0}^{N-1} A_{ij}\,B_j(O_{t+1})\,\beta_{t+1}(j)" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Step 3b – E-step */}
                <div className="bw-step">
                    <div className="bw-step-header">
                        <FaChartLine className="bw-step-icon" />
                        <h4>Step B — Expectation (E-Step)</h4>
                    </div>

                    <p>Combine both passes to compute two key quantities:</p>

                    <div className="dual-card-row">
                        <div className="dual-card dual-card--amber">
                            <h5><InlineMath math="\gamma_t(i)" /> — State Occupancy</h5>
                            <p>"How likely was the system in state <InlineMath math="S_i" /> at time <InlineMath math="t" />?"</p>
                            <div className="formula-highlight formula-highlight--compact">
                                <BlockMath math="\gamma_t(i) = \frac{\alpha_t(i)\;\beta_t(i)}{\displaystyle\sum_{j=0}^{N-1}\alpha_t(j)\;\beta_t(j)}" />
                            </div>
                        </div>

                        <div className="dual-card dual-card--pink">
                            <h5><InlineMath math="\xi_t(i,j)" /> — Transition Count</h5>
                            <p>"How likely was a jump <InlineMath math="S_i \!\to\! S_j" /> at time <InlineMath math="t" />?"</p>
                            <div className="formula-highlight formula-highlight--compact">
                                <BlockMath math="\xi_t(i,j) = \frac{\alpha_t(i)\,A_{ij}\,B_j(O_{t\!+\!1})\,\beta_{t\!+\!1}(j)}{\displaystyle\sum_{i}\sum_{j}\alpha_t(i)\,A_{ij}\,B_j(O_{t\!+\!1})\,\beta_{t\!+\!1}(j)}" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Step 3c – M-step */}
                <div className="bw-step">
                    <div className="bw-step-header">
                        <FaSyncAlt className="bw-step-icon" />
                        <h4>Step C — Maximization (M-Step)</h4>
                    </div>

                    <p>
                        Re-estimate parameters using the expected counts. <em>Think of this as:</em>{' '}
                        "If those were the true states, what matrices would best explain the data?"
                    </p>

                    <div className="update-rules-grid">
                        <div className="update-rule">
                            <div className="update-rule-label">New <InlineMath math="\bar{A}_{ij}" /></div>
                            <div className="formula-highlight formula-highlight--compact">
                                <BlockMath math="\bar{A}_{ij} = \frac{\sum_{t=1}^{T-1}\xi_t(i,j)}{\sum_{t=1}^{T-1}\gamma_t(i)}" />
                            </div>
                            <p className="text-subtle text-sm">
                                Expected jumps <InlineMath math="S_i \!\to\! S_j" /> ÷ expected time in <InlineMath math="S_i" />
                            </p>
                        </div>

                        <div className="update-rule">
                            <div className="update-rule-label update-rule-label--pink">New <InlineMath math="\bar{B}_{ik}" /></div>
                            <div className="formula-highlight formula-highlight--compact">
                                <BlockMath math="\bar{B}_{ik} = \frac{\sum_{t : O_t = V_k}\gamma_t(i)}{\sum_{t=1}^{T}\gamma_t(i)}" />
                            </div>
                            <p className="text-subtle text-sm">
                                Expected emissions of <InlineMath math="V_k" /> from <InlineMath math="S_i" /> ÷ total time in <InlineMath math="S_i" />
                            </p>
                        </div>

                        <div className="update-rule">
                            <div className="update-rule-label update-rule-label--green">New <InlineMath math="\bar{\pi}_i" /></div>
                            <div className="formula-highlight formula-highlight--compact">
                                <BlockMath math="\bar{\pi}_i = \gamma_1(i)" />
                            </div>
                            <p className="text-subtle text-sm">
                                Probability of starting in <InlineMath math="S_i" />
                            </p>
                        </div>
                    </div>
                </div>

                {/* Convergence note */}
                <div className="analogy-box analogy-box--green" style={{ marginTop: '1.5rem' }}>
                    <FaRedo className="analogy-icon" />
                    <p>
                        <strong>Repeat</strong> steps A → B → C until the likelihood{' '}
                        <InlineMath math="P(O|\lambda)" /> stops improving (converges).
                        The Optimization Chart above shows this convergence for your training run!
                    </p>
                </div>
            </motion.section>
        </motion.div>
    );
};

export default MathExplanation;
