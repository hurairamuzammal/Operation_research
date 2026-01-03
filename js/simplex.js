
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

var formatLinearExpr = function (coeffs, varPrefix) {
    if (varPrefix === undefined) varPrefix = 'x';
    if (!coeffs || coeffs.length === 0) return '0';
    var result = '';
    for (var i = 0; i < coeffs.length; i++) {
        var c = coeffs[i];
        var varName = varPrefix + '<sub>' + (i + 1) + '</sub>';
        if (i === 0) {
            result += formatNumber(c) + varName;
        } else if (c >= 0) {
            result += ' + ' + formatNumber(c) + varName;
        } else {
            result += ' - ' + formatNumber(Math.abs(c)) + varName;
        }
    }
    return result;
};

var renderMatrix = (matrix, title, rowLabels = null, colLabels = null) => {
    let html = `<div style="margin:0.5rem 0"><strong style="color:var(--accent-color)">${title}</strong>`;
    html += `<table style="margin-top:0.25rem"><tbody>`;
    if (colLabels) {
        html += '<tr><th></th>';
        colLabels.forEach(l => html += `<th style="padding:0.25rem 0.5rem;font-size:0.85rem;color:var(--text-muted)">${l}</th>`);
        html += '</tr>';
    }
    matrix.forEach((row, i) => {
        html += '<tr>';
        if (rowLabels) html += `<th style="padding:0.25rem 0.5rem;font-size:0.85rem;color:var(--text-muted)">${rowLabels[i]}</th>`;
        row.forEach(val => html += `<td style="padding:0.25rem 0.5rem;text-align:center;background:var(--bg-primary)">${formatNumber(typeof val === 'object' ? val.v : val)}</td>`);
        html += '</tr>';
    });
    html += '</tbody></table></div>';
    return html;
};

var renderVector = (vec, title, labels = null, isRow = true) => {
    let html = `<div style="margin:0.5rem 0"><strong style="color:var(--accent-color)">${title}</strong>`;
    html += `<table style="margin-top:0.25rem"><tbody>`;
    if (isRow) {
        if (labels) {
            html += '<tr>';
            labels.forEach(l => html += `<th style="padding:0.25rem 0.5rem;font-size:0.85rem;color:var(--text-muted)">${l}</th>`);
            html += '</tr>';
        }
        html += '<tr>';
        vec.forEach(v => html += `<td style="padding:0.25rem 0.5rem;text-align:center;background:var(--bg-primary)">${formatNumber(typeof v === 'object' ? v.v : v)}</td>`);
        html += '</tr>';
    } else {
        vec.forEach((v, i) => {
            html += '<tr>';
            if (labels) html += `<th style="padding:0.25rem 0.5rem;font-size:0.85rem;color:var(--text-muted)">${labels[i]}</th>`;
            html += `<td style="padding:0.25rem 0.5rem;text-align:center;background:var(--bg-primary)">${formatNumber(typeof v === 'object' ? v.v : v)}</td></tr>`;
        });
    }
    html += '</tbody></table></div>';
    return html;
};

var drawBranchAndBoundTree = (nodes) => {
    if (!nodes || nodes.length === 0) return '';


    const levels = {};
    let maxDepth = 0;
    nodes.forEach(node => {
        if (!levels[node.depth]) levels[node.depth] = [];
        levels[node.depth].push(node);
        if (node.depth > maxDepth) maxDepth = node.depth;
    });

    const nodeRadius = 25;
    const levelHeight = 100;
    const svgWidth = Math.max(800, Object.keys(levels).reduce((max, d) => Math.max(max, levels[d].length * 120), 0));
    const svgHeight = (maxDepth + 1) * levelHeight + 60;

    Object.keys(levels).forEach(depth => {
        const nodesInLevel = levels[depth];
        const totalWidth = nodesInLevel.length * 120;
        const startX = (svgWidth - totalWidth) / 2 + 60;
        nodesInLevel.forEach((node, i) => {
            node.x = startX + i * 120;
            node.y = node.depth * levelHeight + 40;
        });
    });


    let svg = `<svg width="100%" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" style="background:var(--bg-secondary);border-radius:8px;border:1px solid var(--border-color);margin-bottom:1.5rem">`;

    svg += `<defs>
        <marker id="arrow" markerWidth="10" markerHeight="10" refX="24" refY="5" orient="auto" markerUnits="strokeWidth">
        <path d="M0,0 L10,5 L0,10" fill="var(--text-muted)" />
        </marker>
    </defs>`;


    nodes.forEach(node => {
        if (node.parentId !== null) {
            const parent = nodes.find(n => n.id === node.parentId);
            if (parent) {
                svg += `<line x1="${parent.x}" y1="${parent.y}" x2="${node.x}" y2="${node.y}" stroke="var(--text-muted)" stroke-width="2" marker-end="url(#arrow)" />`;

                const midX = (parent.x + node.x) / 2;
                const midY = (parent.y + node.y) / 2;

                const label = (node.addedConstraint || '').replace(/x(\d+)/g, 'x$1');

                svg += `<rect x="${midX - 40}" y="${midY - 12}" width="80" height="24" fill="var(--bg-primary)" rx="4" stroke="var(--border-color)" />`;
                svg += `<text x="${midX}" y="${midY + 5}" text-anchor="middle" font-size="11" fill="var(--text-primary)">${label}</text>`;
            }
        }
    });


    nodes.forEach(node => {
        let fill = 'var(--bg-primary)';
        let stroke = 'var(--border-color)';
        let strokeWidth = "2";

        if (node.isIntegerSolution) {
            fill = 'rgba(46,139,87,0.2)';
            stroke = 'var(--accent-color)';
            strokeWidth = "3";
        } else if (node.pruneReason) {
            fill = 'rgba(200,100,100,0.2)';
            stroke = '#cc6666';
        } else {
            fill = 'var(--bg-tertiary)';
            stroke = 'var(--text-muted)';
        }

        svg += `<circle cx="${node.x}" cy="${node.y}" r="${nodeRadius}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`;
        svg += `<text x="${node.x}" y="${node.y + 4}" text-anchor="middle" font-size="12" font-weight="bold" fill="var(--text-primary)">${node.id}</text>`;

        let statusText = '';
        if (node.pruneReason && node.pruneReason.includes('Infeasible')) statusText = 'Infeas';
        else if (node.pruneReason && node.pruneReason.includes('Bounded')) statusText = 'Cut';
        else if (node.isIntegerSolution) statusText = 'Int';
        else if (node.lpZ !== undefined && node.lpZ !== -Infinity) statusText = `Z=${formatNumber(node.lpZ)}`;
        else statusText = '...';

        svg += `<text x="${node.x}" y="${node.y + nodeRadius + 15}" text-anchor="middle" font-size="10" fill="var(--text-primary)">${statusText}</text>`;
    });

    svg += '</svg>';
    return svg;
};
class SimplexSolver {
    constructor(objectiveCoeffs, constraints, isMinimization = false) {
        this.numVars = objectiveCoeffs.length;
        this.originalConstraints = constraints;
        this.numConstraints = constraints.length;
        this.tableau = [];
        this.basicVars = [];
        this.colHeaders = [];
        this.rowHeaders = [];
        this.steps = [];
        this.currentStep = 0;
        this.isOptimal = false;
        this.status = "Initialized";
        this.isMinimization = isMinimization;
        this.originalObjective = objectiveCoeffs;
        this.objective = isMinimization ? objectiveCoeffs.map(c => -c) : objectiveCoeffs;
        this.initTableau(this.objective, constraints);
    }
    getStandardFormHTML() {
        let html = '<div class="info-box"><h4>Standard Form</h4>';
        const objType = this.isMinimization ? 'Min' : 'Max';
        const displayObj = formatLinearExpr(this.originalObjective);
        html += `<p><strong>Objective:</strong> ${objType} Z = ${displayObj}`;
        html += ` ${this.isMinimization ? '(converted to Max by negating)' : ''} + 0s... - M(artificials)</p>`;
        html += '<p><strong>Subject to:</strong></p><ul>';
        this.originalConstraints.forEach((c, i) => {
            const coeffs = formatLinearExpr(c.coeffs);
            let slackStr = '', typeStr = '';
            if (c.type === '<=' || !c.type) { slackStr = ` + 1s<sub>${i + 1}</sub>`; typeStr = '='; }
            else if (c.type === '>=') { slackStr = ` - 1s<sub>${i + 1}</sub> + 1a<sub>${i + 1}</sub>`; typeStr = '='; }
            else { slackStr = ` + 1a<sub>${i + 1}</sub>`; typeStr = '='; }
            html += `<li>${coeffs}${slackStr} ${typeStr} ${c.rhs}</li>`;
        });
        html += '</ul></div>';
        return html;
    }
    createVal(v, m = 0) { return { v, m }; }
    add(a, b) { return { v: a.v + b.v, m: a.m + b.m }; }
    sub(a, b) { return { v: a.v - b.v, m: a.m - b.m }; }
    mul(a, scalar) { return { v: a.v * scalar, m: a.m * scalar }; }
    div(a, scalar) { return { v: a.v / scalar, m: a.m / scalar }; }
    isLess(a, b) { if (Math.abs(a.m - b.m) > 1e-9) return a.m < b.m; return a.v < b.v - 1e-9; }
    isNeg(a) { if (Math.abs(a.m) > 1e-9) return a.m < -1e-9; return a.v < -1e-9; }
    initTableau(objective, constraints) {
        let slacks = [];
        let artificials = [];
        constraints.forEach((c, i) => {
            if (c.type === '<=' || !c.type) {
                slacks.push({ row: i, sign: 1, name: `s${i + 1}` });
            } else if (c.type === '>=') {
                slacks.push({ row: i, sign: -1, name: `s${i + 1}` });
                artificials.push({ row: i, name: `a${i + 1}` });
            } else if (c.type === '=') {
                artificials.push({ row: i, name: `a${i + 1}` });
            }
        });
        for (let i = 0; i < this.numVars; i++) this.colHeaders.push(`x${i + 1}`);
        slacks.forEach(s => this.colHeaders.push(s.name));
        artificials.forEach(a => this.colHeaders.push(a.name));
        this.colHeaders.push("RHS");
        for (let i = 0; i < this.numConstraints; i++) {
            let row = [];
            constraints[i].coeffs.forEach(c => row.push(this.createVal(c)));
            slacks.forEach(s => row.push(this.createVal(s.row === i ? s.sign : 0)));
            artificials.forEach(a => row.push(this.createVal(a.row === i ? 1 : 0)));
            row.push(this.createVal(constraints[i].rhs));
            this.tableau.push(row);
            const art = artificials.find(a => a.row === i);
            if (art) {
                this.rowHeaders.push(art.name);
                this.basicVars.push(this.colHeaders.indexOf(art.name));
            } else {
                const slk = slacks.find(s => s.row === i);
                this.rowHeaders.push(slk.name);
                this.basicVars.push(this.colHeaders.indexOf(slk.name));
            }
        }
        let zRow = [];
        objective.forEach(c => zRow.push(this.createVal(-c)));
        slacks.forEach(() => zRow.push(this.createVal(0)));
        artificials.forEach(() => zRow.push(this.createVal(0, 1)));
        zRow.push(this.createVal(0));
        this.tableau.unshift(zRow);
        this.rowHeaders.unshift("Z");
        artificials.forEach(art => {
            const artRowIdx = art.row + 1;
            for (let j = 0; j < this.tableau[0].length; j++) {
                const val = this.tableau[artRowIdx][j].v;
                const subtrahend = { v: 0, m: val };
                this.tableau[0][j] = this.sub(this.tableau[0][j], subtrahend);
            }
        });
        const title = artificials.length > 0 ? "Initial Tableau (Big M)" : "Initial Tableau";
        this.saveStep(title, null, null, []);
    }
    saveStep(description, pivot = null, ratios = null, rowOps = []) {
        this.steps.push({
            tableau: JSON.parse(JSON.stringify(this.tableau)),
            rowHeaders: [...this.rowHeaders],
            basicVars: [...this.basicVars],
            description: description,
            pivot: pivot,
            ratios: ratios,
            rowOps: rowOps
        });
    }
    findPivot() {
        const zRow = this.tableau[0];
        const numCols = zRow.length - 1;
        let minVal = { v: 0, m: 0 };
        let pivotCol = -1;
        for (let j = 0; j < numCols; j++) {
            if (this.isLess(zRow[j], minVal)) {
                minVal = zRow[j];
                pivotCol = j;
            }
        }
        if (pivotCol === -1) {
            this.isOptimal = true;
            this.status = "Optimal Solution Found";
            return null;
        }
        let minRatio = Infinity;
        let pivotRow = -1;
        let ratios = [];
        for (let i = 1; i < this.tableau.length; i++) {
            const rhs = this.tableau[i][this.tableau[i].length - 1];
            const coeff = this.tableau[i][pivotCol];
            let ratioVal = null;
            if (coeff.v > 1e-9) {
                const ratio = rhs.v / coeff.v;
                ratioVal = ratio;
                if (ratio < minRatio) {
                    minRatio = ratio;
                    pivotRow = i;
                }
            }
            ratios.push(ratioVal);
        }
        if (pivotRow === -1) {
            this.status = "Unbounded Solution";
            this.saveStep("Unbounded Solution Detected", null, ratios);
            return null;
        }
        const lastStep = this.steps[this.steps.length - 1];
        lastStep.pivot = { row: pivotRow, col: pivotCol };
        lastStep.ratios = ratios;
        return { row: pivotRow, col: pivotCol };
    }
    performPivot(pivot) {
        const { row: pivotRowIdx, col: pivotColIdx } = pivot;
        const pivotElement = this.tableau[pivotRowIdx][pivotColIdx];
        const numRows = this.tableau.length;
        const numCols = this.tableau[0].length;
        const rowOps = [];
        rowOps.push(`R${pivotRowIdx + 1} ← R${pivotRowIdx + 1} / ${formatBigM(pivotElement)}`);
        for (let j = 0; j < numCols; j++) {
            this.tableau[pivotRowIdx][j] = this.div(this.tableau[pivotRowIdx][j], pivotElement.v);
        }
        for (let i = 0; i < numRows; i++) {
            if (i !== pivotRowIdx) {
                const factor = this.tableau[i][pivotColIdx];
                if (Math.abs(factor.v) > 1e-9 || Math.abs(factor.m) > 1e-9) {
                    const factorStr = formatBigM(factor);
                    rowOps.push(`R${i + 1} ← R${i + 1} - (${factorStr}) × R${pivotRowIdx + 1}`);
                    for (let j = 0; j < numCols; j++) {
                        const pivotRowVal = this.tableau[pivotRowIdx][j];
                        const subtrahend = {
                            v: pivotRowVal.v * factor.v,
                            m: pivotRowVal.v * factor.m + pivotRowVal.m * factor.v
                        };
                        this.tableau[i][j] = this.sub(this.tableau[i][j], subtrahend);
                    }
                }
            }
        }
        this.basicVars[pivotRowIdx - 1] = pivotColIdx;
        this.rowHeaders[pivotRowIdx] = this.colHeaders[pivotColIdx];
        const entering = this.colHeaders[pivotColIdx];
        const leaving = this.steps[this.steps.length - 1].rowHeaders[pivotRowIdx];
        this.saveStep(`Iteration ${this.steps.length}: Pivot (Leave ${leaving}, Enter ${entering})`, null, null, rowOps);
    }
    solve() {
        let maxSteps = 100;
        while (!this.isOptimal && maxSteps > 0) {
            const pivot = this.findPivot();
            if (!pivot) break;
            this.performPivot(pivot);
            maxSteps--;
        }
        if (!this.isOptimal && maxSteps === 0) {
            this.status = "Max iterations reached";
        }
        if (this.isOptimal) {
            const finalTableau = this.tableau;
            const rhsCol = finalTableau[0].length - 1;
            let isInfeasible = false;
            for (let i = 0; i < this.numConstraints; i++) {
                const basicVarIdx = this.basicVars[i];
                const varName = this.colHeaders[basicVarIdx];
                if (varName.startsWith('a')) {
                    const rhsVal = finalTableau[i + 1][rhsCol];
                    if (Math.abs(rhsVal.m) > 1e-9 || rhsVal.v > 1e-9) {
                        isInfeasible = true;
                        break;
                    }
                }
            }
            if (isInfeasible) {
                this.status = "Infeasible Solution";
                this.isOptimal = false;
            }
        }
    }
    static generateRandom(numVars = 2) {
        const objective = Array.from({ length: numVars }, () => Math.floor(Math.random() * 6) + 1);
        const constraints = Array.from({ length: 3 }, () => ({
            coeffs: Array.from({ length: numVars }, () => Math.floor(Math.random() * 4) + 1),
            rhs: Math.floor(Math.random() * 16) + 5,
            type: '<='
        }));
        return { objective, constraints };
    }
}
class BranchAndBoundSolver {
    constructor(objective, constraints, numVars, isMinimization = false) {
        this.objective = objective;
        this.isMinimization = isMinimization

        this.originalConstraints = constraints;
        this.numVars = numVars;
        this.bestSolution = null;
        this.bestZ = isMinimization ? Infinity : -Infinity;
        this.nodes = [];
        this.nodeId = 0;
    }
    solve() {
        const rootNode = {
            id: this.nodeId++,
            parentId: null,
            constraints: [...this.originalConstraints],
            addedConstraint: null,
            depth: 0
        };
        this.processNode(rootNode);
        return {
            nodes: this.nodes,
            bestSolution: this.bestSolution,
            bestZ: this.bestZ,
            numVars: this.numVars
        };
    }
    processNode(node) {
        const solver = new SimplexSolver(this.objective, node.constraints, this.isMinimization);
        solver.solve();
        const solution = this.extractSolution(solver);
        node.lpSolution = solution;
        node.lpZ = solution.z;
        node.status = solver.status;
        node.isOptimal = solver.isOptimal;
        node.solverSteps = solver.steps;
        node.colHeaders = solver.colHeaders;
        node.numVars = solver.numVars;
        this.nodes.push(node);
        if (!solver.isOptimal || solver.status === "Infeasible Solution") {
            node.pruneReason = "Infeasible";
            return;
        }
        const prune = this.isMinimization ? (solution.z >= this.bestZ) : (solution.z <= this.bestZ)
        if (prune) {

            node.pruneReason = `Bounded (Z ${this.isMinimization ? '>=' : '<='} ${this.bestZ.toFixed(2)}`;
            return;
        }
        const fractionalVar = this.findFractionalVariable(solution.vars);
        const best = this.isMinimization ? (solution.z < this.bestZ) : (solution.z > this.bestZ)
        if (fractionalVar === null) {
            if (best) {
                this.bestZ = solution.z;
                this.bestSolution = solution;
                node.isIntegerSolution = true;
            }
            return;
        }
        node.branchVar = fractionalVar.varName;
        node.branchValue = fractionalVar.value;
        const floorVal = Math.floor(fractionalVar.value);
        const ceilVal = Math.ceil(fractionalVar.value);
        const leftConstraint = {
            coeffs: Array(this.numVars).fill(0),
            rhs: floorVal,
            type: '<='
        };
        leftConstraint.coeffs[fractionalVar.index] = 1;
        const leftNode = {
            id: this.nodeId++,
            parentId: node.id,
            constraints: [...node.constraints, leftConstraint],
            addedConstraint: `x${fractionalVar.index + 1} ≤ ${floorVal}`,
            depth: node.depth + 1
        };
        const rightConstraint = {
            coeffs: Array(this.numVars).fill(0),
            rhs: ceilVal,
            type: '>='
        };
        rightConstraint.coeffs[fractionalVar.index] = 1;
        const rightNode = {
            id: this.nodeId++,
            parentId: node.id,
            constraints: [...node.constraints, rightConstraint],
            addedConstraint: `x${fractionalVar.index + 1} ≥ ${ceilVal}`,
            depth: node.depth + 1
        };
        this.processNode(leftNode);
        this.processNode(rightNode);
    }
    extractSolution(solver) {
        if (!solver.isOptimal) {
            return { vars: [], z: -Infinity };
        }
        const finalTableau = solver.tableau;
        const rhsCol = finalTableau[0].length - 1;
        const vars = [];
        for (let i = 0; i < this.numVars; i++) {
            const varName = `x${i + 1}`;
            const colIdx = solver.colHeaders.indexOf(varName);
            const basicRowIdx = solver.rowHeaders.indexOf(varName);
            let value = 0;
            if (basicRowIdx !== -1) {
                value = finalTableau[basicRowIdx][rhsCol].v;
            }
            vars.push({
                name: varName,
                index: i,
                value: value
            });
        }
        const z = finalTableau[0][rhsCol].v;
        return { vars, z };
    }
    findFractionalVariable(vars) {
        for (const v of vars) {
            const frac = v.value - Math.floor(v.value);
            if (frac > 0.001 && frac < 0.999) {
                return {
                    varName: v.name,
                    index: v.index,
                    value: v.value
                };
            }
        }
        return null;
    }
}
class RevisedSimplexSolver {
    constructor(c, A, b, Binv, basicIndices) {
        this.c = c;
        this.A = A;
        this.b = b;
        this.Binv = Binv;
        this.basicIndices = basicIndices;
        this.m = A.length;
        this.n = c.length;
        this.steps = [];
        this.isOptimal = false;
        this.status = "Initialized";
    }
    matMul(A, B) {
        const rowsA = A.length, colsA = A[0].length;
        const colsB = B[0] ? B[0].length : 1;
        const isVector = !B[0].length;
        if (isVector) {
            const result = [];
            for (let i = 0; i < rowsA; i++) {
                let sum = 0;
                for (let j = 0; j < colsA; j++) sum += A[i][j] * B[j];
                result.push(sum);
            }
            return result;
        }
        const result = [];
        for (let i = 0; i < rowsA; i++) {
            result[i] = [];
            for (let j = 0; j < colsB; j++) {
                let sum = 0;
                for (let k = 0; k < colsA; k++) sum += A[i][k] * B[k][j];
                result[i][j] = sum;
            }
        }
        return result;
    }
    getColumn(matrix, colIdx) {
        return matrix.map(row => row[colIdx]);
    }
    dot(a, b) {
        let sum = 0;
        for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
        return sum;
    }
    solve() {
        const maxIterations = 50;
        for (let iter = 0; iter < maxIterations; iter++) {
            const xB = this.matMul(this.Binv, this.b);
            const CB = this.basicIndices.map(idx => this.c[idx]);
            const reducedCosts = [];
            let minReducedCost = 0, enteringIdx = -1;
            for (let j = 0; j < this.n; j++) {
                if (this.basicIndices.includes(j)) {
                    reducedCosts.push({ idx: j, value: 0, isBasic: true });
                    continue;
                }
                const aj = this.getColumn(this.A, j);
                const BinvAj = this.matMul(this.Binv, aj);
                const cBar = this.c[j] - this.dot(CB, BinvAj);
                reducedCosts.push({ idx: j, value: cBar, isBasic: false, BinvAj: BinvAj });
                if (cBar < minReducedCost) {
                    minReducedCost = cBar;
                    enteringIdx = j;
                }
            }
            const Z = this.dot(CB, xB);
            if (enteringIdx === -1) {
                this.steps.push({
                    type: 'optimal',
                    iteration: iter + 1,
                    title: `Iteration ${iter + 1}: Optimality Check`,
                    Binv: deepCopy(this.Binv),
                    xB: [...xB],
                    CB: [...CB],
                    reducedCosts: reducedCosts,
                    Z: Z,
                    description: 'All reduced costs ≥ 0. Optimal solution found! ✓'
                });
                this.isOptimal = true;
                this.status = "Optimal Solution Found";
                this.finalXB = xB;
                this.finalZ = Z;
                break;
            }
            const aEntering = this.getColumn(this.A, enteringIdx);
            const d = this.matMul(this.Binv, aEntering);
            let minRatio = Infinity, leavingRow = -1;
            const ratios = [];
            for (let i = 0; i < this.m; i++) {
                if (d[i] > 1e-9) {
                    const ratio = xB[i] / d[i];
                    ratios.push({ row: i, ratio: ratio, xB: xB[i], d: d[i] });
                    if (ratio < minRatio) {
                        minRatio = ratio;
                        leavingRow = i;
                    }
                } else {
                    ratios.push({ row: i, ratio: null, xB: xB[i], d: d[i] });
                }
            }
            if (leavingRow === -1) {
                this.steps.push({
                    type: 'unbounded',
                    iteration: iter + 1,
                    title: `Iteration ${iter + 1}: Unbounded`,
                    description: 'No positive d values. Problem is unbounded.'
                });
                this.status = "Unbounded";
                break;
            }
            const leavingIdx = this.basicIndices[leavingRow];
            this.steps.push({
                type: 'iteration',
                iteration: iter + 1,
                title: `Iteration ${iter + 1}: Matrix Operations`,
                Binv: deepCopy(this.Binv),
                xB: [...xB],
                CB: [...CB],
                reducedCosts: reducedCosts,
                Z: Z,
                entering: { idx: enteringIdx, name: `x${enteringIdx + 1}` },
                leaving: { idx: leavingIdx, row: leavingRow, name: `x${leavingIdx + 1}` },
                d: [...d],
                ratios: ratios,
                theta: minRatio,
                description: `Entering: x${enteringIdx + 1} (c̄ = ${formatNumber(minReducedCost)}), Leaving: x${leavingIdx + 1} (θ = ${formatNumber(minRatio)})`
            });
            const pivotElement = d[leavingRow];
            const newBinv = deepCopy(this.Binv);
            for (let j = 0; j < this.m; j++) {
                newBinv[leavingRow][j] /= pivotElement;
            }
            for (let i = 0; i < this.m; i++) {
                if (i !== leavingRow) {
                    const factor = d[i];
                    for (let j = 0; j < this.m; j++) {
                        newBinv[i][j] -= factor * newBinv[leavingRow][j];
                    }
                }
            }
            this.Binv = newBinv;
            this.basicIndices[leavingRow] = enteringIdx;
        }
        return {
            steps: this.steps,
            isOptimal: this.isOptimal,
            status: this.status,
            finalXB: this.finalXB,
            finalZ: this.finalZ,
            basicIndices: this.basicIndices
        };
    }
}
class SensitivityAnalysis {
    constructor(solver) {
        this.solver = solver;
        this.tableau = solver.tableau;
        this.colHeaders = solver.colHeaders;
        this.rowHeaders = solver.rowHeaders;
        this.basicVars = solver.basicVars;
        this.numVars = solver.numVars;
        this.numConstraints = solver.numConstraints;
    }

