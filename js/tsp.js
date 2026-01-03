if (typeof INFINITY_VALUE === 'undefined') {
    var INFINITY_VALUE = 999999;
    var deepCopy = function (matrix) {
        if (!Array.isArray(matrix)) return matrix;
        return matrix.map(row => Array.isArray(row) ? row.map(cell => cell) : row);
    };
    var createMatrix = function (rows, cols, defaultValue) {
        if (defaultValue === undefined) defaultValue = 0;
        return Array(rows).fill(null).map(() => Array(cols).fill(defaultValue));
    };
    var formatNumber = function (num, decimals) {
        if (decimals === undefined) decimals = 2;
        if (num === INFINITY_VALUE) return "∞";
        if (num === 0) return "0";
        if (Number.isInteger(num)) return num.toString();
        return num.toFixed(decimals);
    };
    var formatValue = function (value, asFraction) {
        if (value === 0) return "0";
        if (value === null || value === undefined) return "-";
        if (value === INFINITY_VALUE) return "∞";
        return formatNumber(value);
    };
    var formatBigM = function (val) {
        if (typeof val === 'object' && 'v' in val) {
            var v = val.v, m = val.m;
            if (Math.abs(m) < 1e-9) return formatNumber(v);
            var result = '';
            if (Math.abs(v) > 1e-9) result = formatNumber(v) + (m > 0 ? ' + ' : ' - ');
            else if (m < 0) result = '-';
            var absM = Math.abs(m);
            result += (Math.abs(absM - 1) < 1e-9 ? '' : formatNumber(absM)) + 'M';
            return result;
        }
        return formatNumber(val);
    };
    var isInfinity = function (value) {
        return value === INFINITY_VALUE || value === Infinity;
    };
}
class TSPSolver {
    constructor(distanceMatrix, cityLabels, startCity = 0) {
        this.n = distanceMatrix.length;
        this.dist = distanceMatrix;
        this.cityLabels = cityLabels;
        this.startCity = startCity;
        this.dp = {};
        this.parent = {};
        this.optimalTour = [];
        this.optimalCost = Infinity;
        this.allPaths = [];
    }
    solve() {
        const n = this.n, start = this.startCity, INF = Infinity;
        const startMask = 1 << start;
        this.dp[`${startMask}_${start}`] = 0;
        for (let size = 1; size < n; size++) {
            const subsets = this.getSubsetsOfSize(n, size + 1, start);
            for (const mask of subsets) {
                for (let last = 0; last < n; last++) {
                    if (!(mask & (1 << last))) continue;
                    if (last === start && size < n - 1) continue;
                    const key = `${mask}_${last}`;
                    if (this.dp[key] === undefined) this.dp[key] = INF;
                    const prevMask = mask ^ (1 << last);
                    if (prevMask === 0) continue;
                    for (let prev = 0; prev < n; prev++) {
                        if (!(prevMask & (1 << prev))) continue;
                        const prevKey = `${prevMask}_${prev}`;
                        if (this.dp[prevKey] === undefined) continue;
                        const edgeCost = this.dist[prev][last];
                        if (edgeCost === INF) continue;
                        const newCost = this.dp[prevKey] + edgeCost;
                        if (newCost < this.dp[key]) { this.dp[key] = newCost; this.parent[key] = { mask: prevMask, city: prev }; }
                    }
                }
            }
        }
        const fullMask = (1 << n) - 1;
        let minCost = INF, lastCity = -1;
        for (let last = 0; last < n; last++) {
            if (last === start) continue;
            const key = `${fullMask}_${last}`;
            if (this.dp[key] === undefined) continue;
            const returnCost = this.dist[last][start];
            if (returnCost === INF) continue;
            const totalCost = this.dp[key] + returnCost;
            if (totalCost < minCost) { minCost = totalCost; lastCity = last; }
        }
        this.optimalCost = minCost;
        this.traceOptimalPath(fullMask, lastCity);
        this.generateAllPaths();
        return { tour: this.optimalTour, cost: this.optimalCost, allPaths: this.allPaths };
    }
    traceOptimalPath(fullMask, lastCity) {
        this.optimalTour = [];
        let currentMask = fullMask, currentCity = lastCity;
        while (currentMask !== 1 << this.startCity) {
            this.optimalTour.push(currentCity);
            const key = `${currentMask}_${currentCity}`;
            const parent = this.parent[key];
            if (!parent) break;
            currentMask = parent.mask; currentCity = parent.city;
        }
        this.optimalTour.push(this.startCity);
        this.optimalTour.reverse();
        this.optimalTour.push(this.startCity);
    }
    generateAllPaths() {
        this.allPaths = [];
        const n = this.n, start = this.startCity;
        const otherCities = [];
        for (let i = 0; i < n; i++) {
            if (i !== start) otherCities.push(i);
        }
        const permutations = this.getPermutations(otherCities);
        for (const perm of permutations) {
            const path = [start, ...perm, start];
            const steps = [];
            let cumulativeCost = 0;
            let valid = true;
            for (let i = 0; i < path.length - 1; i++) {
                const from = path[i], to = path[i + 1];
                const edgeCost = this.dist[from][to];
                if (edgeCost === Infinity || edgeCost === undefined) {
                    valid = false;
                    break;
                }
                cumulativeCost += edgeCost;
                steps.push({
                    from: this.cityLabels[from],
                    to: this.cityLabels[to],
                    edgeCost: edgeCost,
                    cumulative: cumulativeCost,
                    pathSoFar: path.slice(0, i + 2).map(c => this.cityLabels[c]).join(' → ')
                });
            }
            if (valid) {
                const isOptimal = cumulativeCost === this.optimalCost;
                this.allPaths.push({
                    path: path.map(c => this.cityLabels[c]),
                    totalCost: cumulativeCost,
                    steps: steps,
                    isOptimal: isOptimal
                });
            }
        }
        this.allPaths.sort((a, b) => a.totalCost - b.totalCost);
    }
    getPermutations(arr) {
        if (arr.length <= 1) return [arr];
        return arr.flatMap((item, i) =>
            this.getPermutations([...arr.slice(0, i), ...arr.slice(i + 1)]).map(perm => [item, ...perm])
        );
    }
    getSubsetsOfSize(n, size, mustInclude) {
        const result = [];
        const generate = (start, current, count) => {
            if (count === size) { if (current & (1 << mustInclude)) result.push(current); return; }
            if (start >= n || n - start < size - count) return;
            generate(start + 1, current | (1 << start), count + 1);
            generate(start + 1, current, count);
        };
        generate(0, 0, 0);
        return result;
    }
    static getExampleProblem() { return { size: 4, labels: ["A", "B", "C", "D"], matrix: [[0, 16, 11, 6], [8, 0, 13, 16], [4, 7, 0, 9], [5, 12, 2, 0]], startCity: 0 }; }
    static generateRandomProblem(size = 4) {
        const labels = Array.from({ length: size }, (_, i) => String.fromCharCode(65 + i));
        const matrix = Array.from({ length: size }, (_, i) =>
            Array.from({ length: size }, (_, j) => i === j ? 0 : Math.floor(Math.random() * 19) + 2)
        );
        return { size, labels, matrix, startCity: 0 };
    }
}
function initTSP() {
    const sizeInput = document.getElementById("tsp-size"), matrixContainer = document.getElementById("tsp-matrix"), solveBtn = document.getElementById("tsp-solve-btn"), vizSection = document.getElementById("tsp-viz"), summaryContainer = document.getElementById("tsp-summary"), startSelect = document.getElementById("tsp-start");
    if (!sizeInput) return;
    function buildMatrix(data = null) {
        const size = parseInt(sizeInput.value) || 4;
        const cities = "ABCDEFGHIJ".slice(0, size).split("");
        startSelect.innerHTML = cities.map(c => `<option value="${c}">${c}</option>`).join("");
        let html = '<div class="matrix-container"><div class="matrix-grid"><div class="matrix-row"><div class="matrix-label"></div>';
        cities.forEach(c => html += `<div class="matrix-header">${c}</div>`);
        html += '</div>';
        cities.forEach((c, i) => {
            html += `<div class="matrix-row"><div class="matrix-label">${c}</div>`;
            cities.forEach((_, j) => {
                const val = data ? data.matrix[i][j] : (i === j ? 0 : Math.floor(Math.random() * 50) + 1);
                html += `<div class="matrix-cell"><input type="number" data-row="${i}" data-col="${j}" value="${val}" ${i === j ? 'readonly style="background:rgba(100,100,100,0.3)"' : ''} /></div>`;
            });
            html += '</div>';
        });
        html += '</div></div>';
        matrixContainer.innerHTML = html;
    }
    sizeInput.addEventListener("change", () => buildMatrix());
    document.getElementById("tsp-random-btn")?.addEventListener("click", () => buildMatrix());
    document.getElementById("tsp-clear-btn")?.addEventListener("click", () => { matrixContainer.querySelectorAll('input:not([readonly])').forEach(inp => inp.value = 0); vizSection.classList.add("hidden"); });
    buildMatrix();
    solveBtn?.addEventListener("click", () => {
        const size = parseInt(sizeInput.value) || 4;
        const cities = "ABCDEFGHIJ".slice(0, size).split("");
        const startIdx = cities.indexOf(startSelect.value);
        const matrix = [];
        for (let i = 0; i < size; i++) { matrix[i] = []; for (let j = 0; j < size; j++) matrix[i][j] = 0; }
        matrixContainer.querySelectorAll('input').forEach(inp => { const row = parseInt(inp.dataset.row), col = parseInt(inp.dataset.col); matrix[row][col] = parseInt(inp.value) || (row === col ? 0 : Infinity); });
        const solver = new TSPSolver(matrix, cities, startIdx);
        const result = solver.solve();
        vizSection.classList.remove("hidden");
        const tourLabels = result.tour.map(i => cities[i]);
        const edgeCosts = [];
        for (let i = 0; i < result.tour.length - 1; i++) edgeCosts.push({ from: cities[result.tour[i]], to: cities[result.tour[i + 1]], cost: matrix[result.tour[i]][result.tour[i + 1]] });
        let html = `<div class="info-box success"><h3>Optimal Tour Found</h3><p style="font-size:1.5rem;color:var(--accent-color)"><strong>Minimum Cost: ${result.cost}</strong></p><p style="font-size:1.2rem;margin-top:1rem"><strong>Tour: ${tourLabels.join(" → ")}</strong></p></div>`;
        html += `<div style="background:var(--bg-tertiary);padding:1rem;border-radius:8px;margin:1.5rem 0;border-left:4px solid var(--accent-color)">`;
        html += `<strong>TSP Dynamic Programming Formulas:</strong><br>`;
        html += `<div style="background:rgba(0,0,0,0.3);padding:0.5rem 1rem;border-radius:4px;font-family:monospace;margin-top:0.5rem">`;
        html += `g(S, j) = min<sub>i∈S, i≠j</sub> { g(S−{j}, i) + d(i, j) }`;
        html += `</div>`;
        html += `<p style="color:var(--text-dim);margin-top:0.5rem;font-size:0.9rem">Where S is the set of visited cities, j is the last city, and d(i,j) is the distance from i to j.</p>`;
        html += `<div style="background:rgba(0,0,0,0.3);padding:0.5rem 1rem;border-radius:4px;font-family:monospace;margin-top:0.5rem">`;
        html += `Total Cost = Σ d(c<sub>i</sub>, c<sub>i+1</sub>) for all edges in tour`;
        html += `</div>`;
        html += `</div>`;
        html += '<h4 style="margin-top:2rem">Optimal Tour Breakdown</h4>';
        html += `<p style="color:var(--text-dim);margin-bottom:0.75rem">Cost = ${edgeCosts.map(e => `d(${e.from},${e.to})`).join(' + ')} = ${edgeCosts.map(e => e.cost).join(' + ')} = <strong>${result.cost}</strong></p>`;
        html += '<div class="table-wrapper"><table><thead><tr><th>Edge</th><th>Cost</th><th>Cumulative</th></tr></thead><tbody>';
        let cumSum = 0;
        edgeCosts.forEach(e => {
            cumSum += e.cost;
            html += `<tr><td>${e.from} → ${e.to}</td><td style="color:var(--accent-color)">${e.cost}</td><td style="color:var(--accent-color);font-weight:bold">${cumSum}</td></tr>`;
        });
        html += `<tr style="border-top:2px solid var(--accent-color);font-weight:bold"><td>Total</td><td colspan="2" style="color:var(--accent-color)">${result.cost}</td></tr></tbody></table></div>`;
        html += '<h4 style="margin-top:2rem;color:var(--accent-color)">Branch & Bound Tree (State Space)</h4>';
        html += '<p style="color:var(--text-dim);margin-bottom:1rem">Visual representation of all paths explored. Green path = optimal tour.</p>';
        const treeData = {};
        const optimalPath = tourLabels;
        result.allPaths.forEach(pathData => {
            let currentLevel = treeData;
            let cumCost = 0;
            for (let i = 0; i < pathData.path.length; i++) {
                const city = pathData.path[i];
                const edgeCost = i > 0 ? pathData.steps[i - 1].edgeCost : 0;
                cumCost = i > 0 ? pathData.steps[i - 1].cumulative : 0;
                if (!currentLevel[city]) {
                    currentLevel[city] = {
                        children: {},
                        edgeCost: i > 0 ? edgeCost : 0,
                        cumCost: cumCost,
                        totalCost: pathData.totalCost,
                        isOptimal: pathData.isOptimal,
                        depth: i
                    };
                }
                if (pathData.isOptimal && i < pathData.path.length - 1) {
                    currentLevel[city].isOnOptimalPath = true;
                }
                currentLevel = currentLevel[city].children;
            }
        });
        const nodeSize = 40;
        const levelHeight = 90;
        const minNodeSpacing = 70;
        function countLeaves(node) {
            const childKeys = Object.keys(node);
            if (childKeys.length === 0) return 1;
            let count = 0;
            childKeys.forEach(key => count += countLeaves(node[key].children));
            return count;
        }
        function buildTreeSVG(node, depth, startX, availableWidth, parentX = null, parentY = null, isParentOptimal = false) {
            let svgContent = '';
            const childKeys = Object.keys(node);
            if (childKeys.length === 0) return { svg: '', width: 0 };
            const totalLeaves = childKeys.reduce((sum, key) => sum + countLeaves(node[key].children), 0) || childKeys.length;
            let currentX = startX;
            childKeys.forEach((city, idx) => {
                const childNode = node[city];
                const childLeaves = countLeaves(childNode.children) || 1;
                const childWidth = (availableWidth * childLeaves) / totalLeaves;
                const nodeX = currentX + childWidth / 2;
                const nodeY = depth * levelHeight + nodeSize;
                const isOptimal = childNode.isOnOptimalPath || (depth === 0 && city === cities[startIdx]);
                const nodeColor = isOptimal ? '#2e8b57' : '#4a90a4';
                const nodeStroke = isOptimal ? '#5fba7d' : '#6ab0c0';
                const textColor = 'white';
                if (parentX !== null && parentY !== null) {
                    const lineColor = isOptimal && isParentOptimal ? '#5fba7d' : '#555';
                    const lineWidth = isOptimal && isParentOptimal ? 3 : 1.5;
                    svgContent += `<line x1="${parentX}" y1="${parentY + nodeSize / 2}" x2="${nodeX}" y2="${nodeY - nodeSize / 2}" stroke="${lineColor}" stroke-width="${lineWidth}"/>`;
                    const midX = (parentX + nodeX) / 2;
                    const midY = (parentY + nodeSize / 2 + nodeY - nodeSize / 2) / 2;
                    if (childNode.edgeCost > 0) {
                        svgContent += `<text x="${midX + 10}" y="${midY}" fill="${isOptimal && isParentOptimal ? '#5fba7d' : '#888'}" font-size="12" text-anchor="middle">${childNode.edgeCost}</text>`;
                    }
                }
                svgContent += `<circle cx="${nodeX}" cy="${nodeY}" r="${nodeSize / 2}" fill="${nodeColor}" stroke="${nodeStroke}" stroke-width="2"/>`;
                svgContent += `<text x="${nodeX}" y="${nodeY + 5}" fill="${textColor}" font-size="16" font-weight="bold" text-anchor="middle">${city}</text>`;
                if (Object.keys(childNode.children).length === 0 && childNode.cumCost > 0) {
                    const finalCost = childNode.totalCost;
                    const costColor = childNode.isOptimal ? '#5fba7d' : '#888';
                    svgContent += `<text x="${nodeX}" y="${nodeY + nodeSize / 2 + 20}" fill="${costColor}" font-size="14" font-weight="bold" text-anchor="middle">${finalCost}</text>`;
                }
                const childResult = buildTreeSVG(childNode.children, depth + 1, currentX, childWidth, nodeX, nodeY, isOptimal);
                svgContent += childResult.svg;
                currentX += childWidth;
            });
            return { svg: svgContent, width: availableWidth };
        }
        const leafCount = result.allPaths.length;
        const totalWidth = Math.max(800, leafCount * minNodeSpacing);
        const rootNode = {};
        rootNode[cities[startIdx]] = { children: treeData[cities[startIdx]]?.children || {}, edgeCost: 0, cumCost: 0, isOnOptimalPath: true, depth: 0 };
        const maxDepth = size + 1;
        const totalHeight = maxDepth * levelHeight + nodeSize * 2;
        let treeSVG = `<svg width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}" style="background:var(--bg-primary);border-radius:8px">`;
        treeSVG += `<text x="${totalWidth / 2}" y="25" fill="var(--text-primary)" font-size="14" text-anchor="middle" font-style="italic">Starting from ${cities[startIdx]}</text>`;
        const rootX = totalWidth / 2;
        const rootY = 50;
        treeSVG += `<circle cx="${rootX}" cy="${rootY}" r="${nodeSize / 2}" fill="#2e8b57" stroke="#5fba7d" stroke-width="3"/>`;
        treeSVG += `<text x="${rootX}" y="${rootY + 5}" fill="white" font-size="16" font-weight="bold" text-anchor="middle">${cities[startIdx]}</text>`;
        const childrenOfRoot = treeData[cities[startIdx]]?.children || {};
        const childKeys = Object.keys(childrenOfRoot);
        if (childKeys.length > 0) {
            const totalLeaves = childKeys.reduce((sum, key) => sum + (countLeaves(childrenOfRoot[key].children) || 1), 0) || childKeys.length;
            let currentX = 0;
            childKeys.forEach(city => {
                const childNode = childrenOfRoot[city];
                const childLeaves = countLeaves(childNode.children) || 1;
                const childWidth = (totalWidth * childLeaves) / totalLeaves;
                const nodeX = currentX + childWidth / 2;
                const nodeY = levelHeight + 50;
                const isOptimal = childNode.isOnOptimalPath;
                const lineColor = isOptimal ? '#5fba7d' : '#555';
                const lineWidth = isOptimal ? 3 : 1.5;
                treeSVG += `<line x1="${rootX}" y1="${rootY + nodeSize / 2}" x2="${nodeX}" y2="${nodeY - nodeSize / 2}" stroke="${lineColor}" stroke-width="${lineWidth}"/>`;
                const midX = (rootX + nodeX) / 2 + 10;
                const midY = (rootY + nodeSize / 2 + nodeY - nodeSize / 2) / 2;
                if (childNode.edgeCost > 0) {
                    treeSVG += `<text x="${midX}" y="${midY}" fill="${isOptimal ? '#5fba7d' : '#888'}" font-size="12" text-anchor="middle">${childNode.edgeCost}</text>`;
                }
                const nodeColor = isOptimal ? '#2e8b57' : '#4a90a4';
                const nodeStroke = isOptimal ? '#5fba7d' : '#6ab0c0';
                treeSVG += `<circle cx="${nodeX}" cy="${nodeY}" r="${nodeSize / 2}" fill="${nodeColor}" stroke="${nodeStroke}" stroke-width="2"/>`;
                treeSVG += `<text x="${nodeX}" y="${nodeY + 5}" fill="white" font-size="16" font-weight="bold" text-anchor="middle">${city}</text>`;
                const childResult = buildTreeSVG(childNode.children, 2, currentX, childWidth, nodeX, nodeY, isOptimal);
                treeSVG += childResult.svg;
                currentX += childWidth;
            });
        }
        treeSVG += '</svg>';
        html += `<div style="overflow-x:auto;margin:1rem 0">${treeSVG}</div>`;
        html += '<h4 style="margin-top:2rem">All Possible Tours (Sorted by Cost)</h4>';
        html += '<p style="color:var(--text-dim);margin-bottom:1rem">Showing all paths from ' + cities[startIdx] + ' visiting all cities and returning to ' + cities[startIdx] + ':</p>';
        result.allPaths.forEach((pathData, idx) => {
            const isOptimal = pathData.isOptimal;
            const borderColor = isOptimal ? 'var(--accent-color)' : 'var(--bg-tertiary)';
            const bgColor = isOptimal ? 'rgba(46,139,87,0.15)' : 'var(--bg-secondary)';
            html += `<div style="background:${bgColor};border:2px solid ${borderColor};border-radius:8px;padding:1rem;margin-bottom:1rem;${isOptimal ? 'box-shadow:0 0 10px rgba(46,139,87,0.3)' : ''}">`;
            html += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem">`;
            html += `<strong style="font-size:1.1rem">${isOptimal ? 'OPTIMAL: ' : ''}Path ${idx + 1}: ${pathData.path.join(' → ')}</strong>`;
            html += `<span style="font-size:1.2rem;color:${isOptimal ? 'var(--accent-color)' : 'var(--text-muted)'};font-weight:bold">Total: ${pathData.totalCost}</span>`;
            html += '</div>';
            html += '<div style="display:flex;flex-wrap:wrap;gap:0.5rem;align-items:center">';
            pathData.steps.forEach((step, stepIdx) => {
                if (stepIdx > 0) html += '<span style="color:var(--text-dim)">+</span>';
                html += `<div style="background:var(--bg-primary);padding:0.4rem 0.75rem;border-radius:6px;font-size:0.9rem">`;
                html += `<span style="color:var(--text-muted)">${step.from}→${step.to}:</span> `;
                html += `<span style="color:var(--accent-color);font-weight:bold">${step.edgeCost}</span>`;
                html += `</div>`;
            });
            html += `<span style="color:var(--text-dim)">=</span>`;
            html += `<div style="background:${isOptimal ? 'var(--accent-color)' : 'var(--bg-tertiary)'};color:${isOptimal ? 'white' : 'var(--text-primary)'};padding:0.4rem 0.75rem;border-radius:6px;font-weight:bold">${pathData.totalCost}</div>`;
            html += '</div>';
            html += '</div>';
        });
        summaryContainer.innerHTML = html;
        vizSection.scrollIntoView({ behavior: "smooth" });
    });
}

