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
class ShortestPathSolver {
    constructor(matrix, labels, startIdx, endIdx) {
        this.matrix = matrix;
        this.labels = labels;
        this.n = matrix.length;
        this.startIdx = startIdx;
        this.endIdx = endIdx;
        this.stages = [];
        this.f = {};
        this.levelTables = [];
        this.shortestPath = [];
        this.shortestCost = Infinity;
    }
    detectStages() {
        const forwardDist = new Array(this.n).fill(-1);
        forwardDist[this.startIdx] = 0;
        let queue = [this.startIdx];
        while (queue.length > 0) {
            const node = queue.shift();
            for (let j = 0; j < this.n; j++) {
                if (this.matrix[node][j] > 0 && forwardDist[j] < 0) {
                    forwardDist[j] = forwardDist[node] + 1;
                    queue.push(j);
                }
            }
        }
        const canReachEnd = new Array(this.n).fill(false);
        canReachEnd[this.endIdx] = true;
        let changed = true;
        while (changed) {
            changed = false;
            for (let i = 0; i < this.n; i++) {
                if (canReachEnd[i]) continue;
                for (let j = 0; j < this.n; j++) {
                    if (this.matrix[i][j] > 0 && canReachEnd[j]) {
                        canReachEnd[i] = true;
                        changed = true;
                        break;
                    }
                }
            }
        }
        const reachableNodes = [];
        for (let i = 0; i < this.n; i++) {
            if (forwardDist[i] >= 0 && canReachEnd[i] && i !== this.endIdx) {
                reachableNodes.push(i);
            }
        }
        if (forwardDist[this.endIdx] < 0) {
            this.stages = [[this.startIdx], [this.endIdx]];
            return this.stages;
        }
        const maxDist = Math.max(...reachableNodes.map(n => forwardDist[n]));
        const levels = [];
        for (let d = 0; d <= maxDist; d++) {
            const nodesAtDist = reachableNodes.filter(n => forwardDist[n] === d);
            if (nodesAtDist.length > 0) {
                levels.push(nodesAtDist);
            }
        }
        levels.push([this.endIdx]);
        this.stages = levels;
        return this.stages;
    }
    solve() {
        this.detectStages();
        const numStages = this.stages.length;
        if (numStages < 2) {
            return { shortestPath: [], shortestCost: Infinity, error: "Need at least 2 stages" };
        }
        for (const nodeIdx of this.stages[numStages - 1]) {
            this.f[nodeIdx] = { cost: 0, nextNode: null };
        }
        this.levelTables.push({
            stageNum: numStages,
            xIndex: numStages,
            stageName: `f(x${numStages}) - Destination`,
            nodes: this.stages[numStages - 1].map(i => this.labels[i]),
            rows: this.stages[numStages - 1].map(i => ({
                node: this.labels[i],
                calculations: [],
                fValue: 0,
                optimalNext: '-'
            }))
        });
        for (let k = numStages - 1; k >= 1; k--) {
            const currentNodes = this.stages[k - 1];
            const allLaterNodes = [];
            for (let laterStage = k; laterStage < numStages; laterStage++) {
                allLaterNodes.push(...this.stages[laterStage]);
            }
            const currentXIndex = k;
            const levelTable = {
                stageNum: k,
                xIndex: currentXIndex,
                nextXIndex: k + 1,
                stageName: `f(x${currentXIndex})${k === 1 ? ' - Source' : ''}`,
                nodes: currentNodes.map(i => this.labels[i]),
                nextNodes: allLaterNodes.map(i => this.labels[i]),
                rows: []
            };
            for (const nodeIdx of currentNodes) {
                let minCost = Infinity;
                let optimalNext = null;
                const calculations = [];
                for (const nextIdx of allLaterNodes) {
                    const edgeCost = this.matrix[nodeIdx][nextIdx];
                    if (edgeCost > 0) {
                        const fNext = this.f[nextIdx] ? this.f[nextIdx].cost : Infinity;
                        const total = edgeCost + fNext;
                        calculations.push({
                            nextNode: this.labels[nextIdx],
                            edgeCost: edgeCost,
                            fNext: fNext,
                            total: total,
                            formula: `${edgeCost}+${fNext}=${total}`
                        });
                        if (total < minCost) {
                            minCost = total;
                            optimalNext = nextIdx;
                        }
                    } else {
                        calculations.push({
                            nextNode: this.labels[nextIdx],
                            edgeCost: 0,
                            fNext: null,
                            total: Infinity,
                            formula: '-'
                        });
                    }
                }
                this.f[nodeIdx] = { cost: minCost, nextNode: optimalNext };
                levelTable.rows.push({
                    node: this.labels[nodeIdx],
                    calculations: calculations,
                    fValue: minCost,
                    optimalNext: optimalNext !== null ? this.labels[optimalNext] : '-'
                });
            }
            this.levelTables.unshift(levelTable);
        }
        this.traceOptimalPath();
        return {
            shortestPath: this.shortestPath,
            shortestCost: this.shortestCost,
            stages: this.stages.map(s => s.map(i => this.labels[i])),
            levelTables: this.levelTables,
            f: this.f
        };
    }
    traceOptimalPath() {
        this.shortestPath = [this.labels[this.startIdx]];
        this.shortestCost = this.f[this.startIdx] ? this.f[this.startIdx].cost : Infinity;
        let currentIdx = this.startIdx;
        while (this.f[currentIdx] && this.f[currentIdx].nextNode !== null) {
            currentIdx = this.f[currentIdx].nextNode;
            this.shortestPath.push(this.labels[currentIdx]);
        }
    }
    getEdgeCost(fromLabel, toLabel) {
        const fromIdx = this.labels.indexOf(fromLabel);
        const toIdx = this.labels.indexOf(toLabel);
        if (fromIdx === -1 || toIdx === -1) return 0;
        return this.matrix[fromIdx][toIdx];
    }
}