    getVal(val) {
        if (typeof val === 'object' && val !== null && 'v' in val) {
            return val.v;
        }
        return val;
    }

    getShadowPrices() {
        const shadowPrices = [];
        const zRow = this.tableau[0];
        for (let i = 0; i < this.numConstraints; i++) {
            const slackName = `s${i + 1}`;
            const colIdx = this.colHeaders.indexOf(slackName);

            if (colIdx !== -1) {
                const price = this.getVal(zRow[colIdx]);
                shadowPrices.push({
                    constraint: `Constraint ${i + 1}`,
                    shadowPrice: price
                });
            } else {
                shadowPrices.push({
                    constraint: `Constraint ${i + 1}`,
                    shadowPrice: 0
                });
            }
        }
        return shadowPrices;
    }

    getRangeOfOptimality() {
        const ranges = [];
        const zRow = this.tableau[0];

        for (let j = 0; j < this.numVars; j++) {
            const varName = `x${j + 1}`;
            const currentCj = this.solver.objective[j];
            const colIdx = j;

            const basicRowIdx = this.basicVars.indexOf(colIdx);

            if (basicRowIdx === -1) {
                const reducedCost = this.getVal(zRow[colIdx]);
                ranges.push({
                    variable: varName,
                    current: currentCj,
                    lower: -Infinity,
                    upper: currentCj + reducedCost
                });
            } else {
                const rowIdx = basicRowIdx + 1;
                let maxNegDelta = -Infinity;
                let minPosDelta = Infinity;

                for (let k = 0; k < this.colHeaders.length - 1; k++) {
                    if (!this.basicVars.includes(k)) {
                        const reducedCost = this.getVal(zRow[k]);
                        const y_ik = this.getVal(this.tableau[rowIdx][k]);

                        if (Math.abs(y_ik) > 1e-9) {
                            const val = -reducedCost / y_ik;
                            if (y_ik > 0) {
                                if (val > maxNegDelta) maxNegDelta = val;
                            } else {
                                if (val < minPosDelta) minPosDelta = val;
                            }
                        }
                    }
                }

                ranges.push({
                    variable: varName,
                    current: currentCj,
                    lower: maxNegDelta === -Infinity ? -Infinity : currentCj + maxNegDelta,
                    upper: minPosDelta === Infinity ? Infinity : currentCj + minPosDelta
                });
            }
        }
        return ranges;
    }

    getRangeOfFeasibility() {
        const ranges = [];
        const rhsColIdx = this.colHeaders.length - 1;

        for (let i = 0; i < this.numConstraints; i++) {
            const constraintName = `Constraint ${i + 1}`;
            const currentRhs = this.solver.originalConstraints[i].rhs;
            const slackName = `s${i + 1}`;
            const slackColIdx = this.colHeaders.indexOf(slackName);

            if (slackColIdx === -1) {
                ranges.push({
                    constraint: constraintName,
                    current: currentRhs,
                    lower: currentRhs,
                    upper: currentRhs
                });
                continue;
            }

            let maxNegDelta = -Infinity;
            let minPosDelta = Infinity;

            for (let k = 1; k <= this.numConstraints; k++) {
                const b_k = this.getVal(this.tableau[k][rhsColIdx]);
                const s_ki = this.getVal(this.tableau[k][slackColIdx]);

                if (Math.abs(s_ki) > 1e-9) {
                    const val = -b_k / s_ki;
                    if (s_ki > 0) {
                        if (val > maxNegDelta) maxNegDelta = val;
                    } else {
                        if (val < minPosDelta) minPosDelta = val;
                    }
                }
            }

            ranges.push({
                constraint: constraintName,
                current: currentRhs,
                lower: maxNegDelta === -Infinity ? -Infinity : currentRhs + maxNegDelta,
                upper: minPosDelta === Infinity ? Infinity : currentRhs + minPosDelta
            });
        }

        return ranges;
    }

    getMatrixComponents() {

        return {};
    }
}

class InteractiveSensitivityAnalysis {
    constructor(solver, objective, constraints, numVars, isMinimization = false) {
        this.solver = solver;
        this.objective = objective;
        this.constraints = [...constraints];
        this.numVars = numVars;
        this.isMinimization = isMinimization;
        this.extractSolution();
    }

    extractSolution() {
        const finalStep = this.solver.steps[this.solver.steps.length - 1];
        const finalTableau = finalStep.tableau;
        this.solutionValues = {};
        for (let i = 0; i < this.numVars; i++) {
            const varName = `x${i + 1}`;
            const rowIdx = finalStep.rowHeaders.indexOf(varName);
            this.solutionValues[varName] = rowIdx !== -1
                ? finalTableau[rowIdx][finalTableau[rowIdx].length - 1].v
                : 0;
        }
        const zRaw = finalTableau[0][finalTableau[0].length - 1].v;
        this.optimalZ = this.isMinimization ? -zRaw : zRaw;
    }

    checkConstraintFeasibility(coeffs, type, rhs) {
        let lhsValue = 0;
        for (let i = 0; i < coeffs.length; i++) {
            const varName = `x${i + 1}`;
            lhsValue += coeffs[i] * (this.solutionValues[varName] || 0);
        }
        let isSatisfied = false;
        if (type === '<=' || type === '≤') {
            isSatisfied = lhsValue <= rhs + 1e-9;
        } else if (type === '>=' || type === '≥') {
            isSatisfied = lhsValue >= rhs - 1e-9;
        } else {
            isSatisfied = Math.abs(lhsValue - rhs) < 1e-9;
        }
        return {
            isSatisfied,
            lhsValue,
            rhs,
            type,
            slack: type === '<=' ? rhs - lhsValue : (type === '>=' ? lhsValue - rhs : 0)
        };
    }

    resolveWithNewConstraint(coeffs, type, rhs) {
        const finalStep = this.solver.steps[this.solver.steps.length - 1];
        const finalTableau = finalStep.tableau;
        const m = this.constraints.length;
        const slackColStart = this.numVars;

        const Binv = [];
        for (let i = 0; i < m; i++) {
            const row = [];
            for (let j = 0; j < m; j++) {
                const val = finalTableau[i + 1][slackColStart + j];
                row.push(val?.v || 0);
            }
            Binv.push(row);
        }

        const newConstraints = [...this.constraints, { coeffs, type, rhs }];
        const newSolver = new SimplexSolver(this.objective, newConstraints, this.isMinimization);
        newSolver.solve();

        const matrixInfo = {
            Binv: Binv,
            originalSolution: { ...this.solutionValues },
            method: 'Re-solving from scratch (Dual Simplex would be more efficient for violated constraints)'
        };

        return {
            solver: newSolver,
            isOptimal: newSolver.isOptimal,
            status: newSolver.status,
            steps: newSolver.steps,
            matrixInfo: matrixInfo
        };
    }

    checkVariableProfitability(objCoeff, constraintCoeffs) {
        if (!this.solver.isOptimal) return { isProfitable: false, reducedCost: 0 };
        const finalStep = this.solver.steps[this.solver.steps.length - 1];
        const finalTableau = finalStep.tableau;
        const m = this.constraints.length;
        let cbBinv = [];
        for (let j = 0; j < m; j++) {
            let sum = 0;
            for (let i = 0; i < m; i++) {
                const varName = finalStep.rowHeaders[i + 1];
                let cVal = 0;
                if (varName.startsWith('x')) {
                    const idx = parseInt(varName.substring(1)) - 1;
                    if (idx < this.objective.length) cVal = this.isMinimization ? -this.objective[idx] : this.objective[idx];
                }
                const slackColStart = this.numVars;
                const BinvVal = finalTableau[i + 1][slackColStart + j]?.v || 0;
                sum += cVal * BinvVal;
            }
            cbBinv.push(sum);
        }
        let cbBinvAn = 0;
        for (let i = 0; i < m; i++) {
            cbBinvAn += cbBinv[i] * (constraintCoeffs[i] || 0);
        }
        const reducedCost = (this.isMinimization ? -objCoeff : objCoeff) - cbBinvAn;
        const isProfitable = this.isMinimization ? reducedCost > 1e-9 : reducedCost > 1e-9;
        return { isProfitable, reducedCost, cbBinvAn };
    }

