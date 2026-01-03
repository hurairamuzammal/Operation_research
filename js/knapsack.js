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
class KnapsackSolver {
    constructor(weights, values, capacity, priorities = null, qtyLimits = null, type = 'bounded') {
        this.weights = weights;
        this.values = values.map((v, i) => v + (priorities ? priorities[i] : 0));
        this.priorities = priorities || Array(weights.length).fill(0);
        this.type = type;
        this.qtyLimits = qtyLimits || Array(weights.length).fill(type === 'unbounded' ? Infinity : 1);
        this.capacity = capacity;
        this.n = weights.length;

        if (this.type === '01') {
            this.qtyLimits.fill(1);
        } else if (this.type === 'unbounded') {
            this.qtyLimits = this.weights.map(w => Math.floor(capacity / w));
        } else if (this.type === 'bounded') {
            for (let i = 0; i < this.n; i++) {
                // Fix: explicit 0 means 0. Check against null/undefined in parsing, but here ensure negative becomes 0.
                if (this.qtyLimits[i] < 0) this.qtyLimits[i] = 0;
                // Note: user input parsing happens before this class. We assume qtyLimits has valid integers.
            }
        }

        this.dp = [];
        this.steps = [];
        this.maxValue = 0;
        this.selectedItems = {};
        this.totalWeight = 0;
    }
    solve() {
        if (this.type === 'unbounded') return this.solveUnbounded();

        const n = this.n, W = this.capacity;
        for (let i = 0; i <= n; i++) this.dp[i] = new Array(W + 1).fill(0);
        this.steps.push({ type: "init", title: "Initialize DP Table", description: `Create ${n + 1}×${W + 1} table. Type: ${this.type}.<div style="background:var(--bg-tertiary);padding:0.75rem;border-radius:6px;margin-top:0.5rem;border-left:3px solid var(--accent-color)"><strong>DP Recurrence Formula:</strong><div style="background:rgba(0,0,0,0.3);padding:0.5rem;border-radius:4px;font-family:monospace;margin-top:0.5rem">f(i, w) = max{ f(i-1, w), max<sub>k=1..q</sub>{ k·v<sub>i</sub> + f(i-1, w-k·w<sub>i</sub>) } }</div><p style="color:var(--text-dim);font-size:0.85rem;margin-top:0.5rem">Where q<sub>i</sub> is the max quantity for item i, and w ≤ Capacity</p></div>`, dpSnapshot: this.cloneDP(), currentCell: null, comparingCells: [] });
        for (let i = 1; i <= n; i++) {
            const wi = this.weights[i - 1], vi = this.values[i - 1], maxQty = this.qtyLimits[i - 1];
            for (let w = 0; w <= W; w++) {
                this.dp[i][w] = this.dp[i - 1][w];
                for (let k = 1; k <= maxQty && k * wi <= w; k++) {
                    const takeValue = k * vi + this.dp[i - 1][w - k * wi];
                    if (takeValue > this.dp[i][w]) this.dp[i][w] = takeValue;
                }
            }
            this.steps.push({ type: "fill", title: `Item ${i} (max qty=${maxQty})`, description: `<div style="margin-bottom:0.5rem">w<sub>${i}</sub>=${wi}, v<sub>${i}</sub>=${vi}, q<sub>${i}</sub>=${maxQty}</div><div style="background:rgba(0,0,0,0.2);padding:0.5rem;border-radius:4px;font-family:monospace">f(${i}, w) = max{ f(${i - 1}, w), max<sub>k=1..${maxQty}</sub>{ k·${vi} + f(${i - 1}, w-k·${wi}) } }</div>`, dpSnapshot: this.cloneDP(), currentCell: { row: i, col: W }, comparingCells: [] });
        }
        this.maxValue = this.dp[n][W];
        this.steps.push({ type: "optimal", title: "Optimal Found", description: `<strong style="color:var(--accent-color)">Max value f(${n}, ${W}) = ${this.maxValue}</strong>`, dpSnapshot: this.cloneDP(), currentCell: { row: n, col: W }, comparingCells: [] });
        this.backtrack();
        return { maxValue: this.maxValue, selectedItems: this.selectedItems, totalWeight: this.totalWeight, steps: this.steps };
    }
    backtrack() {
        let w = this.capacity;
        this.selectedItems = {};
        for (let i = this.n; i >= 1 && w > 0; i--) {
            const wi = this.weights[i - 1], vi = this.values[i - 1], maxQty = this.qtyLimits[i - 1];
            let taken = 0;
            for (let k = maxQty; k >= 1; k--) {
                if (k * wi <= w && this.dp[i][w] === k * vi + this.dp[i - 1][w - k * wi]) {
                    taken = k;
                    break;
                }
            }
            if (taken > 0) {
                this.selectedItems[i] = taken;
                this.totalWeight += taken * wi;
                w -= taken * wi;
            }
        }
        this.finalizeSolution();
    }