class BellmanFordSolver {
    constructor(matrix, labels, startIdx, endIdx) {
        this.matrix = matrix;
        this.labels = labels;
        this.n = matrix.length;
        this.startIdx = startIdx;
        this.endIdx = endIdx;
        this.distances = [];
        this.predecessors = [];
        this.iterations = [];
        this.shortestPath = [];
        this.shortestCost = Infinity;
        this.hasNegativeCycle = false;
    }

    getEdges() {
        const edges = [];
        for (let i = 0; i < this.n; i++) {
            for (let j = 0; j < this.n; j++) {
                if (i !== j && this.matrix[i][j] !== 0) {
                    edges.push({ from: i, to: j, weight: this.matrix[i][j] });
                }
            }
        }
        return edges;
    }

    solve() {
        const INF = Infinity;
        this.distances = new Array(this.n).fill(INF);
        this.predecessors = new Array(this.n).fill(null);
        this.distances[this.startIdx] = 0;

        const edges = this.getEdges();

        this.iterations.push({
            iteration: 0,
            description: 'Initialization',
            distances: [...this.distances],
            predecessors: [...this.predecessors],
            relaxations: [],
            formula: `d(${this.labels[this.startIdx]}) = 0, d(others) = ∞`
        });

        for (let i = 1; i < this.n; i++) {
            const relaxations = [];
            const prevDistances = [...this.distances];

            for (const edge of edges) {
                const { from, to, weight } = edge;
                if (this.distances[from] !== INF && this.distances[from] + weight < this.distances[to]) {
                    const oldDist = this.distances[to];
                    this.distances[to] = this.distances[from] + weight;
                    this.predecessors[to] = from;
                    relaxations.push({
                        edge: `${this.labels[from]}→${this.labels[to]}`,
                        weight: weight,
                        oldDist: oldDist,
                        newDist: this.distances[to],
                        formula: `d(${this.labels[to]}) = d(${this.labels[from]}) + w(${this.labels[from]},${this.labels[to]}) = ${this.distances[from]} + ${weight} = ${this.distances[to]}`
                    });
                }
            }

            this.iterations.push({
                iteration: i,
                description: `Iteration ${i} - Relaxing all edges`,
                distances: [...this.distances],
                predecessors: [...this.predecessors],
                relaxations: relaxations,
                changed: relaxations.length > 0
            });
        }

        for (const edge of edges) {
            const { from, to, weight } = edge;
            if (this.distances[from] !== INF && this.distances[from] + weight < this.distances[to]) {
                this.hasNegativeCycle = true;
                break;
            }
        }

        if (!this.hasNegativeCycle) {
            this.tracePath();
        }

        return {
            distances: this.distances,
            predecessors: this.predecessors,
            iterations: this.iterations,
            shortestPath: this.shortestPath,
            shortestCost: this.shortestCost,
            hasNegativeCycle: this.hasNegativeCycle,
            edges: edges
        };
    }