    resolveWithNewVariable(objCoeff, constraintCoeffs) {
        const finalStep = this.solver.steps[this.solver.steps.length - 1];
        const finalTableau = finalStep.tableau;
        const m = this.constraints.length;
        const slackColStart = this.numVars;

        const Binv = [];
        for (let i = 0; i < m; i++) {
            const row = [];
            for (let j = 0; j < m; j++) {
                const val = finalTableau[i + 1][slackColStart + j];
                row.push(val?.v || 0);
            }
            Binv.push(row);
        }

        const newCol = [];
        for (let i = 0; i < m; i++) {
            let sum = 0;
            for (let j = 0; j < m; j++) {
                sum += Binv[i][j] * (constraintCoeffs[j] || 0);
            }
            newCol.push(sum);
        }

        const CB = [];
        for (let i = 0; i < m; i++) {
            const varName = finalStep.rowHeaders[i + 1];
            if (varName.startsWith('x')) {
                const idx = parseInt(varName.substring(1)) - 1;
                if (idx < this.objective.length) {
                    CB.push(this.isMinimization ? -this.objective[idx] : this.objective[idx]);
                } else {
                    CB.push(0);
                }
            } else {
                CB.push(0);
            }
        }

        let cbNewCol = 0;
        for (let i = 0; i < m; i++) {
            cbNewCol += CB[i] * newCol[i];
        }
        const cNew = this.isMinimization ? -objCoeff : objCoeff;
        const reducedCost = cNew - cbNewCol;

        const newObjective = [...this.objective, objCoeff];
        const newConstraints = this.constraints.map((con, i) => ({
            ...con,
            coeffs: [...con.coeffs, constraintCoeffs[i] || 0]
        }));
        const newNumVars = this.numVars + 1;

        const augmentedSteps = [];
        const augmentedColHeaders = [...this.solver.colHeaders.slice(0, -1), `x${newNumVars}`, 'RHS'];

        const augmentedTableau = [];
        const zRow = [];
        for (let j = 0; j < finalTableau[0].length - 1; j++) {
            zRow.push({ v: finalTableau[0][j].v, m: finalTableau[0][j].m || 0 });
        }
        zRow.push({ v: -reducedCost, m: 0 });
        zRow.push({ v: finalTableau[0][finalTableau[0].length - 1].v, m: finalTableau[0][finalTableau[0].length - 1].m || 0 });
        augmentedTableau.push(zRow);

        for (let i = 1; i <= m; i++) {
            const row = [];
            for (let j = 0; j < finalTableau[i].length - 1; j++) {
                row.push({ v: finalTableau[i][j].v, m: finalTableau[i][j].m || 0 });
            }
            row.push({ v: newCol[i - 1], m: 0 });
            row.push({ v: finalTableau[i][finalTableau[i].length - 1].v, m: finalTableau[i][finalTableau[i].length - 1].m || 0 });
            augmentedTableau.push(row);
        }

        augmentedSteps.push({
            tableau: JSON.parse(JSON.stringify(augmentedTableau)),
            rowHeaders: [...finalStep.rowHeaders],
            basicVars: [...finalStep.basicVars],
            description: `Optimal Tableau with New Variable x${newNumVars} Added (c̄ = ${formatNumber(reducedCost)})`,
            pivot: null,
            ratios: null,
            rowOps: []
        });

        if (reducedCost <= 1e-9) {
            return {
                solver: {
                    isOptimal: true,
                    status: "Optimal Solution Found",
                    colHeaders: augmentedColHeaders,
                    tableau: augmentedTableau,
                    steps: augmentedSteps,
                    numVars: newNumVars
                },
                isOptimal: true,
                status: "Variable not profitable - current solution remains optimal",
                steps: augmentedSteps,
                numVars: newNumVars,
                usedBinv: true,
                reducedCost: reducedCost
            };
        }

        const newSolver = new SimplexSolver(newObjective, newConstraints, this.isMinimization);
        newSolver.solve();

        const combinedSteps = [...augmentedSteps];
        combinedSteps.push({
            tableau: augmentedSteps[0].tableau,
            rowHeaders: augmentedSteps[0].rowHeaders,
            basicVars: augmentedSteps[0].basicVars,
            description: `Variable x${newNumVars} is profitable (c̄ = ${formatNumber(reducedCost)} > 0). Continuing with pivots...`,
            pivot: null,
            ratios: null,
            rowOps: []
        });

        newSolver.steps.slice(1).forEach(step => combinedSteps.push(step));

        return {
            solver: newSolver,
            isOptimal: newSolver.isOptimal,
            status: newSolver.status,
            steps: combinedSteps,
            numVars: newNumVars,
            usedBinv: true,
            reducedCost: reducedCost,
            newColInOptimal: newCol
        };
    }
}

class MatrixSensitivityAnalysis {
    constructor(solver, objective, constraints, numVars, isMinimization = false) {
        this.solver = solver;
        this.objective = objective;
        this.constraints = [...constraints];
        this.numVars = numVars;
        this.numConstraints = constraints.length;
        this.isMinimization = isMinimization;
        this.extractMatrixComponents();
    }

    extractMatrixComponents() {
        if (!this.solver.isOptimal) return;

        const finalStep = this.solver.steps[this.solver.steps.length - 1];
        const finalTableau = finalStep.tableau;
        const m = this.numConstraints;

        this.Binv = [];
        const slackStartCol = this.numVars;
        for (let i = 0; i < m; i++) {
            const row = [];
            for (let j = 0; j < m; j++) {
                const val = finalTableau[i + 1][slackStartCol + j];
                row.push(val?.v || 0);
            }
            this.Binv.push(row);
        }

        this.basicVarIndices = [];
        this.basicVarNames = [];
        for (let i = 1; i <= m; i++) {
            const varName = finalStep.rowHeaders[i];
            this.basicVarNames.push(varName);
            const colIdx = this.solver.colHeaders.indexOf(varName);
            this.basicVarIndices.push(colIdx);
        }

        this.currentRHS = [];
        for (let i = 1; i <= m; i++) {
            const rhsVal = finalTableau[i][finalTableau[i].length - 1];
            this.currentRHS.push(rhsVal?.v || 0);
        }

        this.originalA = this.constraints.map(c => [...c.coeffs]);
        this.originalB = this.constraints.map(c => c.rhs);

        this.CB = [];
        for (let i = 0; i < m; i++) {
            const varName = this.basicVarNames[i];
            if (varName.startsWith('x')) {
                const idx = parseInt(varName.substring(1)) - 1;
                if (idx < this.numVars) {
                    this.CB.push(this.isMinimization ? -this.objective[idx] : this.objective[idx]);
                } else {
                    this.CB.push(0);
                }
            } else {
                this.CB.push(0);
            }
        }

        const zRaw = finalTableau[0][finalTableau[0].length - 1].v;
        this.optimalZ = this.isMinimization ? -zRaw : zRaw;

        this.solutionValues = {};
        for (let i = 0; i < this.numVars; i++) {
            const varName = `x${i + 1}`;
            const rowIdx = finalStep.rowHeaders.indexOf(varName);
            this.solutionValues[varName] = rowIdx !== -1
                ? finalTableau[rowIdx][finalTableau[rowIdx].length - 1].v
                : 0;
        }
    }

    matVecMul(matrix, vector) {
        const result = [];
        for (let i = 0; i < matrix.length; i++) {
            let sum = 0;
            for (let j = 0; j < matrix[i].length; j++) {
                sum += matrix[i][j] * vector[j];
            }
            result.push(sum);
        }
        return result;
    }

    dotProduct(a, b) {
        let sum = 0;
        for (let i = 0; i < a.length; i++) {
            sum += a[i] * b[i];
        }
        return sum;
    }

    modifyRHS(constraintIdx, newValue) {
        const steps = [];
        const oldValue = this.originalB[constraintIdx];

        steps.push({
            type: 'info',
            title: 'RHS Modification',
            content: `Changing RHS of Constraint ${constraintIdx + 1} from ${formatNumber(oldValue)} to ${formatNumber(newValue)}`
        });

        steps.push({
            type: 'matrix',
            title: 'Current B⁻¹ Matrix',
            matrix: this.Binv,
            labels: this.basicVarNames.map(n => n.replace(/([xsa])(\d+)/i, '$1<sub>$2</sub>'))
        });

        const newB = [...this.originalB];
        newB[constraintIdx] = newValue;

        steps.push({
            type: 'vector',
            title: 'Original b Vector',
            vector: this.originalB,
            labels: this.constraints.map((_, i) => `b<sub>${i + 1}</sub>`)
        });

        steps.push({
            type: 'vector',
            title: 'New b Vector (b\')',
            vector: newB,
            labels: this.constraints.map((_, i) => `b\'<sub>${i + 1}</sub>`),
            highlightIdx: constraintIdx
        });

        const newXB = this.matVecMul(this.Binv, newB);

        steps.push({
            type: 'calculation',
            title: 'Calculating New Basic Solution',
            formula: 'x<sub>B</sub>\' = B⁻¹ × b\'',
            details: `New basic variable values = B⁻¹ × [${newB.map(v => formatNumber(v)).join(', ')}]`
        });

        steps.push({
            type: 'vector',
            title: 'New Basic Variable Values (x<sub>B</sub>\')',
            vector: newXB,
            labels: this.basicVarNames.map(n => n.replace(/([xsa])(\d+)/i, '$1<sub>$2</sub>'))
        });

        const isFeasible = newXB.every(v => v >= -1e-9);

        const newZ = this.dotProduct(this.CB, newXB);
        const displayZ = this.isMinimization ? -newZ : newZ;

        steps.push({
            type: 'calculation',
            title: 'Calculating New Objective Value',
            formula: 'Z\' = C<sub>B</sub> × x<sub>B</sub>\'',
            details: `Z' = ${formatNumber(displayZ)}`
        });

        let needsResolve = false;
        let resolveResult = null;

        if (isFeasible) {
            steps.push({
                type: 'result',
                title: 'Feasibility Check',
                status: 'success',
                content: 'All basic variable values are non-negative. Current basis remains optimal!'
            });
        } else {
            steps.push({
                type: 'result',
                title: 'Feasibility Check',
                status: 'warning',
                content: 'Some basic variable values are negative. Need to re-solve using Dual Simplex or from scratch.'
            });
            needsResolve = true;

            const newConstraints = this.constraints.map((c, i) => ({
                ...c,
                rhs: newB[i]
            }));
            const newSolver = new SimplexSolver(this.objective, newConstraints, this.isMinimization);
            newSolver.solve();
            resolveResult = {
                solver: newSolver,
                isOptimal: newSolver.isOptimal,
                status: newSolver.status,
                steps: newSolver.steps
            };
        }

        const newSolutionValues = {};
        for (let i = 0; i < this.numVars; i++) {
            const varName = `x${i + 1}`;
            const basicIdx = this.basicVarNames.indexOf(varName);
            newSolutionValues[varName] = basicIdx !== -1 ? Math.max(0, newXB[basicIdx]) : 0;
        }

        return {
            steps,
            isFeasible,
            needsResolve,
            resolveResult,
            originalZ: this.optimalZ,
            newZ: displayZ,
            originalSolution: { ...this.solutionValues },
            newSolution: newSolutionValues,
            originalRHS: this.originalB,
            newRHS: newB,
            modifiedConstraint: constraintIdx
        };
    }

    modifyConstraintCoefficient(constraintIdx, varIdx, newValue) {
        const steps = [];
        const oldValue = this.originalA[constraintIdx][varIdx];

        steps.push({
            type: 'info',
            title: 'Constraint Coefficient Modification',
            content: `Changing A[${constraintIdx + 1}][${varIdx + 1}] (coefficient of x<sub>${varIdx + 1}</sub> in Constraint ${constraintIdx + 1}) from ${formatNumber(oldValue)} to ${formatNumber(newValue)}`
        });

        steps.push({
            type: 'matrix',
            title: 'Current B⁻¹ Matrix',
            matrix: this.Binv,
            labels: this.basicVarNames.map(n => n.replace(/([xsa])(\d+)/i, '$1<sub>$2</sub>'))
        });

        const newA = this.originalA.map(row => [...row]);
        newA[constraintIdx][varIdx] = newValue;

        const varName = `x${varIdx + 1}`;
        const isVarBasic = this.basicVarNames.includes(varName);

        const oldColumn = this.originalA.map(row => row[varIdx]);
        const newColumn = newA.map(row => row[varIdx]);

        steps.push({
            type: 'vector',
            title: `Original Column a<sub>${varIdx + 1}</sub>`,
            vector: oldColumn,
            labels: this.constraints.map((_, i) => `Row ${i + 1}`)
        });

        steps.push({
            type: 'vector',
            title: `New Column a\'<sub>${varIdx + 1}</sub>`,
            vector: newColumn,
            labels: this.constraints.map((_, i) => `Row ${i + 1}`),
            highlightIdx: constraintIdx
        });

        const newBinvAj = this.matVecMul(this.Binv, newColumn);

        steps.push({
            type: 'calculation',
            title: 'Calculating Updated Tableau Column',
            formula: `B⁻¹ × a\'<sub>${varIdx + 1}</sub>`,
            details: `New column in optimal tableau for x<sub>${varIdx + 1}</sub>`
        });

        steps.push({
            type: 'vector',
            title: `New Tableau Column for x<sub>${varIdx + 1}</sub>`,
            vector: newBinvAj,
            labels: this.basicVarNames.map(n => n.replace(/([xsa])(\d+)/i, '$1<sub>$2</sub>'))
        });

        const cj = varIdx < this.numVars
            ? (this.isMinimization ? -this.objective[varIdx] : this.objective[varIdx])
            : 0;
        const cbBinvAj = this.dotProduct(this.CB, newBinvAj);
        const newReducedCost = cj - cbBinvAj;

        steps.push({
            type: 'calculation',
            title: 'Calculating New Reduced Cost',
            formula: `c̄<sub>${varIdx + 1}</sub>\' = c<sub>${varIdx + 1}</sub> - C<sub>B</sub> × B⁻¹ × a\'<sub>${varIdx + 1}</sub>`,
            details: `c̄<sub>${varIdx + 1}</sub>' = ${formatNumber(cj)} - ${formatNumber(cbBinvAj)} = ${formatNumber(newReducedCost)}`
        });

        let needsResolve = false;
        let resolveResult = null;

        if (isVarBasic) {
            steps.push({
                type: 'result',
                title: 'Basic Variable Modified',
                status: 'warning',
                content: `x<sub>${varIdx + 1}</sub> is a basic variable. Modifying its constraint coefficient may affect the basis structure. Re-solving required.`
            });
            needsResolve = true;
        } else {
            if (newReducedCost >= -1e-9) {
                steps.push({
                    type: 'result',
                    title: 'Optimality Check',
                    status: 'success',
                    content: `Reduced cost c̄<sub>${varIdx + 1}</sub>' = ${formatNumber(newReducedCost)} ≥ 0. Current basis remains optimal!`
                });
            } else {
                steps.push({
                    type: 'result',
                    title: 'Optimality Check',
                    status: 'warning',
                    content: `Reduced cost c̄<sub>${varIdx + 1}</sub>' = ${formatNumber(newReducedCost)} < 0. Variable x<sub>${varIdx + 1}</sub> should enter the basis. Re-solving required.`
                });
                needsResolve = true;
            }
        }

        if (needsResolve) {
            const newConstraints = this.constraints.map((c, i) => ({
                ...c,
                coeffs: [...newA[i]]
            }));
            const newSolver = new SimplexSolver(this.objective, newConstraints, this.isMinimization);
            newSolver.solve();
            resolveResult = {
                solver: newSolver,
                isOptimal: newSolver.isOptimal,
                status: newSolver.status,
                steps: newSolver.steps
            };
        }

        return {
            steps,
            isVarBasic,
            newReducedCost,
            needsResolve,
            resolveResult,
            originalZ: this.optimalZ,
            originalSolution: { ...this.solutionValues },
            originalA: this.originalA,
            newA: newA,
            modifiedConstraint: constraintIdx,
            modifiedVar: varIdx
        };
    }

    modifyEntireConstraint(constraintIdx, newCoeffs, newRHS = null) {
        const steps = [];
        const oldCoeffs = this.originalA[constraintIdx];
        const oldRHS = this.originalB[constraintIdx];

        steps.push({
            type: 'info',
            title: 'Entire Constraint Modification',
            content: `Modifying Constraint ${constraintIdx + 1}`
        });

        steps.push({
            type: 'constraint',
            title: 'Original Constraint',
            coeffs: oldCoeffs,
            rhs: oldRHS,
            type_sym: this.constraints[constraintIdx].type
        });

        steps.push({
            type: 'constraint',
            title: 'New Constraint',
            coeffs: newCoeffs,
            rhs: newRHS !== null ? newRHS : oldRHS,
            type_sym: this.constraints[constraintIdx].type
        });

        steps.push({
            type: 'matrix',
            title: 'Current B⁻¹ Matrix',
            matrix: this.Binv,
            labels: this.basicVarNames.map(n => n.replace(/([xsa])(\d+)/i, '$1<sub>$2</sub>'))
        });

        const newA = this.originalA.map(row => [...row]);
        newA[constraintIdx] = [...newCoeffs];

        const newB = [...this.originalB];
        if (newRHS !== null) {
            newB[constraintIdx] = newRHS;
        }

        const newXB = this.matVecMul(this.Binv, newB);
        const isFeasible = newXB.every(v => v >= -1e-9);

        steps.push({
            type: 'calculation',
            title: 'Checking Feasibility',
            formula: 'x<sub>B</sub>\' = B⁻¹ × b\'',
            details: `New basic values: [${newXB.map(v => formatNumber(v)).join(', ')}]`
        });

        let allOptimal = true;
        for (let j = 0; j < this.numVars; j++) {
            if (!this.basicVarNames.includes(`x${j + 1}`)) {
                const col = newA.map(row => row[j]);
                const BinvCol = this.matVecMul(this.Binv, col);
                const cj = this.isMinimization ? -this.objective[j] : this.objective[j];
                const reducedCost = cj - this.dotProduct(this.CB, BinvCol);
                if (reducedCost < -1e-9) {
                    allOptimal = false;
                    break;
                }
            }
        }

        const needsResolve = !isFeasible || !allOptimal;
        let resolveResult = null;

        if (needsResolve) {
            steps.push({
                type: 'result',
                title: 'Optimality Check',
                status: 'warning',
                content: `${!isFeasible ? 'Infeasible solution.' : ''} ${!allOptimal ? 'Non-optimal reduced costs.' : ''} Re-solving required.`
            });

            const newConstraints = this.constraints.map((c, i) => ({
                ...c,
                coeffs: [...newA[i]],
                rhs: newB[i]
            }));
            const newSolver = new SimplexSolver(this.objective, newConstraints, this.isMinimization);
            newSolver.solve();
            resolveResult = {
                solver: newSolver,
                isOptimal: newSolver.isOptimal,
                status: newSolver.status,
                steps: newSolver.steps
            };
        } else {
            steps.push({
                type: 'result',
                title: 'Optimality Check',
                status: 'success',
                content: 'Current basis remains optimal!'
            });
        }

        const newZ = this.dotProduct(this.CB, newXB);
        const displayZ = this.isMinimization ? -newZ : newZ;

        return {
            steps,
            isFeasible,
            allOptimal,
            needsResolve,
            resolveResult,
            originalZ: this.optimalZ,
            newZ: displayZ,
            originalSolution: { ...this.solutionValues },
            modifiedConstraint: constraintIdx
        };
    }

