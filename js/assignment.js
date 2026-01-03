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
function getRowMin(matrix, row) { return Math.min(...matrix[row].filter(v => !isInfinity(v))); }
function getColMin(matrix, col) { return Math.min(...matrix.map(row => row[col]).filter(v => !isInfinity(v))); }
function countZeros(matrix) { return matrix.flat().filter(v => v === 0).length; }
function convertToMinimization(matrix) { const maxVal = Math.max(...matrix.flat().filter(v => !isInfinity(v))); return matrix.map(row => row.map(cell => isInfinity(cell) ? INFINITY_VALUE : maxVal - cell)); }
function makeSquare(matrix) {
    const rows = matrix.length, cols = matrix[0].length;
    if (rows === cols) return { matrix: deepCopy(matrix), dummyRows: [], dummyCols: [], wasModified: false };
    let newMatrix = deepCopy(matrix), dummyRows = [], dummyCols = [];
    if (rows < cols) { for (let i = 0; i < cols - rows; i++) { newMatrix.push(Array(cols).fill(0)); dummyRows.push(rows + i); } }
    else { for (let i = 0; i < rows; i++) for (let j = 0; j < rows - cols; j++) newMatrix[i].push(0); for (let j = 0; j < rows - cols; j++) dummyCols.push(cols + j); }
    return { matrix: newMatrix, dummyRows, dummyCols, wasModified: true };
}
function generateCoveringLines(numRows, coveredRows, coveredCols) {
    let linesHtml = '';
    const numCols = coveredCols.length;
    const rowHeight = 100 / (numRows + 1);
    const colWidth = 100 / (numCols + 1);
    coveredRows.forEach((covered, rowIndex) => {
        if (covered) {
            const topPercent = rowHeight * (rowIndex + 1) + rowHeight / 2;
            linesHtml += `<div class="covering-line-horizontal" style="top: ${topPercent}%;" title="Row ${rowIndex + 1} covered"></div>`;
        }
    });
    coveredCols.forEach((covered, colIndex) => {
        if (covered) {
            const leftPercent = colWidth * (colIndex + 1) + colWidth / 2;
            linesHtml += `<div class="covering-line-vertical" style="left: ${leftPercent}%;" title="Column ${colIndex + 1} covered"></div>`;
        }
    });
    coveredRows.forEach((rowCovered, rowIndex) => {
        if (rowCovered) {
            coveredCols.forEach((colCovered, colIndex) => {
                if (colCovered) {
                    const topPercent = rowHeight * (rowIndex + 1) + rowHeight / 2;
                    const leftPercent = colWidth * (colIndex + 1) + colWidth / 2;
                    linesHtml += `<div class="line-intersection" style="top: ${topPercent}%; left: ${leftPercent}%;" title="Intersection"></div>`;
                }
            });
        }
    });
    return linesHtml;
}
function displayHungarianMatrix(matrix, options = {}) {
    const { title = "", coveredRows = null, coveredCols = null, assignment = null, minCell = null } = options;
    const n = matrix.length;
    const showLines = coveredRows && coveredCols && (coveredRows.some(v => v) || coveredCols.some(v => v));
    let html = title ? `<h5>${title}</h5>` : '';
    if (showLines) {
        html += '<div class="matrix-lines-container" style="display:inline-block;position:relative;">';
    }
    html += '<div class="table-wrapper"><table>';
    html += '<thead><tr><th></th>';
    for (let j = 0; j < n; j++) html += `<th>T${j + 1}</th>`;
    html += '</tr></thead><tbody>';
    for (let i = 0; i < n; i++) {
        html += `<tr><th>W${i + 1}</th>`;
        for (let j = 0; j < n; j++) {
            let cellClass = [];
            const val = matrix[i][j];
            if (val === 0) cellClass.push('cell-zero');
            if (assignment && assignment.some(a => a.row === i && a.col === j)) cellClass.push('cell-assigned');
            if (minCell && minCell.row === i && minCell.col === j) cellClass.push('cell-min-uncovered');
            if (coveredRows && coveredCols) {
                if (coveredRows[i] && coveredCols[j]) cellClass.push('cell-covered-both');
                else if (coveredRows[i]) cellClass.push('cell-covered-row');
                else if (coveredCols[j]) cellClass.push('cell-covered-col');
            }
            html += `<td class="${cellClass.join(' ')}">${isInfinity(val) ? '∞' : val}</td>`;
        }
        html += '</tr>';
    }
    html += '</tbody></table></div>';
    if (showLines) {
        html += generateCoveringLines(n, coveredRows, coveredCols);
        html += '</div>';
    }
    return html;
}
function hungarianAlgorithmWithSteps(costMatrix, isMax = false) {
    const n = costMatrix.length;
    const steps = [];
    let workingMatrix = isMax ? convertToMinimization(costMatrix) : deepCopy(costMatrix);
    let maxVal = 0;
    if (isMax) {
        maxVal = Math.max(...costMatrix.flat().filter(v => !isInfinity(v)));
        steps.push({
            type: 'conversion',
            title: 'Converting to Minimization',
            description: `Maximization problem converted by subtracting each value from max (${maxVal})`,
            matrix: deepCopy(workingMatrix)
        });
    }
    const rowMins = [];
    for (let i = 0; i < n; i++) {
        const minVal = getRowMin(workingMatrix, i);
        rowMins.push(minVal);
        for (let j = 0; j < n; j++) {
            if (!isInfinity(workingMatrix[i][j])) workingMatrix[i][j] -= minVal;
        }
    }
    steps.push({
        type: 'row-reduction',
        title: 'Step 1: Row Reduction',
        description: `Subtracted row minimums: [${rowMins.join(', ')}]`,
        matrix: deepCopy(workingMatrix)
    });
    const colMins = [];
    for (let j = 0; j < n; j++) {
        const minVal = getColMin(workingMatrix, j);
        colMins.push(minVal);
        for (let i = 0; i < n; i++) {
            if (!isInfinity(workingMatrix[i][j])) workingMatrix[i][j] -= minVal;
        }
    }
    steps.push({
        type: 'col-reduction',
        title: 'Step 2: Column Reduction',
        description: `Subtracted column minimums: [${colMins.join(', ')}]`,
        matrix: deepCopy(workingMatrix)
    });
    const earlyAssignment = findOptimalAssignment(workingMatrix);
    if (earlyAssignment.length === n) {
        let totalCost = 0;
        for (const { row, col } of earlyAssignment) {
            if (!isInfinity(costMatrix[row][col])) totalCost += costMatrix[row][col];
        }
        steps.push({
            type: 'assignment',
            title: 'Step 3: Optimal Assignment',
            description: `Complete assignment found directly from reduced matrix. ${isMax ? 'Maximum Profit' : 'Minimum Cost'}: ${totalCost}`,
            matrix: deepCopy(workingMatrix),
            assignment: earlyAssignment
        });
        return { assignment: earlyAssignment, totalCost, steps, isMaximization: isMax };
    }
    let iteration = 0;
    const maxIterations = n * n;
    while (iteration < maxIterations) {
        const assignment = findOptimalAssignment(workingMatrix);
        if (assignment.length === n) {
            let totalCost = 0;
            for (const { row, col } of assignment) {
                if (!isInfinity(costMatrix[row][col])) totalCost += costMatrix[row][col];
            }
            steps.push({
                type: 'assignment',
                title: 'Step 4: Optimal Assignment',
                description: `Found optimal assignment with ${isMax ? 'Maximum Profit' : 'Minimum Cost'}: ${totalCost}`,
                matrix: deepCopy(workingMatrix),
                assignment: assignment
            });
            return { assignment, totalCost, steps, isMaximization: isMax };
        }
        iteration++;
        const { coveredRows, coveredCols, lineCount } = findMinimumCover(workingMatrix, assignment);
        steps.push({
            type: 'covering',
            title: `Step 3.${iteration}: Covering Zeros (Iteration ${iteration})`,
            description: `Drawing minimum lines to cover all zeros: ${lineCount} lines needed (${coveredRows.filter(v => v).length} rows + ${coveredCols.filter(v => v).length} columns). Need ${n} lines for optimal.`,
            matrix: deepCopy(workingMatrix),
            coveredRows: [...coveredRows],
            coveredCols: [...coveredCols],
            lineCount: lineCount
        });
        let minUncov = Infinity, minCell = null;
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (!coveredRows[i] && !coveredCols[j] && !isInfinity(workingMatrix[i][j]) && workingMatrix[i][j] < minUncov) {
                    minUncov = workingMatrix[i][j];
                    minCell = { row: i, col: j };
                }
            }
        }
        if (minUncov === Infinity || minUncov === 0) break;
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (isInfinity(workingMatrix[i][j])) continue;
                if (!coveredRows[i] && !coveredCols[j]) workingMatrix[i][j] -= minUncov;
                else if (coveredRows[i] && coveredCols[j]) workingMatrix[i][j] += minUncov;
            }
        }
        const optimizedAssignment = findOptimalAssignment(workingMatrix);
        const canAssignAll = optimizedAssignment.length === n;
        steps.push({
            type: 'optimization',
            title: `Step 3.${iteration}b: Matrix Optimization`,
            description: `Minimum uncovered value: ${minUncov}. Subtracted from uncovered cells, added to intersection cells.${canAssignAll ? ' Complete assignment now possible!' : ''}`,
            matrix: deepCopy(workingMatrix),
            coveredRows: [...coveredRows],
            coveredCols: [...coveredCols],
            minCell: minCell,
            assignment: canAssignAll ? optimizedAssignment : null
        });
        if (canAssignAll) {
            let totalCost = 0;
            for (const { row, col } of optimizedAssignment) {
                if (!isInfinity(costMatrix[row][col])) totalCost += costMatrix[row][col];
            }
            steps.push({
                type: 'assignment',
                title: 'Step 4: Optimal Assignment',
                description: `Found optimal assignment with ${isMax ? 'Maximum Profit' : 'Minimum Cost'}: ${totalCost}`,
                matrix: deepCopy(workingMatrix),
                assignment: optimizedAssignment
            });
            return { assignment: optimizedAssignment, totalCost, steps, isMaximization: isMax };
        }
    }
    const assignment = findOptimalAssignment(workingMatrix);
    let totalCost = 0;
    for (const { row, col } of assignment) {
        if (!isInfinity(costMatrix[row][col])) totalCost += costMatrix[row][col];
    }
    steps.push({
        type: 'assignment',
        title: 'Step 4: Optimal Assignment',
        description: `Found optimal assignment with ${isMax ? 'Maximum Profit' : 'Minimum Cost'}: ${totalCost}`,
        matrix: deepCopy(workingMatrix),
        assignment: assignment
    });
    return { assignment, totalCost, steps, isMaximization: isMax };
}
function findMinimumCover(matrix, assignment) {
    const n = matrix.length;
    const rowMatch = Array(n).fill(-1);
    const colMatch = Array(n).fill(-1);
    for (const { row, col } of assignment) {
        rowMatch[row] = col;
        colMatch[col] = row;
    }
    const markedRows = Array(n).fill(false);
    const markedCols = Array(n).fill(false);
    for (let i = 0; i < n; i++) {
        if (rowMatch[i] === -1) markedRows[i] = true;
    }
    let changed = true;
    while (changed) {
        changed = false;
        for (let i = 0; i < n; i++) {
            if (markedRows[i]) {
                for (let j = 0; j < n; j++) {
                    if (!markedCols[j] && matrix[i][j] === 0) {
                        markedCols[j] = true;
                        changed = true;
                    }
                }
            }
        }
        for (let j = 0; j < n; j++) {
            if (markedCols[j] && colMatch[j] !== -1 && !markedRows[colMatch[j]]) {
                markedRows[colMatch[j]] = true;
                changed = true;
            }
        }
    }
    const coveredRows = markedRows.map(v => !v);
    const coveredCols = [...markedCols];
    const lineCount = coveredRows.filter(v => v).length + coveredCols.filter(v => v).length;
    return { coveredRows, coveredCols, lineCount };
}

