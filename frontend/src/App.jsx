import { useState, useRef, useCallback, useEffect, lazy, Suspense } from 'react'
import axios from 'axios'
import { motion, AnimatePresence } from 'framer-motion'
import { FaPlay, FaPause, FaSync, FaProjectDiagram, FaCode, FaLightbulb, FaInfoCircle, FaStepBackward, FaStepForward, FaFastBackward, FaFastForward } from 'react-icons/fa'
import { BlockMath, InlineMath } from 'react-katex'
import './App.css'
const OptimizationChart = lazy(() => import('./OptimizationChart'));
const MathExplanation = lazy(() => import('./MathExplanation'));
const InitPlayground = lazy(() => import('./InitPlayground'));
const GenerativeSampling = lazy(() => import('./GenerativeSampling'));
const SensitivityAnalysis = lazy(() => import('./SensitivityAnalysis'));
const ViterbiDecoding = lazy(() => import('./ViterbiDecoding'));
import LandingPage from './LandingPage';

function App() {
  const [N, setN] = useState(2)
  const [M, setM] = useState(2)
  const [maxIter, setMaxIter] = useState(50)
  const [observations, setObservations] = useState(["0,1,0"])
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showLanding, setShowLanding] = useState(true);

  const [hoveredEdge, setHoveredEdge] = useState(null)
  const [hoveredNode, setHoveredNode] = useState(null)
  const [graphZoom, setGraphZoom] = useState(1)

  const [showInit, setShowInit] = useState(false);
  const [initParams, setInitParams] = useState(null);
  const [showParticles, setShowParticles] = useState(true);

  // Playback state
  const [currentIter, setCurrentIter] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Lazy-load particles: only render when graph is visible in viewport
  const [graphVisible, setGraphVisible] = useState(false);
  const graphContainerRef = useRef(null);

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

  // Reset zoom and playback when new results arrive
  useEffect(() => {
    setGraphZoom(1);
    if (result && result.history) {
      setCurrentIter(result.history.length - 1); // Default to final iteration
      setIsPlaying(false);
    }
  }, [result]);

  // Handle Playback Interval
  useEffect(() => {
    let intervalId;
    if (isPlaying && result && currentIter < result.history.length - 1) {
      intervalId = setInterval(() => {
        setCurrentIter(prev => prev + 1);
      }, 600 / playbackSpeed);
    } else if (isPlaying && result && currentIter >= result.history.length - 1) {
      setIsPlaying(false);
    }
    return () => clearInterval(intervalId);
  }, [isPlaying, result, currentIter, playbackSpeed]);

  // IntersectionObserver for lazy-loading particles
  useEffect(() => {
    const el = graphContainerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setGraphVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
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

      const payload = {
        N: parseInt(N),
        M: parseInt(M),
        maxIter: parseInt(maxIter) || 50,
        observations: parsedObs,
        initParams: showInit ? initParams : null
      }
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

  // Show landing page
  if (showLanding) {
    return <LandingPage onStart={() => setShowLanding(false)} />;
  }

  /* ===== Static SVG Graph Rendering ===== */
  const renderGraph = () => {
    if (!result) return null;

    // Get parameters for the CURRENT iteration
    const stateA = result.history[currentIter]?.A || result.A;
    const statePi = result.history[currentIter]?.Pi || result.Pi;

    const n = stateA.length;
    const nodeRadius = 28;
    const padding = 120;
    // Cap ring radius to ensure the SVG doesn't become impossibly large for N=50
    // 35 * n provides enough circumference but we clamp at 1800 to avoid browser issues
    const ringRadius = Math.min(1800, Math.max(120, n * 35));
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
    stateA.forEach((row, i) => {
      row.forEach((prob, j) => {
        if (prob > 0.005) edges.push({ from: i, to: j, prob });
      });
    });

    // Check if reverse edge exists (for curving in opposite directions)
    const hasReverse = (i, j) => stateA[j][i] > 0.005;

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
            <filter id="particleGlow">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <radialGradient id="particleGradient">
              <stop offset="0%" stopColor="#c4b5fd" />
              <stop offset="100%" stopColor="#818cf8" />
            </radialGradient>
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

                {/* Flowing Particles — lazy loaded */}
                {graphVisible && showParticles && edge.prob > 0.05 && Array.from({ length: Math.ceil(edge.prob * 4) }).map((_, pIdx) => {
                  const numParticles = Math.ceil(edge.prob * 4);
                  const dur = 2.5 - Math.min(1.5, edge.prob * 1.5);
                  return (
                    <circle
                      key={`p-${key}-${pIdx}`}
                      r={2}
                      fill="url(#particleGradient)"
                      filter="url(#particleGlow)"
                      opacity={0.85}
                    >
                      <animateMotion
                        dur={`${dur}s`}
                        repeatCount="indefinite"
                        path={pathInfo.path}
                        begin={`${(pIdx * dur) / numParticles}s`}
                      />
                    </circle>
                  )
                })}
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

                {/* Hovered Flowing Particles — lazy loaded */}
                {graphVisible && showParticles && edge.prob > 0.01 && Array.from({ length: Math.ceil(edge.prob * 6) }).map((_, pIdx) => {
                  const numParticles = Math.ceil(edge.prob * 6);
                  const dur = 2.0 - Math.min(1.0, edge.prob);
                  return (
                    <circle
                      key={`hp-${key}-${pIdx}`}
                      r={3.0}
                      fill="#f472b6"
                      filter="url(#particleGlow)"
                      opacity={1}
                    >
                      <animateMotion
                        dur={`${dur}s`}
                        repeatCount="indefinite"
                        path={pathInfo.path}
                        begin={`${(pIdx * dur) / numParticles}s`}
                      />
                    </circle>
                  )
                })}
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
                  π={statePi[i].toFixed(3)}
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
      >
        Hidden Markov Model
      </motion.h1>
      <p className="author-credit"><span>— By <strong>Mridul Joy</strong></span></p>

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
          <div className="input-group">
            <label><FaSync /> Max Iterations</label>
            <div className="number-input-wrap">
              <span className="number-stepper number-stepper--dec" onClick={() => setMaxIter(prev => Math.max(5, Number(prev) - 5))}>−</span>
              <input type="number" value={maxIter} onChange={e => setMaxIter(e.target.value)} min="5" max="500" />
              <span className="number-stepper number-stepper--inc" onClick={() => setMaxIter(prev => Math.min(500, Number(prev) + 5))}>+</span>
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

        {/* Custom Initialization Toggle */}
        <div className="custom-toggle-container">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={showInit}
              onChange={e => setShowInit(e.target.checked)}
              className="toggle-input"
            />
            <div className="toggle-slider"></div>
            <span className="toggle-text">
              Custom Initialization <span className="toggle-subtext">(Advanced)</span>
            </span>
          </label>
        </div>

        {/* Animation Toggle */}
        <div className="custom-toggle-container" style={{ marginTop: '0.75rem' }}>
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={showParticles}
              onChange={e => setShowParticles(e.target.checked)}
              className="toggle-input"
            />
            <div className="toggle-slider"></div>
            <span className="toggle-text">
              Animate Probability Flow <span className="toggle-subtext">(Visual)</span>
            </span>
          </label>
        </div>

        {/* Init Playground Component */}
        <AnimatePresence>
          {showInit && (
            <Suspense fallback={<div className="p-4 text-center text-gray-400 text-sm">Loading playground...</div>}>
              <InitPlayground
                N={parseInt(N)}
                M={parseInt(M)}
                initParams={initParams}
                setInitParams={setInitParams}
              />
            </Suspense>
          )}
        </AnimatePresence>

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
            style={{ display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}
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
      {
        result && (
          <Suspense fallback={<div className="h-64 flex items-center justify-center text-gray-500 text-sm">Loading chart...</div>}>
            <OptimizationChart history={result.history} executionTime={result.executionTime} isDark={true} />
          </Suspense>
        )
      }

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

            {/* Playback Controls */}
            {result.history && result.history.length > 0 && (
              <div className="playback-panel">
                {/* Top: Iteration Badge */}
                <div className="playback-iter-badge">
                  <span className="playback-iter-text">Iteration</span>
                  <span className="playback-iter-num">{currentIter + 1}</span>
                  <span className="playback-iter-sep">/</span>
                  <span className="playback-iter-total">{result.history.length}</span>
                </div>

                {/* Progress Bar */}
                <div className="playback-track-wrapper">
                  <div className="playback-track">
                    <div
                      className="playback-track-fill"
                      style={{ width: `${(currentIter / Math.max(1, result.history.length - 1)) * 100}%` }}
                    />
                    <div
                      className="playback-track-thumb"
                      style={{ left: `${(currentIter / Math.max(1, result.history.length - 1)) * 100}%` }}
                    />
                  </div>
                  <input
                    type="range"
                    className="playback-track-input"
                    min="0"
                    max={result.history.length - 1}
                    value={currentIter}
                    onChange={(e) => {
                      setIsPlaying(false);
                      setCurrentIter(parseInt(e.target.value));
                    }}
                  />
                </div>

                {/* Transport Controls */}
                <div className="playback-transport">
                  <button className="transport-btn" onClick={() => { setIsPlaying(false); setCurrentIter(0); }} title="First">
                    <FaFastBackward />
                  </button>
                  <button className="transport-btn" onClick={() => { setIsPlaying(false); setCurrentIter(prev => Math.max(0, prev - 1)); }} title="Step Back">
                    <FaStepBackward />
                  </button>
                  <button
                    className="transport-btn transport-btn--play"
                    onClick={() => {
                      if (currentIter >= result.history.length - 1) setCurrentIter(0);
                      setIsPlaying(!isPlaying);
                    }}
                  >
                    {isPlaying ? <FaPause /> : <FaPlay style={{ marginLeft: '2px' }} />}
                  </button>
                  <button className="transport-btn" onClick={() => { setIsPlaying(false); setCurrentIter(prev => Math.min(result.history.length - 1, prev + 1)); }} title="Step Forward">
                    <FaStepForward />
                  </button>
                  <button className="transport-btn" onClick={() => { setIsPlaying(false); setCurrentIter(result.history.length - 1); }} title="Last">
                    <FaFastForward />
                  </button>

                  {/* Speed Selector */}
                  <div className="playback-speed">
                    {[0.5, 1, 2, 3].map(s => (
                      <button
                        key={s}
                        className={`speed-chip ${playbackSpeed === s ? 'speed-chip--active' : ''}`}
                        onClick={() => setPlaybackSpeed(s)}
                      >
                        {s}×
                      </button>
                    ))}
                  </div>
                </div>

                {/* Log Likelihood */}
                <div className="playback-logL">
                  ℓ = {result.history[currentIter].logLikelihood.toFixed(4)}
                </div>
              </div>
            )}

            {/* Graph */}
            <div className="graph-container" ref={graphContainerRef}>
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
                      {(result.history[currentIter]?.A || result.A).map((_, i) => <th key={i}>S{i}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {(result.history[currentIter]?.A || result.A).map((row, i) => (
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
                                cursor: 'crosshair',
                                transition: 'color 0.3s ease'
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
                        {(result.history[currentIter]?.B || result.B)[0].map((_, j) => <th key={j}>Sym {j}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {(result.history[currentIter]?.B || result.B).map((row, i) => {
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
                              <td key={j} style={{ color: cellColor(val), transition: 'color 0.3s ease' }}>
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
                      {(result.history[currentIter]?.Pi || result.Pi).map((val, i) => (
                        <tr key={i}>
                          <td><strong>S{i}</strong></td>
                          <td style={{ color: cellColor(val), fontWeight: 600, transition: 'color 0.3s ease' }}>
                            {val.toFixed(4)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </div>

            {/* Generative Sampling Simulation */}
            <Suspense fallback={<div className="h-64 flex items-center justify-center text-gray-500">Loading generator...</div>}>
              <GenerativeSampling Pi={result.history[currentIter]?.Pi || result.Pi} A={result.history[currentIter]?.A || result.A} B={result.history[currentIter]?.B || result.B} isDark={true} />
            </Suspense>

            {/* Interactive What-If Sensitivity Topography */}
            <Suspense fallback={<div className="h-64 flex items-center justify-center text-gray-500">Loading sensitivity analysis...</div>}>
              <SensitivityAnalysis Pi={result.history[currentIter]?.Pi || result.Pi} A={result.history[currentIter]?.A || result.A} B={result.history[currentIter]?.B || result.B} originalLL={result.final_log_likelihood} observationsText={observations} isDark={true} />
            </Suspense>

            {/* Live Viterbi Decoding */}
            <Suspense fallback={<div className="h-64 flex items-center justify-center text-gray-500">Loading Viterbi decoder...</div>}>
              <ViterbiDecoding Pi={result.history[currentIter]?.Pi || result.Pi} A={result.history[currentIter]?.A || result.A} B={result.history[currentIter]?.B || result.B} isDark={true} />
            </Suspense>

            {/* In-depth Math Explanation */}
            <Suspense fallback={<div className="h-64 flex items-center justify-center text-gray-500">Loading explanation...</div>}>
              <MathExplanation N={parseInt(N)} M={parseInt(M)} observations={observations} result={result} />
            </Suspense>

          </motion.div>
        )}
      </AnimatePresence>


    </motion.div >
  )
}

export default App