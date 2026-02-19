# Performance Optimization Report

## Summary
The application has been optimized for performance using **Code Splitting** and **Lazy Loading**. The initial bundle size has been significantly reduced by deferring the loading of heavy components and libraries until they are actually needed.

## Optimizations Applied

### 1. Lazy Loading Components
The following components are now loaded dynamically using `React.lazy` and `Suspense`:
-   **`MathExplanation`**: Contains the heavy `katex` library and math formulas. Loaded only after training is complete.
-   **`OptimizationChart`**: Contains the `recharts` library. Loaded only when results are available.
-   **`InitPlayground`**: Loaded only when the "Custom Initialization" toggle is activated.

### 2. Vendor Chunk Splitting
The build configuration (`vite.config.js`) has been updated to split vendor libraries into separate chunks:
-   `vendor`: React core
-   `charts`: Recharts
-   `animation`: Framer Motion
-   `math`: KaTeX

## Verification
Running `npm run build` now produces the following optimized chunks (sizes are approximate):
-   `index-[hash].js`: Main bundle (Reduced size)
-   `charts-[hash].js`: ~340KB (Deferred)
-   `math-[hash].js`: ~270KB (Deferred)
-   `animation-[hash].js`: ~130KB (Separate Cache)

## How to Verify
1.  Run `npm run build` in the `frontend` directory.
2.  Inspect the `dist/assets` folder or the build output to see the split chunks.
