(function () {
    let chart = null;
    let constraints = [];
    let objective = { type: 'max', x: 0, y: 0 };

    function initGraphical() {
        console.log("initGraphical called");

        const solveBtn = document.getElementById('graph-solve-btn');
        if (solveBtn) {
            solveBtn.onclick = () => {
                console.log("Solve button clicked");
                solveGraphical(false); // Manual click -> show alerts if invalid
            };
        }

        const randomBtn = document.getElementById('graph-random-btn');
        if (randomBtn) {
            randomBtn.onclick = generateRandomProblem;
        }

        document.getElementById('graph-add-con').onclick = () => {
            addConstraintInput();
            // solveGraphical(true); // Optional: solve immediately on add? Better wait for input.
        };
        document.getElementById('graph-remove-con').onclick = () => {
            removeConstraintInput();
            solveGraphical(true);
        };

        const resetZoomBtn = document.getElementById('graph-reset-zoom');
        if (resetZoomBtn) {
            resetZoomBtn.onclick = () => {
                if (chart) chart.resetZoom();
            };
        }

        const canvasContainer = document.getElementById('graph-canvas-container');
        if (canvasContainer) {
            canvasContainer.innerHTML = '<canvas id="graphChart" style="max-height:500px;"></canvas>';
            canvasContainer.innerHTML += '<p style="color:#666;font-size:0.8rem;margin-top:0.5rem;">💡 <strong>Interactive:</strong> Click anywhere on the graph to check coordinates and Z-value. Drag/Zoom supported.</p>';
        }

        // --- REACTIVITY ---
        const debounce = (func, wait) => {
            let timeout;
            return (...args) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, args), wait);
            };
        };

        const liveSolver = debounce(() => {
            solveGraphical(true);
        }, 10); // Instant responsiveness

        // Attach listeners to container for delegation (catches inputs in constraints)
        const constraintsList = document.getElementById('graph-constraints-list');
        if (constraintsList) {
            constraintsList.addEventListener('input', liveSolver);
            constraintsList.addEventListener('change', liveSolver); // For selects/color
        }

        // Attach listeners to Objective Function inputs
        const objTypeSelect = document.getElementById('graph-obj-type');
        const objInputsContainer = document.getElementById('obj-inputs-container'); // Assuming this container exists in HTML

        if (objTypeSelect) {
            objTypeSelect.addEventListener('change', (e) => {
                if (objInputsContainer) {
                    objInputsContainer.style.display = e.target.value === 'none' ? 'none' : 'flex';
                }
                liveSolver();
            });
            // Initial state check
            if (objInputsContainer) {
                objInputsContainer.style.display = objTypeSelect.value === 'none' ? 'none' : 'flex';
            }
        }

        const objInputs = document.querySelectorAll('#graph-obj-x, #graph-obj-y');
        objInputs.forEach(inp => {
            inp.addEventListener('input', liveSolver);
            inp.addEventListener('change', liveSolver);
        });

        // Initial solve (optional, but good for "ready to go" feel)
        setTimeout(() => solveGraphical(true), 500);
    }

    function generateRandomProblem() {
        const isMax = Math.random() > 0.5;
        document.getElementById('graph-obj-type').value = isMax ? 'max' : 'min';
        document.getElementById('graph-obj-x').value = Math.floor(Math.random() * 10) + 1;
        document.getElementById('graph-obj-y').value = Math.floor(Math.random() * 10) + 1;

        const list = document.getElementById('graph-constraints-list');
        list.innerHTML = '';
        const numCons = Math.floor(Math.random() * 2) + 2;

        for (let i = 0; i < numCons; i++) {
            addConstraintInput();
        }

        const signs = ['<=', '>='];
        const rows = list.querySelectorAll('.constraint-row');
        rows.forEach(row => {
            const xCoeff = Math.floor(Math.random() * 10) + 1;
            const yCoeff = Math.floor(Math.random() * 10) + 1;
            const sign = signs[Math.floor(Math.random() * signs.length)];
            const val = Math.floor(Math.random() * 50) + 20;
            row.querySelector('.con-equation').value = `${xCoeff}x + ${yCoeff}y ${sign} ${val}`;
        });

        // Trigger update
        solveGraphical(true);
    }

    function addConstraintInput() {
        // Simple color cycler
        const colors = ['#e74c3c', '#3498db', '#9b59b6', '#f39c12', '#1abc9c', '#34495e', '#e67e22', '#2ecc71'];
        const existingRows = document.querySelectorAll('#graph-constraints-list .constraint-row');
        const nextColor = colors[existingRows.length % colors.length];

        const div = document.createElement('div');
        div.className = 'constraint-row';
        div.style.display = 'flex';
        div.style.gap = '8px';
        div.style.marginBottom = '8px';
        div.style.alignItems = 'center';
        div.innerHTML = `
            <input type="text" class="con-equation" placeholder="e.g., 3x + 2y <= 12 or x = y" value="x + y <= 10" 
                   style="flex:1; min-width:200px; padding:8px; border-radius:4px; border:1px solid var(--border-color); background:var(--bg-secondary); color:var(--text-primary); font-family:inherit;">
            <input type="color" class="con-color" value="${nextColor}" title="Line Color" style="width:40px;height:30px;padding:0;border:none;background:none;cursor:pointer;">
        `;
        document.getElementById('graph-constraints-list').appendChild(div);
    }

    // Parse equation string like "3x + 2y <= 12" or "x = y" or "y >= 2x + 1"
    function parseEquation(eqStr) {
        if (!eqStr || typeof eqStr !== 'string') return null;

        // Normalize the string
        let str = eqStr.trim().toLowerCase();

        // Replace common variations
        str = str.replace(/x1/g, 'x').replace(/x2/g, 'y');
        str = str.replace(/\s+/g, ' '); // Normalize spaces

        // Detect the operator and split
        let sign = null;
        let leftSide, rightSide;

        if (str.includes('<=')) {
            sign = 'lte';
            [leftSide, rightSide] = str.split('<=');
        } else if (str.includes('>=')) {
            sign = 'gte';
            [leftSide, rightSide] = str.split('>=');
        } else if (str.includes('<')) {
            sign = 'lt';
            [leftSide, rightSide] = str.split('<');
        } else if (str.includes('>')) {
            sign = 'gt';
            [leftSide, rightSide] = str.split('>');
        } else if (str.includes('=')) {
            sign = 'eq';
            [leftSide, rightSide] = str.split('=');
        } else {
            return null; // No valid operator found
        }

        if (!leftSide || !rightSide) return null;

        // Parse coefficients from each side
        const parseCoeffs = (side) => {
            let xCoeff = 0, yCoeff = 0, constant = 0;

            // Normalize: add + before - for easier splitting
            side = side.replace(/-/g, '+-').replace(/^\+/, '').replace(/\+\+/g, '+');

            const terms = side.split('+').filter(t => t.trim() !== '');

            for (let term of terms) {
                term = term.trim();
                if (!term) continue;

                if (term.includes('x')) {
                    // x term
                    let coeff = term.replace('x', '').trim();
                    if (coeff === '' || coeff === '+') coeff = '1';
                    if (coeff === '-') coeff = '-1';
                    xCoeff += parseFloat(coeff) || 0;
                } else if (term.includes('y')) {
                    // y term
                    let coeff = term.replace('y', '').trim();
                    if (coeff === '' || coeff === '+') coeff = '1';
                    if (coeff === '-') coeff = '-1';
                    yCoeff += parseFloat(coeff) || 0;
                } else {
                    // Constant term
                    constant += parseFloat(term) || 0;
                }
            }

            return { x: xCoeff, y: yCoeff, c: constant };
        };

        const left = parseCoeffs(leftSide);
        const right = parseCoeffs(rightSide);

        // Move everything to left side: left - right <= 0 or >= 0
        // Standard form: Ax + By <op> C
        // left.x*x + left.y*y + left.c <op> right.x*x + right.y*y + right.c
        // (left.x - right.x)*x + (left.y - right.y)*y <op> right.c - left.c

        const xCoeff = left.x - right.x;
        const yCoeff = left.y - right.y;
        const val = right.c - left.c;

        return { x: xCoeff, y: yCoeff, sign, val };
    }

    function removeConstraintInput() {
        const list = document.getElementById('graph-constraints-list');
        if (list.lastElementChild) {
            list.removeChild(list.lastElementChild);
        }
    }

    // isLive = true suppresses alerts for smoother typing experience
    function solveGraphical(isLive = false) {
        console.log("solveGraphical started", { isLive });

        try {
            const objInputs = Array.from(document.querySelectorAll('#graph-obj-x, #graph-obj-y'));

            // Check objective function inputs
            const hasObjEmpty = objInputs.some(i => i.value.trim() === '');
            if (hasObjEmpty) {
                if (!isLive) alert("Please fill in objective function coefficients.");
                return;
            }

            const objType = document.getElementById('graph-obj-type').value;
            const objX = parseFloat(document.getElementById('graph-obj-x').value) || 0;
            const objY = parseFloat(document.getElementById('graph-obj-y').value) || 0;
            objective = { type: objType, x: objX, y: objY };

            constraints = [];
            const rows = document.querySelectorAll('#graph-constraints-list .constraint-row');

            rows.forEach((row, idx) => {
                const eqInput = row.querySelector('.con-equation');
                const colorInput = row.querySelector('.con-color');

                if (!eqInput) return;

                const eqStr = eqInput.value.trim();
                if (!eqStr) return;

                const parsed = parseEquation(eqStr);
                if (!parsed) {
                    // Invalid equation, skip silently in live mode
                    return;
                }

                const color = colorInput ? colorInput.value : getLineColor(idx);
                constraints.push({ ...parsed, color });
            });

            // Implicit constraints (color not needed usually, but let's be consistent)
            constraints.push({ x: 1, y: 0, sign: 'gte', val: 0, isImplicit: true });
            constraints.push({ x: 0, y: 1, sign: 'gte', val: 0, isImplicit: true });

            const lines = [...constraints];

            let points = [];
            for (let i = 0; i < lines.length; i++) {
                for (let j = i + 1; j < lines.length; j++) {
                    const pt = getIntersection(lines[i], lines[j]);
                    if (pt && isFinite(pt.x) && isFinite(pt.y) && pt.x >= -1e-6 && pt.y >= -1e-6) {
                        points.push(pt);
                    }
                }
            }

            const feasiblePoints = points.filter(pt => {
                return constraints.every(c => checkConstraint(pt, c));
            });

            let optimalZ = objective.type === 'max' ? -Infinity : Infinity;
            let optimalPt = null;

            if (objective.type !== 'none') {
                feasiblePoints.forEach(pt => {
                    const z = objective.x * pt.x + objective.y * pt.y;
                    if (objective.type === 'max') {
                        if (z > optimalZ) {
                            optimalZ = z;
                            optimalPt = pt;
                        }
                    } else {
                        if (z < optimalZ) {
                            optimalZ = z;
                            optimalPt = pt;
                        }
                    }
                });
            } else {
                optimalZ = null;
            }

            drawChartJS(lines.filter(l => !l.isImplicit), feasiblePoints, optimalPt, optimalZ);

            if (objective.type !== 'none') {
                displaySolution(optimalPt, optimalZ);
            } else {
                document.getElementById('graph-solution').style.display = 'none';
            }

            const vizContainer = document.getElementById('graphical-viz');
            if (vizContainer) {
                vizContainer.classList.remove('hidden');
                vizContainer.style.display = 'block';
            }
        } catch (e) {
            console.error("Error in solveGraphical:", e);
            if (!isLive) alert("Error in solveGraphical: " + e.message);
        }
    }

    function getIntersection(l1, l2) {
        const det = l1.x * l2.y - l2.x * l1.y;
        if (Math.abs(det) < 1e-9) return null;
        const x = (l1.val * l2.y - l2.val * l1.y) / det;
        const y = (l1.x * l2.val - l2.x * l1.val) / det;
        return { x, y };
    }

    function checkConstraint(pt, c) {
        if (!pt || typeof pt.x !== 'number' || typeof pt.y !== 'number') return false;
        const val = c.x * pt.x + c.y * pt.y;
        const tolerance = 1e-6;
        if (c.sign === 'lte') return val <= c.val + tolerance;
        if (c.sign === 'gte') return val >= c.val - tolerance;
        if (c.sign === 'lt') return val < c.val - tolerance; // Strict
        if (c.sign === 'gt') return val > c.val + tolerance; // Strict
        if (c.sign === 'eq') return Math.abs(val - c.val) <= tolerance; // Equality
        return true;
    }

    function displaySolution(pt, z) {
        const out = document.getElementById('graph-solution');
        if (!pt) {
            out.innerHTML = `
                <div style="padding:1rem;background:rgba(220,53,69,0.1);border-radius:8px;border:1px solid rgba(220,53,69,0.3);">
                    <h3 style="color:#dc3545;margin-bottom:0.5rem;">No Feasible Solution</h3>
                    <p style="color:#666;">The constraints define an empty feasible region.</p>
                </div>
            `;
            out.classList.remove('hidden');
            out.style.display = 'block';
            return;
        }
        out.innerHTML = `
            <div style="padding:1.5rem;background:rgba(40,167,69,0.08);border-radius:8px;border:1px solid rgba(40,167,69,0.2);">
                <h3 style="color:#28a745;margin-bottom:1rem;font-weight:400;">✓ Optimal Solution Found</h3>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                    <div>
                        <span style="font-size:0.75rem;color:#666;text-transform:uppercase;letter-spacing:0.1em;">x₁</span>
                        <p style="font-size:1.5rem;font-weight:300;margin:0.25rem 0;">${pt.x.toFixed(4)}</p>
                    </div>
                    <div>
                        <span style="font-size:0.75rem;color:#666;text-transform:uppercase;letter-spacing:0.1em;">x₂</span>
                        <p style="font-size:1.5rem;font-weight:300;margin:0.25rem 0;">${pt.y.toFixed(4)}</p>
                    </div>
                </div>
                <div style="margin-top:1rem;padding-top:1rem;border-top:1px solid rgba(0,0,0,0.1);">
                    <span style="font-size:0.75rem;color:#666;text-transform:uppercase;letter-spacing:0.1em;">Optimal Z Value</span>
                    <p style="font-size:2rem;font-weight:300;margin:0.25rem 0;color:#28a745;">${z.toFixed(4)}</p>
                </div>
            </div>
        `;
        out.classList.remove('hidden');
        out.style.display = 'block';
    }

    function drawChartJS(userConstraints, feasiblePts, optPt, optZ) {
        const canvas = document.getElementById('graphChart');
        if (!canvas) return;

        if (chart) {
            chart.destroy();
        }

        // 1. Determine Scale Bounds with generous padding for "Infinite" feel
        // We will define a large ViewBox, e.g. [-5, maxX+padding, -5, maxY+padding]
        let maxX = 10, maxY = 10;

        userConstraints.forEach(l => {
            // Find intercepts to gauge scale
            if (Math.abs(l.x) > 1e-6) {
                const xInt = l.val / l.x;
                if (isFinite(xInt)) maxX = Math.max(maxX, Math.abs(xInt));
            }
            if (Math.abs(l.y) > 1e-6) {
                const yInt = l.val / l.y;
                if (isFinite(yInt)) maxY = Math.max(maxY, Math.abs(yInt));
            }
        });
        feasiblePts.forEach(p => {
            if (isFinite(p.x)) maxX = Math.max(maxX, p.x);
            if (isFinite(p.y)) maxY = Math.max(maxY, p.y);
        });

        // "Infinite" Viewport Boundaries (-X to +X)
        const rangeX = maxX * 1.5;
        const rangeY = maxY * 1.5;
        const minX = -rangeX * 0.2; // Show some negative
        const minY = -rangeY * 0.2;
        const viewMaxX = rangeX;
        const viewMaxY = rangeY;

        // Bounding Box for clipping lines & shading - use MUCH LARGER bounds to prevent cutoff
        const shadePadding = 2; // Extend shading well beyond visible area
        const bounds = {
            minX: minX * shadePadding,
            maxX: viewMaxX * shadePadding,
            minY: minY * shadePadding,
            maxY: viewMaxY * shadePadding
        };

        // 2. Prepare Datasets
        const datasets = [];

        // --- A. Half-Plane Shading (Bottom Layer) - Desmos-style ---
        // Store polygon data for custom plugin drawing (Chart.js fill doesn't work reliably in scatter)
        const shadePolygons = [];
        userConstraints.forEach((c) => {
            // Skip shading for equalities (they define lines, not regions)
            if (c.sign === 'eq') return;

            // Calculate polygon clipping against bounds
            const poly = getInequalityPolygon(c, bounds);

            // Convert hex color to rgba for shading
            const color = c.color || '#333333';
            const rgba = hexToRgba(color, 0.35); // Desmos-like opacity

            if (poly.length >= 3) {
                shadePolygons.push({
                    points: poly,
                    fillColor: rgba,
                    strokeColor: color
                });
            }
        });

        // Custom plugin to draw filled polygons using native canvas
        const shadingPlugin = {
            id: 'halfPlaneShading',
            beforeDatasetsDraw: (chart) => {
                const ctx = chart.ctx;
                const xScale = chart.scales.x;
                const yScale = chart.scales.y;

                ctx.save();

                shadePolygons.forEach(({ points, fillColor }) => {
                    if (points.length < 3) return;

                    ctx.beginPath();
                    ctx.fillStyle = fillColor;

                    const startX = xScale.getPixelForValue(points[0].x);
                    const startY = yScale.getPixelForValue(points[0].y);
                    ctx.moveTo(startX, startY);

                    for (let i = 1; i < points.length; i++) {
                        const px = xScale.getPixelForValue(points[i].x);
                        const py = yScale.getPixelForValue(points[i].y);
                        ctx.lineTo(px, py);
                    }

                    ctx.closePath();
                    ctx.fill();
                });

                ctx.restore();
            }
        };

        // --- B. Infinite Lines (Middle Layer) ---
        const signSymbols = { lte: '≤', gte: '≥', lt: '<', gt: '>', eq: '=' };
        userConstraints.forEach((c) => {
            const pts = getClippedLinePoints(c, bounds);
            const isStrict = c.sign === 'lt' || c.sign === 'gt';
            const signSymbol = signSymbols[c.sign] || c.sign;
            datasets.push({
                label: `${c.x}x₁ + ${c.y}x₂ ${signSymbol} ${c.val}`,
                data: pts,
                borderColor: c.color || '#333',
                borderWidth: 2,
                borderDash: isStrict ? [10, 5] : [], // Dashed if strict inequality
                pointRadius: 0,
                fill: false,
                showLine: true,
                tension: 0,
                order: 5
            });
        });

        // --- C. Feasible Region Overlay (Green, Darker Intersection) ---
        if (feasiblePts.length >= 3) {
            const hull = getConvexHull(feasiblePts);
            const hullData = hull.map(p => ({ x: p.x, y: p.y }));
            hullData.push(hullData[0]);
            datasets.push({
                label: 'Feasible Area',
                data: hullData,
                backgroundColor: 'rgba(40, 167, 69, 0.5)', // Distinct green
                borderColor: '#28a745',
                borderWidth: 3,
                fill: true,
                showLine: true,
                pointRadius: 0,
                tension: 0,
                order: 3
            });
        }

        // --- D. Corner Points ---
        const cornerPoints = feasiblePts.map(p => ({ x: p.x, y: p.y }));
        datasets.push({
            label: 'Corner Points',
            data: cornerPoints,
            backgroundColor: '#ffffff',
            borderColor: '#007bff',
            borderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            showLine: false,
            order: 2
        });

        // --- E. Optimal Point ---
        if (optPt && optZ !== null) {
            datasets.push({
                label: `Result: Z=${optZ.toFixed(2)}`,
                data: [{ x: optPt.x, y: optPt.y }],
                backgroundColor: '#dc3545',
                borderColor: '#dc3545',
                pointRadius: 8,
                pointHoverRadius: 10,
                pointStyle: 'circle',
                showLine: false,
                order: 1
            });
        }

        // --- F. Interactive Marker ---
        const interactiveDatasetIndex = datasets.length;
        datasets.push({
            label: 'Inspected Point',
            data: [],
            backgroundColor: '#ff9f43',
            borderColor: '#ff9f43',
            pointRadius: 6,
            pointStyle: 'rectRot',
            showLine: false,
            order: 0 // Top
        });

        chart = new Chart(canvas, {
            type: 'scatter',
            data: { datasets },
            plugins: [shadingPlugin], // Custom plugin for half-plane shading
            options: {
                responsive: true,
                maintainAspectRatio: false,
                aspectRatio: 1.5,
                animation: { duration: 0 }, // Instant
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        min: Math.floor(minX),
                        max: Math.ceil(viewMaxX),
                        grid: {
                            color: (ctx) => ctx.tick.value === 0 ? '#000' : 'rgba(0,0,0,0.1)',
                            lineWidth: (ctx) => ctx.tick.value === 0 ? 2 : 1,
                        },
                        title: { display: true, text: 'x₁', font: { weight: 'bold' } }
                    },
                    y: {
                        type: 'linear',
                        min: Math.floor(minY),
                        max: Math.ceil(viewMaxY),
                        grid: {
                            color: (ctx) => ctx.tick.value === 0 ? '#000' : 'rgba(0,0,0,0.1)',
                            lineWidth: (ctx) => ctx.tick.value === 0 ? 2 : 1,
                        },
                        title: { display: true, text: 'x₂', font: { weight: 'bold' } }
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            boxWidth: 10,
                            filter: (item) => item.text !== 'Shade' // Hide individual shade entries
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const pt = ctx.raw;
                                if (ctx.datasetIndex === interactiveDatasetIndex && objective.type !== 'none') {
                                    const z = objective.x * pt.x + objective.y * pt.y;
                                    return `(${pt.x.toFixed(2)}, ${pt.y.toFixed(2)}) Z = ${z.toFixed(2)}`;
                                }
                                return `(${pt.x.toFixed(2)}, ${pt.y.toFixed(2)})`;
                            }
                        }
                    },
                    zoom: {
                        zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'xy' },
                        pan: { enabled: true, mode: 'xy' }
                    }
                },
                onClick: (evt) => {
                    const xAxis = chart.scales.x;
                    const yAxis = chart.scales.y;
                    const xClick = xAxis.getValueForPixel(evt.x);
                    const yClick = yAxis.getValueForPixel(evt.y);

                    if (isFinite(xClick) && isFinite(yClick)) {
                        chart.data.datasets[interactiveDatasetIndex].data = [{ x: xClick, y: yClick }];

                        let label = `(${xClick.toFixed(1)}, ${yClick.toFixed(1)})`;
                        if (objective.type !== 'none') {
                            const currentZ = objective.x * xClick + objective.y * yClick;
                            label += ` Z=${currentZ.toFixed(2)}`;
                        }

                        chart.data.datasets[interactiveDatasetIndex].label = label;
                        chart.update('none');
                    }
                }
            }
        });
    }

    // --- GEOMETRY HELPERS ---

    // Get 2 points representing the line clipped to bounds
    function getClippedLinePoints(c, b) {
        // Ax + By = Val
        // Intersect with x=minX, x=maxX, y=minY, y=maxY
        const pts = [];
        const { minX, maxX, minY, maxY } = b;
        const tol = 1e-9;

        const candidates = [];

        // Intersection with x = minX
        if (Math.abs(c.y) > tol) candidates.push({ x: minX, y: (c.val - c.x * minX) / c.y });
        // Intersection with x = maxX
        if (Math.abs(c.y) > tol) candidates.push({ x: maxX, y: (c.val - c.x * maxX) / c.y });
        // Intersection with y = minY
        if (Math.abs(c.x) > tol) candidates.push({ x: (c.val - c.y * minY) / c.x, y: minY });
        // Intersection with y = maxY
        if (Math.abs(c.x) > tol) candidates.push({ x: (c.val - c.y * maxY) / c.x, y: maxY });

        // Filter points within bounds
        const epsilon = 1e-5; // Tolerance for floating point comparisons
        const valid = candidates.filter(p =>
            p.x >= minX - epsilon && p.x <= maxX + epsilon &&
            p.y >= minY - epsilon && p.y <= maxY + epsilon
        );

        // Sort unique points to ensure consistent line drawing
        valid.sort((p1, p2) => p1.x - p2.x || p1.y - p2.y);

        // Remove duplicates
        const unique = [];
        if (valid.length > 0) unique.push(valid[0]);
        for (let i = 1; i < valid.length; i++) {
            const last = unique[unique.length - 1];
            if (Math.abs(valid[i].x - last.x) > epsilon || Math.abs(valid[i].y - last.y) > epsilon) {
                unique.push(valid[i]);
            }
        }

        return unique;
    }

    // Get polygon for the half-plane inequality clipped to bounds
    function getInequalityPolygon(c, b) {
        // 1. Get clipped line points (2 points usually)
        const linePts = getClippedLinePoints(c, b);
        if (linePts.length < 2) {
            // If the line doesn't intersect the box, check if the entire box satisfies the constraint
            const testPoint = { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
            if (checkConstraint(testPoint, c)) {
                // Entire box is feasible, return box corners
                return [
                    { x: b.minX, y: b.minY },
                    { x: b.maxX, y: b.minY },
                    { x: b.maxX, y: b.maxY },
                    { x: b.minX, y: b.maxY },
                    { x: b.minX, y: b.minY } // Close loop
                ];
            }
            return []; // Entire box is infeasible
        }

        // 2. Add corners of bounding box that satisfy inequality
        const corners = [
            { x: b.minX, y: b.minY },
            { x: b.maxX, y: b.minY },
            { x: b.maxX, y: b.maxY },
            { x: b.minX, y: b.maxY }
        ];

        const validCorners = corners.filter(p => checkConstraint(p, c));

        // 3. Combine line points and valid corners
        const allPoints = [...linePts, ...validCorners];

        // Remove duplicates from allPoints
        const uniquePoints = [];
        const seen = new Set();
        const epsilon = 1e-5;
        for (const p of allPoints) {
            const key = `${p.x.toFixed(5)},${p.y.toFixed(5)}`;
            if (!seen.has(key)) {
                uniquePoints.push(p);
                seen.add(key);
            }
        }

        // 4. Sort points to form a convex polygon (Graham scan or simple atan2)
        if (uniquePoints.length < 3) return []; // Need at least 3 points for a polygon

        // Find centroid for sorting
        const center = uniquePoints.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
        center.x /= uniquePoints.length;
        center.y /= uniquePoints.length;

        uniquePoints.sort((a, b) => {
            const angleA = Math.atan2(a.y - center.y, a.x - center.x);
            const angleB = Math.atan2(b.y - center.y, b.x - center.x);
            if (angleA !== angleB) return angleA - angleB;
            // If angles are the same, sort by distance from center
            const distA = (a.x - center.x) ** 2 + (a.y - center.y) ** 2;
            const distB = (b.x - center.x) ** 2 + (b.y - center.y) ** 2;
            return distA - distB;
        });

        uniquePoints.push(uniquePoints[0]); // Close loop
        return uniquePoints;
    }

    function hexToRgba(hex, alpha) {
        // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
        const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthandRegex, function (m, r, g, b) {
            return r + r + g + g + b + b;
        });
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${alpha})` : `rgba(0,0,0,${alpha})`;
    }

    function getLineColor(idx) {
        const colors = [
            '#e74c3c', '#3498db', '#9b59b6', '#f39c12',
            '#1abc9c', '#34495e', '#e67e22', '#2ecc71'
        ];
        return colors[idx % colors.length];
    }

    function getConvexHull(points) {
        if (points.length <= 2) return points;

        const sorted = points.slice().sort((a, b) => a.x - b.x || a.y - b.y);
        const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

        const lower = [];
        for (let p of sorted) {
            while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
                lower.pop();
            }
            lower.push(p);
        }

        const upper = [];
        for (let i = sorted.length - 1; i >= 0; i--) {
            const p = sorted[i];
            while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
                upper.pop();
            }
            upper.push(p);
        }

        return lower.concat(upper.slice(1, -1));
    }

    window.initGraphical = initGraphical;

})();
