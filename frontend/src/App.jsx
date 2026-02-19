import { useState, useRef, useCallback, useEffect } from 'react'
import axios from 'axios'
import { motion, AnimatePresence } from 'framer-motion'
import { FaPlay, FaSync, FaProjectDiagram, FaCode, FaLightbulb, FaInfoCircle } from 'react-icons/fa'
import { BlockMath, InlineMath } from 'react-katex'
import './App.css'
import OptimizationChart from './OptimizationChart';
import MathExplanation from './MathExplanation';

function App() {
  const [N, setN] = useState(2)
  const [M, setM] = useState(2)
  const [observations, setObservations] = useState(["0,1,0"])
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [hoveredEdge, setHoveredEdge] = useState(null)
  const [hoveredNode, setHoveredNode] = useState(null)
  const [graphZoom, setGraphZoom] = useState(1)

  // Drag-to-pan for the graph scroll container
  const graphScrollRef = useRef(null)
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 })
  const edgeLabelsRef = useRef({})  // stores { key: { labelX, labelY, svgSize } }

  const onMouseDown = useCallback((e) => {
    const el = graphScrollRef.current;
    if (!el) return;
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY, scrollLeft: el.scrollLeft, scrollTop: el.scrollTop };
    el.style.cursor = 'grabbing';
    e.preventDefault();
  }, []);

  const onMouseMove = useCallback((e) => {
    if (!isDragging.current) return;
    const el = graphScrollRef.current;
    if (!el) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    el.scrollLeft = dragStart.current.scrollLeft - dx;
    el.scrollTop = dragStart.current.scrollTop - dy;
  }, []);

  const onMouseUp = useCallback(() => {
    isDragging.current = false;
    if (graphScrollRef.current) graphScrollRef.current.style.cursor = 'grab';
  }, []);

  const onWheel = useCallback((e) => {
    e.preventDefault();
    setGraphZoom(prev => {
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      return Math.min(10, Math.max(0.3, prev * delta));
    });
  }, []);

  // Attach wheel listener as non-passive so preventDefault works
  useEffect(() => {
    const el = graphScrollRef.current;
    if (!el) return;
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [onWheel, result]);

  // Reset zoom when new results arrive
  useEffect(() => {
    setGraphZoom(1);
  }, [result]);

  // Auto-scroll to bring hovered edge into view
  useEffect(() => {
    if (!hoveredEdge || !graphScrollRef.current) return;
    const pos = edgeLabelsRef.current[hoveredEdge];
    if (!pos) return;
    const el = graphScrollRef.current;
    const { svgSize } = pos;
    const n = result?.A?.length || 2;
    const nodeRadius = 28;
    const padding = 120;
    const ringRadius = Math.max(120, n * 45);
    const computedSvgSize = (ringRadius + padding) * 2;
    const containerSize = 500;
    const fitZoom = Math.min(1, containerSize / computedSvgSize);
    const effectiveZoom = fitZoom * graphZoom;

    // Convert SVG coords to pixel coords in the scaled SVG
    const pixelX = pos.labelX * effectiveZoom;
    const pixelY = pos.labelY * effectiveZoom;

    // Check if the point is visible in the scroll viewport
    const viewLeft = el.scrollLeft;
    const viewTop = el.scrollTop;
    const viewRight = viewLeft + el.clientWidth;
    const viewBottom = viewTop + el.clientHeight;
    const margin = 60;

    if (pixelX < viewLeft + margin || pixelX > viewRight - margin ||
      pixelY < viewTop + margin || pixelY > viewBottom - margin) {
      el.scrollTo({
        left: pixelX - el.clientWidth / 2,
        top: pixelY - el.clientHeight / 2,
        behavior: 'smooth'
      });
    }
  }, [hoveredEdge, graphZoom, result]);

  const handleTrain = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const parsedObs = observations.map(line =>
        line.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
      ).filter(arr => arr.length > 0)

      const payload = { N: parseInt(N), M: parseInt(M), observations: parsedObs }
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await axios.post(`${apiUrl}/train`, payload)
      setResult(response.data)
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.error || err.message)
    } finally {
      setLoading(false)
    }
  }

  /* ===== Static SVG Graph Rendering ===== */
  const renderGraph = () => {
    if (!result) return null;

    const n = result.A.length;
    const nodeRadius = 28;
    const padding = 120;
    const ringRadius = Math.max(120, n * 45);
    const svgSize = (ringRadius + padding) * 2;
    const center = svgSize / 2;

    // Place nodes in a circle
    const positions = [];
    for (let i = 0; i < n; i++) {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2;
      positions.push({
        x: center + ringRadius * Math.cos(angle),
        y: center + ringRadius * Math.sin(angle),
      });
    }

    // Collect edges
    const edges = [];
    result.A.forEach((row, i) => {
      row.forEach((prob, j) => {
        if (prob > 0.005) edges.push({ from: i, to: j, prob });
      });
    });

    // Check if reverse edge exists (for curving in opposite directions)
    const hasReverse = (i, j) => result.A[j][i] > 0.005;

    // Compute curved path between two different nodes
    const makeEdgePath = (from, to, curveOffset) => {
      const x1 = positions[from].x, y1 = positions[from].y;
      const x2 = positions[to].x, y2 = positions[to].y;
      const dx = x2 - x1, dy = y2 - y1;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const nx = -dy / dist, ny = dx / dist;
      const mx = (x1 + x2) / 2 + nx * curveOffset;
      const my = (y1 + y2) / 2 + ny * curveOffset;
      const ux = dx / dist, uy = dy / dist;
      const sx = x1 + ux * nodeRadius, sy = y1 + uy * nodeRadius;
      const ex = x2 - ux * nodeRadius, ey = y2 - uy * nodeRadius;
      return { path: `M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}`, labelX: mx, labelY: my };
    };

    // Self-loop arc above node
    const makeSelfLoop = (idx) => {
      const { x, y } = positions[idx];
      const loopR = 28;
      const topY = y - nodeRadius;
      return {
        path: `M ${x - 14} ${topY} A ${loopR} ${loopR} 0 1 1 ${x + 14} ${topY}`,
        labelX: x,
        labelY: topY - loopR * 1.7,
      };
    };

    // Store edge label positions for auto-scroll
    const labelPositions = {};
    edges.forEach((edge) => {
      const key = `${edge.from}-${edge.to}`;
      const isSelf = edge.from === edge.to;
      let pathInfo;
      if (isSelf) {
        pathInfo = makeSelfLoop(edge.from);
      } else {
        const bidi = hasReverse(edge.from, edge.to);
        const curveAmt = bidi ? (edge.from < edge.to ? 45 : -45) : 30;
        pathInfo = makeEdgePath(edge.from, edge.to, curveAmt);
      }
      labelPositions[key] = { labelX: pathInfo.labelX, labelY: pathInfo.labelY, svgSize };
    });
    edgeLabelsRef.current = labelPositions;

    // Auto-fit: scale SVG to fit the 500px container
    const containerSize = 500;
    const fitZoom = Math.min(1, containerSize / svgSize);
    const effectiveZoom = fitZoom * graphZoom;

    return (
      <div
        className="graph-scroll-container"
        ref={graphScrollRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        style={{ cursor: 'grab' }}
      >
        <svg
          width={svgSize * effectiveZoom}
          height={svgSize * effectiveZoom}
          viewBox={`0 0 ${svgSize} ${svgSize}`}
          className="state-graph-svg"
        >
          <defs>
            <marker id="arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto" markerUnits="strokeWidth">
              <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
            </marker>
            <marker id="arrow-hl" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto" markerUnits="strokeWidth">
              <polygon points="0 0, 10 3.5, 0 7" fill="#f472b6" />
            </marker>
            <filter id="glow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Edges – non-hovered first, hovered last for z-ordering */}
          {edges.filter(edge => `${edge.from}-${edge.to}` !== hoveredEdge).map((edge) => {
            const key = `${edge.from}-${edge.to}`;
            const isSelf = edge.from === edge.to;

            let pathInfo;
            if (isSelf) {
              pathInfo = makeSelfLoop(edge.from);
            } else {
              const bidi = hasReverse(edge.from, edge.to);
              const curveAmt = bidi ? (edge.from < edge.to ? 45 : -45) : 30;
              pathInfo = makeEdgePath(edge.from, edge.to, curveAmt);
            }

            const strokeW = Math.max(1.5, edge.prob * 5);

            return (
              <g key={`e-${key}`}
                onMouseEnter={() => setHoveredEdge(key)}
                onMouseLeave={() => setHoveredEdge(null)}
                style={{ cursor: 'pointer' }}
              >
                <path d={pathInfo.path} fill="none" stroke="transparent" strokeWidth={18} />
                <path
                  d={pathInfo.path}
                  fill="none"
                  stroke="rgba(148, 163, 184, 0.5)"
                  strokeWidth={strokeW}
                  markerEnd={isSelf ? undefined : 'url(#arrow)'}
                  style={{ transition: 'stroke 0.2s, stroke-width 0.2s' }}
                />
                <rect
                  x={pathInfo.labelX - 52} y={pathInfo.labelY - 11}
                  width={104} height={22} rx={6}
                  fill="rgba(15, 23, 42, 0.88)"
                  stroke="rgba(148, 163, 184, 0.3)"
                  strokeWidth={1}
                />
                <text
                  x={pathInfo.labelX} y={pathInfo.labelY + 1}
                  textAnchor="middle" dominantBaseline="middle"
                  fill="#fff" fontSize="11" fontWeight="600"
                  fontFamily="'JetBrains Mono', monospace"
                  style={{ pointerEvents: 'none' }}
                >
                  S{edge.from}→S{edge.to}: {edge.prob.toFixed(4)}
                </text>
              </g>
            );
          })}

          {/* Hovered edge rendered last (on top) */}
          {edges.filter(edge => `${edge.from}-${edge.to}` === hoveredEdge).map((edge) => {
            const key = `${edge.from}-${edge.to}`;
            const isSelf = edge.from === edge.to;

            let pathInfo;
            if (isSelf) {
              pathInfo = makeSelfLoop(edge.from);
            } else {
              const bidi = hasReverse(edge.from, edge.to);
              const curveAmt = bidi ? (edge.from < edge.to ? 45 : -45) : 30;
              pathInfo = makeEdgePath(edge.from, edge.to, curveAmt);
            }

            const strokeW = Math.max(1.5, edge.prob * 5);

            return (
              <g key={`e-${key}`}
                onMouseEnter={() => setHoveredEdge(key)}
                onMouseLeave={() => setHoveredEdge(null)}
                style={{ cursor: 'pointer' }}
              >
                <path d={pathInfo.path} fill="none" stroke="transparent" strokeWidth={18} />
                <path
                  d={pathInfo.path}
                  fill="none"
                  stroke="#f472b6"
                  strokeWidth={strokeW * 2}
                  markerEnd={isSelf ? undefined : 'url(#arrow-hl)'}
                  style={{ transition: 'stroke 0.2s, stroke-width 0.2s' }}
                />
                <rect
                  x={pathInfo.labelX - 52} y={pathInfo.labelY - 11}
                  width={104} height={22} rx={6}
                  fill="rgba(244, 114, 182, 0.92)"
                  stroke="#f472b6"
                  strokeWidth={1}
                />
                <text
                  x={pathInfo.labelX} y={pathInfo.labelY + 1}
                  textAnchor="middle" dominantBaseline="middle"
                  fill="#fff" fontSize="11" fontWeight="700"
                  fontFamily="'JetBrains Mono', monospace"
                  style={{ pointerEvents: 'none' }}
                >
                  S{edge.from}→S{edge.to}: {edge.prob.toFixed(4)}
                </text>
              </g>
            );
          })}

          {/* Nodes */}
          {positions.map((pos, i) => {
            const isHov = hoveredNode === i;
            return (
              <g key={`n-${i}`}
                onMouseEnter={() => setHoveredNode(i)}
                onMouseLeave={() => setHoveredNode(null)}
                style={{ cursor: 'pointer' }}
              >
                <circle
                  cx={pos.x} cy={pos.y} r={nodeRadius}
                  fill={isHov ? '#34d399' : '#6366f1'}
                  stroke={isHov ? '#a7f3d0' : '#818cf8'}
                  strokeWidth={isHov ? 3 : 2}
                  filter="url(#glow)"
                  style={{ transition: 'fill 0.2s, stroke 0.2s' }}
                />
                <text
                  x={pos.x} y={pos.y}
                  textAnchor="middle" dominantBaseline="middle"
                  fill="#fff" fontSize="14" fontWeight="700"
                  fontFamily="Inter, sans-serif"
                  style={{ pointerEvents: 'none' }}
                >
                  S{i}
                </text>
                {/* π value below node */}
                <text
                  x={pos.x} y={pos.y + nodeRadius + 16}
                  textAnchor="middle" dominantBaseline="middle"
                  fill="#94a3b8" fontSize="10" fontWeight="500"
                  fontFamily="'JetBrains Mono', monospace"
                  style={{ pointerEvents: 'none' }}
                >
                  π={result.Pi[i].toFixed(3)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  /* ===== Cell color helper ===== */
  const cellColor = (val) => {
    if (val > 0.7) return '#34d399';
    if (val > 0.4) return '#fbbf24';
    if (val > 0.15) return '#94a3b8';
    return '#64748b';
  };

  /* ===== Render ===== */
  return (
    <motion.div
      className="App"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <motion.h1
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7 }}
      >
        Mridul's HMM Visualizer
      </motion.h1>

      {/* ===== Input Card ===== */}
      <div className="glass-card">
        <div className="params-grid">
          <div className="input-group">
            <label><FaProjectDiagram /> Hidden States (N)</label>
            <div className="number-input-wrap">
              <span className="number-stepper number-stepper--dec" onClick={() => setN(prev => Math.max(2, Number(prev) - 1))}>−</span>
              <input type="number" value={N} onChange={e => setN(e.target.value)} min="2" max="10" />
              <span className="number-stepper number-stepper--inc" onClick={() => setN(prev => Math.min(10, Number(prev) + 1))}>+</span>
            </div>
          </div>
          <div className="input-group">
            <label><FaCode /> Observable Symbols (M)</label>
            <div className="number-input-wrap">
              <span className="number-stepper number-stepper--dec" onClick={() => setM(prev => Math.max(2, Number(prev) - 1))}>−</span>
              <input type="number" value={M} onChange={e => setM(e.target.value)} min="2" max="10" />
              <span className="number-stepper number-stepper--inc" onClick={() => setM(prev => Math.min(10, Number(prev) + 1))}>+</span>
            </div>
          </div>
        </div>

        <div className="input-group">
          <label>Observation Sequences (comma-separated)</label>
          <textarea
            value={observations.join('\n')}
            onChange={e => setObservations(e.target.value.split('\n'))}
            rows="4"
            placeholder={"0, 1, 0\n1, 1, 0, 1"}
          />
        </div>

        <div className="action-bar">
          <div className="tooltip-section">
            <FaLightbulb color="#fbbf24" />
            <span>Tip: Hover over matrix cells to highlight graph edges</span>
          </div>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleTrain}
            disabled={loading}
          >
            {loading ? <FaSync className="spin" /> : <FaPlay style={{ marginRight: '6px' }} />}
            {loading ? ' Training…' : ' Train Model'}
          </motion.button>
        </div>

        {error && (
          <motion.div className="error-message" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {error}
          </motion.div>
        )}
      </div>

      {/* ===== Optimization Chart ===== */}
      {result && (
        <OptimizationChart history={result.history} executionTime={result.executionTime} isDark={true} />
      )}

      {/* ===== Results ===== */}
      <AnimatePresence>
        {result && (
          <motion.div
            className="glass-card"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.5 }}
          >
            <h2 style={{ marginBottom: '1.5rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-subtle)' }}>
              <FaProjectDiagram style={{ color: 'var(--accent)' }} />
              Training Results
            </h2>

            {/* Graph */}
            <div className="graph-container">
              {renderGraph()}
            </div>

            {/* Transition Matrix (A) */}
            <motion.div
              className="matrix-container"
              style={{ marginTop: '1.5rem' }}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <div className="matrix-header">
                <h3>Transition Matrix (A)</h3>
                <div className="info-icon" title="P(state j at t+1 | state i at t)"><FaInfoCircle /></div>
              </div>
              <div className="theory-block">
                <BlockMath math="A_{ij} = P(q_{t+1} = S_j \mid q_t = S_i)" />
              </div>
              <div className="matrix-scroll-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>From / To</th>
                      {result.A.map((_, i) => <th key={i}>S{i}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {result.A.map((row, i) => (
                      <tr key={i}>
                        <td><strong>S{i}</strong></td>
                        {row.map((val, j) => {
                          const isHl = hoveredEdge === `${i}-${j}`;
                          return (
                            <motion.td
                              key={j}
                              style={{
                                color: cellColor(val),
                                background: isHl ? 'rgba(129, 140, 248, 0.15)' : 'transparent',
                                cursor: 'crosshair'
                              }}
                              onMouseEnter={() => setHoveredEdge(`${i}-${j}`)}
                              onMouseLeave={() => setHoveredEdge(null)}
                              whileHover={{ scale: 1.08 }}
                            >
                              {val.toFixed(4)}
                            </motion.td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>


            {/* Emission Matrix (B)  */}
            <div className="results-grid">
              <motion.div
                className="matrix-container"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <div className="matrix-header">
                  <h3 style={{ background: 'linear-gradient(135deg, #ec4899, #f472b6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Emission Matrix (B)
                  </h3>
                  <div className="info-icon" title="P(symbol k | state i)"><FaInfoCircle /></div>
                </div>
                <div className="theory-block">
                  <BlockMath math="B_{ik} = P(O_t = v_k \mid q_t = S_i)" />
                </div>
                <div className="matrix-scroll-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>State</th>
                        {result.B[0].map((_, j) => <th key={j}>Sym {j}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {result.B.map((row, i) => {
                        const isRowHovered = hoveredNode === i;
                        return (
                          <motion.tr
                            key={i}
                            onMouseEnter={() => setHoveredNode(i)}
                            onMouseLeave={() => setHoveredNode(null)}
                            style={{ background: isRowHovered ? 'rgba(244, 114, 182, 0.08)' : 'transparent' }}
                          >
                            <td><strong>S{i}</strong></td>
                            {row.map((val, j) => (
                              <td key={j} style={{ color: cellColor(val) }}>
                                {val.toFixed(4)}
                              </td>
                            ))}
                          </motion.tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>

              {/* Initial Distribution (Pi) */}
              <motion.div
                className="matrix-container"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="matrix-header">
                  <h3 style={{ background: 'linear-gradient(135deg, #22d3ee, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Initial Distribution (π)
                  </h3>
                  <div className="info-icon" title="Initial state probability"><FaInfoCircle /></div>
                </div>
                <div className="theory-block">
                  <BlockMath math="\pi_i = P(q_1 = S_i)" />
                </div>
                <div className="matrix-scroll-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>State</th>
                        <th>Probability</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.Pi.map((val, i) => (
                        <tr key={i}>
                          <td><strong>S{i}</strong></td>
                          <td style={{ color: cellColor(val), fontWeight: 600 }}>
                            {val.toFixed(4)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </div>

            {/* In-depth Math Explanation */}
            <MathExplanation N={parseInt(N)} M={parseInt(M)} observations={observations} result={result} />

          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default App