function findOptimalAssignment(reducedMatrix) {
    const n = reducedMatrix.length;
    const rowMatch = Array(n).fill(-1);
    const colMatch = Array(n).fill(-1);
    function augment(row, visited) {
        for (let col = 0; col < n; col++) {
            if (reducedMatrix[row][col] === 0 && !visited[col]) {
                visited[col] = true;
                if (colMatch[col] === -1 || augment(colMatch[col], visited)) {
                    rowMatch[row] = col;
                    colMatch[col] = row;
                    return true;
                }
            }
        }
        return false;
    }
    for (let row = 0; row < n; row++) {
        const visited = Array(n).fill(false);
        augment(row, visited);
    }
    const assignment = [];
    for (let row = 0; row < n; row++) {
        if (rowMatch[row] !== -1) {
            assignment.push({ row: row, col: rowMatch[row] });
        }
    }
    return assignment.sort((a, b) => a.row - b.row);
}
function initAssignment() {
    const sizeInput = document.getElementById("assign-size"), matrixContainer = document.getElementById("assign-matrix"), solveBtn = document.getElementById("assign-solve-btn"), vizSection = document.getElementById("assign-viz"), setupContainer = document.getElementById("assign-setup"), stepsContainer = document.getElementById("assign-steps"), finalContainer = document.getElementById("assign-final");
    if (!sizeInput) return;
    function buildMatrix() {
        const n = parseInt(sizeInput.value) || 4;
        let html = '<div class="matrix-container"><div class="matrix-grid"><div class="matrix-row"><div class="matrix-label"></div>';
        for (let j = 0; j < n; j++) html += `<div class="matrix-header">T${j + 1}</div>`;
        html += '</div>';
        for (let i = 0; i < n; i++) { html += `<div class="matrix-row"><div class="matrix-label">W${i + 1}</div>`; for (let j = 0; j < n; j++) html += `<div class="matrix-cell"><input type="number" data-row="${i}" data-col="${j}" value="0" min="0" /></div>`; html += '</div>'; }
        html += '</div></div>';
        matrixContainer.innerHTML = html;
    }
    sizeInput.addEventListener("change", buildMatrix);
    buildMatrix();
    document.getElementById("assign-generate-btn")?.addEventListener("click", () => { matrixContainer.querySelectorAll('input').forEach(inp => inp.value = Math.floor(Math.random() * 50) + 1); });
    document.getElementById("assign-clear-btn")?.addEventListener("click", () => { matrixContainer.querySelectorAll('input').forEach(inp => inp.value = 0); vizSection.classList.add("hidden"); });


    // Tab Handling for Assignment Type
    document.querySelectorAll('.mode-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const mode = e.target.dataset.mode;
            const select = document.getElementById("assign-type");
            if (select) select.value = mode;
        });
    });

    solveBtn?.addEventListener("click", () => {
        const n = parseInt(sizeInput.value) || 4;
        const matrixInputs = matrixContainer.querySelectorAll('input');

        // Blank/Zero Check
        let hasNonZero = false;
        let hasEmpty = false;
        matrixInputs.forEach(inp => {
            if (parseFloat(inp.value) !== 0) hasNonZero = true;
            if (inp.value.trim() === '') hasEmpty = true;
        });

        if (hasEmpty) {
            alert("Please fill in all matrix cells.");
            return;
        }

        if (!hasNonZero) {
            // Optional: You might want to allow all zeros, but typically it could mean a mistake. 
            // The user requested "blank solving check", which usually refers to empty or default state.
            // If strictly check for empty inputs: done above.
            // If check for all zeros (unchanged default):
            const confirmZero = confirm("The matrix contains only zeros. Do you want to proceed?");
            if (!confirmZero) return;
        }

        const isMax = document.getElementById("assign-type").value === "max";
        const costs = [];
        for (let i = 0; i < n; i++) costs[i] = Array(n).fill(0);
        matrixInputs.forEach(inp => costs[parseInt(inp.dataset.row)][parseInt(inp.dataset.col)] = parseFloat(inp.value) || 0);
        const squareResult = makeSquare(costs);
        const result = hungarianAlgorithmWithSteps(squareResult.matrix, isMax);
        const filteredAssignment = result.assignment.filter(({ row, col }) => !squareResult.dummyRows.includes(row) && !squareResult.dummyCols.includes(col));
        let actualCost = 0; for (const { row, col } of filteredAssignment) if (row < costs.length && col < costs[0].length) actualCost += costs[row][col];
        vizSection.classList.remove("hidden");
        setupContainer.innerHTML = `<h3>Problem Analysis</h3><p><strong>Size:</strong> ${n}×${n}</p><p><strong>Type:</strong> ${isMax ? 'Maximization' : 'Minimization'}</p>${squareResult.wasModified ? '<p>Matrix was balanced with dummy rows/columns</p>' : ''}`;
        let stepsHtml = '<h3>Hungarian Method Steps</h3>';
        stepsHtml += `<div style="background:var(--bg-tertiary);padding:1rem;border-radius:8px;margin-bottom:1.5rem;border-left:4px solid var(--accent-color)">`;
        stepsHtml += `<strong>Hungarian Method Formulas:</strong>`;
        stepsHtml += `<div style="background:rgba(0,0,0,0.3);padding:0.5rem 1rem;border-radius:4px;font-family:monospace;margin-top:0.5rem">`;
        stepsHtml += `c'<sub>ij</sub> = c<sub>ij</sub> - min<sub>j</sub>(c<sub>ij</sub>) &nbsp;&nbsp;(Row Reduction)`;
        stepsHtml += `</div>`;
        stepsHtml += `<div style="background:rgba(0,0,0,0.3);padding:0.5rem 1rem;border-radius:4px;font-family:monospace;margin-top:0.5rem">`;
        stepsHtml += `c''<sub>ij</sub> = c'<sub>ij</sub> - min<sub>i</sub>(c'<sub>ij</sub>) &nbsp;&nbsp;(Column Reduction)`;
        stepsHtml += `</div>`;
        stepsHtml += `<div style="background:rgba(0,0,0,0.3);padding:0.5rem 1rem;border-radius:4px;font-family:monospace;margin-top:0.5rem">`;
        stepsHtml += `θ = min(uncovered elements), then: uncovered − θ, twice-covered + θ`;
        stepsHtml += `</div>`;
        stepsHtml += `</div>`;
        stepsHtml += `<div class="lines-legend">
            <div class="lines-legend-item"><div class="line-sample-h"></div><span>Row Cover</span></div>
            <div class="lines-legend-item"><div class="line-sample-v"></div><span>Column Cover</span></div>
            <div class="lines-legend-item"><div class="intersection-sample"></div><span>Intersection</span></div>
        </div>`;
        result.steps.forEach((step, idx) => {
            stepsHtml += `<div class="info-box" style="margin-bottom:1.5rem;border-left:4px solid ${step.type === 'assignment' ? 'var(--accent-color)' : 'var(--primary-color)'}">`;
            stepsHtml += `<h4>${step.title}</h4>`;
            stepsHtml += `<p style="margin-bottom:1rem">${step.description}</p>`;
            stepsHtml += displayHungarianMatrix(step.matrix, {
                title: '',
                coveredRows: step.coveredRows || null,
                coveredCols: step.coveredCols || null,
                assignment: step.assignment || null,
                minCell: step.minCell || null
            });
            stepsHtml += '</div>';
        });
        stepsContainer.innerHTML = stepsHtml;
        let assignHtml = '<div class="info-box success"><h3>Optimal Assignment</h3><p style="font-size:1.5rem;color:var(--accent-color)"><strong>' + (isMax ? 'Maximum Profit: ' : 'Minimum Cost: ') + formatNumber(actualCost) + '</strong></p><div class="allocation-display">';
        for (const { row, col } of filteredAssignment) assignHtml += `<div class="allocation-item"><span class="allocation-route">Worker ${row + 1} -> Task ${col + 1}</span><span class="allocation-cost">Cost: ${costs[row][col]}</span></div>`;
        assignHtml += '</div></div>';
        let matrixHtml = '<h4>Original Cost Matrix with Assignments</h4><div class="table-wrapper"><table><thead><tr><th></th>';
        for (let j = 0; j < n; j++) matrixHtml += `<th>T${j + 1}</th>`;
        matrixHtml += '</tr></thead><tbody>';
        for (let i = 0; i < n; i++) { matrixHtml += `<tr><th>W${i + 1}</th>`; for (let j = 0; j < n; j++) { const isAssigned = filteredAssignment.some(a => a.row === i && a.col === j); matrixHtml += `<td class="${isAssigned ? 'cell-assigned' : ''}">${costs[i][j]}</td>`; } matrixHtml += '</tr>'; }
        matrixHtml += '</tbody></table></div>';
        finalContainer.innerHTML = assignHtml + matrixHtml;
        vizSection.scrollIntoView({ behavior: "smooth" });
    });
}