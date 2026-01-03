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

function isBalanced(supply, demand) { return Math.abs(supply.reduce((a, b) => a + b, 0) - demand.reduce((a, b) => a + b, 0)) < 0.0001; }
function balanceProblem(costs, supply, demand) {
    const totalS = supply.reduce((a, b) => a + b, 0), totalD = demand.reduce((a, b) => a + b, 0);
    if (Math.abs(totalS - totalD) < 0.0001) return { costs, supply, demand, wasBalanced: true, balanceInfo: { message: "Balanced" } };
    let newCosts = deepCopy(costs), newSupply = [...supply], newDemand = [...demand], balanceInfo = {};
    if (totalS > totalD) { newDemand.push(totalS - totalD); newCosts.forEach(row => row.push(0)); balanceInfo = { type: "dummy_destination", dummyAmount: totalS - totalD, message: `Added dummy D${newDemand.length}` }; }
    else { newSupply.push(totalD - totalS); newCosts.push(Array(demand.length).fill(0)); balanceInfo = { type: "dummy_source", dummyAmount: totalD - totalS, message: `Added dummy S${newSupply.length}` }; }
    return { costs: newCosts, supply: newSupply, demand: newDemand, wasBalanced: false, balanceInfo };
}
function calculateTotalCostTrans(allocation, costs) {
    return allocation.reduce((total, row, i) => total + row.reduce((sum, val, j) => sum + (val > 0.005 ? val * costs[i][j] : 0), 0), 0);
}
function countAllocations(allocation) {
    return allocation.flat().filter(v => v > 0).length;
}
function getAllocatedCells(allocation) {
    const cells = [];
    allocation.forEach((row, i) => row.forEach((val, j) => { if (val > 0) cells.push({ row: i, col: j, value: val }); }));
    return cells;
}
function argMax(arr) { let maxVal = -Infinity, maxIdx = -1; for (let i = 0; i < arr.length; i++) if (arr[i] !== null && arr[i] > maxVal) { maxVal = arr[i]; maxIdx = i; } return maxIdx; }
function allNull(arr) { return arr.every(x => x === null || x === undefined); }
function northwestCorner(costs, supply, demand) {
    const m = costs.length, n = costs[0].length, allocation = createMatrix(m, n, 0);
    let supplyCopy = [...supply], demandCopy = [...demand], i = 0, j = 0;
    while (i < m && j < n) {
        const allocate = Math.min(supplyCopy[i], demandCopy[j]);
        allocation[i][j] = allocate;
        supplyCopy[i] -= allocate; demandCopy[j] -= allocate;
        if (supplyCopy[i] === 0) i++; else j++;
    }
    return { allocation, totalCost: calculateTotalCostTrans(allocation, costs), method: "Northwest Corner" };
}
function leastCostMethod(costs, supply, demand) {
    const m = costs.length, n = costs[0].length, allocation = createMatrix(m, n, 0);
    let supplyCopy = [...supply], demandCopy = [...demand];
    for (let iter = 0; iter < m * n; iter++) {
        let minCost = Infinity, minI = -1, minJ = -1;
        for (let i = 0; i < m; i++) if (supplyCopy[i] > 0) for (let j = 0; j < n; j++) if (demandCopy[j] > 0 && costs[i][j] < minCost) { minCost = costs[i][j]; minI = i; minJ = j; }
        if (minI === -1) break;
        const allocate = Math.min(supplyCopy[minI], demandCopy[minJ]);
        allocation[minI][minJ] = allocate; supplyCopy[minI] -= allocate; demandCopy[minJ] -= allocate;
    }
    return { allocation, totalCost: calculateTotalCostTrans(allocation, costs), method: "Least Cost Method" };
}
function vogelsMethod(costs, supply, demand) {
    const m = costs.length, n = costs[0].length, allocation = createMatrix(m, n, 0);
    let supplyCopy = [...supply], demandCopy = [...demand];
    for (let iter = 0; iter < m * n; iter++) {
        const rowPenalties = [], colPenalties = [];
        for (let i = 0; i < m; i++) { if (supplyCopy[i] > 0) { const avail = []; for (let j = 0; j < n; j++) if (demandCopy[j] > 0) avail.push(costs[i][j]); avail.sort((a, b) => a - b); rowPenalties[i] = avail.length >= 2 ? avail[1] - avail[0] : (avail.length === 1 ? avail[0] : null); } else rowPenalties[i] = null; }
        for (let j = 0; j < n; j++) { if (demandCopy[j] > 0) { const avail = []; for (let i = 0; i < m; i++) if (supplyCopy[i] > 0) avail.push(costs[i][j]); avail.sort((a, b) => a - b); colPenalties[j] = avail.length >= 2 ? avail[1] - avail[0] : (avail.length === 1 ? avail[0] : null); } else colPenalties[j] = null; }
        if (allNull(rowPenalties) && allNull(colPenalties)) break;
        const maxRowP = Math.max(...rowPenalties.filter(p => p !== null)), maxColP = Math.max(...colPenalties.filter(p => p !== null));
        let selectedRow = -1, selectedCol = -1;
        if (maxRowP >= maxColP && maxRowP !== -Infinity) { selectedRow = argMax(rowPenalties); let minCost = Infinity; for (let j = 0; j < n; j++) if (demandCopy[j] > 0 && costs[selectedRow][j] < minCost) { minCost = costs[selectedRow][j]; selectedCol = j; } }
        else { selectedCol = argMax(colPenalties); let minCost = Infinity; for (let i = 0; i < m; i++) if (supplyCopy[i] > 0 && costs[i][selectedCol] < minCost) { minCost = costs[i][selectedCol]; selectedRow = i; } }
        if (selectedRow === -1 || selectedCol === -1) break;
        const allocate = Math.min(supplyCopy[selectedRow], demandCopy[selectedCol]);
        allocation[selectedRow][selectedCol] = allocate; supplyCopy[selectedRow] -= allocate; demandCopy[selectedCol] -= allocate;
    }
    return { allocation, totalCost: calculateTotalCostTrans(allocation, costs), method: "VAM" };
}
function resolveDegeneracy(allocation, costs) {
    const m = allocation.length, n = allocation[0].length, required = m + n - 1;
    let current = countAllocations(allocation), newAlloc = deepCopy(allocation);
    while (current < required) {
        for (let i = 0; i < m && current < required; i++) for (let j = 0; j < n && current < required; j++) if (newAlloc[i][j] === 0) { newAlloc[i][j] = 0.0001; current++; break; }
    }
    return newAlloc;
}
function calculateUV(allocation, costs) {
    const m = allocation.length, n = allocation[0].length, u = Array(m).fill(null), v = Array(n).fill(null);
    u[0] = 0;
    const allocatedCells = getAllocatedCells(allocation);
    for (let iter = 0; iter < (m + n) * 2; iter++) {
        let updated = false;
        for (const cell of allocatedCells) {
            const i = cell.row, j = cell.col;
            if (u[i] !== null && v[j] === null) { v[j] = costs[i][j] - u[i]; updated = true; }
            else if (u[i] === null && v[j] !== null) { u[i] = costs[i][j] - v[j]; updated = true; }
        }
        if (u.every(val => val !== null) && v.every(val => val !== null)) break;
        if (!updated) { for (let i = 0; i < m; i++) if (u[i] === null) u[i] = 0; for (let j = 0; j < n; j++) if (v[j] === null) v[j] = 0; break; }
    }
    return { u, v };
}
function findImprovingCell(allocation, costs, u, v) {
    const m = allocation.length, n = allocation[0].length;
    let minOpp = -0.0001, enterRow = -1, enterCol = -1, oppCosts = createMatrix(m, n, null);
    for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) if (allocation[i][j] === 0 || allocation[i][j] < 0.001) { const opp = costs[i][j] - u[i] - v[j]; oppCosts[i][j] = opp; if (opp < minOpp) { minOpp = opp; enterRow = i; enterCol = j; } }
    return { enterRow, enterCol, minOpp, oppCosts, isOptimal: enterRow === -1 };
}
function findClosedLoop(allocation, enterRow, enterCol) {
    const m = allocation.length, n = allocation[0].length;
    const basicCells = [];
    for (let i = 0; i < m; i++) {
        for (let j = 0; j < n; j++) {
            if (allocation[i][j] > 0.0001 || (i === enterRow && j === enterCol)) {
                basicCells.push([i, j]);
            }
        }
    }
    function findLoopDFS(path, currentRow, currentCol, isHorizontal) {
        if (path.length >= 4 && currentRow === enterRow && currentCol === enterCol) {
            return path;
        }
        if (path.length > 2 * (m + n)) return null;
        if (isHorizontal) {
            for (let j = 0; j < n; j++) {
                if (j === currentCol) continue;
                const hasAlloc = allocation[currentRow][j] > 0.0001;
                const isEntering = currentRow === enterRow && j === enterCol;
                if (hasAlloc || isEntering) {
                    const alreadyInPath = path.some(([r, c]) => r === currentRow && c === j);
                    if (!alreadyInPath || (currentRow === enterRow && j === enterCol && path.length >= 3)) {
                        if (currentRow === enterRow && j === enterCol && path.length >= 3) {
                            return [...path, [currentRow, j]];
                        }
                        const result = findLoopDFS([...path, [currentRow, j]], currentRow, j, false);
                        if (result) return result;
                    }
                }
            }
        } else {
            for (let i = 0; i < m; i++) {
                if (i === currentRow) continue;
                const hasAlloc = allocation[i][currentCol] > 0.0001;
                const isEntering = i === enterRow && currentCol === enterCol;
                if (hasAlloc || isEntering) {
                    const alreadyInPath = path.some(([r, c]) => r === i && c === currentCol);
                    if (!alreadyInPath || (i === enterRow && currentCol === enterCol && path.length >= 3)) {
                        if (i === enterRow && currentCol === enterCol && path.length >= 3) {
                            return [...path, [i, currentCol]];
                        }
                        const result = findLoopDFS([...path, [i, currentCol]], i, currentCol, true);
                        if (result) return result;
                    }
                }
            }
        }
        return null;
    }
    let loop = findLoopDFS([[enterRow, enterCol]], enterRow, enterCol, true);
    if (!loop) loop = findLoopDFS([[enterRow, enterCol]], enterRow, enterCol, false);
    if (loop && loop.length >= 4) {
        if (loop.length > 1 && loop[0][0] === loop[loop.length - 1][0] && loop[0][1] === loop[loop.length - 1][1]) {
            loop.pop();
        }
        return loop;
    }
    return [[enterRow, enterCol]];
}
function improveAllocation(allocation, loop) {
    if (loop.length < 4) return { allocation, successful: false };
    const newAlloc = deepCopy(allocation);
    let theta = Infinity;
    for (let i = 1; i < loop.length; i += 2) { const [r, c] = loop[i]; if (newAlloc[r][c] < theta) theta = newAlloc[r][c]; }
    if (theta === Infinity || theta === 0) return { allocation: newAlloc, successful: false };
    for (let i = 0; i < loop.length; i++) { const [r, c] = loop[i]; if (i % 2 === 0) newAlloc[r][c] += theta; else newAlloc[r][c] -= theta; }
    for (let i = 0; i < newAlloc.length; i++) for (let j = 0; j < newAlloc[0].length; j++) if (Math.abs(newAlloc[i][j]) < 0.0001) newAlloc[i][j] = 0;
    return { allocation: newAlloc, theta, successful: true };
}
function modiMethodWithSteps(initialAlloc, costs, supply, demand) {
    const steps = [];
    let allocation = deepCopy(initialAlloc);
    const m = costs.length, n = costs[0].length;
    const required = m + n - 1;
    let currentCount = countAllocations(allocation);
    let degeneracyInfo = null;
    if (currentCount < required) {
        degeneracyInfo = {
            required: required,
            actual: currentCount,
            deficit: required - currentCount,
            addedCells: []
        };
        let newAlloc = deepCopy(allocation);
        while (currentCount < required) {
            for (let i = 0; i < m && currentCount < required; i++) {
                for (let j = 0; j < n && currentCount < required; j++) {
                    if (newAlloc[i][j] === 0) {
                        newAlloc[i][j] = 0.001;
                        degeneracyInfo.addedCells.push({ row: i, col: j });
                        currentCount++;
                        break;
                    }
                }
            }
        }
        allocation = newAlloc;
    }
    steps.push({
        type: 'initial',
        title: 'Step 0: Initial Solution & Degeneracy Check',
        allocation: deepCopy(allocation),
        initialCost: calculateTotalCostTrans(allocation, costs),
        degeneracy: degeneracyInfo,
        description: degeneracyInfo
            ? `Degeneracy detected! Need ${required} allocations (m+n-1), but only have ${degeneracyInfo.actual}. Added ε to ${degeneracyInfo.deficit} cell(s).`
            : `No degeneracy. Allocations: ${currentCount} = m+n-1 = ${required}. ✓`
    });
    for (let iter = 0; iter < 50; iter++) {
        const { u, v } = calculateUV(allocation, costs);
        const penalties = createMatrix(m, n, null);
        let maxPenalty = -Infinity, maxRow = -1, maxCol = -1;
        for (let i = 0; i < m; i++) {
            for (let j = 0; j < n; j++) {
                if (allocation[i][j] < 0.001) {
                    const pij = u[i] + v[j] - costs[i][j];
                    penalties[i][j] = pij;
                    if (pij > maxPenalty) { maxPenalty = pij; maxRow = i; maxCol = j; }
                }
            }
        }
        const isOptimal = maxPenalty <= 0.0001;
        if (isOptimal) {
            steps.push({
                type: 'optimal',
                iteration: iter + 1,
                title: `Iteration ${iter + 1}: Optimality Check`,
                allocation: deepCopy(allocation),
                u: [...u],
                v: [...v],
                penalties: deepCopy(penalties),
                description: 'All penalties ≤ 0. Optimal solution found! ✓',
                totalCost: calculateTotalCostTrans(allocation, costs)
            });
            break;
        }
        const loop = findClosedLoop(allocation, maxRow, maxCol);
        if (loop.length < 4) {
            steps.push({
                type: 'error',
                title: `Iteration ${iter + 1}: Loop Error`,
                description: `Could not find valid closed loop from cell (${maxRow + 1}, ${maxCol + 1}).`
            });
            break;
        }
        let theta = Infinity;
        const minusCells = [];
        for (let i = 1; i < loop.length; i += 2) {
            const [r, c] = loop[i];
            if (allocation[r][c] < theta) theta = allocation[r][c];
            minusCells.push({ row: r, col: c, value: allocation[r][c] });
        }
        steps.push({
            type: 'iteration',
            iteration: iter + 1,
            title: `Iteration ${iter + 1}: UV Method & Improvement`,
            allocation: deepCopy(allocation),
            u: [...u],
            v: [...v],
            penalties: deepCopy(penalties),
            enteringCell: { row: maxRow, col: maxCol, penalty: maxPenalty },
            loop: loop.map(([r, c], i) => ({ row: r, col: c, sign: i % 2 === 0 ? '+' : '-' })),
            theta: theta,
            description: `Max penalty = ${formatNumber(maxPenalty)} at (S${maxRow + 1}, D${maxCol + 1}). Q = ${formatNumber(theta)}. Loop: ${loop.map(([r, c]) => `(${r + 1},${c + 1})`).join(' → ')}`
        });
        const result = improveAllocation(allocation, loop);
        if (!result.successful) break;
        allocation = result.allocation;
    }
    return {
        steps: steps,
        finalAllocation: allocation,
        totalCost: calculateTotalCostTrans(allocation, costs),
        epsilonCells: degeneracyInfo ? degeneracyInfo.addedCells : []
    };
}
function initTransportation() {
    const sourcesInput = document.getElementById("trans-sources"), destsInput = document.getElementById("trans-destinations"), matrixContainer = document.getElementById("trans-matrix"), allocContainer = document.getElementById("trans-alloc-matrix"), allocSection = document.getElementById("trans-alloc-section"), optimizeBtn = document.getElementById("trans-optimize-btn"), vizSection = document.getElementById("trans-viz"), setupContainer = document.getElementById("trans-setup"), initialContainer = document.getElementById("trans-initial"), modiContainer = document.getElementById("trans-modi"), finalContainer = document.getElementById("trans-final");
    if (!sourcesInput) return;
    let currentProblem = {};
    function buildMatrix() {
        const m = parseInt(sourcesInput.value) || 3, n = parseInt(destsInput.value) || 4;
        let html = '<div class="matrix-container"><div class="matrix-grid"><div class="matrix-row"><div class="matrix-label"></div>';
        for (let j = 0; j < n; j++) html += `<div class="matrix-header">D${j + 1}</div>`;
        html += '<div class="matrix-header">Supply</div></div>';
        for (let i = 0; i < m; i++) { html += `<div class="matrix-row"><div class="matrix-label">S${i + 1}</div>`; for (let j = 0; j < n; j++) html += `<div class="matrix-cell"><input type="number" data-type="cost" data-row="${i}" data-col="${j}" value="0" min="0" /></div>`; html += `<div class="matrix-cell"><input type="number" data-type="supply" data-row="${i}" value="0" min="0" /></div></div>`; }
        html += '<div class="matrix-row"><div class="matrix-label">Demand</div>'; for (let j = 0; j < n; j++) html += `<div class="matrix-cell"><input type="number" data-type="demand" data-col="${j}" value="0" min="0" /></div>`; html += '<div class="matrix-cell"></div></div></div></div>';
        matrixContainer.innerHTML = html;
        buildAllocMatrix();
    }
    function buildAllocMatrix() {
        if (!allocContainer) return;
        const m = parseInt(sourcesInput.value) || 3, n = parseInt(destsInput.value) || 4;
        let html = '<div class="matrix-container"><div class="matrix-grid"><div class="matrix-row"><div class="matrix-label"></div>';
        for (let j = 0; j < n; j++) html += `<div class="matrix-header">D${j + 1}</div>`;
        html += '</div>';
        for (let i = 0; i < m; i++) { html += `<div class="matrix-row"><div class="matrix-label">S${i + 1}</div>`; for (let j = 0; j < n; j++) html += `<div class="matrix-cell"><input type="number" data-type="alloc" data-row="${i}" data-col="${j}" value="0" min="0" style="background:rgba(0,255,100,0.1)" /></div>`; html += '</div>'; }
        html += '</div></div>';
        allocContainer.innerHTML = html;
    }
    sourcesInput.addEventListener("change", buildMatrix);
    destsInput.addEventListener("change", buildMatrix);
    buildMatrix();
    let allocMode = 'method';
    const allocMethodBtn = document.getElementById("trans-alloc-use-method");
    const allocManualBtn = document.getElementById("trans-alloc-manual");
    const allocMethodSelect = document.getElementById("trans-alloc-method-select");
    const allocManualSection = document.getElementById("trans-alloc-manual-section");
    allocMethodBtn?.addEventListener("click", () => {
        allocMode = 'method';
        allocMethodBtn.classList.replace('secondary', 'primary');
        allocManualBtn.classList.replace('primary', 'secondary');
        allocMethodSelect?.classList.remove('hidden');
        allocManualSection?.classList.add('hidden');
    });
    allocManualBtn?.addEventListener("click", () => {
        allocMode = 'manual';
        allocManualBtn.classList.replace('secondary', 'primary');
        allocMethodBtn.classList.replace('primary', 'secondary');
        allocMethodSelect?.classList.add('hidden');
        allocManualSection?.classList.remove('hidden');
        buildAllocMatrix();
    });
    document.getElementById("trans-generate-btn")?.addEventListener("click", () => {
        const m = parseInt(sourcesInput.value) || 3, n = parseInt(destsInput.value) || 4;
        matrixContainer.querySelectorAll('[data-type="cost"]').forEach(inp => inp.value = Math.floor(Math.random() * 20) + 1);
        let totalSupply = 0;
        matrixContainer.querySelectorAll('[data-type="supply"]').forEach(inp => { inp.value = Math.floor(Math.random() * 40) + 10; totalSupply += parseInt(inp.value); });
        const demands = matrixContainer.querySelectorAll('[data-type="demand"]');
        let remaining = totalSupply;
        demands.forEach((inp, j) => { if (j < demands.length - 1) { const val = Math.max(1, Math.floor(Math.random() * Math.min(remaining - (demands.length - j - 1), 50))); inp.value = val; remaining -= val; } else inp.value = remaining; });
    });
    document.getElementById("trans-clear-btn")?.addEventListener("click", () => { matrixContainer.querySelectorAll('input').forEach(inp => inp.value = 0); allocContainer?.querySelectorAll('input')?.forEach(inp => inp.value = 0); vizSection.classList.add("hidden"); });


    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll('[id$="-viz"]').forEach(el => el.classList.add("hidden"));
        });
    });

    function displayAllocationTable(allocation, costs, supply, demand, title, highlights = {}, u = null, v = null) {
        const m = allocation.length, n = allocation[0].length;
        let html = `<h4>${title}</h4><div class="table-wrapper"><table>`;
        html += '<thead>';
        if (v) {
            html += '<tr><th></th><th></th>';
            for (let j = 0; j < n; j++) html += `<th style="color:var(--accent-color);font-weight:bold">v<sub>${j + 1}</sub>=${formatNumber(v[j])}</th>`;
            html += '<th></th></tr>';
        }
        html += '<tr><th></th><th></th>';
        for (let j = 0; j < n; j++) html += `<th class="demand-header">D${j + 1}</th>`;
        html += '<th class="supply-header">Supply</th></tr></thead><tbody>';
        for (let i = 0; i < m; i++) {
            html += '<tr>';
            if (u) {
                html += `<th style="color:var(--accent-color);font-weight:bold">u<sub>${i + 1}</sub>=${formatNumber(u[i])}</th>`;
            } else {
                html += '<th></th>';
            }
            html += `<th class="supply-header">S${i + 1}</th>`;
            for (let j = 0; j < n; j++) {
                const val = allocation[i][j];
                let cls = val > 0.001 ? "allocated-cell" : "";
                let isEpsilon = false;
                if (highlights.epsilonCells && highlights.epsilonCells.some(c => c.row === i && c.col === j)) {
                    cls += " epsilon-cell";
                    isEpsilon = true;
                }
                if (highlights.entering && highlights.entering.row === i && highlights.entering.col === j) cls += " entering-cell";
                if (highlights.loop) {
                    const loopCell = highlights.loop.find(c => c.row === i && c.col === j);
                    if (loopCell) {
                        cls += loopCell.sign === '+' ? " loop-plus-cell" : " loop-minus-cell";
                    }
                }
                let displayVal = "-";
                if (val > 0.001) {
                    displayVal = formatNumber(val);
                } else if (isEpsilon && val > 0) {
                    displayVal = "ε";
                }
                html += `<td class="${cls}"><div class="cell-allocation">${displayVal}</div><div class="cell-cost">c=${costs[i][j]}</div></td>`;
            }
            html += `<td>${supply[i]}</td></tr>`;
        }
        html += '<tr><th></th><th class="demand-header">Demand</th>';
        for (let j = 0; j < n; j++) html += `<td class="demand-header">${demand[j]}</td>`;
        html += '<td></td></tr></tbody></table></div>';
        return html;
    }
    function displayUVTable(u, v) {
        let html = '<div class="uv-summary" style="display:flex;gap:1rem;flex-wrap:wrap;margin:0.5rem 0;font-size:0.9rem">';
        html += `<span><strong>U:</strong> [${u.map((val, i) => `u<sub>${i + 1}</sub>=${formatNumber(val)}`).join(', ')}]</span>`;
        html += `<span><strong>V:</strong> [${v.map((val, j) => `v<sub>${j + 1}</sub>=${formatNumber(val)}`).join(', ')}]</span>`;
        html += '</div>';
        return html;
    }
    function displayPenaltyMatrix(penalties, costs, enteringCell) {
        const m = penalties.length, n = penalties[0].length;
        let html = '<h5>Penalty Matrix (P<sub>ij</sub> = U<sub>i</sub> + V<sub>j</sub> - C<sub>ij</sub>)</h5><div class="table-wrapper"><table><thead><tr><th></th>';
        for (let j = 0; j < n; j++) html += `<th>D${j + 1}</th>`;
        html += '</tr></thead><tbody>';
        for (let i = 0; i < m; i++) {
            html += `<tr><th>S${i + 1}</th>`;
            for (let j = 0; j < n; j++) {
                const p = penalties[i][j];
                let cls = '';
                if (p !== null && p > 0) cls = 'positive-penalty';
                if (enteringCell && enteringCell.row === i && enteringCell.col === j) cls = 'max-penalty';
                html += `<td class="${cls}">${p !== null ? formatNumber(p) : '-'}</td>`;
            }
            html += '</tr>';
        }
        html += '</tbody></table></div>';
        return html;
    }
    optimizeBtn?.addEventListener("click", () => {
        const m = parseInt(sourcesInput.value) || 3, n = parseInt(destsInput.value) || 4;
        const costs = [], supply = Array(m).fill(0), demand = Array(n).fill(0);
        for (let i = 0; i < m; i++) costs[i] = Array(n).fill(0);
        matrixContainer.querySelectorAll('[data-type="cost"]').forEach(inp => costs[parseInt(inp.dataset.row)][parseInt(inp.dataset.col)] = parseFloat(inp.value) || 0);
        matrixContainer.querySelectorAll('[data-type="supply"]').forEach(inp => supply[parseInt(inp.dataset.row)] = parseFloat(inp.value) || 0);
        matrixContainer.querySelectorAll('[data-type="demand"]').forEach(inp => demand[parseInt(inp.dataset.col)] = parseFloat(inp.value) || 0);
        const totalS = supply.reduce((a, b) => a + b, 0), totalD = demand.reduce((a, b) => a + b, 0);
        if (totalS === 0 || totalD === 0) { alert("Enter supply and demand values."); return; }
        const balanced = balanceProblem(costs, supply, demand);
        currentProblem = { costs: balanced.costs, supply: balanced.supply, demand: balanced.demand };
        let allocation = [], initialMethod = '';
        if (allocMode === 'method') {
            const optMethod = document.getElementById("trans-opt-method")?.value || 'vam';
            let initialResult;
            if (optMethod === "nw") initialResult = northwestCorner(currentProblem.costs, currentProblem.supply, currentProblem.demand);
            else if (optMethod === "lcm") initialResult = leastCostMethod(currentProblem.costs, currentProblem.supply, currentProblem.demand);
            else initialResult = vogelsMethod(currentProblem.costs, currentProblem.supply, currentProblem.demand);
            allocation = initialResult.allocation;
            initialMethod = initialResult.method;
        } else {
            allocation = [];
            for (let i = 0; i < m; i++) allocation[i] = Array(n).fill(0);
            allocContainer?.querySelectorAll('[data-type="alloc"]')?.forEach(inp => allocation[parseInt(inp.dataset.row)][parseInt(inp.dataset.col)] = parseFloat(inp.value) || 0);
            if (countAllocations(allocation) === 0) { alert("Enter allocation values in the allocation matrix."); return; }
            initialMethod = 'Manual Entry';
        }
        const modiResult = modiMethodWithSteps(allocation, currentProblem.costs, currentProblem.supply, currentProblem.demand);
        vizSection.classList.remove("hidden");
        setupContainer.innerHTML = `<h3>Problem Analysis</h3><p><strong>Dimensions:</strong> ${m}×${n}</p><p><strong>Supply:</strong> ${totalS} | <strong>Demand:</strong> ${totalD}</p><p>${balanced.wasBalanced ? '✓ Balanced' : '⚠ ' + balanced.balanceInfo.message}</p><p><strong>Initial Method:</strong> ${initialMethod}</p>`;
        if (!balanced.wasBalanced) {
            const bm = balanced.costs.length;
            const bn = balanced.costs[0].length;
            const zeroAlloc = Array(bm).fill(null).map(() => Array(bn).fill(0));
            setupContainer.innerHTML += displayAllocationTable(zeroAlloc, balanced.costs, balanced.supply, balanced.demand, "Balanced Cost Matrix (with Dummy)");
        }
        initialContainer.innerHTML = '';
        let modiHtml = '<h3>MODI Optimization Steps</h3>';
        modiHtml += `<div style="background:var(--bg-tertiary);padding:1rem;border-radius:8px;margin-bottom:1.5rem;border-left:4px solid var(--accent-color)">`;
        modiHtml += `<strong>MODI Method Formulas:</strong>`;
        modiHtml += `<div style="background:rgba(0,0,0,0.3);padding:0.5rem 1rem;border-radius:4px;font-family:monospace;margin-top:0.5rem">`;
        modiHtml += `u<sub>i</sub> + v<sub>j</sub> = c<sub>ij</sub> &nbsp;&nbsp;(for basic cells)`;
        modiHtml += `</div>`;
        modiHtml += `<div style="background:rgba(0,0,0,0.3);padding:0.5rem 1rem;border-radius:4px;font-family:monospace;margin-top:0.5rem">`;
        modiHtml += `Δ<sub>ij</sub> = u<sub>i</sub> + v<sub>j</sub> - c<sub>ij</sub> &nbsp;&nbsp;(opportunity cost for non-basic cells)`;
        modiHtml += `</div>`;
        modiHtml += `<p style="color:var(--text-dim);margin-top:0.5rem;font-size:0.9rem"><strong>Optimality:</strong> All Δ<sub>ij</sub> ≤ 0 for minimization</p>`;
        modiHtml += `</div>`;
        const epsilonCells = modiResult.epsilonCells || [];
        modiResult.steps.forEach((step, idx) => {
            modiHtml += `<div class="modi-step info-box" style="margin-bottom:1.5rem;border-left:4px solid ${step.type === 'optimal' ? 'var(--success-color)' : 'var(--accent-color)'}">`;
            modiHtml += `<h4>${step.title}</h4>`;
            modiHtml += `<p>${step.description}</p>`;
            if (step.type === 'initial' && step.degeneracy && step.degeneracy.addedCells.length > 0) {
                modiHtml += '<p style="color:var(--danger-color);font-weight:bold">ε added at: ';
                modiHtml += step.degeneracy.addedCells.map(c => `(S${c.row + 1}, D${c.col + 1})`).join(', ');
                modiHtml += '</p>';
            }
            if (step.type === 'initial') {
                if (step.initialCost !== undefined) {
                    modiHtml += `<div style="background:rgba(245,158,11,0.15);padding:1rem;border-radius:8px;margin:1rem 0;border-left:4px solid var(--warning-color)">`;
                    modiHtml += `<strong>Initial Solution Cost:</strong> <span style="font-size:1.3rem;font-weight:bold;color:var(--warning-color)">${formatNumber(step.initialCost)}</span>`;
                    modiHtml += `</div>`;
                }
                if (step.allocation) {
                    modiHtml += displayAllocationTable(step.allocation, currentProblem.costs, currentProblem.supply, currentProblem.demand, 'Current Allocation', { epsilonCells: epsilonCells }, step.u || null, step.v || null);
                }
            } else {
                if (step.penalties) {
                    modiHtml += displayPenaltyMatrix(step.penalties, currentProblem.costs, step.enteringCell);
                }
                if (step.allocation) {
                    modiHtml += displayAllocationTable(step.allocation, currentProblem.costs, currentProblem.supply, currentProblem.demand, 'Current Allocation', { entering: step.enteringCell, loop: step.loop }, step.u || null, step.v || null);
                }
            }
            if (step.loop && step.theta !== undefined) {
                modiHtml += `<div class="loop-info" style="background:rgba(239,68,68,0.1);padding:1rem;border-radius:8px;margin-top:1rem;border:2px solid var(--danger-color)">`;
                modiHtml += `<h5 style="color:var(--danger-color);margin-bottom:0.5rem">θ Update Operation</h5>`;
                modiHtml += `<strong>Loop Path:</strong> ${step.loop.map(c => {
                    const sign = c.sign;
                    const color = sign === '+' ? 'var(--accent-color)' : 'var(--danger-color)';
                    return `<span style="color:${color};font-weight:bold">(S${c.row + 1},D${c.col + 1})${sign}</span>`;
                }).join(' → ')}<br>`;
                modiHtml += `<strong>θ (Q) =</strong> <span style="color:var(--danger-color);font-size:1.2rem;font-weight:bold">${formatNumber(step.theta)}</span> (minimum value from − cells)<br>`;
                modiHtml += `<strong>Update:</strong> `;
                step.loop.forEach((c, i) => {
                    const sign = c.sign;
                    const op = sign === '+' ? '+' : '−';
                    const color = sign === '+' ? 'var(--accent-color)' : 'var(--danger-color)';
                    modiHtml += `<span style="background:${sign === '+' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'};padding:0.2rem 0.5rem;border-radius:4px;margin:0.2rem">(S${c.row + 1},D${c.col + 1}) ${op} θ</span>`;
                });
                modiHtml += '</div>';
            }
            modiHtml += '</div>';
        });
        modiContainer.innerHTML = modiHtml;
        finalContainer.innerHTML = `<div class="info-box success"><h3>✓ Optimal Solution</h3><p>Total Cost: <strong style="font-size:1.5rem;color:var(--accent-color)">${formatNumber(modiResult.totalCost)}</strong></p></div>` + displayAllocationTable(modiResult.finalAllocation, currentProblem.costs, currentProblem.supply, currentProblem.demand, "Optimal Allocation");
        vizSection.scrollIntoView({ behavior: "smooth" });
    });
}