    solveUnbounded() {
        const n = this.n, W = this.capacity;


        for (let i = 0; i <= n; i++) this.dp[i] = new Array(W + 1).fill(0);

        this.steps.push({ type: "init", title: "Initialize Unbounded DP", description: `Unbounded Knapsack (Infinite Quantity). Formula: f(i, w) = max( f(i-1, w), f(i, w-w<sub>i</sub>) + v<sub>i</sub> )`, dpSnapshot: this.cloneDP() });

        for (let i = 1; i <= n; i++) {
            const wi = this.weights[i - 1], vi = this.values[i - 1];
            for (let w = 0; w <= W; w++) {
                let notTake = this.dp[i - 1][w];
                let take = (w >= wi) ? (this.dp[i][w - wi] + vi) : 0;

                this.dp[i][w] = Math.max(notTake, take);
            }
            this.steps.push({ type: "fill", title: `Item ${i}`, description: `Processed Item ${i} (Unbounded). Checked against itself for multiple inclusions.`, dpSnapshot: this.cloneDP() });
        }

        this.maxValue = this.dp[n][W];
        this.startUnboundedBacktrack();
        return { maxValue: this.maxValue, selectedItems: this.selectedItems, totalWeight: this.totalWeight, steps: this.steps };
    }

    startUnboundedBacktrack() {
        let i = this.n, w = this.capacity;
        this.selectedItems = {};
        this.totalWeight = 0;

        while (i > 0 && w > 0) {
            const wi = this.weights[i - 1], vi = this.values[i - 1];
            let valViaTake = (w >= wi) ? (this.dp[i][w - wi] + vi) : -1;

            if (valViaTake === this.dp[i][w]) {
                this.selectedItems[i] = (this.selectedItems[i] || 0) + 1;
                this.totalWeight += wi;
                w -= wi;
            } else {
                i--;
            }
        }
        this.finalizeSolution();
    }