    modifyObjectiveCoefficient(varIdx, newValue) {
        const steps = [];
        const oldValue = this.objective[varIdx];
        const varName = `x${varIdx + 1}`;

        steps.push({
            type: 'info',
            title: 'Objective Coefficient Modification',
            content: `Changing c<sub>${varIdx + 1}</sub> (coefficient of ${varName} in objective) from ${formatNumber(oldValue)} to ${formatNumber(newValue)}`
        });

        steps.push({
            type: 'matrix',
            title: 'Current B⁻¹ Matrix',
            matrix: this.Binv,
            labels: this.basicVarNames.map(n => n.replace(/([xsa])(\d+)/i, '$1<sub>$2</sub>'))
        });

        const newObjective = [...this.objective];
        newObjective[varIdx] = newValue;

        steps.push({
            type: 'vector',
            title: 'Original Objective Coefficients (c)',
            vector: this.objective,
            labels: this.objective.map((_, i) => `c<sub>${i + 1}</sub>`)
        });

        steps.push({
            type: 'vector',
            title: 'New Objective Coefficients (c\')',
            vector: newObjective,
            labels: newObjective.map((_, i) => `c'<sub>${i + 1}</sub>`),
            highlightIdx: varIdx
        });

        const isVarBasic = this.basicVarNames.includes(varName);

        if (isVarBasic) {
            const newCB = [];
            for (let i = 0; i < this.numConstraints; i++) {
                const vn = this.basicVarNames[i];
                if (vn === varName) {
                    newCB.push(this.isMinimization ? -newValue : newValue);
                } else if (vn.startsWith('x')) {
                    const idx = parseInt(vn.substring(1)) - 1;
                    if (idx < this.numVars) {
                        newCB.push(this.isMinimization ? -this.objective[idx] : this.objective[idx]);
                    } else {
                        newCB.push(0);
                    }
                } else {
                    newCB.push(0);
                }
            }

            steps.push({
                type: 'calculation',
                title: 'Recalculating C<sub>B</sub> (Basic Variable Changed)',
                formula: 'C<sub>B</sub>\' contains updated coefficient',
                details: `New C<sub>B</sub>' = [${newCB.map(v => formatNumber(v)).join(', ')}]`
            });

            let allOptimal = true;
            const newReducedCosts = [];
            for (let j = 0; j < this.numVars; j++) {
                if (!this.basicVarNames.includes(`x${j + 1}`)) {
                    const col = this.originalA.map(row => row[j]);
                    const BinvCol = this.matVecMul(this.Binv, col);
                    const cj = j === varIdx ? (this.isMinimization ? -newValue : newValue) : (this.isMinimization ? -this.objective[j] : this.objective[j]);
                    const reducedCost = cj - this.dotProduct(newCB, BinvCol);
                    newReducedCosts.push({ var: `x${j + 1}`, cost: reducedCost });
                    if (reducedCost < -1e-9) {
                        allOptimal = false;
                    }
                }
            }

            steps.push({
                type: 'vector',
                title: 'New Reduced Costs (c̄\')',
                vector: newReducedCosts.map(r => r.cost),
                labels: newReducedCosts.map(r => `c̄<sub>${r.var}</sub>`)
            });

            const needsResolve = !allOptimal;
            let resolveResult = null;

            if (needsResolve) {
                steps.push({
                    type: 'result',
                    title: 'Optimality Check',
                    status: 'warning',
                    content: 'Some reduced costs are negative. Current basis is no longer optimal. Re-solving required.'
                });

                const newSolver = new SimplexSolver(newObjective, this.constraints, this.isMinimization);
                newSolver.solve();
                resolveResult = {
                    solver: newSolver,
                    isOptimal: newSolver.isOptimal,
                    status: newSolver.status,
                    steps: newSolver.steps
                };
            } else {
                steps.push({
                    type: 'result',
                    title: 'Optimality Check',
                    status: 'success',
                    content: 'All reduced costs remain non-negative. Current basis remains optimal!'
                });
            }

            const newZ = this.dotProduct(newCB, this.currentRHS);
            const displayZ = this.isMinimization ? -newZ : newZ;

            return {
                steps,
                isVarBasic,
                needsResolve,
                resolveResult,
                originalZ: this.optimalZ,
                newZ: displayZ,
                originalSolution: { ...this.solutionValues },
                newSolution: needsResolve ? null : { ...this.solutionValues },
                originalObjective: this.objective,
                newObjective: newObjective,
                modifiedVar: varIdx
            };

        } else {
            const col = this.originalA.map(row => row[varIdx]);
            const BinvCol = this.matVecMul(this.Binv, col);
            const newCj = this.isMinimization ? -newValue : newValue;
            const cbBinvCol = this.dotProduct(this.CB, BinvCol);
            const newReducedCost = newCj - cbBinvCol;

            steps.push({
                type: 'calculation',
                title: 'Recalculating Reduced Cost for Non-Basic Variable',
                formula: `c̄<sub>${varIdx + 1}</sub>\' = c\'<sub>${varIdx + 1}</sub> - C<sub>B</sub> × B⁻¹ × a<sub>${varIdx + 1}</sub>`,
                details: `c̄<sub>${varIdx + 1}</sub>' = ${formatNumber(newCj)} - ${formatNumber(cbBinvCol)} = ${formatNumber(newReducedCost)}`
            });

            const needsResolve = newReducedCost < -1e-9;
            let resolveResult = null;

            if (needsResolve) {
                steps.push({
                    type: 'result',
                    title: 'Optimality Check',
                    status: 'warning',
                    content: `Reduced cost c̄<sub>${varIdx + 1}</sub>' = ${formatNumber(newReducedCost)} < 0. Variable ${varName} should now enter the basis. Re-solving required.`
                });

                const newSolver = new SimplexSolver(newObjective, this.constraints, this.isMinimization);
                newSolver.solve();
                resolveResult = {
                    solver: newSolver,
                    isOptimal: newSolver.isOptimal,
                    status: newSolver.status,
                    steps: newSolver.steps
                };
            } else {
                steps.push({
                    type: 'result',
                    title: 'Optimality Check',
                    status: 'success',
                    content: `Reduced cost c̄<sub>${varIdx + 1}</sub>' = ${formatNumber(newReducedCost)} ≥ 0. Current basis remains optimal! No change to solution values.`
                });
            }

            return {
                steps,
                isVarBasic,
                newReducedCost,
                needsResolve,
                resolveResult,
                originalZ: this.optimalZ,
                newZ: this.optimalZ,
                originalSolution: { ...this.solutionValues },
                newSolution: needsResolve ? null : { ...this.solutionValues },
                originalObjective: this.objective,
                newObjective: newObjective,
                modifiedVar: varIdx
            };
        }
    }
}


