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
                solveGraphical();
            };
        }

        const randomBtn = document.getElementById('graph-random-btn');
        if (randomBtn) {
            randomBtn.onclick = generateRandomProblem;
        }

        document.getElementById('graph-add-con').onclick = addConstraintInput;
        document.getElementById('graph-remove-con').onclick = removeConstraintInput;

        const canvasContainer = document.getElementById('graph-canvas-container');
        if (canvasContainer) {
            canvasContainer.innerHTML = '<canvas id="graphChart" style="max-height:500px;"></canvas>';
            canvasContainer.innerHTML += '<p style="color:#666;font-size:0.8rem;margin-top:0.5rem;">💡 Use mouse wheel to zoom, drag to pan. Double-click to reset.</p>';
        }
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

        const rows = list.querySelectorAll('.constraint-row');
        rows.forEach(row => {
            row.querySelector('.con-x').value = Math.floor(Math.random() * 10) + 1;
            row.querySelector('.con-y').value = Math.floor(Math.random() * 10) + 1;
            row.querySelector('.con-sign').value = 'lte';
            row.querySelector('.con-val').value = Math.floor(Math.random() * 50) + 20;
        });
    }

    function addConstraintInput() {
        const div = document.createElement('div');
        div.className = 'constraint-row';
        div.style.display = 'flex';
        div.style.gap = '8px';
        div.style.marginBottom = '8px';
        div.innerHTML = `
            <input type="number" class="con-x" placeholder="x1 coeff" value="1" style="width:80px">
            <span>x1 +</span>
            <input type="number" class="con-y" placeholder="x2 coeff" value="1" style="width:80px">
            <span>x2</span>
            <select class="con-sign">
                <option value="lte">≤</option>
                <option value="gte">≥</option>
            </select>
            <input type="number" class="con-val" placeholder="Value" value="10" style="width:80px">
        `;
        document.getElementById('graph-constraints-list').appendChild(div);
    }

    function removeConstraintInput() {
        const list = document.getElementById('graph-constraints-list');
        if (list.lastElementChild) {
            list.removeChild(list.lastElementChild);
        }
    }

    function solveGraphical() {
        console.log("solveGraphical started");

        try {
            const objType = document.getElementById('graph-obj-type').value;
            const objX = parseFloat(document.getElementById('graph-obj-x').value) || 0;
            const objY = parseFloat(document.getElementById('graph-obj-y').value) || 0;
            objective = { type: objType, x: objX, y: objY };
            console.log("Objective:", objective);

            constraints = [];
            const rows = document.querySelectorAll('#graph-constraints-list .constraint-row');

            rows.forEach((row, idx) => {
                const xInput = row.querySelector('.con-x');
                const yInput = row.querySelector('.con-y');
                const signInput = row.querySelector('.con-sign');
                const valInput = row.querySelector('.con-val');

                if (!xInput || !yInput || !signInput || !valInput) {
                    console.error("Invalid constraint row definition", row);
                    return;
                }

                const x = parseFloat(xInput.value) || 0;
                const y = parseFloat(yInput.value) || 0;
                const sign = signInput.value;
                const val = parseFloat(valInput.value) || 0;
                constraints.push({ x, y, sign, val });
                console.log(`Constraint ${idx}:`, { x, y, sign, val });
            });

            constraints.push({ x: 1, y: 0, sign: 'gte', val: 0 });
            constraints.push({ x: 0, y: 1, sign: 'gte', val: 0 });

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
            console.log("Intersection Points:", points);

            const feasiblePoints = points.filter(pt => {
                return constraints.every(c => checkConstraint(pt, c));
            });
            console.log("Feasible Points:", feasiblePoints);

            let optimalZ = objective.type === 'max' ? -Infinity : Infinity;
            let optimalPt = null;

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
            console.log("Optimal Point:", optimalPt, "Z:", optimalZ);

            drawChartJS(lines.slice(0, -2), feasiblePoints, optimalPt, optimalZ);
            displaySolution(optimalPt, optimalZ);

            const vizContainer = document.getElementById('graphical-viz');
            if (vizContainer) {
                vizContainer.classList.remove('hidden');
                vizContainer.style.display = 'block';
            }
        } catch (e) {
            console.error("Error in solveGraphical:", e);
            alert("Error in solveGraphical: " + e.message);
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

        let maxX = 10, maxY = 10;
        userConstraints.forEach(l => {
            if (Math.abs(l.x) > 1e-6) {
                const xInt = l.val / l.x;
                if (xInt > 0 && isFinite(xInt)) maxX = Math.max(maxX, xInt * 1.3);
            }
            if (Math.abs(l.y) > 1e-6) {
                const yInt = l.val / l.y;
                if (yInt > 0 && isFinite(yInt)) maxY = Math.max(maxY, yInt * 1.3);
            }
        });
        feasiblePts.forEach(p => {
            if (isFinite(p.x)) maxX = Math.max(maxX, p.x * 1.3);
            if (isFinite(p.y)) maxY = Math.max(maxY, p.y * 1.3);
        });

        const datasets = [];

        userConstraints.forEach((c, idx) => {
            const lineData = getConstraintLinePoints(c, maxX, maxY);
            datasets.push({
                label: `${c.x}x₁ + ${c.y}x₂ ${c.sign === 'lte' ? '≤' : '≥'} ${c.val}`,
                data: lineData,
                borderColor: getLineColor(idx),
                borderWidth: 2,
                pointRadius: 0,
                fill: false,
                showLine: true,
                tension: 0
            });
        });

        if (feasiblePts.length >= 3) {
            const hull = getConvexHull(feasiblePts);
            const hullData = hull.map(p => ({ x: p.x, y: p.y }));
            hullData.push(hullData[0]);
            datasets.push({
                label: 'Feasible Region',
                data: hullData,
                backgroundColor: 'rgba(40, 167, 69, 0.2)',
                borderColor: 'rgba(40, 167, 69, 0.8)',
                borderWidth: 2,
                fill: true,
                showLine: true,
                pointRadius: 0,
                tension: 0
            });
        }

        const cornerPoints = feasiblePts.map(p => ({ x: p.x, y: p.y }));
        datasets.push({
            label: 'Corner Points',
            data: cornerPoints,
            backgroundColor: '#007bff',
            borderColor: '#0056b3',
            pointRadius: 5,
            pointHoverRadius: 8,
            showLine: false
        });

        if (optPt) {
            datasets.push({
                label: `Optimal (${optPt.x.toFixed(2)}, ${optPt.y.toFixed(2)}) Z=${optZ.toFixed(2)}`,
                data: [{ x: optPt.x, y: optPt.y }],
                backgroundColor: '#dc3545',
                borderColor: '#dc3545',
                pointRadius: 10,
                pointHoverRadius: 14,
                pointStyle: 'star',
                showLine: false
            });
        }

        chart = new Chart(canvas, {
            type: 'scatter',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 1.5,
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        min: 0,
                        max: Math.ceil(maxX),
                        title: {
                            display: true,
                            text: 'x₁',
                            font: { size: 14, weight: 'bold' }
                        },
                        grid: {
                            color: 'rgba(0,0,0,0.1)'
                        }
                    },
                    y: {
                        type: 'linear',
                        min: 0,
                        max: Math.ceil(maxY),
                        title: {
                            display: true,
                            text: 'x₂',
                            font: { size: 14, weight: 'bold' }
                        },
                        grid: {
                            color: 'rgba(0,0,0,0.1)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 15,
                            font: { size: 11 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const pt = context.raw;
                                return `(${pt.x.toFixed(2)}, ${pt.y.toFixed(2)})`;
                            }
                        }
                    },
                    zoom: {
                        zoom: {
                            wheel: { enabled: true },
                            pinch: { enabled: true },
                            mode: 'xy'
                        },
                        pan: {
                            enabled: true,
                            mode: 'xy'
                        }
                    }
                },
                onClick: function (evt, elements) {
                    if (elements.length === 0) {
                        chart.resetZoom();
                    }
                }
            }
        });
    }

    function getConstraintLinePoints(c, maxX, maxY) {
        const points = [];

        if (Math.abs(c.y) < 1e-9 && Math.abs(c.x) > 1e-9) {
            const xVal = c.val / c.x;
            if (xVal >= 0) {
                points.push({ x: xVal, y: 0 });
                points.push({ x: xVal, y: maxY });
            }
        } else if (Math.abs(c.x) < 1e-9 && Math.abs(c.y) > 1e-9) {
            const yVal = c.val / c.y;
            if (yVal >= 0) {
                points.push({ x: 0, y: yVal });
                points.push({ x: maxX, y: yVal });
            }
        } else if (Math.abs(c.x) > 1e-9 && Math.abs(c.y) > 1e-9) {
            const xInt = c.val / c.x;
            const yInt = c.val / c.y;

            if (xInt >= 0) points.push({ x: xInt, y: 0 });
            if (yInt >= 0) points.push({ x: 0, y: yInt });

            if (xInt < 0 && c.y !== 0) {
                const y0 = c.val / c.y;
                const yMax = (c.val - c.x * maxX) / c.y;
                if (y0 >= 0) points.push({ x: 0, y: y0 });
                if (yMax >= 0) points.push({ x: maxX, y: yMax });
            }
            if (yInt < 0 && c.x !== 0) {
                const x0 = c.val / c.x;
                const xAtMaxY = (c.val - c.y * maxY) / c.x;
                if (x0 >= 0) points.push({ x: x0, y: 0 });
                if (xAtMaxY >= 0) points.push({ x: xAtMaxY, y: maxY });
            }
        }

        return points.slice(0, 2);
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