    finalizeSolution() {
        const itemCounts = Object.entries(this.selectedItems).map(([item, count]) => {
            return count > 1 ? `Item ${item} (x${count})` : `Item ${item}`;
        }).join(", ");



        const snapshot = this.dp.length ? this.cloneDP() : [];

        this.steps.push({
            type: "solution",
            title: "Solution Found!",
            description: `Selected: ${itemCounts}. Weight: ${this.totalWeight.toFixed(2)}. Value: ${this.maxValue.toFixed(2)}.`,
            dpSnapshot: snapshot,
            solution: { itemCounts: this.selectedItems, totalWeight: this.totalWeight, maxValue: this.maxValue }
        });
    }
    cloneDP() { return this.dp.map(row => [...row]); }
    static generateRandom(numItems = 4, maxWeight = 10, maxValue = 10, maxCapacity = 15) {
        const weights = Array.from({ length: numItems }, () => Math.floor(Math.random() * maxWeight) + 1);
        const values = Array.from({ length: numItems }, () => Math.floor(Math.random() * maxValue) + 1);
        const priorities = Array.from({ length: numItems }, () => Math.floor(Math.random() * 3));
        const qtyLimits = Array.from({ length: numItems }, () => Math.floor(Math.random() * 2) + 1);
        return { weights, values, priorities, qtyLimits, capacity: Math.floor(Math.random() * (maxCapacity - 5)) + 5 };
    }
}
function initKnapsack() {
    const els = {
        capacity: document.getElementById("knapsack-capacity"),
        itemsTable: document.getElementById("knapsack-items"),
        addBtn: document.getElementById("knapsack-add-btn"),
        removeBtn: document.getElementById("knapsack-remove-btn"),
        generateBtn: document.getElementById("knapsack-generate-btn"),
        clearBtn: document.getElementById("knapsack-clear-btn"),
        solveBtn: document.getElementById("knapsack-solve-btn"),
        vizSection: document.getElementById("knapsack-viz"),
        summary: document.getElementById("knapsack-summary"),
        stepTitle: document.getElementById("knapsack-step-title"),
        stepDesc: document.getElementById("knapsack-step-desc"),
        dpTable: document.getElementById("knapsack-dp-table"),
        solution: document.getElementById("knapsack-solution"),
        prevBtn: document.getElementById("knapsack-prev"),
        nextBtn: document.getElementById("knapsack-next"),
        stepIndicator: document.getElementById("knapsack-step-indicator"),
        autoBtn: document.getElementById("knapsack-auto"),
        skipBtn: document.getElementById("knapsack-skip"),

        modeSelect: document.getElementById("knapsack-mode")
    };
    if (!els.capacity) return;
    let solver = null, currentStep = 0, autoInterval = null, itemCount = 4;
    let currentMode = 'bounded';

    function updateModeUI() {
        currentMode = els.modeSelect.value;
        const isBounded = currentMode === 'bounded';

        const qtyCols = document.querySelectorAll('.k-qty-col');
        qtyCols.forEach(el => {
            if (isBounded) el.classList.remove('hidden');
            else el.classList.add('hidden');
        });
    }

    // Bind tab buttons to update the hidden select and trigger updateModeUI
    document.querySelectorAll('.mode-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const mode = e.target.dataset.mode;
            if (els.modeSelect) {
                els.modeSelect.value = mode;
                // Manually trigger the update as programmatic change doesn't fire event
                updateModeUI();
            }
        });
    });

    els.modeSelect?.addEventListener('change', updateModeUI);
    updateModeUI();

    function bindDragEvents(row) {
        let draggedRow = null;
        row.addEventListener('dragstart', function (e) {
            draggedRow = this;
            e.dataTransfer.effectAllowed = 'move';
            this.classList.add('dragging');
            // Store the initial content types to avoid phantom drags
            e.dataTransfer.setData('text/html', this.innerHTML);
        });

        row.addEventListener('dragend', function () {
            this.classList.remove('dragging');
            els.itemsTable.querySelectorAll('.dragging').forEach(r => r.classList.remove('dragging'));
        });

        row.addEventListener('dragover', function (e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            return false;
        });

        row.addEventListener('drop', function (e) {
            e.stopPropagation();
            e.preventDefault();

            // Find the dragging row
            const draggingRow = els.itemsTable.querySelector('.dragging');
            if (draggingRow && draggingRow !== this) {
                // Swap rows or insert
                // Simple approach: Insert before if dropping on top half, after if bottom half? 
                // Or just swap their positions in the DOM for simplicity.
                // Standard Sortable behavior:
                // If draggingRow index < this index, insertAfter this
                // If draggingRow index > this index, insertBefore this

                const allRows = Array.from(els.itemsTable.querySelectorAll("tr"));
                const draggingIndex = allRows.indexOf(draggingRow);
                const targetIndex = allRows.indexOf(this);

                if (draggingIndex < targetIndex) {
                    this.after(draggingRow);
                } else {
                    this.before(draggingRow);
                }
            }
            return false;
        });
    }

    // Bind initial rows
    els.itemsTable.querySelectorAll('tr').forEach(row => bindDragEvents(row));

    els.addBtn.addEventListener("click", () => {
        itemCount++;
        const row = document.createElement("tr");
        row.setAttribute('draggable', 'true');
        const isBounded = els.modeSelect.value === 'bounded';
        row.innerHTML = `<td><input type="text" class="k-name" value="Item ${itemCount}" /></td><td><input type="number" class="k-weight" value="1" min="1" /></td><td><input type="number" class="k-value" value="0" min="0" /></td><td><input type="number" class="k-priority" value="1" min="0" /></td><td class="k-qty-col ${isBounded ? '' : 'hidden'}"><input type="number" class="k-qty" value="0" min="0" /></td>`;
        bindDragEvents(row);
        els.itemsTable.appendChild(row);
    });

    els.removeBtn.addEventListener("click", () => { const rows = els.itemsTable.querySelectorAll("tr"); if (rows.length > 1) { els.itemsTable.removeChild(rows[rows.length - 1]); itemCount--; } });

    els.generateBtn.addEventListener("click", () => {
        const problem = KnapsackSolver.generateRandom(Math.floor(Math.random() * 3) + 3, 6, 6, 12);
        els.itemsTable.innerHTML = "";
        itemCount = 0;
        problem.weights.forEach((w, i) => {
            itemCount = i + 1;
            const row = document.createElement("tr");
            row.setAttribute('draggable', 'true');
            const isBounded = els.modeSelect.value === 'bounded';
            row.innerHTML = `<td><input type="text" class="k-name" value="Item ${itemCount}" /></td><td><input type="number" class="k-weight" value="${w}" min="1" /></td><td><input type="number" class="k-value" value="0" min="0" /></td><td><input type="number" class="k-priority" value="${problem.priorities[i]}" min="0" /></td><td class="k-qty-col ${isBounded ? '' : 'hidden'}"><input type="number" class="k-qty" value="${problem.qtyLimits[i]}" min="0" /></td>`;
            bindDragEvents(row);
            els.itemsTable.appendChild(row);
        });
        els.capacity.value = problem.capacity;
    });

    els.clearBtn.addEventListener("click", () => {
        els.capacity.value = 9;
        els.itemsTable.innerHTML = "";
        itemCount = 0;
        const defaults = [{ w: 3, p: 5, q: 2 }, { w: 1, p: 4, q: 2 }, { w: 2, p: 3, q: 0 }];
        defaults.forEach((d, i) => {
            itemCount = i + 1;
            const row = document.createElement("tr");
            row.setAttribute('draggable', 'true');
            const isBounded = els.modeSelect.value === 'bounded';
            row.innerHTML = `<td><input type="text" class="k-name" value="Item ${itemCount}" /></td><td><input type="number" class="k-weight" value="${d.w}" min="1" /></td><td><input type="number" class="k-value" value="0" min="0" /></td><td><input type="number" class="k-priority" value="${d.p}" min="0" /></td><td class="k-qty-col ${isBounded ? '' : 'hidden'}"><input type="number" class="k-qty" value="${d.q}" min="0" /></td>`;
            bindDragEvents(row);
            els.itemsTable.appendChild(row);
        });
        els.vizSection.classList.add("hidden");
        stopAuto();
    });

    els.solveBtn.addEventListener("click", () => {
        stopAuto();
        const capacity = parseInt(els.capacity.value) || 0;
        const weights = [], values = [], priorities = [], qtyLimits = [];
        const itemNames = []; // Added for tracking names if needed, though solver relies on index

        els.itemsTable.querySelectorAll("tr").forEach(row => {
            weights.push(parseInt(row.querySelector(".k-weight").value) || 1);
            values.push(parseInt(row.querySelector(".k-value").value) || 0);
            priorities.push(parseInt(row.querySelector(".k-priority")?.value) || 0);
            itemNames.push(row.querySelector(".k-name")?.value || "Item");

            if (currentMode === 'bounded') {
                const qtyVal = row.querySelector(".k-qty")?.value;
                const parsedQty = parseInt(qtyVal);
                qtyLimits.push((qtyVal === '' || isNaN(parsedQty)) ? 0 : parsedQty);
            } else {
                qtyLimits.push(1);
            }
        });

        if (weights.length === 0 || capacity <= 0) { alert("Enter valid items and capacity."); return; }

        solver = new KnapsackSolver(weights, values, capacity, priorities, qtyLimits, currentMode);
        solver.itemNames = itemNames; // Attach names to solver for display
        solver.solve();

        if (currentMode === '01') {
            solver.steps[0].description = `Create ${weights.length + 1}×${capacity + 1} table. Standard 0/1 Knapsack (item qty max 1).<div style="background:var(--bg-tertiary);padding:0.75rem;border-radius:6px;margin-top:0.5rem;border-left:3px solid var(--accent-color)"><strong>DP Recurrence Formula:</strong><div style="background:rgba(0,0,0,0.3);padding:0.5rem;border-radius:4px;font-family:monospace;margin-top:0.5rem">f(i, w) = max{ f(i-1, w), v<sub>i</sub> + f(i-1, w-w<sub>i</sub>) } &nbsp;&nbsp;(if w ≥ w<sub>i</sub>)<br>f(i, w) = f(i-1, w) &nbsp;&nbsp;(if w < w<sub>i</sub>)</div></div>`;
        }

        currentStep = 0;
        els.vizSection.classList.remove("hidden");
        els.vizSection.scrollIntoView({ behavior: "smooth" });

        let html = `<h3>Problem: Capacity=${capacity}, Items=${weights.length} (${currentMode === '01' ? '0/1' : 'Bounded'})</h3>`;
        if (currentMode === '01') {
            html += `<div style="background:var(--bg-tertiary);padding:1rem;border-radius:8px;margin:1rem 0;border-left:4px solid var(--accent-color)"><strong>0/1 Knapsack:</strong> Items can be taken 0 or 1 time.</div>`;
        } else if (currentMode === 'bounded') {
            html += `<div style="background:var(--bg-tertiary);padding:1rem;border-radius:8px;margin:1rem 0;border-left:4px solid var(--accent-color)"><strong>Bounded Knapsack:</strong> Items limited by specified Quantity.</div>`;
        } else if (currentMode === 'unbounded') {
            html += `<div style="background:var(--bg-tertiary);padding:1rem;border-radius:8px;margin:1rem 0;border-left:4px solid var(--accent-color)"><strong>Unbounded Knapsack:</strong> Items have unlimited quantity.</div>`;
        }

        els.summary.innerHTML = html;
        renderStep(currentStep);
        updateIndicator();
    });
    els.prevBtn.addEventListener("click", () => { if (currentStep > 0) { currentStep--; renderStep(currentStep); updateIndicator(); } });
    els.nextBtn.addEventListener("click", () => { if (solver && currentStep < solver.steps.length - 1) { currentStep++; renderStep(currentStep); updateIndicator(); } });
    els.autoBtn.addEventListener("click", toggleAuto);
    els.skipBtn.addEventListener("click", () => { stopAuto(); if (solver) { currentStep = solver.steps.length - 1; renderStep(currentStep); updateIndicator(); } });

    function renderStep(idx) {
        if (!solver || idx < 0 || idx >= solver.steps.length) return;
        const step = solver.steps[idx];
        els.stepTitle.textContent = step.title;
        els.stepDesc.innerHTML = step.description;
        renderDPTable(step);
        if (step.type === "solution") {
            els.solution.classList.remove("hidden");
            // Update solution display to use names if possible
            const itemCounts = Object.entries(step.solution.itemCounts || {}).map(([itemIdx, count]) => {
                const name = solver.itemNames ? (solver.itemNames[parseInt(itemIdx) - 1] || `Item ${itemIdx}`) : `Item ${itemIdx}`;
                return count > 1 ? `${name} (x${count})` : name;
            }).join(", ");
            els.solution.innerHTML = `<h3>✓ Optimal: Value=${step.solution.maxValue}, Weight=${step.solution.totalWeight}</h3><p>Selected: ${itemCounts || 'None'}</p>`;
        } else {
            els.solution.classList.add("hidden");
        }
        els.prevBtn.disabled = currentStep === 0;
        els.nextBtn.disabled = currentStep === solver.steps.length - 1;
    }

    function renderDPTable(step) {
        const dp = step.dpSnapshot;
        let html = '<table class="dp-table"><thead><tr><th>i\\w</th>';
        for (let w = 0; w <= solver.capacity; w++) html += `<th>${w}</th>`;
        html += '</tr></thead><tbody>';
        for (let i = 0; i <= solver.n; i++) {
            const qty = i > 0 ? solver.qtyLimits[i - 1] : 0;
            // Use name in row header if available
            let rowLabel = i === 0 ? '0' : (solver.itemNames ? solver.itemNames[i - 1] : i);
            let detail = i === 0 ? '' : `(w=${solver.weights[i - 1]},v=${solver.values[i - 1]},q=${qty})`;

            html += `<tr><th>${rowLabel}${detail}</th>`;
            for (let w = 0; w <= solver.capacity; w++) {
                let cls = "";
                if (step.currentCell && step.currentCell.row === i && step.currentCell.col === w) cls = "current-cell";
                else if (step.comparingCells && step.comparingCells.some(c => c.row === i && c.col === w)) cls = "comparing-cell";
                html += `<td class="${cls}">${dp[i][w]}</td>`;
            }
            html += '</tr>';
        }
        html += '</tbody></table>';
        els.dpTable.innerHTML = html;
    }
    function updateIndicator() { els.stepIndicator.textContent = `Step ${currentStep + 1} / ${solver.steps.length}`; }
    function toggleAuto() { if (autoInterval) stopAuto(); else startAuto(); }
    function startAuto() { els.autoBtn.textContent = "⏸ Pause"; autoInterval = setInterval(() => { if (solver && currentStep < solver.steps.length - 1) { currentStep++; renderStep(currentStep); updateIndicator(); } else stopAuto(); }, 500); }
    function stopAuto() { if (autoInterval) { clearInterval(autoInterval); autoInterval = null; } els.autoBtn.textContent = "▶ Auto"; }
}