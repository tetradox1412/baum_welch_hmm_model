import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

const MatrixInput = ({ label, rows, cols, data, setData, rowLabels, colLabels, color = "indigo" }) => {
    const handleChange = (r, c, val) => {
        const newData = [...data];
        newData[r][c] = val;
        setData(newData);
    };

    return (
        <div className="matrix-input-group">
            <h4 className={`text-${color}-400 mb-2 text-sm font-bold uppercase tracking-wider`}>{label}</h4>
            <div className="overflow-x-auto">
                <table className="border-collapse">
                    <thead>
                        <tr>
                            {/* Corner */}
                            <th></th>
                            {colLabels.map((lbl, i) => (
                                <th key={i} className="text-xs text-gray-400 pb-1 px-2">{lbl}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: rows }).map((_, r) => (
                            <tr key={r}>
                                <td className="text-xs text-gray-400 pr-2 font-mono whitespace-nowrap">
                                    {rowLabels ? rowLabels[r] : `S${r}`}
                                </td>
                                {Array.from({ length: cols }).map((_, c) => (
                                    <td key={c} className="p-1">
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            max="1"
                                            value={data[r][c]}
                                            onChange={(e) => handleChange(r, c, parseFloat(e.target.value) || 0)}
                                            className="w-16 bg-white/5 border border-white/10 rounded px-2 py-1 text-sm font-mono text-center focus:border-indigo-500 focus:outline-none transition-colors"
                                        />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const InitPlayground = ({ N, M, initParams, setInitParams }) => {
    // Initialize params when N or M changes
    useEffect(() => {
        if (!initParams) {
            resetParams();
        } else {
            // Check dimensions
            if (initParams.A.length !== N || initParams.B.length !== N || initParams.B[0].length !== M) {
                resetParams();
            }
        }
    }, [N, M]);

    const resetParams = () => {
        // Uniform initialization
        const A = Array(N).fill(0).map(() => Array(N).fill(1 / N));
        const B = Array(N).fill(0).map(() => Array(M).fill(1 / M));
        const Pi = Array(N).fill(1 / N);
        setInitParams({ A, B, Pi });
    };

    if (!initParams) return null;

    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card mt-4 border-l-4 border-l-purple-500"
        >
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white">Parameter Initialization</h3>
                <button
                    onClick={resetParams}
                    className="text-xs px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-gray-300 transition"
                >
                    Reset to Uniform
                </button>
            </div>

            <p className="text-sm text-gray-400 mb-6 bg-white/5 p-3 rounded">
                Manually set the starting probabilities. Rows should sum to ~1.0.
                This lets you test how different starting points affect the final result (Local Optima).
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <MatrixInput
                    label={`Transition Matrix A (${N}×${N})`}
                    rows={N} cols={N}
                    data={initParams.A}
                    setData={(d) => setInitParams({ ...initParams, A: d })}
                    colLabels={Array.from({ length: N }, (_, i) => `S${i}`)}
                />

                <MatrixInput
                    label={`Emission Matrix B (${N}×${M})`}
                    rows={N} cols={M}
                    data={initParams.B}
                    setData={(d) => setInitParams({ ...initParams, B: d })}
                    colLabels={Array.from({ length: M }, (_, i) => `V${i}`)}
                    color="pink"
                />

                <div className="matrix-input-group">
                    <h4 className="text-emerald-400 mb-2 text-sm font-bold uppercase tracking-wider">Initial Pi ({N})</h4>
                    <div className="flex flex-col gap-2">
                        {initParams.Pi.map((val, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <span className="text-xs text-gray-400 font-mono w-6">S{i}</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0" max="1"
                                    value={val}
                                    onChange={(e) => {
                                        const newPi = [...initParams.Pi];
                                        newPi[i] = parseFloat(e.target.value) || 0;
                                        setInitParams({ ...initParams, Pi: newPi });
                                    }}
                                    className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm font-mono focus:border-emerald-500 focus:outline-none transition-colors"
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
