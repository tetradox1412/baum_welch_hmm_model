import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

const InitPlayground = ({ N, M, initParams, setInitParams }) => {
    // Initialize params when N or M changes
    useEffect(() => {
        if (!initParams) {
            resetParams();
        } else {
            if (initParams.A.length !== N || initParams.B.length !== N ||
                (initParams.B[0] && initParams.B[0].length !== M)) {
                resetParams();
            }
        }
    }, [N, M]);

    const resetParams = () => {
        const A = Array(N).fill(0).map(() => Array(N).fill(+(1 / N).toFixed(4)));
        const B = Array(N).fill(0).map(() => Array(M).fill(+(1 / M).toFixed(4)));
        const Pi = Array(N).fill(+(1 / N).toFixed(4));
        setInitParams({ A, B, Pi });
    };

    const updateA = (r, c, val) => {
        const newA = initParams.A.map(row => [...row]);
        newA[r][c] = val;
        setInitParams({ ...initParams, A: newA });
    };

    const updateB = (r, c, val) => {
        const newB = initParams.B.map(row => [...row]);
        newB[r][c] = val;
        setInitParams({ ...initParams, B: newB });
    };

    const updatePi = (idx, val) => {
        const newPi = [...initParams.Pi];
        newPi[idx] = val;
        setInitParams({ ...initParams, Pi: newPi });
    };

    if (!initParams) return null;

    return (
        <motion.div
            className="init-playground"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35 }}
        >
            <div className="init-playground-header">
                <h3>⚙️ Parameter Initialization</h3>
                <button className="init-reset-btn" onClick={resetParams}>
                    Reset to Uniform
                </button>
            </div>

            <p className="init-description">
                Manually set the starting probabilities. Rows should sum to ~1.0.
                This lets you test how different starting points affect the final result (Local Optima).
            </p>

            <div className="init-matrices-grid">
                {/* Transition Matrix A */}
                <div className="init-matrix-section">
                    <h4 className="init-matrix-label init-matrix-label--indigo">
                        Transition Matrix A ({N}×{N})
                    </h4>
                    <div className="matrix-scroll-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th></th>
                                    {Array.from({ length: N }, (_, i) => (
                                        <th key={i}>S{i}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {initParams.A.map((row, r) => (
                                    <tr key={r}>
                                        <td className="init-row-label">S{r}</td>
                                        {row.map((val, c) => (
                                            <td key={c}>
                                                <input
                                                    type="number"
                                                    className="init-cell-input"
                                                    step="0.01"
                                                    min="0"
                                                    max="1"
                                                    value={val}
                                                    onChange={(e) => updateA(r, c, parseFloat(e.target.value) || 0)}
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Emission Matrix B */}
                <div className="init-matrix-section">
                    <h4 className="init-matrix-label init-matrix-label--pink">
                        Emission Matrix B ({N}×{M})
                    </h4>
                    <div className="matrix-scroll-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th></th>
                                    {Array.from({ length: M }, (_, i) => (
                                        <th key={i}>V{i}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {initParams.B.map((row, r) => (
                                    <tr key={r}>
                                        <td className="init-row-label">S{r}</td>
                                        {row.map((val, c) => (
                                            <td key={c}>
                                                <input
                                                    type="number"
                                                    className="init-cell-input"
                                                    step="0.01"
                                                    min="0"
                                                    max="1"
                                                    value={val}
                                                    onChange={(e) => updateB(r, c, parseFloat(e.target.value) || 0)}
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Initial Pi */}
                <div className="init-matrix-section">
                    <h4 className="init-matrix-label init-matrix-label--green">
                        Initial π ({N})
                    </h4>
                    <div className="init-pi-list">
                        {initParams.Pi.map((val, i) => (
                            <div key={i} className="init-pi-row">
                                <span className="init-row-label">S{i}</span>
                                <input
                                    type="number"
                                    className="init-cell-input init-pi-input"
                                    step="0.01"
                                    min="0"
                                    max="1"
                                    value={val}
                                    onChange={(e) => updatePi(i, parseFloat(e.target.value) || 0)}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default InitPlayground;