    tracePath() {
        this.shortestCost = this.distances[this.endIdx];
        if (this.shortestCost === Infinity) {
            this.shortestPath = [];
            return;
        }

        const path = [];
        let current = this.endIdx;
        while (current !== null) {
            path.unshift(this.labels[current]);
            current = this.predecessors[current];
        }
        this.shortestPath = path;
    }

    getEdgeCost(fromLabel, toLabel) {
        const fromIdx = this.labels.indexOf(fromLabel);
        const toIdx = this.labels.indexOf(toLabel);
        if (fromIdx === -1 || toIdx === -1) return 0;
        return this.matrix[fromIdx][toIdx];
    }
}
function initShortestPath() {
    const sizeInput = document.getElementById("sp-size"), matrixContainer = document.getElementById("sp-matrix"), solveBtn = document.getElementById("sp-solve-btn"), vizSection = document.getElementById("sp-viz"), summaryContainer = document.getElementById("sp-summary"), startSelect = document.getElementById("sp-start"), endSelect = document.getElementById("sp-end");
    const modeDpBtn = document.getElementById("sp-mode-dp"), modeBellmanBtn = document.getElementById("sp-mode-bellman"), modeDesc = document.getElementById("sp-mode-desc"), matrixLabel = document.getElementById("sp-matrix-label"), matrixHint = document.getElementById("sp-matrix-hint"), vizTitle = document.getElementById("sp-viz-title");
    if (!sizeInput) return;

    let currentMode = 'dp';

    function updateModeUI() {
        if (currentMode === 'dp') {
            modeDpBtn?.classList.add('primary');
            modeDpBtn?.classList.remove('secondary');
            modeBellmanBtn?.classList.remove('primary');
            modeBellmanBtn?.classList.add('secondary');
            if (modeDesc) modeDesc.textContent = 'Uses backward DP for acyclic graphs with non-negative edges.';
            if (matrixLabel) matrixLabel.textContent = 'Adjacency Matrix (enter distance, 0 = no edge)';
            if (matrixHint) matrixHint.textContent = 'Enter edge weights. Leave 0 for no direct connection.';
        } else {
            modeBellmanBtn?.classList.add('primary');
            modeBellmanBtn?.classList.remove('secondary');
            modeDpBtn?.classList.remove('primary');
            modeDpBtn?.classList.add('secondary');
            if (modeDesc) modeDesc.textContent = 'Handles negative edge weights. Detects negative cycles.';
            if (matrixLabel) matrixLabel.textContent = 'Adjacency Matrix (supports negative weights, 0 = no edge)';
            if (matrixHint) matrixHint.textContent = 'Enter edge weights (negative allowed). Leave 0 for no direct connection.';
        }
        buildMatrix();
    }

    modeDpBtn?.addEventListener('click', () => { currentMode = 'dp'; updateModeUI(); });
    modeBellmanBtn?.addEventListener('click', () => { currentMode = 'bellman'; updateModeUI(); });

    function buildMatrix() {
        const size = parseFloat(sizeInput.value) || 5;
        const nodes = "ABCDEFGHIJKLMNOP".slice(0, size).split("");
        startSelect.innerHTML = nodes.map((c, i) => `<option value="${i}"${i === 0 ? ' selected' : ''}>${c}</option>`).join("");
        endSelect.innerHTML = nodes.map((c, i) => `<option value="${i}"${i === size - 1 ? ' selected' : ''}>${c}</option>`).join("");
        let html = '<div class="matrix-container"><div class="matrix-grid"><div class="matrix-row"><div class="matrix-label"></div>';
        nodes.forEach(c => html += `<div class="matrix-header">${c}</div>`);
        html += '</div>';
        nodes.forEach((c, i) => {
            html += `<div class="matrix-row"><div class="matrix-label">${c}</div>`;
            nodes.forEach((_, j) => {
                const val = 0;
                const minVal = currentMode === 'bellman' ? '' : 'min="0"';
                html += `<div class="matrix-cell"><input type="number" data-row="${i}" data-col="${j}" value="${val}" ${i === j ? 'readonly style="background:rgba(100,100,100,0.3)"' : ''} ${minVal} /></div>`;
            });
            html += '</div>';
        });
        html += '</div></div>';
        matrixContainer.innerHTML = html;
    }

    function generateRandomMatrix() {
        const size = parseFloat(sizeInput.value) || 5;
        const nodes = "ABCDEFGHIJKLMNOP".slice(0, size).split("");
        const edgesPerNode = 2;
        const matrix = Array.from({ length: size }, () => Array(size).fill(0));

        if (currentMode === 'dp') {
            for (let i = 0; i < size - 1; i++) {
                const numEdges = Math.min(size - i - 1, Math.floor(Math.random() * edgesPerNode) + 1);
                const targets = [];
                for (let j = i + 1; j < size && targets.length < numEdges; j++) {
                    if (Math.random() < 0.7 || j === i + 1) targets.push(j);
                }
                targets.forEach(j => {
                    matrix[i][j] = Math.floor(Math.random() * 20) + 1;
                });
            }
            for (let i = 0; i < size - 1; i++) {
                if (matrix[i].every(v => v === 0)) {
                    matrix[i][i + 1] = Math.floor(Math.random() * 20) + 1;
                }
            }
        } else {
            for (let i = 0; i < size; i++) {
                for (let j = 0; j < size; j++) {
                    if (i !== j && Math.random() < 0.4) {
                        const weight = Math.floor(Math.random() * 25) - 5;
                        matrix[i][j] = weight === 0 ? 1 : weight;
                    }
                }
            }
            for (let i = 0; i < size - 1; i++) {
                if (matrix[i].every(v => v === 0)) {
                    matrix[i][i + 1] = Math.floor(Math.random() * 15) + 1;
                }
            }
        }

        matrixContainer.querySelectorAll('input').forEach(inp => {
            const row = parseFloat(inp.dataset.row), col = parseFloat(inp.dataset.col);
            inp.value = matrix[row][col];
        });
    }

    sizeInput.addEventListener("change", buildMatrix);
    document.getElementById("sp-random-btn")?.addEventListener("click", () => { buildMatrix(); generateRandomMatrix(); });
    document.getElementById("sp-clear-btn")?.addEventListener("click", () => { matrixContainer.querySelectorAll('input:not([readonly])').forEach(inp => inp.value = 0); vizSection.classList.add("hidden"); });
    buildMatrix();
    generateRandomMatrix();

    solveBtn?.addEventListener("click", () => {
        const size = parseFloat(sizeInput.value) || 5;
        const nodes = "ABCDEFGHIJKLMNOP".slice(0, size).split("");
        const startIdx = parseFloat(startSelect.value);
        const endIdx = parseFloat(endSelect.value);
        if (startIdx === endIdx) {
            alert("Start and End nodes must be different.");
            return;
        }
        const matrix = [];
        for (let i = 0; i < size; i++) { matrix[i] = []; for (let j = 0; j < size; j++) matrix[i][j] = 0; }
        matrixContainer.querySelectorAll('input').forEach(inp => {
            const row = parseFloat(inp.dataset.row), col = parseFloat(inp.dataset.col);
            matrix[row][col] = parseFloat(inp.value) || 0;
        });

        vizSection.classList.remove("hidden");

        if (currentMode === 'dp') {
            if (vizTitle) vizTitle.textContent = 'Solution Process (Backward DP)';
            solveDPMode(matrix, nodes, startIdx, endIdx, size);
        } else {
            if (vizTitle) vizTitle.textContent = 'Solution Process (Bellman-Ford)';
            solveBellmanFordMode(matrix, nodes, startIdx, endIdx, size);
        }

        vizSection.scrollIntoView({ behavior: "smooth" });
    });

    function solveDPMode(matrix, nodes, startIdx, endIdx, size) {
        const solver = new ShortestPathSolver(matrix, nodes, startIdx, endIdx);
        const result = solver.solve();
        let html = '';
        html += '<h4>Detected Network Stages</h4>';
        html += '<div style="display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:1.5rem">';
        result.stages.forEach((stage, i) => {
            html += `<div style="background:var(--bg-secondary);padding:0.75rem 1rem;border-radius:8px;border:1px solid var(--bg-tertiary)">`;
            html += `<strong>Stage ${i + 1}</strong>: ${stage.join(', ')}`;
            html += '</div>';
        });
        html += '</div>';
        html += '<h4>Network Graph (Source → Destination)</h4>';
        html += '<div style="background:var(--bg-secondary);padding:1.5rem;border-radius:8px;margin-bottom:1.5rem;overflow-x:auto">';
        html += '<div style="display:flex;align-items:flex-start;gap:2rem;min-width:max-content">';
        result.stages.forEach((stage, stageIdx) => {
            const isLastStage = stageIdx === result.stages.length - 1;
            const stageLabel = stageIdx === 0 ? 'Source' : (isLastStage ? 'Destination' : `Stage ${stageIdx + 1}`);
            html += '<div style="display:flex;flex-direction:column;align-items:center;min-width:80px">';
            html += `<div style="font-size:0.75rem;color:var(--text-dim);margin-bottom:0.5rem">${stageLabel}</div>`;
            stage.forEach(nodeLabel => {
                const isOnPath = result.shortestPath.includes(nodeLabel);
                const nodeStyle = isOnPath
                    ? 'background:var(--accent-color);color:white;font-weight:bold;border:2px solid var(--accent-color)'
                    : 'background:var(--bg-primary);border:2px solid var(--bg-tertiary)';
                html += `<div style="padding:0.5rem 1rem;border-radius:50%;${nodeStyle};margin:0.25rem;min-width:40px;text-align:center;font-weight:bold">${nodeLabel}</div>`;
            });
            html += '</div>';
            if (!isLastStage) {
                html += '<div style="display:flex;flex-direction:column;justify-content:center;gap:0.25rem;padding:0.5rem">';
                const nextStage = result.stages[stageIdx + 1];
                stage.forEach(fromLabel => {
                    const fromIdx = nodes.indexOf(fromLabel);
                    nextStage.forEach(toLabel => {
                        const toIdx = nodes.indexOf(toLabel);
                        if (matrix[fromIdx][toIdx] > 0) {
                            const isOnPath = result.shortestPath.includes(fromLabel) &&
                                result.shortestPath.includes(toLabel) &&
                                result.shortestPath.indexOf(toLabel) === result.shortestPath.indexOf(fromLabel) + 1;
                            const edgeStyle = isOnPath
                                ? 'color:var(--accent-color);font-weight:bold'
                                : 'color:var(--text-dim)';
                            html += `<div style="font-size:0.8rem;white-space:nowrap;${edgeStyle}">${fromLabel}→${toLabel}: ${matrix[fromIdx][toIdx]}</div>`;
                        }
                    });
                });
                html += '</div>';
            }
        });
        html += '</div></div>';
        html += '<h4>All Edges</h4>';
        html += '<div style="background:var(--bg-secondary);padding:1rem;border-radius:8px;margin-bottom:1.5rem">';
        html += '<div style="display:flex;flex-wrap:wrap;gap:0.5rem;align-items:center">';
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                if (matrix[i][j] > 0) {
                    const isOnPath = result.shortestPath.includes(nodes[i]) &&
                        result.shortestPath.includes(nodes[j]) &&
                        result.shortestPath.indexOf(nodes[j]) === result.shortestPath.indexOf(nodes[i]) + 1;
                    html += `<span style="padding:0.25rem 0.5rem;background:${isOnPath ? 'var(--accent-color)' : 'var(--bg-primary)'};color:${isOnPath ? 'white' : 'inherit'};border-radius:4px;font-size:0.85rem">${nodes[i]}→${nodes[j]}:${matrix[i][j]}</span>`;
                }
            }
        }
        html += '</div></div>';
        const numStages = result.stages.length;
        html += '<h4 style="margin-top:2rem">Backward DP Calculations (Destination → Source)</h4>';
        html += `<div style="background:var(--bg-tertiary);padding:1rem;border-radius:8px;margin-bottom:1.5rem;border-left:4px solid var(--accent-color)">`;
        html += `<strong>General Formula:</strong> f(x<sub>k</sub>) = min { d(x<sub>k</sub>, x<sub>k+1</sub>) + f(x<sub>k+1</sub>) }`;
        html += `</div>`;
        result.levelTables.slice().reverse().forEach(table => {
            html += `<div style="background:var(--bg-secondary);border-radius:8px;padding:1rem;margin-bottom:1rem">`;
            const xi = table.xIndex || table.stageNum;
            const xj = table.nextXIndex || (xi + 1);
            html += `<h5 style="margin-bottom:0.5rem;color:var(--accent-color)">Stage ${numStages - xi + 1}: ${table.stageName}</h5>`;
            if (table.rows[0]?.calculations?.length > 0) {
                table.rows.forEach(row => {
                    html += `<div style="background:var(--bg-primary);padding:0.75rem;border-radius:6px;margin-bottom:0.75rem;border:1px solid var(--bg-tertiary)">`;
                    html += `<p style="margin-bottom:0.5rem;color:var(--text-muted)">Computing minimum cost from node <strong>${row.node}</strong> to destination:</p>`;
                    html += `<div style="background:rgba(0,0,0,0.3);padding:0.5rem 1rem;border-radius:4px;font-family:monospace;margin-bottom:0.5rem">`;
                    html += `f<sub>${xi}</sub>(${row.node}) = min { d(${row.node}, x<sub>${xj}</sub>) + f<sub>${xj}</sub>(x<sub>${xj}</sub>) }`;
                    html += `</div>`;
                    html += `<p style="margin-bottom:0.25rem;font-weight:bold">Evaluating all options:</p>`;
                    row.calculations.forEach(calc => {
                        if (calc.formula !== '-') {
                            const isMin = calc.total === row.fValue && row.fValue !== Infinity;
                            html += `<div style="display:inline-block;margin:0.25rem;padding:0.25rem 0.5rem;background:${isMin ? 'var(--accent-color)' : 'var(--bg-tertiary)'};color:${isMin ? 'white' : 'inherit'};border-radius:4px;font-size:0.9rem">`;
                            html += `${row.node}→${calc.nextNode}: d=${calc.edgeCost}, f(${calc.nextNode})=${calc.fNext === Infinity ? '∞' : calc.fNext} → <strong>${calc.formula}</strong>`;
                            html += `</div>`;
                        }
                    });
                    html += `<p style="margin-top:0.5rem;color:var(--accent-color);font-weight:bold">∴ f<sub>${xi}</sub>(${row.node}) = ${row.fValue === Infinity ? '∞' : row.fValue}, Next: ${row.optimalNext}</p>`;
                    html += `</div>`;
                });
                html += '<div class="table-wrapper" style="margin-top:1rem"><table><thead><tr>';
                html += `<th>x<sub>${xi}</sub></th>`;
                table.nextNodes?.forEach(n => html += `<th>x<sub>${xj}</sub>=${n}<br><small>d+f(${n})</small></th>`);
                html += `<th style="background:rgba(46,139,87,0.2)">f(x<sub>${xi}</sub>)</th>`;
                html += `<th style="background:rgba(46,139,87,0.2)">x<sub>${xj}</sub>*</th>`;
                html += '</tr></thead><tbody>';
                table.rows.forEach(row => {
                    const isOnPath = result.shortestPath.includes(row.node);
                    html += `<tr style="${isOnPath ? 'background:rgba(46,139,87,0.1)' : ''}">`;
                    html += `<td><strong>${row.node}</strong></td>`;
                    row.calculations.forEach(calc => {
                        const isMin = calc.total === row.fValue && row.fValue !== Infinity;
                        html += `<td style="${isMin ? 'color:var(--accent-color);font-weight:bold' : ''}">${calc.formula}</td>`;
                    });
                    html += `<td style="color:var(--accent-color);font-weight:bold">${row.fValue === Infinity ? '∞' : row.fValue}</td>`;
                    html += `<td style="color:var(--accent-color);font-weight:bold">${row.optimalNext}</td>`;
                    html += '</tr>';
                });
                html += '</tbody></table></div>';
            } else {
                html += `<div style="background:var(--bg-primary);padding:0.75rem;border-radius:6px;border:1px solid var(--bg-tertiary)">`;
                html += `<p style="margin-bottom:0.5rem;font-weight:bold">Base Case (Destination):</p>`;
                html += `<div style="background:rgba(0,0,0,0.3);padding:0.5rem 1rem;border-radius:4px;font-family:monospace">`;
                html += `f<sub>${numStages}</sub>(${table.nodes.join(', ')}) = 0`;
                html += `</div>`;
                html += `<p style="margin-top:0.5rem;color:var(--text-dim)">Cost from destination to itself is zero.</p>`;
                html += `</div>`;
            }
            html += '</div>';
        });
        if (result.shortestCost !== Infinity) {
            html += `<div class="info-box success" style="margin-top:2rem"><h3>Shortest Path Found</h3>`;
            html += `<p style="font-size:1.5rem;color:var(--accent-color);margin:1rem 0"><strong>Total Cost: ${result.shortestCost}</strong></p>`;
            html += `<p style="font-size:1.2rem"><strong>Path: ${result.shortestPath.join(' → ')}</strong></p>`;
            html += '<div style="margin-top:1rem"><strong>Cost Breakdown:</strong><br>';
            let cumulative = 0;
            for (let i = 0; i < result.shortestPath.length - 1; i++) {
                const from = result.shortestPath[i], to = result.shortestPath[i + 1];
                const cost = solver.getEdgeCost(from, to);
                cumulative += cost;
                html += `<span style="display:inline-block;margin:0.25rem;padding:0.25rem 0.5rem;background:var(--bg-primary);border-radius:4px">${from}→${to}: ${cost}</span>`;
            }
            html += `<span style="display:inline-block;margin:0.25rem;padding:0.25rem 0.5rem;background:var(--accent-color);color:white;border-radius:4px;font-weight:bold">= ${result.shortestCost}</span>`;
            html += '</div></div>';
        } else {
            html += `<div class="info-box warning" style="margin-top:2rem"><h3>No Path Found</h3><p>There is no path from ${nodes[startIdx]} to ${nodes[endIdx]}.</p></div>`;
        }
        summaryContainer.innerHTML = html;
    }

    function solveBellmanFordMode(matrix, nodes, startIdx, endIdx, size) {
        const solver = new BellmanFordSolver(matrix, nodes, startIdx, endIdx);
        const result = solver.solve();
        let html = '';

        html += '<h4>All Edges (with weights)</h4>';
        html += '<div style="background:var(--bg-secondary);padding:1rem;border-radius:8px;margin-bottom:1.5rem">';
        html += '<div style="display:flex;flex-wrap:wrap;gap:0.5rem;align-items:center">';
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                if (matrix[i][j] !== 0) {
                    const isNegative = matrix[i][j] < 0;
                    const isOnPath = result.shortestPath.includes(nodes[i]) &&
                        result.shortestPath.includes(nodes[j]) &&
                        result.shortestPath.indexOf(nodes[j]) === result.shortestPath.indexOf(nodes[i]) + 1;
                    const bgColor = isOnPath ? 'var(--accent-color)' : (isNegative ? 'rgba(220,53,69,0.3)' : 'var(--bg-primary)');
                    const textColor = isOnPath ? 'white' : (isNegative ? '#ff6b6b' : 'inherit');
                    html += `<span style="padding:0.25rem 0.5rem;background:${bgColor};color:${textColor};border-radius:4px;font-size:0.85rem">${nodes[i]}→${nodes[j]}: ${matrix[i][j]}</span>`;
                }
            }
        }
        html += '</div></div>';

        html += '<h4 style="margin-top:2rem">Bellman-Ford Algorithm Steps</h4>';
        html += `<div style="background:var(--bg-tertiary);padding:1rem;border-radius:8px;margin-bottom:1.5rem;border-left:4px solid var(--accent-color)">`;
        html += `<strong>Relaxation Formula:</strong> If d[u] + w(u,v) < d[v], then d[v] = d[u] + w(u,v)`;
        html += `</div>`;

        result.iterations.forEach((iter, idx) => {
            html += `<div style="background:var(--bg-secondary);border-radius:8px;padding:1rem;margin-bottom:1rem">`;
            html += `<h5 style="margin-bottom:0.5rem;color:var(--accent-color)">${iter.description}</h5>`;

            if (iter.formula) {
                html += `<div style="background:rgba(0,0,0,0.3);padding:0.5rem 1rem;border-radius:4px;font-family:monospace;margin-bottom:0.75rem">`;
                html += iter.formula;
                html += `</div>`;
            }

            if (iter.relaxations && iter.relaxations.length > 0) {
                html += `<p style="margin-bottom:0.5rem;font-weight:bold;color:var(--text-muted)">Edge Relaxations:</p>`;
                iter.relaxations.forEach(rel => {
                    html += `<div style="background:var(--bg-primary);padding:0.5rem 0.75rem;border-radius:4px;margin-bottom:0.5rem;border-left:3px solid var(--accent-color)">`;
                    html += `<span style="font-weight:bold">${rel.edge}</span> (w=${rel.weight}): `;
                    html += `<span style="color:var(--text-dim)">${rel.oldDist === Infinity ? '∞' : rel.oldDist}</span> → `;
                    html += `<span style="color:var(--accent-color);font-weight:bold">${rel.newDist}</span>`;
                    html += `<div style="font-size:0.85rem;color:var(--text-muted);margin-top:0.25rem;font-family:monospace">${rel.formula}</div>`;
                    html += `</div>`;
                });
            } else if (idx > 0) {
                html += `<p style="color:var(--text-dim);font-style:italic">No edges relaxed in this iteration.</p>`;
            }

            html += `<div class="table-wrapper" style="margin-top:1rem"><table><thead><tr>`;
            html += `<th>Node</th>`;
            nodes.forEach(n => html += `<th>${n}</th>`);
            html += `</tr></thead><tbody>`;
            html += `<tr><td><strong>d()</strong></td>`;
            iter.distances.forEach((d, i) => {
                const isSource = i === startIdx;
                const isOnPath = result.shortestPath.includes(nodes[i]);
                const style = isSource ? 'background:rgba(46,139,87,0.2);font-weight:bold' : (isOnPath ? 'color:var(--accent-color);font-weight:bold' : '');
                html += `<td style="${style}">${d === Infinity ? '∞' : d}</td>`;
            });
            html += `</tr>`;
            html += `<tr><td><strong>pred</strong></td>`;
            iter.predecessors.forEach((p, i) => {
                html += `<td>${p !== null ? nodes[p] : '-'}</td>`;
            });
            html += `</tr>`;
            html += `</tbody></table></div>`;
            html += '</div>';
        });

        if (result.hasNegativeCycle) {
            html += `<div class="info-box" style="margin-top:2rem;background:rgba(220,53,69,0.2);border-left:4px solid #dc3545">`;
            html += `<h3 style="color:#ff6b6b">⚠️ Negative Cycle Detected!</h3>`;
            html += `<p>The graph contains a negative weight cycle. Shortest paths are undefined because we can keep reducing the path cost indefinitely by traversing the negative cycle.</p>`;
            html += `</div>`;
        } else if (result.shortestCost !== Infinity) {
            html += `<div class="info-box success" style="margin-top:2rem"><h3>Shortest Path Found</h3>`;
            html += `<p style="font-size:1.5rem;color:var(--accent-color);margin:1rem 0"><strong>Total Cost: ${result.shortestCost}</strong></p>`;
            html += `<p style="font-size:1.2rem"><strong>Path: ${result.shortestPath.join(' → ')}</strong></p>`;
            html += '<div style="margin-top:1rem"><strong>Cost Breakdown:</strong><br>';
            for (let i = 0; i < result.shortestPath.length - 1; i++) {
                const from = result.shortestPath[i], to = result.shortestPath[i + 1];
                const cost = solver.getEdgeCost(from, to);
                const isNegative = cost < 0;
                html += `<span style="display:inline-block;margin:0.25rem;padding:0.25rem 0.5rem;background:${isNegative ? 'rgba(220,53,69,0.3)' : 'var(--bg-primary)'};color:${isNegative ? '#ff6b6b' : 'inherit'};border-radius:4px">${from}→${to}: ${cost}</span>`;
            }
            html += `<span style="display:inline-block;margin:0.25rem;padding:0.25rem 0.5rem;background:var(--accent-color);color:white;border-radius:4px;font-weight:bold">= ${result.shortestCost}</span>`;
            html += '</div></div>';
        } else {
            html += `<div class="info-box warning" style="margin-top:2rem"><h3>No Path Found</h3><p>There is no path from ${nodes[startIdx]} to ${nodes[endIdx]}.</p></div>`;
        }

        summaryContainer.innerHTML = html;
    }
}