function initSimplex() {
    const objectiveContainer = document.getElementById("simplex-objective"), constraintsContainer = document.getElementById("simplex-constraints"), solveBtn = document.getElementById("simplex-solve-btn"), vizSection = document.getElementById("simplex-viz"), tableauContainer = document.getElementById("simplex-tableaus"), solutionContainer = document.getElementById("simplex-solution");
    if (!solveBtn) return;
    let numVars = 2, solver = null;
    let lastObjective = null, lastConstraints = null, lastNumVars = null;
    solutionContainer.addEventListener('click', (e) => {
        if (e.target.id === 'simplex-bb-btn') {
            if (!lastObjective || !lastConstraints) return;
            const bbSolver = new BranchAndBoundSolver(lastObjective, lastConstraints, lastNumVars, isMinimization);
            const result = bbSolver.solve();
            const renderNodeTableau = (node) => {
                if (!node.solverSteps || node.solverSteps.length === 0) return '';
                let html = '<div style="margin-top:1rem;overflow-x:auto">';
                const finalStep = node.solverSteps[node.solverSteps.length - 1];
                html += `<p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:0.5rem">Final Tableau (${finalStep.description || 'Optimal'}):</p>`;
                html += '<table style="min-width:100%;border-collapse:collapse"><thead><tr><th style="padding:0.25rem 0.5rem;background:var(--bg-tertiary);border:1px solid var(--bg-tertiary)">Basic</th>';
                node.colHeaders.forEach(h => html += `<th style="padding:0.25rem 0.5rem;background:var(--bg-tertiary);border:1px solid var(--bg-tertiary)">${h.replace(/([xsa])(\d+)/i, '$1<sub>$2</sub>')}</th>`);
                html += '</tr></thead><tbody>';
                finalStep.tableau.forEach((row, ri) => {
                    html += `<tr><th style="padding:0.25rem 0.5rem;background:var(--bg-secondary);border:1px solid var(--bg-tertiary)">${finalStep.rowHeaders[ri].replace(/([xsa])(\d+)/i, '$1<sub>$2</sub>')}</th>`;
                    row.forEach(val => html += `<td style="padding:0.25rem 0.5rem;text-align:center;border:1px solid var(--bg-tertiary)">${formatBigM(val)}</td>`);
                    html += '</tr>';
                });
                html += '</tbody></table></div>';
                return html;
            };
            let html = '<h3>Branch & Bound - Integer Programming</h3>';
            html += `<div class="info-box"><p><strong>Objective:</strong> Max Z = ${formatLinearExpr(lastObjective)}</p>`;
            html += '<p style="margin-top:0.5rem"><strong>Constraints:</strong></p><ul style="margin-left:1rem">';
            lastConstraints.forEach(con => {
                const lhs = formatLinearExpr(con.coeffs);
                const typeSymbol = con.type === '<=' ? '≤' : con.type === '>=' ? '≥' : '=';
                html += `<li>${lhs} ${typeSymbol} ${con.rhs}</li>`;
            });
            html += '</ul><p style="margin-top:0.5rem;font-style:italic">All x<sub>i</sub> must be integers ≥ 0</p></div>';
            html += '<h4 style="margin-top:2rem">Branch & Bound Tree</h4>';
            html += '<p style="color:var(--text-dim);margin-bottom:1rem">Nodes explored: ' + result.nodes.length + '</p>';
            result.nodes.forEach((node, idx) => {
                const isRoot = node.parentId === null;
                const isOptimal = node.isIntegerSolution;
                const isPruned = !!node.pruneReason;
                let borderColor = 'var(--bg-tertiary)';
                let bgColor = 'var(--bg-secondary)';
                if (isOptimal) { borderColor = 'var(--accent-color)'; bgColor = 'rgba(46,139,87,0.15)'; }
                else if (isPruned) { borderColor = '#cc6666'; bgColor = 'rgba(200,100,100,0.1)'; }
                const indent = node.depth * 20;
                html += `<div style="margin-left:${indent}px;background:${bgColor};border:2px solid ${borderColor};border-radius:8px;padding:1rem;margin-bottom:0.5rem">`;
                html += `<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem">`;
                html += `<strong>Node ${node.id}${isRoot ? ' (Root - LP Relaxation)' : ''}</strong>`;
                if (node.lpZ !== undefined && node.lpZ !== -Infinity) {
                    html += `<span style="color:${isOptimal ? 'var(--accent-color)' : 'var(--text-muted)'};font-weight:bold">Z = ${formatNumber(node.lpZ)}</span>`;
                }
                html += '</div>';
                if (node.addedConstraint) {
                    html += `<div style="margin-top:0.5rem;padding:0.25rem 0.5rem;background:var(--bg-primary);border-radius:4px;display:inline-block"><strong>Added:</strong> ${node.addedConstraint}</div>`;
                }
                if (node.lpSolution && node.lpSolution.vars.length > 0) {
                    html += '<div style="margin-top:0.5rem;display:flex;gap:0.5rem;flex-wrap:wrap">';
                    node.lpSolution.vars.forEach(v => {
                        const isFrac = v.value - Math.floor(v.value) > 0.001 && v.value - Math.floor(v.value) < 0.999;
                        html += `<span style="padding:0.25rem 0.5rem;background:${isFrac ? 'rgba(255,200,0,0.2)' : 'var(--bg-primary)'};border-radius:4px;${isFrac ? 'border:1px dashed orange' : ''}">${v.name} = ${formatNumber(v.value)}${isFrac ? ' (frac)' : ''}</span>`;
                    });
                    html += '</div>';
                }
                html += renderNodeTableau(node);
                if (node.branchVar) {
                    html += `<div style="margin-top:0.5rem;color:var(--text-muted)">Branch on: ${node.branchVar} = ${formatNumber(node.branchValue)} → floor(${Math.floor(node.branchValue)}) / ceil(${Math.ceil(node.branchValue)})</div>`;
                }
                if (node.pruneReason) {
                    html += `<div style="margin-top:0.5rem;color:#cc6666;font-weight:bold">PRUNED: ${node.pruneReason}</div>`;
                }
                if (node.isIntegerSolution) {
                    html += `<div style="margin-top:0.5rem;color:var(--accent-color);font-weight:bold">INTEGER SOLUTION FOUND</div>`;
                }
                html += '</div>';
            });
            if (result.bestSolution) {
                html += '<div class="info-box success" style="margin-top:2rem"><h3>Optimal Integer Solution</h3>';
                html += `<p style="font-size:1.5rem;color:var(--accent-color);margin:1rem 0"><strong>Z* = ${formatNumber(result.bestZ)}</strong></p>`;
                html += '<div style="display:flex;gap:1rem;flex-wrap:wrap">';
                result.bestSolution.vars.forEach(v => {
                    html += `<div style="background:rgba(255,255,255,0.1);padding:0.5rem 1rem;border-radius:8px"><strong>${v.name}</strong> = <span style="color:var(--accent-color);font-size:1.2rem">${Math.round(v.value)}</span></div>`;
                });
                html += '</div></div>';
            } else {
                html += '<div class="info-box warning" style="margin-top:2rem"><h3>No Integer Solution Found</h3><p>The problem has no feasible integer solution.</p></div>';
            }
            tableauContainer.innerHTML = html;
            solutionContainer.innerHTML = '';
            vizSection.scrollIntoView({ behavior: "smooth" });
        }
    });
    function buildInputs() {
        let objHtml = '<div class="objective-row">';
        for (let i = 0; i < numVars; i++) { objHtml += `<span class="term"><input type="number" class="obj-coeff" value="${i + 3}" /> x<sub>${i + 1}</sub></span>`; if (i < numVars - 1) objHtml += '<span class="operator">+</span>'; }
        objHtml += '</div>';
        objectiveContainer.innerHTML = objHtml;
        let conHtml = '';
        for (let c = 0; c < 3; c++) {
            conHtml += '<div class="constraint-row">';
            for (let i = 0; i < numVars; i++) { conHtml += `<span class="term"><input type="number" class="con-coeff" value="${Math.floor(Math.random() * 4) + 1}" /> x<sub>${i + 1}</sub></span>`; if (i < numVars - 1) conHtml += '<span class="operator">+</span>'; }
            conHtml += `<select class="con-type"><option value="<=">≤</option><option value=">=">≥</option><option value="=">=</option></select><input type="number" class="con-rhs" value="${Math.floor(Math.random() * 15) + 5}" /></div>`;
        }
        constraintsContainer.innerHTML = conHtml;
    }
    document.getElementById("simplex-add-var")?.addEventListener("click", () => { numVars++; buildInputs(); });
    document.getElementById("simplex-remove-var")?.addEventListener("click", () => { if (numVars > 2) { numVars--; buildInputs(); } });
    document.getElementById("simplex-add-con")?.addEventListener("click", () => {
        let conHtml = '<div class="constraint-row">';
        for (let i = 0; i < numVars; i++) { conHtml += `<span class="term"><input type="number" class="con-coeff" value="1" /> x<sub>${i + 1}</sub></span>`; if (i < numVars - 1) conHtml += '<span class="operator">+</span>'; }
        conHtml += '<select class="con-type"><option value="<=">≤</option><option value=">=">≥</option><option value="=">=</option></select><input type="number" class="con-rhs" value="10" /></div>';
        constraintsContainer.insertAdjacentHTML('beforeend', conHtml);
    });
    document.getElementById("simplex-remove-con")?.addEventListener("click", () => { const rows = constraintsContainer.querySelectorAll(".constraint-row"); if (rows.length > 1) rows[rows.length - 1].remove(); });
    document.getElementById("simplex-generate-btn")?.addEventListener("click", () => {
        buildInputs();
        const problem = SimplexSolver.generateRandom(numVars);
        const objInputs = objectiveContainer.querySelectorAll(".obj-coeff");
        problem.objective.forEach((c, i) => { if (objInputs[i]) objInputs[i].value = c; });
        const conRows = constraintsContainer.querySelectorAll(".constraint-row");
        problem.constraints.forEach((con, i) => { if (conRows[i]) { const coeffInputs = conRows[i].querySelectorAll(".con-coeff"); con.coeffs.forEach((c, j) => { if (coeffInputs[j]) coeffInputs[j].value = c; }); conRows[i].querySelector(".con-rhs").value = con.rhs; conRows[i].querySelector(".con-type").value = con.type; } });
    });
    document.getElementById("simplex-clear-btn")?.addEventListener("click", () => { buildInputs(); vizSection.classList.add("hidden"); });
    buildInputs();
    const standardInputs = document.getElementById("simplex-standard-inputs");
    const modeStandardBtn = document.getElementById("simplex-mode-standard");
    const modeBBBtn = document.getElementById("simplex-mode-bb");
    const modeDesc = document.getElementById("simplex-mode-desc");
    const maximizeBtn = document.getElementById("simplex-maximize-btn");
    const minimizeBtn = document.getElementById("simplex-minimize-btn");
    const objectiveLabel = document.getElementById("simplex-objective-label");
    let currentMode = 'standard';
    let isMinimization = false;
    function updateObjectiveLabel() {
        if (objectiveLabel) {
            objectiveLabel.textContent = `Objective Function (${isMinimization ? 'Minimize' : 'Maximize'} Z = ...)`;
        }
    }
    maximizeBtn?.addEventListener("click", () => {
        isMinimization = false;
        maximizeBtn.classList.replace('secondary', 'primary');
        minimizeBtn?.classList.replace('primary', 'secondary');
        updateObjectiveLabel();
    });
    minimizeBtn?.addEventListener("click", () => {
        isMinimization = true;
        minimizeBtn.classList.replace('secondary', 'primary');
        maximizeBtn?.classList.replace('primary', 'secondary');
        updateObjectiveLabel();
    });
    function setModeActive(activeBtn) {
        [modeStandardBtn, modeBBBtn].forEach(btn => {
            if (btn) btn.classList.replace('primary', 'secondary');
        });
        if (activeBtn) activeBtn.classList.replace('secondary', 'primary');
    }
    modeStandardBtn?.addEventListener("click", () => {
        setModeActive(modeStandardBtn);
        currentMode = 'standard';
        modeDesc.textContent = 'Enter objective function and constraints. Solves using Big M method for ≤, ≥ and = constraints with full tableau display.';
        standardInputs?.classList.remove('hidden');
        solveBtn.textContent = 'Solve with Simplex Method';
    });
    modeBBBtn?.addEventListener("click", () => {
        setModeActive(modeBBBtn);
        currentMode = 'bb';
        modeDesc.textContent = 'Integer Programming: Solves LP relaxation, then branches on fractional values to find optimal integer solution.';
        standardInputs?.classList.remove('hidden');
    });
    solveBtn?.addEventListener("click", () => {
        const objInputs = objectiveContainer.querySelectorAll(".obj-coeff");
        const objective = Array.from(objInputs).map(inp => parseFloat(inp.value) || 0);
        const conRows = constraintsContainer.querySelectorAll(".constraint-row");
        const constraints = Array.from(conRows).map(row => {
            const coeffInputs = row.querySelectorAll(".con-coeff");
            return { coeffs: Array.from(coeffInputs).map(inp => parseFloat(inp.value) || 0), rhs: parseFloat(row.querySelector(".con-rhs").value) || 0, type: row.querySelector(".con-type").value };
        });
        vizSection.classList.remove("hidden");
        if (currentMode === 'bb') {
            const bbSolver = new BranchAndBoundSolver(objective, constraints, numVars, isMinimization);
            const result = bbSolver.solve();

            let html = `<h3 style="margin-bottom:1.5rem">Branch & Bound - Integer Programming</h3>`;


            html += `<div class="info-box"><p><strong>Objective:</strong> Max Z = ${formatLinearExpr(objective)}</p>`;
            html += '<p style="margin-top:0.5rem"><strong>Constraints:</strong></p><ul style="margin-left:1rem">';
            constraints.forEach(con => {
                const lhs = formatLinearExpr(con.coeffs);
                const typeSymbol = con.type === '<=' ? '≤' : con.type === '>=' ? '≥' : '=';
                html += `<li>${lhs} ${typeSymbol} ${con.rhs}</li>`;
            });
            html += '</ul><p style="margin-top:0.5rem;font-style:italic">All x<sub>i</sub> must be integers ≥ 0</p></div>';


            html += `<h4 style="margin-top:2rem;margin-bottom:1rem">Branch & Bound Tree Graph</h4>`;
            html += drawBranchAndBoundTree(result.nodes);


            html += `<h4 style="margin-top:2rem">Node Details</h4>`;
            html += '<p style="color:var(--text-dim);margin-bottom:1rem">Total Nodes Explored: ' + result.nodes.length + '</p>';

            result.nodes.forEach((node, idx) => {
                const isRoot = node.parentId === null;
                const isOptimal = node.isIntegerSolution;
                const isPruned = !!node.pruneReason;
                let borderColor = 'var(--bg-tertiary)';
                let bgColor = 'var(--bg-secondary)';

                if (isOptimal) { borderColor = 'var(--accent-color)'; bgColor = 'rgba(46,139,87,0.15)'; }
                else if (isPruned) { borderColor = '#cc6666'; bgColor = 'rgba(200,100,100,0.1)'; }

                const indent = node.depth * 20;


                html += `<div style="margin-bottom:2rem;background:${bgColor};border:1px solid ${borderColor};border-radius:8px;padding:1.5rem;box-shadow:0 4px 6px rgba(0,0,0,0.1)">`;


                html += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;border-bottom:1px solid ${borderColor};padding-bottom:0.5rem">`;
                html += `<span><strong style="font-size:1.1rem">Node ${node.id}</strong>${isRoot ? ' (Root)' : ''}</span>`;
                if (node.parentId !== null) html += `<span style="font-size:0.9rem;color:var(--text-muted)">Parent: Node ${node.parentId} | Added: ${node.addedConstraint}</span>`;
                html += `</div>`;


                if (node.lpSolution && node.lpSolution.vars.length > 0) {
                    html += `<div style="margin-bottom:1rem;display:flex;gap:1.5rem;flex-wrap:wrap;align-items:center">`;
                    html += `<span><strong>Z = ${formatNumber(node.lpZ)}</strong></span>`;
                    node.lpSolution.vars.forEach(v => {
                        const isFrac = v.value - Math.floor(v.value) > 0.001 && v.value - Math.floor(v.value) < 0.999;
                        html += `<span style="${isFrac ? 'color:orange;font-weight:bold' : ''}">${v.name} = ${formatNumber(v.value)}</span>`;
                    });
                    html += `</div>`;
                }

                if (node.isIntegerSolution) {
                    html += `<div style="margin-bottom:1rem;color:var(--accent-color);font-weight:bold;display:flex;align-items:center;gap:0.5rem">✓ Feasible Integer Solution Found</div>`;
                }
                if (node.pruneReason) {
                    html += `<div style="margin-bottom:1rem;color:#cc6666;font-weight:bold">⚠ Pruned: ${node.pruneReason}</div>`;
                }


                if (node.solverSteps && node.solverSteps.length > 0) {
                    const finalStep = node.solverSteps[node.solverSteps.length - 1];
                    const tableau = finalStep.tableau;

                    html += `<div style="margin-top:1rem">`;
                    html += `<p style="font-size:0.9rem;color:var(--text-muted);margin-bottom:0.5rem">Final Simplex Tableau (${finalStep.description}):</p>`;

                    html += '<div class="table-wrapper" style="overflow-x:auto"><table><thead><tr>';
                    html += '<th style="background:var(--bg-tertiary)">Basic</th>';
                    node.colHeaders.forEach(h => html += `<th style="background:var(--bg-tertiary)">${h.replace(/([xsa])(\d+)/i, '$1<sub>$2</sub>')}</th>`);
                    html += '</tr></thead><tbody>';

                    tableau.forEach((row, ri) => {
                        html += `<tr><th style="background:var(--bg-secondary)">${finalStep.rowHeaders[ri].replace(/([xsa])(\d+)/i, '$1<sub>$2</sub>')}</th>`;
                        row.forEach(val => html += `<td style="text-align:center">${formatBigM(val)}</td>`);
                        html += `</tr>`;
                    });
                    html += '</tbody></table></div>';
                    html += `</div>`;
                }

                if (node.branchVar) {
                    html += `<div style="margin-top:1rem;padding-top:0.5rem;border-top:1px dashed var(--border-color);color:var(--text-primary)">`;
                    html += `<strong>Branching Action:</strong> Select ${node.branchVar} (${formatNumber(node.branchValue)}) → Create subspaces for ${node.branchVar} ≤ ${Math.floor(node.branchValue)} and ${node.branchVar} ≥ ${Math.ceil(node.branchValue)}`;
                    html += `</div>`;
                }

                html += `</div>`;
            });


            if (result.bestSolution) {
                html += '<div class="info-box success" style="margin-top:2rem"><h3>Optimal Integer Solution</h3>';
                html += `<p style="font-size:1.5rem;color:var(--accent-color);margin:1rem 0"><strong>Z* = ${formatNumber(result.bestZ)}</strong></p>`;
                html += '<div style="display:flex;gap:1rem;flex-wrap:wrap">';
                result.bestSolution.vars.forEach(v => {
                    html += `<div style="background:rgba(255,255,255,0.1);padding:0.5rem 1rem;border-radius:8px"><strong>${v.name}</strong> = <span style="color:var(--accent-color);font-size:1.2rem">${Math.round(v.value)}</span></div>`;
                });
                html += '</div></div>';
            } else {
                html += '<div class="info-box warning" style="margin-top:2rem"><h3>No Integer Solution Found</h3><p>The problem has no feasible integer solution.</p></div>';
            }

            tableauContainer.innerHTML = html;
            solutionContainer.innerHTML = '';
            vizSection.scrollIntoView({ behavior: "smooth" });
            return;
        }
        if (currentMode === 'revised') {
            const BIG_M = 1000;
            let slacks = [];
            let artificials = [];
            constraints.forEach((con, i) => {
                if (con.type === '<=' || !con.type) {
                    slacks.push({ row: i, sign: 1, name: `s${i + 1}`, idx: -1 });
                } else if (con.type === '>=') {
                    slacks.push({ row: i, sign: -1, name: `s${i + 1}`, idx: -1 });
                    artificials.push({ row: i, name: `a${i + 1}`, idx: -1 });
                } else if (con.type === '=') {
                    artificials.push({ row: i, name: `a${i + 1}`, idx: -1 });
                }
            });
            const m = constraints.length;
            const n = numVars + slacks.length + artificials.length;
            slacks.forEach((s, i) => s.idx = numVars + i);
            artificials.forEach((a, i) => a.idx = numVars + slacks.length + i);
            const c = [];
            for (let j = 0; j < numVars; j++) c.push(objective[j]);
            for (let j = 0; j < slacks.length; j++) c.push(0);
            for (let j = 0; j < artificials.length; j++) c.push(-BIG_M);
            const A = [];
            for (let i = 0; i < m; i++) {
                const row = [];
                for (let j = 0; j < numVars; j++) {
                    row.push(constraints[i].coeffs[j] || 0);
                }
                for (const slack of slacks) {
                    row.push(slack.row === i ? slack.sign : 0);
                }
                for (const art of artificials) {
                    row.push(art.row === i ? 1 : 0);
                }
                A.push(row);
            }
            const b = constraints.map(con => con.rhs);
            const Binv = [];
            for (let i = 0; i < m; i++) {
                Binv[i] = [];
                for (let j = 0; j < m; j++) {
                    Binv[i][j] = i === j ? 1 : 0;
                }
            }
            const basicIndices = [];
            for (let i = 0; i < m; i++) {
                const art = artificials.find(a => a.row === i);
                if (art) {
                    basicIndices.push(art.idx);
                } else {
                    const slk = slacks.find(s => s.row === i);
                    basicIndices.push(slk.idx);
                }
            }
            const varNames = [];
            for (let j = 0; j < numVars; j++) varNames.push(`x<sub>${j + 1}</sub>`);
            for (const s of slacks) varNames.push(`s<sub>${s.row + 1}</sub>`);
            for (const a of artificials) varNames.push(`a<sub>${a.row + 1}</sub>`);
            const revisedSolver = new RevisedSimplexSolver(c, A, b, Binv, basicIndices);
            const result = revisedSolver.solve();
            const renderMatrix = (matrix, title, rowLabels = null, colLabels = null) => {
                let html = `<div style="margin:0.5rem 0"><strong style="color:var(--accent-color)">${title}</strong>`;
                html += `<table style="margin-top:0.25rem"><tbody>`;
                if (colLabels) {
                    html += '<tr><th></th>';
                    colLabels.forEach(l => html += `<th style="padding:0.25rem 0.5rem;font-size:0.85rem;color:var(--text-muted)">${l}</th>`);
                    html += '</tr>';
                }
                matrix.forEach((row, i) => {
                    html += '<tr>';
                    if (rowLabels) html += `<th style="padding:0.25rem 0.5rem;font-size:0.85rem;color:var(--text-muted)">${rowLabels[i]}</th>`;
                    row.forEach(val => html += `<td style="padding:0.25rem 0.5rem;text-align:center;background:var(--bg-primary)">${formatNumber(val)}</td>`);
                    html += '</tr>';
                });
                html += '</tbody></table></div>';
                return html;
            };
            const renderVector = (vec, title, labels = null, isRow = true) => {
                let html = `<div style="margin:0.5rem 0"><strong style="color:var(--accent-color)">${title}</strong>`;
                html += `<table style="margin-top:0.25rem"><tbody>`;
                if (isRow) {
                    if (labels) {
                        html += '<tr>';
                        labels.forEach(l => html += `<th style="padding:0.25rem 0.5rem;font-size:0.85rem;color:var(--text-muted)">${l}</th>`);
                        html += '</tr>';
                    }
                    html += '<tr>';
                    vec.forEach(v => html += `<td style="padding:0.25rem 0.5rem;text-align:center;background:var(--bg-primary)">${formatNumber(v)}</td>`);
                    html += '</tr>';
                } else {
                    vec.forEach((v, i) => {
                        html += '<tr>';
                        if (labels) html += `<th style="padding:0.25rem 0.5rem;font-size:0.85rem;color:var(--text-muted)">${labels[i]}</th>`;
                        html += `<td style="padding:0.25rem 0.5rem;text-align:center;background:var(--bg-primary)">${formatNumber(v)}</td></tr>`;
                    });
                }
                html += '</tbody></table></div>';
                return html;
            };
            let html = '<h3>Revised Simplex Method - Matrix Operations</h3>';
            html += `<div class="info-box" style="margin-bottom:1.5rem;border-left:4px solid orange">`;
            html += `<h4 style="color:orange;margin-bottom:0.75rem">MATRIX INTERPRETATION STRUCTURE</h4>`;
            html += `<table style="width:100%;border-collapse:collapse"><tbody>`;
            html += `<tr style="border-bottom:1px solid var(--bg-tertiary)">`;
            html += `<td style="padding:0.5rem 1rem;font-weight:bold;width:15%">Z</td>`;
            html += `<td style="padding:0.5rem 1rem;text-align:center">C<sub>B</sub>B<sup>-1</sup>A - C</td>`;
            html += `<td style="padding:0.5rem 1rem;text-align:center">C<sub>B</sub>B<sup>-1</sup></td>`;
            html += `<td style="padding:0.5rem 1rem;text-align:center">C<sub>B</sub>B<sup>-1</sup>b</td>`;
            html += `</tr><tr>`;
            html += `<td style="padding:0.5rem 1rem;font-weight:bold">X<sub>B</sub></td>`;
            html += `<td style="padding:0.5rem 1rem;text-align:center">B<sup>-1</sup>A</td>`;
            html += `<td style="padding:0.5rem 1rem;text-align:center">B<sup>-1</sup></td>`;
            html += `<td style="padding:0.5rem 1rem;text-align:center">B<sup>-1</sup>b</td>`;
            html += `</tr></tbody></table></div>`;
            html += `<div class="info-box" style="margin-bottom:1.5rem">`;
            html += `<h4 style="margin-bottom:1rem">MATRIX COMPONENTS</h4>`;
            html += `<p style="color:var(--text-muted);margin-bottom:1rem;font-style:italic">Original Problem Matrices</p>`;
            html += `<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:1.5rem;align-items:start">`;
            const origA = A.map(row => row.slice(0, numVars));
            const xLabels = Array.from({ length: numVars }, (_, i) => `x<sub>${i + 1}</sub>`);
            html += renderMatrix(origA, 'A (Constraint Matrix)', null, xLabels);
            html += renderVector(objective, 'C (Objective Coefficients)', xLabels, true);
            const bLabels = Array.from({ length: m }, (_, i) => `b${i + 1}`);
            html += renderVector(b, 'b (Right Hand Side)', bLabels, false);
            html += `</div></div>`;
            result.steps.forEach((step, stepIdx) => {
                const isOptimal = step.type === 'optimal';
                const borderColor = isOptimal ? 'var(--success-color)' : 'var(--accent-color)';
                html += `<div class="info-box" style="margin-top:1.5rem;border-left:4px solid ${borderColor}">`;
                html += `<h4 style="margin-bottom:1rem">${step.title}</h4>`;
                html += `<p style="color:var(--text-muted);margin-bottom:1rem">${step.description}</p>`;
                if (step.Binv && step.xB) {
                    const currentBasicIndices = isOptimal ? result.basicIndices : revisedSolver.basicIndices;
                    const CB = step.CB || currentBasicIndices.map(idx => c[idx]);
                    html += `<p style="font-style:italic;color:var(--accent-color);margin-bottom:1rem">Optimal Tableau Components</p>`;
                    html += `<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:1.5rem;align-items:start">`;
                    html += renderMatrix(step.Binv, 'B<sup>-1</sup>');
                    const BinvA = [];
                    for (let i = 0; i < m; i++) {
                        BinvA[i] = [];
                        for (let j = 0; j < n; j++) {
                            let sum = 0;
                            for (let k = 0; k < m; k++) {
                                sum += step.Binv[i][k] * A[k][j];
                            }
                            BinvA[i][j] = sum;
                        }
                    }
                    html += renderMatrix(BinvA, 'B<sup>-1</sup>A', null, varNames);
                    const basicVarLabels = currentBasicIndices.map(idx => varNames[idx]);
                    html += renderVector(step.xB, 'B<sup>-1</sup>b', basicVarLabels, false);
                    html += renderVector(CB, 'C<sub>B</sub>', basicVarLabels, false);
                    html += `</div>`;
                    html += `<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:1.5rem;align-items:start;margin-top:1.5rem">`;
                    const CBBinv = [];
                    for (let j = 0; j < m; j++) {
                        let sum = 0;
                        for (let i = 0; i < m; i++) {
                            sum += CB[i] * step.Binv[i][j];
                        }
                        CBBinv.push(sum);
                    }
                    const slackLabels = Array.from({ length: m }, (_, i) => `s<sub>${i + 1}</sub>`);
                    html += renderVector(CBBinv, 'C<sub>B</sub>B<sup>-1</sup>', slackLabels, true);
                    const CBBinvA_C = [];
                    for (let j = 0; j < n; j++) {
                        let sum = 0;
                        for (let i = 0; i < m; i++) {
                            let BinvAij = 0;
                            for (let k = 0; k < m; k++) {
                                BinvAij += step.Binv[i][k] * A[k][j];
                            }
                            sum += CB[i] * BinvAij;
                        }
                        CBBinvA_C.push(sum - c[j]);
                    }
                    html += renderVector(CBBinvA_C, 'C<sub>B</sub>B<sup>-1</sup>A - C', varNames, true);
                    const CBBinvb = step.Z || CB.reduce((sum, ci, i) => sum + ci * step.xB[i], 0);
                    html += `<div style="margin:0.5rem 0"><strong style="color:var(--accent-color)">C<sub>B</sub>B<sup>-1</sup>b</strong>`;
                    html += `<div style="margin-top:0.5rem;font-size:1.5rem;font-weight:bold;color:var(--accent-color)">${formatNumber(CBBinvb)}</div></div>`;
                    html += `</div>`;
                    html += `<div style="margin-top:1.5rem;padding:1rem;background:rgba(46,139,87,0.1);border-radius:8px">`;
                    html += `<strong style="color:var(--accent-color)">Basic Variables:</strong>`;
                    html += `<div style="display:flex;flex-wrap:wrap;gap:1rem;margin-top:0.75rem">`;
                    currentBasicIndices.forEach((idx, i) => {
                        html += `<div style="background:var(--bg-primary);padding:0.5rem 1rem;border-radius:6px;border:1px solid var(--accent-color)">`;
                        html += `<span style="font-weight:bold">${varNames[idx]}</span> = `;
                        html += `<span style="color:var(--accent-color);font-size:1.1rem">${formatNumber(step.xB[i])}</span>`;
                        html += `</div>`;
                    });
                    html += `</div></div>`;
                }
                if (step.entering && step.leaving) {
                    html += `<div style="margin-top:1rem;padding:0.75rem;background:var(--bg-secondary);border-radius:6px">`;
                    html += `<div style="display:flex;flex-wrap:wrap;gap:2rem">`;
                    html += `<div><strong>Entering Variable:</strong> ${varNames[step.entering.idx]}</div>`;
                    html += `<div><strong>Leaving Variable:</strong> ${varNames[step.leaving.idx]}</div>`;
                    if (step.theta !== undefined) {
                        html += `<div><strong>θ (min ratio):</strong> ${formatNumber(step.theta)}</div>`;
                    }
                    html += `</div></div>`;
                }
                if (step.ratios && step.ratios.length > 0) {
                    html += `<div style="margin-top:1rem"><strong>Ratio Test:</strong>`;
                    html += `<div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-top:0.5rem">`;
                    step.ratios.forEach(r => {
                        const isMin = step.leaving && r.row === step.leaving.row;
                        const bg = isMin ? 'var(--accent-color)' : 'var(--bg-primary)';
                        const color = isMin ? 'white' : 'inherit';
                        html += `<span style="padding:0.25rem 0.5rem;background:${bg};color:${color};border-radius:4px;font-size:0.9rem">`;
                        html += `Row ${r.row + 1}: ${r.ratio !== null ? formatNumber(r.ratio) : '—'}${isMin ? ' (min)' : ''}`;
                        html += `</span>`;
                    });
                    html += `</div></div>`;
                }
                html += `</div>`;
            });
            if (result.isOptimal) {
                html += `<div class="info-box success" style="margin-top:1.5rem">`;
                html += `<h3>Optimal Solution Found</h3>`;
                html += `<p style="font-size:1.75rem;color:var(--accent-color);margin:1rem 0"><strong>Z* = ${formatNumber(result.finalZ)}</strong></p>`;
                html += `<div style="display:flex;flex-wrap:wrap;gap:1rem;margin-top:1rem">`;
                for (let i = 0; i < numVars; i++) {
                    const basicIdx = result.basicIndices.indexOf(i);
                    const val = basicIdx !== -1 ? result.finalXB[basicIdx] : 0;
                    const isBasic = basicIdx !== -1;
                    html += `<div style="background:${isBasic ? 'rgba(46,139,87,0.2)' : 'rgba(255,255,255,0.1)'};padding:0.5rem 1rem;border-radius:8px;${isBasic ? 'border:1px solid var(--accent-color)' : ''}">`;
                    html += `<strong>x<sub>${i + 1}</sub></strong> = <span style="color:var(--accent-color);font-size:1.2rem">${formatNumber(val)}</span>`;
                    html += `</div>`;
                }
                html += `</div></div>`;
            } else {
                html += `<div class="info-box warning" style="margin-top:1.5rem"><h3>${result.status}</h3></div>`;
            }
            tableauContainer.innerHTML = html;
            solutionContainer.innerHTML = '';
            vizSection.scrollIntoView({ behavior: "smooth" });
            return;
        }
        lastObjective = objective;
        lastConstraints = constraints;
        lastNumVars = numVars;
        solver = new SimplexSolver(objective, constraints, isMinimization);
        solver.solve();
        const objTypeText = isMinimization ? 'Min' : 'Max';
        const renderMatrix = (matrix, title, rowLabels = null, colLabels = null) => {
            let html = `<div style="margin:0.5rem 0"><strong style="color:var(--accent-color)">${title}</strong>`;
            html += `<table style="margin-top:0.25rem"><tbody>`;
            if (colLabels) {
                html += '<tr><th></th>';
                colLabels.forEach(l => html += `<th style="padding:0.25rem 0.5rem;font-size:0.85rem;color:var(--text-muted)">${l}</th>`);
                html += '</tr>';
            }
            matrix.forEach((row, i) => {
                html += '<tr>';
                if (rowLabels) html += `<th style="padding:0.25rem 0.5rem;font-size:0.85rem;color:var(--text-muted)">${rowLabels[i]}</th>`;
                row.forEach(val => html += `<td style="padding:0.25rem 0.5rem;text-align:center;background:var(--bg-primary)">${formatNumber(typeof val === 'object' ? val.v : val)}</td>`);
                html += '</tr>';
            });
            html += '</tbody></table></div>';
            return html;
        };
        const renderVector = (vec, title, labels = null, isRow = true) => {
            let html = `<div style="margin:0.5rem 0"><strong style="color:var(--accent-color)">${title}</strong>`;
            html += `<table style="margin-top:0.25rem"><tbody>`;
            if (isRow) {
                if (labels) {
                    html += '<tr>';
                    labels.forEach(l => html += `<th style="padding:0.25rem 0.5rem;font-size:0.85rem;color:var(--text-muted)">${l}</th>`);
                    html += '</tr>';
                }
                html += '<tr>';
                vec.forEach(v => html += `<td style="padding:0.25rem 0.5rem;text-align:center;background:var(--bg-primary)">${formatNumber(typeof v === 'object' ? v.v : v)}</td>`);
                html += '</tr>';
            } else {
                vec.forEach((v, i) => {
                    html += '<tr>';
                    if (labels) html += `<th style="padding:0.25rem 0.5rem;font-size:0.85rem;color:var(--text-muted)">${labels[i]}</th>`;
                    html += `<td style="padding:0.25rem 0.5rem;text-align:center;background:var(--bg-primary)">${formatNumber(typeof v === 'object' ? v.v : v)}</td></tr>`;
                });
            }
            html += '</tbody></table></div>';
            return html;
        };
        let html = solver.getStandardFormHTML();
        const m = constraints.length;
        const slackCount = solver.colHeaders.filter(h => h.startsWith('s')).length;
        const artCount = solver.colHeaders.filter(h => h.startsWith('a')).length;
        const xLabels = Array.from({ length: numVars }, (_, i) => `x<sub>${i + 1}</sub>`);
        const varNames = solver.colHeaders.slice(0, -1).map(h => h.replace(/([xsa])(\d+)/i, '$1<sub>$2</sub>'));
        const slackLabels = Array.from({ length: slackCount }, (_, i) => `s<sub>${i + 1}</sub>`);
        const bLabels = Array.from({ length: m }, (_, i) => `b${i + 1}`);
        const origA = constraints.map(con => con.coeffs);
        const b = constraints.map(con => con.rhs);
        html += `<div style="background:var(--bg-tertiary);padding:1rem;border-radius:8px;margin:1.5rem 0;border-left:4px solid var(--accent-color)">`;
        html += `<strong>Simplex Method Formulas:</strong>`;
        html += `<div style="background:rgba(0,0,0,0.3);padding:0.5rem 1rem;border-radius:4px;font-family:monospace;margin-top:0.5rem">`;
        html += `c̄<sub>j</sub> = c<sub>j</sub> - C<sub>B</sub>B<sup>-1</sup>A<sub>j</sub> &nbsp;&nbsp;(Reduced Cost for column j)`;
        html += `</div>`;
        html += `<div style="background:rgba(0,0,0,0.3);padding:0.5rem 1rem;border-radius:4px;font-family:monospace;margin-top:0.5rem">`;
        html += `θ = min { b̄<sub>i</sub> / ā<sub>ik</sub> : ā<sub>ik</sub> > 0 } &nbsp;&nbsp;(Ratio Test for leaving variable)`;
        html += `</div>`;
        html += `<p style="color:var(--text-dim);margin-top:0.5rem;font-size:0.9rem"><strong>Optimality:</strong> c̄<sub>j</sub> ≤ 0 for all non-basic variables (maximization)</p>`;
        html += `</div>`;
        html += `<div class="info-box" style="margin:1.5rem 0;border-left:4px solid orange">`;
        html += `<h4 style="color:orange;margin-bottom:0.75rem">MATRIX INTERPRETATION STRUCTURE</h4>`;
        html += `<table style="width:100%;border-collapse:collapse"><tbody>`;
        html += `<tr style="border-bottom:1px solid var(--bg-tertiary)">`;
        html += `<td style="padding:0.5rem 1rem;font-weight:bold;width:15%">Z</td>`;
        html += `<td style="padding:0.5rem 1rem;text-align:center">C<sub>B</sub>B<sup>-1</sup>A - C</td>`;
        html += `<td style="padding:0.5rem 1rem;text-align:center">C<sub>B</sub>B<sup>-1</sup></td>`;
        html += `<td style="padding:0.5rem 1rem;text-align:center">C<sub>B</sub>B<sup>-1</sup>b</td>`;
        html += `</tr><tr>`;
        html += `<td style="padding:0.5rem 1rem;font-weight:bold">X<sub>B</sub></td>`;
        html += `<td style="padding:0.5rem 1rem;text-align:center">B<sup>-1</sup>A</td>`;
        html += `<td style="padding:0.5rem 1rem;text-align:center">B<sup>-1</sup></td>`;
        html += `<td style="padding:0.5rem 1rem;text-align:center">B<sup>-1</sup>b</td>`;
        html += `</tr></tbody></table></div>`;
        html += `<div class="info-box" style="margin-bottom:1.5rem">`;
        html += `<h4 style="margin-bottom:1rem">MATRIX COMPONENTS</h4>`;
        html += `<p style="color:var(--text-muted);margin-bottom:1rem;font-style:italic">Original Problem Matrices</p>`;
        html += `<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:1.5rem;align-items:start">`;
        html += renderMatrix(origA, 'A (Constraint Matrix)', null, xLabels);
        html += renderVector(objective, 'C (Objective Coefficients)', xLabels, true);
        html += renderVector(b, 'b (Right Hand Side)', bLabels, false);
        html += `</div></div>`;
        solver.steps.forEach((step, idx) => {
            html += `<div class="tableau-step"><h4>${step.description || `Iteration ${idx}`}</h4>`;
            if (step.rowOps && step.rowOps.length > 0) {
                html += '<div class="row-ops info-box" style="margin-bottom:1rem;background:var(--bg-secondary);border-left:4px solid var(--accent-color)"><strong>Row Operations:</strong><br>' + step.rowOps.join('<br>') + '</div>';
            }
            html += '<div class="table-wrapper"><table><thead><tr><th>Basic</th>';
            solver.colHeaders.forEach(h => html += `<th>${h.replace(/([xsa])(\d+)/i, '$1<sub>$2</sub>')}</th>`);
            html += '<th>Ratio</th></tr></thead><tbody>';
            step.tableau.forEach((row, ri) => {
                const isZ = ri === 0;
                html += `<tr class="${step.pivot && step.pivot.row === ri ? 'pivot-row' : ''}"><th>${step.rowHeaders[ri].replace(/([xsa])(\d+)/i, '$1<sub>$2</sub>')}</th>`;
                row.forEach((val, ci) => { const isPivot = step.pivot && step.pivot.row === ri && step.pivot.col === ci; html += `<td class="${isPivot ? 'pivot-element' : ''} ${step.pivot && step.pivot.col === ci ? 'pivot-col' : ''}">${formatBigM(val)}</td>`; });
                html += `<td>${!isZ && step.ratios && step.ratios[ri - 1] !== null ? formatNumber(step.ratios[ri - 1]) : '-'}</td></tr>`;
            });
            html += '</tbody></table></div>';
            const isOptimalStep = idx === solver.steps.length - 1 && solver.isOptimal;
            const borderColor = isOptimalStep ? 'var(--accent-color)' : 'var(--primary-color)';
            html += `<div class="info-box" style="margin-top:1rem;border-left:4px solid ${borderColor}">`;
            html += `<p style="font-style:italic;color:var(--accent-color);margin-bottom:1rem">${isOptimalStep ? 'Optimal' : 'Current'} Tableau Components</p>`;
            html += `<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:1.5rem;align-items:start">`;
            const Binv = [];
            for (let i = 1; i <= m; i++) {
                const row = [];
                for (let j = 0; j < slackCount; j++) {
                    row.push(step.tableau[i][numVars + j].v);
                }
                Binv.push(row);
            }
            html += renderMatrix(Binv, 'B<sup>-1</sup>');
            const BinvA = [];
            for (let i = 1; i <= m; i++) {
                const row = [];
                for (let j = 0; j < numVars; j++) {
                    row.push(step.tableau[i][j].v);
                }
                BinvA.push(row);
            }
            html += renderMatrix(BinvA, 'B<sup>-1</sup>A', null, xLabels);
            const Binvb = [];
            const basicVarLabels = [];
            for (let i = 1; i <= m; i++) {
                Binvb.push(step.tableau[i][step.tableau[i].length - 1].v);
                basicVarLabels.push(step.rowHeaders[i].replace(/([xsa])(\d+)/i, '$1<sub>$2</sub>'));
            }
            html += renderVector(Binvb, 'B<sup>-1</sup>b', basicVarLabels, false);
            const CB = [];
            for (let i = 1; i <= m; i++) {
                const varName = step.rowHeaders[i];
                const varIdx = solver.colHeaders.indexOf(varName);
                if (varName.startsWith('x') && varIdx < numVars) {
                    CB.push(objective[varIdx]);
                } else {
                    CB.push(0);
                }
            }
            html += renderVector(CB, 'C<sub>B</sub>', basicVarLabels, false);
            html += `</div>`;
            html += `<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:1.5rem;align-items:start;margin-top:1.5rem">`;
            const CBBinv = [];
            for (let j = 0; j < slackCount; j++) {
                let sum = 0;
                for (let i = 0; i < m; i++) {
                    sum += CB[i] * Binv[i][j];
                }
                CBBinv.push(sum);
            }
            html += renderVector(CBBinv, 'C<sub>B</sub>B<sup>-1</sup>', slackLabels, true);
            const reducedCosts = [];
            for (let j = 0; j < numVars; j++) {
                reducedCosts.push(step.tableau[0][j].v);
            }
            html += renderVector(reducedCosts, 'C<sub>B</sub>B<sup>-1</sup>A - C', xLabels, true);
            const zValue = step.tableau[0][step.tableau[0].length - 1].v;
            html += `<div style="margin:0.5rem 0"><strong style="color:var(--accent-color)">C<sub>B</sub>B<sup>-1</sup>b</strong>`;
            html += `<div style="margin-top:0.5rem;font-size:1.5rem;font-weight:bold;color:var(--accent-color)">${formatNumber(zValue)}</div></div>`;
            html += `</div></div>`;
            html += '</div>';
        });
        tableauContainer.innerHTML = html;
        if (solver.isOptimal) {
            const finalStep = solver.steps[solver.steps.length - 1];
            const finalTableau = finalStep.tableau;
            let solHtml = '<div class="info-box success"><h3>Optimal Solution Found</h3>';
            const zValRaw = finalTableau[0][finalTableau[0].length - 1];
            const zDisplay = isMinimization ? -zValRaw.v : zValRaw.v;
            solHtml += `<p style="font-size:1.5rem;color:var(--accent-color);margin-bottom:1rem"><strong>${objTypeText} Z = ${formatNumber(zDisplay)}</strong></p>`;
            solHtml += '<div style="display:flex;flex-wrap:wrap;gap:1.5rem;margin-top:1rem">';
            let hasFractional = false;
            const solutionVars = [];
            for (let i = 0; i < solver.numVars; i++) {
                const varName = `x${i + 1}`;
                const rowIdx = finalStep.rowHeaders.indexOf(varName);
                const val = rowIdx !== -1 ? finalTableau[rowIdx][finalTableau[rowIdx].length - 1].v : 0;
                solutionVars.push({ name: varName, value: val });
                const frac = val - Math.floor(val);
                if (frac > 0.001 && frac < 0.999) {
                    hasFractional = true;
                }
                const isFrac = frac > 0.001 && frac < 0.999;
                solHtml += `<div style="background:${isFrac ? 'rgba(255,200,0,0.2)' : 'rgba(255,255,255,0.1)'};padding:0.5rem 1rem;border-radius:8px;${isFrac ? 'border:1px dashed orange' : ''}"><strong>x<sub>${i + 1}</sub></strong> = <span style="color:var(--accent-color);font-size:1.2rem">${formatNumber(val)}</span>${isFrac ? ' <span style="color:orange;font-size:0.85rem">(fractional)</span>' : ''}</div>`;
            }
            solHtml += '</div></div>';
            if (hasFractional) {
                solHtml += `<div class="info-box" style="margin-top:1rem;border-left:4px solid orange;background:rgba(255,200,0,0.1)">`;
                solHtml += `<h4 style="color:orange">Integer Solution Required?</h4>`;
                solHtml += `<p style="margin:0.5rem 0;color:var(--text-muted)">The optimal LP solution contains fractional values. Use Branch & Bound to find the optimal integer solution.</p>`;
                solHtml += `<button id="simplex-bb-btn" class="btn accent" style="margin-top:0.5rem">Solve with Branch & Bound</button>`;
                solHtml += `</div>`;
            }
            solHtml += '<div class="info-box" style="margin-top:1rem"><h4>Problem Summary</h4>';
            solHtml += `<p><strong>Objective:</strong> ${objTypeText} Z = ${formatLinearExpr(objective)}</p>`;
            solHtml += '<p style="margin-top:0.5rem"><strong>Constraints:</strong></p><ul style="margin-left:1rem">';
            constraints.forEach((con, i) => {
                const lhs = formatLinearExpr(con.coeffs);
                const typeSymbol = con.type === '<=' ? '≤' : con.type === '>=' ? '≥' : '=';
                solHtml += `<li>${lhs} ${typeSymbol} ${con.rhs}</li>`;
            });
            solHtml += '</ul></div>';


            try {
                const sensitivity = new SensitivityAnalysis(solver);
                const shadowPrices = sensitivity.getShadowPrices();
                const optimalityRanges = sensitivity.getRangeOfOptimality();
                const feasibilityRanges = sensitivity.getRangeOfFeasibility();

                solHtml += '<div class="info-box" style="margin-top:1.5rem;border-left:4px solid var(--primary-color)"><h3>Sensitivity Analysis</h3>';


                solHtml += '<h4 style="margin-top:1rem">Shadow Prices (Dual Values)</h4>';
                solHtml += '<p style="color:var(--text-muted);font-size:0.9rem;margin-bottom:0.5rem">The change in the objective function value per unit increase in the RHS of a constraint.</p>';
                solHtml += '<div class="table-wrapper"><table><thead><tr><th>Constraint</th><th>Shadow Price</th></tr></thead><tbody>';
                shadowPrices.forEach(sp => {
                    solHtml += `<tr><td>${sp.constraint}</td><td>${formatNumber(sp.shadowPrice)}</td></tr>`;
                });
                solHtml += '</tbody></table></div>';


                solHtml += '<h4 style="margin-top:1.5rem">Objective Coefficient Ranges (Cj)</h4>';
                solHtml += '<p style="color:var(--text-muted);font-size:0.9rem;margin-bottom:0.5rem">Range for objective coefficients where the current basis remains optimal.</p>';
                solHtml += '<div class="table-wrapper"><table><thead><tr><th>Variable</th><th>Current</th><th>Allowable Decrease</th><th>Allowable Increase</th><th>Range</th></tr></thead><tbody>';
                optimalityRanges.forEach(range => {
                    const decrease = range.lower === -Infinity ? '∞' : formatNumber(range.current - range.lower);
                    const increase = range.upper === Infinity ? '∞' : formatNumber(range.upper - range.current);
                    const lowerStr = range.lower === -Infinity ? '-∞' : formatNumber(range.lower);
                    const upperStr = range.upper === Infinity ? '∞' : formatNumber(range.upper);
                    solHtml += `<tr><td>${range.variable}</td><td>${formatNumber(range.current)}</td><td>${decrease}</td><td>${increase}</td><td>[ ${lowerStr}, ${upperStr} ]</td></tr>`;
                });
                solHtml += '</tbody></table></div>';


                solHtml += '<h4 style="margin-top:1.5rem">RHS Ranges (bi)</h4>';
                solHtml += '<p style="color:var(--text-muted);font-size:0.9rem;margin-bottom:0.5rem">Range for RHS values where the shadow prices remain valid (feasibility maintained).</p>';
                solHtml += '<div class="table-wrapper"><table><thead><tr><th>Constraint</th><th>Current RHS</th><th>Allowable Decrease</th><th>Allowable Increase</th><th>Range</th></tr></thead><tbody>';
                feasibilityRanges.forEach(range => {
                    const decrease = range.lower === -Infinity ? '∞' : formatNumber(range.current - range.lower);
                    const increase = range.upper === Infinity ? '∞' : formatNumber(range.upper - range.current);
                    const lowerStr = range.lower === -Infinity ? '-∞' : formatNumber(range.lower);
                    const upperStr = range.upper === Infinity ? '∞' : formatNumber(range.upper);
                    solHtml += `<tr><td>${range.constraint}</td><td>${formatNumber(range.current)}</td><td>${decrease}</td><td>${increase}</td><td>[ ${lowerStr}, ${upperStr} ]</td></tr>`;
                });
                solHtml += '</tbody></table></div></div>';

                solHtml += `<div class="info-box" style="margin-top:1.5rem;border-left:4px solid orange;background:rgba(255,165,0,0.1)">`;
                solHtml += `<h3 style="color:orange;margin-bottom:1rem">Interactive Sensitivity Analysis</h3>`;
                solHtml += `<p style="color:var(--text-muted);margin-bottom:1rem">Modify existing constraints, RHS values, or add new constraints/variables. Uses matrix methods (B⁻¹) to efficiently recalculate.</p>`;

                solHtml += `<div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:1rem">`;
                solHtml += `<button id="simplex-sa-modify-rhs-tab" class="btn primary" style="flex:1;min-width:100px">Modify RHS</button>`;
                solHtml += `<button id="simplex-sa-modify-con-tab" class="btn secondary" style="flex:1;min-width:100px">Modify Constraint</button>`;
                solHtml += `<button id="simplex-sa-modify-obj-tab" class="btn secondary" style="flex:1;min-width:100px">Modify Objective</button>`;
                solHtml += `<button id="simplex-sa-constraint-tab" class="btn secondary" style="flex:1;min-width:100px">Add Constraint</button>`;
                solHtml += `<button id="simplex-sa-variable-tab" class="btn secondary" style="flex:1;min-width:100px">Add Variable</button>`;
                solHtml += `</div>`;

                solHtml += `<div id="simplex-sa-modify-rhs-form">`;
                solHtml += `<h4 style="margin-bottom:0.75rem">Modify RHS Value (b vector)</h4>`;
                solHtml += `<p style="color:var(--text-muted);font-size:0.9rem;margin-bottom:1rem">Change the right-hand side value of a constraint. Uses B⁻¹ × b' to calculate new solution efficiently.</p>`;
                solHtml += `<div style="display:flex;flex-wrap:wrap;gap:1rem;align-items:flex-end;margin-bottom:1rem">`;
                solHtml += `<div><label style="display:block;margin-bottom:0.25rem;color:var(--text-muted)">Constraint:</label>`;
                solHtml += `<select id="simplex-sa-rhs-constraint" style="padding:0.5rem;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:4px;color:var(--text-primary)">`;
                for (let i = 0; i < constraints.length; i++) {
                    solHtml += `<option value="${i}">Constraint ${i + 1} (current b = ${constraints[i].rhs})</option>`;
                }
                solHtml += `</select></div>`;
                solHtml += `<div><label style="display:block;margin-bottom:0.25rem;color:var(--text-muted)">New RHS Value:</label>`;
                solHtml += `<input type="number" id="simplex-sa-new-rhs" value="${constraints[0].rhs}" style="width:100px;padding:0.5rem;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:4px;color:var(--text-primary)"></div>`;
                solHtml += `</div>`;
                solHtml += `<button id="simplex-sa-apply-rhs" class="btn accent">Apply RHS Change</button>`;
                solHtml += `</div>`;

                solHtml += `<div id="simplex-sa-modify-con-form" style="display:none">`;
                solHtml += `<h4 style="margin-bottom:0.75rem">Modify Constraint Coefficient (A matrix)</h4>`;
                solHtml += `<p style="color:var(--text-muted);font-size:0.9rem;margin-bottom:1rem">Change a coefficient in the constraint matrix. Uses B⁻¹ to recalculate reduced costs.</p>`;
                solHtml += `<div style="display:flex;flex-wrap:wrap;gap:1rem;align-items:flex-end;margin-bottom:1rem">`;
                solHtml += `<div><label style="display:block;margin-bottom:0.25rem;color:var(--text-muted)">Constraint:</label>`;
                solHtml += `<select id="simplex-sa-coeff-constraint" style="padding:0.5rem;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:4px;color:var(--text-primary)">`;
                for (let i = 0; i < constraints.length; i++) {
                    solHtml += `<option value="${i}">Constraint ${i + 1}</option>`;
                }
                solHtml += `</select></div>`;
                solHtml += `<div><label style="display:block;margin-bottom:0.25rem;color:var(--text-muted)">Variable:</label>`;
                solHtml += `<select id="simplex-sa-coeff-var" style="padding:0.5rem;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:4px;color:var(--text-primary)">`;
                for (let i = 0; i < numVars; i++) {
                    solHtml += `<option value="${i}">x${i + 1} (current: ${constraints[0].coeffs[i]})</option>`;
                }
                solHtml += `</select></div>`;
                solHtml += `<div><label style="display:block;margin-bottom:0.25rem;color:var(--text-muted)">New Value:</label>`;
                solHtml += `<input type="number" id="simplex-sa-new-coeff" value="${constraints[0].coeffs[0]}" style="width:80px;padding:0.5rem;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:4px;color:var(--text-primary)"></div>`;
                solHtml += `</div>`;
                solHtml += `<button id="simplex-sa-apply-coeff" class="btn accent">Apply Coefficient Change</button>`;
                solHtml += `</div>`;

                solHtml += `<div id="simplex-sa-modify-obj-form" style="display:none">`;
                solHtml += `<h4 style="margin-bottom:0.75rem">Modify Objective Coefficient (c vector)</h4>`;
                solHtml += `<p style="color:var(--text-muted);font-size:0.9rem;margin-bottom:1rem">Change an objective function coefficient. Checks if current basis remains optimal based on reduced cost changes.</p>`;
                solHtml += `<div style="display:flex;flex-wrap:wrap;gap:1rem;align-items:flex-end;margin-bottom:1rem">`;
                solHtml += `<div><label style="display:block;margin-bottom:0.25rem;color:var(--text-muted)">Variable:</label>`;
                solHtml += `<select id="simplex-sa-obj-var" style="padding:0.5rem;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:4px;color:var(--text-primary)">`;
                for (let i = 0; i < numVars; i++) {
                    solHtml += `<option value="${i}">x${i + 1} (current c = ${objective[i]})</option>`;
                }
                solHtml += `</select></div>`;
                solHtml += `<div><label style="display:block;margin-bottom:0.25rem;color:var(--text-muted)">New Coefficient:</label>`;
                solHtml += `<input type="number" id="simplex-sa-new-obj" value="${objective[0]}" style="width:100px;padding:0.5rem;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:4px;color:var(--text-primary)"></div>`;
                solHtml += `</div>`;
                solHtml += `<button id="simplex-sa-apply-obj" class="btn accent">Apply Objective Change</button>`;
                solHtml += `</div>`;

                solHtml += `<div id="simplex-sa-constraint-form" style="display:none">`;
                solHtml += `<h4 style="margin-bottom:0.75rem">Add New Constraint</h4>`;
                solHtml += `<div style="display:flex;flex-wrap:wrap;gap:0.5rem;align-items:center;margin-bottom:1rem">`;
                for (let i = 0; i < numVars; i++) {
                    solHtml += `<span><input type="number" class="sa-con-coeff" value="1" style="width:60px;padding:0.5rem;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:4px;color:var(--text-primary)"> x<sub>${i + 1}</sub></span>`;
                    if (i < numVars - 1) solHtml += `<span>+</span>`;
                }
                solHtml += `<select id="simplex-sa-con-type" style="padding:0.5rem;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:4px;color:var(--text-primary)">`;
                solHtml += `<option value="<=">≤</option><option value=">=">≥</option><option value="=">=</option></select>`;
                solHtml += `<input type="number" id="simplex-sa-con-rhs" value="10" style="width:80px;padding:0.5rem;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:4px;color:var(--text-primary)">`;
                solHtml += `</div>`;
                solHtml += `<button id="simplex-sa-check-constraint" class="btn accent">Check & Add Constraint</button>`;
                solHtml += `</div>`;

                solHtml += `<div id="simplex-sa-variable-form" style="display:none">`;
                solHtml += `<h4 style="margin-bottom:0.75rem">Add New Variable (x<sub>${numVars + 1}</sub>)</h4>`;
                solHtml += `<div style="margin-bottom:0.75rem">`;
                solHtml += `<label style="display:block;margin-bottom:0.25rem;color:var(--text-muted)">Objective Coefficient (c<sub>${numVars + 1}</sub>):</label>`;
                solHtml += `<input type="number" id="simplex-sa-var-obj" value="5" style="width:100px;padding:0.5rem;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:4px;color:var(--text-primary)">`;
                solHtml += `</div>`;
                solHtml += `<div style="margin-bottom:1rem">`;
                solHtml += `<label style="display:block;margin-bottom:0.25rem;color:var(--text-muted)">Constraint Coefficients:</label>`;
                solHtml += `<div style="display:flex;flex-wrap:wrap;gap:0.5rem">`;
                for (let i = 0; i < constraints.length; i++) {
                    solHtml += `<span style="display:flex;align-items:center;gap:0.25rem">Con ${i + 1}: <input type="number" class="sa-var-con-coeff" value="1" style="width:60px;padding:0.5rem;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:4px;color:var(--text-primary)"></span>`;
                }
                solHtml += `</div></div>`;
                solHtml += `<button id="simplex-sa-check-variable" class="btn accent">Check & Add Variable</button>`;
                solHtml += `</div>`;

                solHtml += `<div id="simplex-sa-results" style="margin-top:1rem"></div>`;
                solHtml += `</div>`;


            } catch (e) {
                console.error("Sensitivity Analysis Error:", e);
                solHtml += `<div class="info-box warning"><p>Could not generate sensitivity analysis: ${e.message}</p></div>`;
            }

            solutionContainer.innerHTML = solHtml;

            const constraintTab = document.getElementById('simplex-sa-constraint-tab');
            const variableTab = document.getElementById('simplex-sa-variable-tab');
            const modifyRhsTab = document.getElementById('simplex-sa-modify-rhs-tab');
            const modifyConTab = document.getElementById('simplex-sa-modify-con-tab');
            const modifyObjTab = document.getElementById('simplex-sa-modify-obj-tab');
            const constraintForm = document.getElementById('simplex-sa-constraint-form');
            const variableForm = document.getElementById('simplex-sa-variable-form');
            const modifyRhsForm = document.getElementById('simplex-sa-modify-rhs-form');
            const modifyConForm = document.getElementById('simplex-sa-modify-con-form');
            const modifyObjForm = document.getElementById('simplex-sa-modify-obj-form');
            const resultsDiv = document.getElementById('simplex-sa-results');

            const allTabs = [constraintTab, variableTab, modifyRhsTab, modifyConTab, modifyObjTab];
            const allForms = [constraintForm, variableForm, modifyRhsForm, modifyConForm, modifyObjForm];


            const renderResolveSteps = (resolveResult, newNumVars, isMin) => {
                let html = '';
                const newSolver = resolveResult.solver;
                html += `<div style="margin-top:1.5rem">`;
                html += `<h4 style="margin-bottom:1rem;color:var(--accent-color)">Re-Solve Iterations</h4>`;

                resolveResult.steps.forEach((step, idx) => {
                    html += `<div class="tableau-step" style="margin-bottom:1.5rem;padding:1rem;background:var(--bg-secondary);border-radius:8px">`;
                    html += `<h5 style="margin-bottom:0.5rem">${step.description || `Iteration ${idx}`}</h5>`;

                    if (step.rowOps && step.rowOps.length > 0) {
                        html += '<div style="margin-bottom:0.75rem;padding:0.5rem;background:var(--bg-primary);border-radius:4px;font-size:0.9rem"><strong>Row Operations:</strong><br>' + step.rowOps.join('<br>') + '</div>';
                    }

                    html += '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse"><thead><tr><th style="padding:0.5rem;background:var(--bg-tertiary);border:1px solid var(--border-color)">Basic</th>';
                    newSolver.colHeaders.forEach(h => html += `<th style="padding:0.5rem;background:var(--bg-tertiary);border:1px solid var(--border-color)">${h.replace(/([xsa])(\d+)/i, '$1<sub>$2</sub>')}</th>`);
                    html += '<th style="padding:0.5rem;background:var(--bg-tertiary);border:1px solid var(--border-color)">Ratio</th></tr></thead><tbody>';

                    step.tableau.forEach((row, ri) => {
                        const isZ = ri === 0;
                        const isPivotRow = step.pivot && step.pivot.row === ri;
                        html += `<tr style="${isPivotRow ? 'background:rgba(255,200,0,0.1)' : ''}"><th style="padding:0.5rem;background:var(--bg-primary);border:1px solid var(--border-color)">${step.rowHeaders[ri].replace(/([xsa])(\d+)/i, '$1<sub>$2</sub>')}</th>`;
                        row.forEach((val, ci) => {
                            const isPivot = step.pivot && step.pivot.row === ri && step.pivot.col === ci;
                            const isPivotCol = step.pivot && step.pivot.col === ci;
                            html += `<td style="padding:0.5rem;text-align:center;border:1px solid var(--border-color);${isPivot ? 'background:orange;color:black;font-weight:bold' : isPivotCol ? 'background:rgba(255,200,0,0.2)' : ''}">${formatBigM(val)}</td>`;
                        });
                        html += `<td style="padding:0.5rem;text-align:center;border:1px solid var(--border-color)">${!isZ && step.ratios && step.ratios[ri - 1] !== null ? formatNumber(step.ratios[ri - 1]) : '-'}</td></tr>`;
                    });
                    html += '</tbody></table></div></div>';
                });

                if (resolveResult.isOptimal) {
                    const newFinalStep = resolveResult.steps[resolveResult.steps.length - 1];
                    const newTableau = newFinalStep.tableau;
                    const newZ = isMin ? -newTableau[0][newTableau[0].length - 1].v : newTableau[0][newTableau[0].length - 1].v;

                    html += `<div class="info-box success" style="margin-top:1rem">`;
                    html += `<h4 style="color:var(--accent-color)">New Optimal Solution Found</h4>`;
                    html += `<p style="font-size:1.5rem;color:var(--accent-color);margin:0.75rem 0"><strong>Z* = ${formatNumber(newZ)}</strong></p>`;
                    html += `<div style="display:flex;flex-wrap:wrap;gap:0.5rem">`;
                    for (let i = 0; i < newNumVars; i++) {
                        const varName = `x${i + 1}`;
                        const rowIdx = newFinalStep.rowHeaders.indexOf(varName);
                        const val = rowIdx !== -1 ? newTableau[rowIdx][newTableau[rowIdx].length - 1].v : 0;
                        html += `<span style="padding:0.5rem 1rem;background:var(--bg-primary);border-radius:4px">x<sub>${i + 1}</sub> = <strong>${formatNumber(val)}</strong></span>`;
                    }
                    html += `</div></div>`;
                }
                html += `</div>`;
                return html;
            };

            constraintTab?.addEventListener('click', () => {
                allTabs.forEach(t => t?.classList.replace('primary', 'secondary'));
                constraintTab.classList.replace('secondary', 'primary');
                allForms.forEach(f => { if (f) f.style.display = 'none'; });
                constraintForm.style.display = 'block';
            });

            variableTab?.addEventListener('click', () => {
                allTabs.forEach(t => t?.classList.replace('primary', 'secondary'));
                variableTab.classList.replace('secondary', 'primary');
                allForms.forEach(f => { if (f) f.style.display = 'none'; });
                variableForm.style.display = 'block';
            });

            modifyRhsTab?.addEventListener('click', () => {
                allTabs.forEach(t => t?.classList.replace('primary', 'secondary'));
                modifyRhsTab.classList.replace('secondary', 'primary');
                allForms.forEach(f => { if (f) f.style.display = 'none'; });
                modifyRhsForm.style.display = 'block';
            });

            modifyConTab?.addEventListener('click', () => {
                allTabs.forEach(t => t?.classList.replace('primary', 'secondary'));
                modifyConTab.classList.replace('secondary', 'primary');
                allForms.forEach(f => { if (f) f.style.display = 'none'; });
                modifyConForm.style.display = 'block';
            });

            modifyObjTab?.addEventListener('click', () => {
                allTabs.forEach(t => t?.classList.replace('primary', 'secondary'));
                modifyObjTab.classList.replace('secondary', 'primary');
                allForms.forEach(f => { if (f) f.style.display = 'none'; });
                modifyObjForm.style.display = 'block';
            });


            const rhsConstraintSelect = document.getElementById('simplex-sa-rhs-constraint');
            rhsConstraintSelect?.addEventListener('change', () => {
                const idx = parseInt(rhsConstraintSelect.value);
                document.getElementById('simplex-sa-new-rhs').value = constraints[idx].rhs;
            });

            const coeffConstraintSelect = document.getElementById('simplex-sa-coeff-constraint');
            const coeffVarSelect = document.getElementById('simplex-sa-coeff-var');
            const updateCoeffValue = () => {
                const conIdx = parseInt(coeffConstraintSelect?.value || 0);
                const varIdx = parseInt(coeffVarSelect?.value || 0);
                const newCoeffInput = document.getElementById('simplex-sa-new-coeff');
                if (newCoeffInput) newCoeffInput.value = constraints[conIdx].coeffs[varIdx];
            };
            coeffConstraintSelect?.addEventListener('change', updateCoeffValue);
            coeffVarSelect?.addEventListener('change', updateCoeffValue);

            const renderMatrixSteps = (result, originalZ, newZ) => {
                let html = '';
                result.steps.forEach(step => {
                    html += `<div class="step-box" style="margin-bottom:1rem;padding:1rem;background:var(--bg-secondary);border-radius:8px">`;
                    if (step.type === 'info') {
                        html += `<h5 style="color:var(--primary-color);margin-bottom:0.5rem">${step.title}</h5>`;
                        html += `<p>${step.content}</p>`;
                    } else if (step.type === 'matrix') {
                        html += `<h5 style="color:var(--primary-color);margin-bottom:0.5rem">${step.title}</h5>`;
                        html += `<div style="overflow-x:auto"><table style="border-collapse:collapse;margin:0.5rem 0"><tbody>`;
                        step.matrix.forEach((row, ri) => {
                            html += `<tr>`;
                            if (step.labels) html += `<th style="padding:0.25rem 0.5rem;background:var(--bg-tertiary);border:1px solid var(--border-color)">${step.labels[ri]}</th>`;
                            row.forEach(val => {
                                html += `<td style="padding:0.25rem 0.5rem;text-align:center;border:1px solid var(--border-color)">${formatNumber(val)}</td>`;
                            });
                            html += `</tr>`;
                        });
                        html += `</tbody></table></div>`;
                    } else if (step.type === 'vector') {
                        html += `<h5 style="color:var(--primary-color);margin-bottom:0.5rem">${step.title}</h5>`;
                        html += `<div style="display:flex;flex-wrap:wrap;gap:0.5rem">`;
                        step.vector.forEach((val, i) => {
                            const highlight = step.highlightIdx === i ? 'background:rgba(255,165,0,0.3);border:1px solid orange' : 'background:var(--bg-primary)';
                            html += `<span style="padding:0.25rem 0.5rem;border-radius:4px;${highlight}">${step.labels ? step.labels[i] + ' = ' : ''}${formatNumber(val)}</span>`;
                        });
                        html += `</div>`;
                    } else if (step.type === 'calculation') {
                        html += `<h5 style="color:var(--primary-color);margin-bottom:0.5rem">${step.title}</h5>`;
                        html += `<div style="padding:0.5rem;background:var(--bg-primary);border-radius:4px;font-family:monospace">`;
                        html += `<strong>Formula:</strong> ${step.formula}<br>`;
                        html += `<span style="color:var(--text-muted)">${step.details}</span>`;
                        html += `</div>`;
                    } else if (step.type === 'result') {
                        const borderColor = step.status === 'success' ? 'var(--accent-color)' : step.status === 'warning' ? 'orange' : '#cc6666';
                        const icon = step.status === 'success' ? '✓' : step.status === 'warning' ? '⚠' : '✗';
                        html += `<div style="border-left:4px solid ${borderColor};padding-left:0.75rem">`;
                        html += `<h5 style="margin-bottom:0.5rem">${icon} ${step.title}</h5>`;
                        html += `<p>${step.content}</p>`;
                        html += `</div>`;
                    } else if (step.type === 'constraint') {
                        html += `<h5 style="color:var(--primary-color);margin-bottom:0.5rem">${step.title}</h5>`;
                        const typeSym = step.type_sym === '<=' ? '≤' : step.type_sym === '>=' ? '≥' : '=';
                        html += `<p>${formatLinearExpr(step.coeffs)} ${typeSym} ${step.rhs}</p>`;
                    }
                    html += `</div>`;
                });

                html += `<div class="info-box" style="margin-top:1rem;border-left:4px solid var(--accent-color)">`;
                html += `<h4>Solution Comparison</h4>`;
                html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-top:0.75rem">`;
                html += `<div style="padding:0.75rem;background:var(--bg-secondary);border-radius:8px">`;
                html += `<strong>Original Solution</strong><br>`;
                html += `<span style="font-size:1.25rem;color:var(--text-muted)">Z = ${formatNumber(originalZ)}</span>`;
                if (result.originalSolution) {
                    html += `<div style="margin-top:0.5rem;display:flex;flex-wrap:wrap;gap:0.25rem">`;
                    Object.entries(result.originalSolution).forEach(([k, v]) => {
                        html += `<span style="padding:0.15rem 0.4rem;background:var(--bg-primary);border-radius:4px;font-size:0.9rem">${k}=${formatNumber(v)}</span>`;
                    });
                    html += `</div>`;
                }
                html += `</div>`;
                html += `<div style="padding:0.75rem;background:var(--bg-secondary);border-radius:8px">`;
                html += `<strong>New Solution</strong><br>`;
                html += `<span style="font-size:1.25rem;color:var(--accent-color)">Z' = ${formatNumber(newZ)}</span>`;
                if (result.newSolution) {
                    html += `<div style="margin-top:0.5rem;display:flex;flex-wrap:wrap;gap:0.25rem">`;
                    Object.entries(result.newSolution).forEach(([k, v]) => {
                        html += `<span style="padding:0.15rem 0.4rem;background:var(--bg-primary);border-radius:4px;font-size:0.9rem">${k}=${formatNumber(v)}</span>`;
                    });
                    html += `</div>`;
                }
                html += `</div>`;
                html += `</div></div>`;

                return html;
            };

            document.getElementById('simplex-sa-apply-rhs')?.addEventListener('click', () => {
                const constraintIdx = parseInt(document.getElementById('simplex-sa-rhs-constraint').value);
                const newRHS = parseFloat(document.getElementById('simplex-sa-new-rhs').value) || 0;

                const matrixSA = new MatrixSensitivityAnalysis(solver, objective, constraints, numVars, isMinimization);
                const result = matrixSA.modifyRHS(constraintIdx, newRHS);

                let resultHtml = `<div class="info-box" style="margin-top:1rem;border-left:4px solid ${result.isFeasible ? 'var(--accent-color)' : 'orange'}">`;
                resultHtml += `<h4>RHS Change Analysis: Constraint ${constraintIdx + 1}</h4>`;
                resultHtml += `<p>Changed b<sub>${constraintIdx + 1}</sub> from <strong>${result.originalRHS[constraintIdx]}</strong> to <strong>${newRHS}</strong></p>`;
                resultHtml += `</div>`;

                resultHtml += renderMatrixSteps(result, result.originalZ, result.newZ);

                if (result.needsResolve && result.resolveResult) {
                    resultHtml += renderResolveSteps(result.resolveResult, numVars, isMinimization);
                }

                resultsDiv.innerHTML = resultHtml;
            });

            document.getElementById('simplex-sa-apply-coeff')?.addEventListener('click', () => {
                const constraintIdx = parseInt(document.getElementById('simplex-sa-coeff-constraint').value);
                const varIdx = parseInt(document.getElementById('simplex-sa-coeff-var').value);
                const newCoeff = parseFloat(document.getElementById('simplex-sa-new-coeff').value) || 0;

                const matrixSA = new MatrixSensitivityAnalysis(solver, objective, constraints, numVars, isMinimization);
                const result = matrixSA.modifyConstraintCoefficient(constraintIdx, varIdx, newCoeff);

                let resultHtml = `<div class="info-box" style="margin-top:1rem;border-left:4px solid ${!result.needsResolve ? 'var(--accent-color)' : 'orange'}">`;
                resultHtml += `<h4>Coefficient Change Analysis</h4>`;
                resultHtml += `<p>Changed A[${constraintIdx + 1}][${varIdx + 1}] from <strong>${result.originalA[constraintIdx][varIdx]}</strong> to <strong>${newCoeff}</strong></p>`;
                resultHtml += `</div>`;

                resultHtml += renderMatrixSteps(result, result.originalZ, result.resolveResult ?
                    (isMinimization ? -result.resolveResult.solver.tableau[0][result.resolveResult.solver.tableau[0].length - 1].v
                        : result.resolveResult.solver.tableau[0][result.resolveResult.solver.tableau[0].length - 1].v)
                    : result.originalZ);

                if (result.needsResolve && result.resolveResult) {
                    resultHtml += renderResolveSteps(result.resolveResult, numVars, isMinimization);
                }

                resultsDiv.innerHTML = resultHtml;
            });

            const objVarSelect = document.getElementById('simplex-sa-obj-var');
            objVarSelect?.addEventListener('change', () => {
                const idx = parseInt(objVarSelect.value);
                document.getElementById('simplex-sa-new-obj').value = objective[idx];
            });

            document.getElementById('simplex-sa-apply-obj')?.addEventListener('click', () => {
                const varIdx = parseInt(document.getElementById('simplex-sa-obj-var').value);
                const newCoeff = parseFloat(document.getElementById('simplex-sa-new-obj').value) || 0;

                const matrixSA = new MatrixSensitivityAnalysis(solver, objective, constraints, numVars, isMinimization);
                const result = matrixSA.modifyObjectiveCoefficient(varIdx, newCoeff);

                let resultHtml = `<div class="info-box" style="margin-top:1rem;border-left:4px solid ${!result.needsResolve ? 'var(--accent-color)' : 'orange'}">`;
                resultHtml += `<h4>Objective Coefficient Change Analysis</h4>`;
                resultHtml += `<p>Changed c<sub>${varIdx + 1}</sub> from <strong>${result.originalObjective[varIdx]}</strong> to <strong>${newCoeff}</strong></p>`;
                if (result.isVarBasic) {
                    resultHtml += `<p style="color:var(--text-muted)">Note: x<sub>${varIdx + 1}</sub> is a basic variable</p>`;
                }
                resultHtml += `</div>`;

                resultHtml += renderMatrixSteps(result, result.originalZ, result.newZ);

                if (result.needsResolve && result.resolveResult) {
                    resultHtml += renderResolveSteps(result.resolveResult, numVars, isMinimization);
                }

                resultsDiv.innerHTML = resultHtml;
            });

            document.getElementById('simplex-sa-check-constraint')?.addEventListener('click', () => {
                const coeffInputs = document.querySelectorAll('.sa-con-coeff');
                const coeffs = Array.from(coeffInputs).map(inp => parseFloat(inp.value) || 0);
                const type = document.getElementById('simplex-sa-con-type').value;
                const rhs = parseFloat(document.getElementById('simplex-sa-con-rhs').value) || 0;

                const interactiveSA = new InteractiveSensitivityAnalysis(solver, objective, constraints, numVars, isMinimization);
                const feasibility = interactiveSA.checkConstraintFeasibility(coeffs, type, rhs);

                let resultHtml = '';
                const typeSymbol = type === '<=' ? '≤' : type === '>=' ? '≥' : '=';
                resultHtml += `<div class="info-box" style="margin-top:1rem;border-left:4px solid ${feasibility.isSatisfied ? 'var(--accent-color)' : '#cc6666'}">`;
                resultHtml += `<h4>Constraint Check: ${formatLinearExpr(coeffs)} ${typeSymbol} ${rhs}</h4>`;
                resultHtml += `<p>LHS Value at optimal solution: <strong>${formatNumber(feasibility.lhsValue)}</strong></p>`;

                if (feasibility.isSatisfied) {
                    resultHtml += `<p style="color:var(--accent-color);font-weight:bold">✓ Constraint is SATISFIED. Current solution remains optimal.</p>`;
                    resultHtml += `<p style="color:var(--text-muted)">Slack: ${formatNumber(feasibility.slack)}</p>`;
                } else {
                    resultHtml += `<p style="color:#cc6666;font-weight:bold">✗ Constraint is VIOLATED. Re-solving required...</p>`;

                    const resolveResult = interactiveSA.resolveWithNewConstraint(coeffs, type, rhs);
                    resultHtml += `</div>`;
                    resultHtml += renderResolveSteps(resolveResult, numVars, isMinimization);
                    if (!resolveResult.isOptimal) {
                        resultHtml += `<div class="info-box warning"><p style="color:#cc6666">Status: ${resolveResult.status}</p></div>`;
                    }
                }
                resultHtml += `</div>`;
                resultsDiv.innerHTML = resultHtml;
            });

            document.getElementById('simplex-sa-check-variable')?.addEventListener('click', () => {
                const objCoeff = parseFloat(document.getElementById('simplex-sa-var-obj').value) || 0;
                const conCoeffInputs = document.querySelectorAll('.sa-var-con-coeff');
                const constraintCoeffs = Array.from(conCoeffInputs).map(inp => parseFloat(inp.value) || 0);

                const interactiveSA = new InteractiveSensitivityAnalysis(solver, objective, constraints, numVars, isMinimization);
                const profitability = interactiveSA.checkVariableProfitability(objCoeff, constraintCoeffs);

                let resultHtml = '';
                resultHtml += `<div class="info-box" style="margin-top:1rem;border-left:4px solid ${profitability.isProfitable ? 'orange' : 'var(--accent-color)'}">`;
                resultHtml += `<h4>Variable Check: x<sub>${numVars + 1}</sub> with c<sub>${numVars + 1}</sub> = ${objCoeff}</h4>`;
                resultHtml += `<p>Reduced Cost (c̄<sub>${numVars + 1}</sub>): <strong>${formatNumber(profitability.reducedCost)}</strong></p>`;

                if (!profitability.isProfitable) {
                    resultHtml += `<p style="color:var(--accent-color);font-weight:bold">✓ Variable is NOT profitable. Current solution remains optimal.</p>`;
                    resultHtml += `<p style="color:var(--text-muted)">Adding this variable would not improve the objective.</p>`;
                } else {
                    resultHtml += `<p style="color:orange;font-weight:bold">⚠ Variable IS profitable. Adding to basis and re-solving...</p>`;

                    const resolveResult = interactiveSA.resolveWithNewVariable(objCoeff, constraintCoeffs);
                    resultHtml += `</div>`;
                    resultHtml += renderResolveSteps(resolveResult, resolveResult.numVars, isMinimization);
                    if (!resolveResult.isOptimal) {
                        resultHtml += `<div class="info-box warning"><p style="color:#cc6666">Status: ${resolveResult.status}</p></div>`;
                    }
                }
                resultHtml += `</div>`;
                resultsDiv.innerHTML = resultHtml;
            });
        } else {
            solutionContainer.innerHTML = `<div class="info-box warning"><h3>${solver.status}</h3><p>The problem ${solver.status === 'Unbounded' ? 'has no bounded solution' : 'has no feasible solution'}.</p></div>`;
        }
        vizSection.scrollIntoView({ behavior: "smooth" });
    });
}
