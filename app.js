/* ============================================================
   Expense & Budget Visualizer — Vanilla JavaScript
   Features: Add transactions, balance, pie chart, monthly
   summary, custom categories, sort transactions
   Storage: Browser Local Storage
   ============================================================ */

(function () {
    "use strict";

    /* ===== Storage Helpers ===== */
    var STORAGE_KEYS = {
        transactions: "expense_transactions",
        categories: "expense_categories",
        sortOrder: "expense_sort_order"
    };

    var Storage = {
        get: function (key, fallback) {
            try {
                var raw = localStorage.getItem(key);
                return raw ? JSON.parse(raw) : fallback;
            } catch (e) {
                return fallback;
            }
        },
        set: function (key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (e) {
                return false;
            }
        }
    };

    function safeLoadTransactions() {
        try {
            var raw = localStorage.getItem(STORAGE_KEYS.transactions);
            if (!raw) return { data: [], recovered: false };
            var parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return { data: parsed, recovered: false };
            return { data: [], recovered: true };
        } catch (e) {
            return { data: [], recovered: true };
        }
    }

    function safeLoadCategories() {
        try {
            var raw = localStorage.getItem(STORAGE_KEYS.categories);
            if (!raw) return { data: null, recovered: false };
            var parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return { data: parsed, recovered: false };
            return { data: null, recovered: true };
        } catch (e) {
            return { data: null, recovered: true };
        }
    }

    /* ===== Pure Logic: Validation ===== */

    function validateAmount(rawAmount) {
        if (rawAmount === null || rawAmount === undefined || rawAmount === "") {
            return { valid: false, error: "Amount is required." };
        }
        var str = String(rawAmount).trim();
        if (str === "") {
            return { valid: false, error: "Amount is required." };
        }
        if (!/^-?\d+(\.\d+)?$/.test(str)) {
            return { valid: false, error: "Amount must be a valid number." };
        }
        var num = parseFloat(str);
        if (isNaN(num) || !isFinite(num)) {
            return { valid: false, error: "Amount must be a valid number." };
        }
        if (num <= 0) {
            return { valid: false, error: "Amount must be greater than zero." };
        }
        if (num > 999999999.99) {
            return { valid: false, error: "Amount must not exceed 999,999,999.99." };
        }
        var dotIndex = str.indexOf(".");
        if (dotIndex !== -1 && str.length - dotIndex - 1 > 2) {
            return { valid: false, error: "Amount must have at most two decimal places." };
        }
        return { valid: true, value: num };
    }

    function validateTransaction(tx) {
        var errors = [];
        var name = (tx.name || "").trim();
        var category = (tx.category || "").trim();

        if (name.length === 0) {
            errors.push("Item name is required.");
        }
        if (category.length === 0) {
            errors.push("Category is required.");
        }
        var amountResult = validateAmount(tx.amount);
        if (!amountResult.valid) {
            errors.push(amountResult.error);
        }

        return {
            valid: errors.length === 0,
            errors: errors,
            name: name,
            amount: amountResult.valid ? amountResult.value : null,
            category: category
        };
    }

    function validateCategoryName(name, existingCategories) {
        var trimmed = (name || "").trim();
        if (trimmed.length === 0) {
            return { valid: false, error: "Category name is required." };
        }
        if (trimmed.length > 50) {
            return { valid: false, error: "Category name must not exceed 50 characters." };
        }
        for (var i = 0; i < existingCategories.length; i++) {
            if (existingCategories[i] === trimmed) {
                return { valid: false, error: "That category already exists." };
            }
        }
        return { valid: true, value: trimmed };
    }

    /* ===== Pure Logic: Aggregation ===== */

    function computeBalance(transactions) {
        var sum = 0;
        for (var i = 0; i < transactions.length; i++) {
            sum += transactions[i].amount;
        }
        return Math.round((sum + Number.EPSILON) * 100) / 100;
    }

    function groupByCategory(transactions) {
        var groups = {};
        for (var i = 0; i < transactions.length; i++) {
            var tx = transactions[i];
            if (!groups[tx.category]) {
                groups[tx.category] = 0;
            }
            groups[tx.category] += tx.amount;
        }
        var rounded = {};
        for (var key in groups) {
            if (groups.hasOwnProperty(key)) {
                rounded[key] = Math.round((groups[key] + Number.EPSILON) * 100) / 100;
            }
        }
        return rounded;
    }

    function groupByMonth(transactions) {
        var groups = {};
        for (var i = 0; i < transactions.length; i++) {
            var tx = transactions[i];
            var monthKey = tx.date.substring(0, 7);
            if (!groups[monthKey]) {
                groups[monthKey] = { transactions: [], total: 0 };
            }
            groups[monthKey].transactions.push(tx);
            groups[monthKey].total += tx.amount;
        }
        for (var key in groups) {
            if (groups.hasOwnProperty(key)) {
                groups[key].total = Math.round((groups[key].total + Number.EPSILON) * 100) / 100;
            }
        }
        return groups;
    }

    /* ===== Pure Logic: Sorting ===== */

    function sortTransactions(transactions, sortOrder) {
        var copy = transactions.slice();
        if (sortOrder === "category") {
            copy.sort(function (a, b) {
                return a.category.localeCompare(b.category, undefined, { sensitivity: "base" });
            });
        } else {
            copy.sort(function (a, b) {
                return a.amount - b.amount;
            });
        }
        return copy;
    }

    /* ===== Expose pure functions for testing ===== */
    window.ExpenseApp = {
        validateAmount: validateAmount,
        validateTransaction: validateTransaction,
        validateCategoryName: validateCategoryName,
        computeBalance: computeBalance,
        groupByCategory: groupByCategory,
        groupByMonth: groupByMonth,
        sortTransactions: sortTransactions
    };

    /* ===== State ===== */
    var DEFAULT_CATEGORIES = ["Food", "Transport", "Fun"];
    var transactions = [];
    var categories = DEFAULT_CATEGORIES.slice();
    var sortOrder = "amount";
    var selectedMonth = null;
    var chartInstance = null;

    /* ===== DOM References ===== */
    var balanceEl = document.getElementById("balance");
    var txForm = document.getElementById("tx-form");
    var txNameInput = document.getElementById("tx-name");
    var txAmountInput = document.getElementById("tx-amount");
    var txCategorySelect = document.getElementById("tx-category");
    var txFeedback = document.getElementById("tx-feedback");
    var catNameInput = document.getElementById("cat-name");
    var catAddBtn = document.getElementById("cat-add-btn");
    var catFeedback = document.getElementById("cat-feedback");
    var sortSelect = document.getElementById("sort-select");
    var txListEl = document.getElementById("tx-list");
    var txEmpty = document.getElementById("tx-empty");
    var chartCanvas = document.getElementById("chart");
    var chartEmpty = document.getElementById("chart-empty");
    var monthListEl = document.getElementById("month-list");
    var monthDetailEl = document.getElementById("month-detail");
    var summaryEmpty = document.getElementById("summary-empty");

    /* ===== Mutations ===== */

    function addTransaction(data) {
        var result = validateTransaction(data);
        if (!result.valid) {
            return { ok: false, error: result.errors.join(" ") };
        }
        var tx = {
            id: Date.now() + "-" + Math.random().toString(36).slice(2, 9),
            name: result.name,
            amount: result.amount,
            category: result.category,
            date: new Date().toISOString().substring(0, 10)
        };
        transactions.push(tx);
        if (!Storage.set(STORAGE_KEYS.transactions, transactions)) {
            showFeedback(txFeedback, "Failed to save. Data kept for this session.", "error");
        }
        return { ok: true };
    }

    function deleteTransaction(id) {
        transactions = transactions.filter(function (t) { return t.id !== id; });
        if (!Storage.set(STORAGE_KEYS.transactions, transactions)) {
            showFeedback(txFeedback, "Failed to save deletion. Data kept for this session.", "error");
        }
    }

    function addCustomCategory(name) {
        var result = validateCategoryName(name, categories);
        if (!result.valid) {
            return { ok: false, error: result.error };
        }
        categories.push(result.value);
        if (!Storage.set(STORAGE_KEYS.categories, categories)) {
            showFeedback(catFeedback, "Failed to save category. It will persist for this session.", "error");
        }
        return { ok: true };
    }

    function setSortOrder(order) {
        sortOrder = order;
        Storage.set(STORAGE_KEYS.sortOrder, sortOrder);
    }

    /* ===== Renderers ===== */

    function showFeedback(el, message, type) {
        el.textContent = message;
        el.classList.remove("error", "success");
        if (type) el.classList.add(type);
        clearTimeout(el._timeout);
        el._timeout = setTimeout(function () {
            el.textContent = "";
            el.classList.remove("error", "success");
        }, 3000);
    }

    function renderBalance() {
        var balance = computeBalance(transactions);
        balanceEl.textContent = "$" + balance.toFixed(2);
    }

    function renderCategorySelect() {
        txCategorySelect.innerHTML = "";
        categories.forEach(function (cat) {
            var opt = document.createElement("option");
            opt.value = cat;
            opt.textContent = cat;
            txCategorySelect.appendChild(opt);
        });
    }

    function renderList() {
        var sorted = sortTransactions(transactions, sortOrder);
        txListEl.innerHTML = "";

        if (sorted.length === 0) {
            txEmpty.style.display = "block";
            return;
        }
        txEmpty.style.display = "none";

        sorted.forEach(function (tx) {
            var item = document.createElement("div");
            item.className = "tx-item";

            var info = document.createElement("div");
            info.className = "tx-item-info";

            var nameEl = document.createElement("div");
            nameEl.className = "tx-item-name";
            nameEl.textContent = tx.name;

            var metaEl = document.createElement("div");
            metaEl.className = "tx-item-meta";
            metaEl.textContent = tx.category + " - " + tx.date;

            info.appendChild(nameEl);
            info.appendChild(metaEl);

            var amountEl = document.createElement("div");
            amountEl.className = "tx-item-amount";
            amountEl.textContent = "$" + tx.amount.toFixed(2);

            var delBtn = document.createElement("button");
            delBtn.className = "tx-delete";
            delBtn.innerHTML = "&times;";
            delBtn.title = "Delete";
            delBtn.addEventListener("click", function () {
                deleteTransaction(tx.id);
                renderAll();
            });

            item.appendChild(info);
            item.appendChild(amountEl);
            item.appendChild(delBtn);
            txListEl.appendChild(item);
        });
    }

    function renderChart() {
        var chartData = groupByCategory(transactions);
        var labels = Object.keys(chartData);
        var values = labels.map(function (l) { return chartData[l]; });

        if (labels.length === 0) {
            if (chartInstance) {
                chartInstance.destroy();
                chartInstance = null;
            }
            chartCanvas.style.display = "none";
            chartEmpty.style.display = "block";
            return;
        }

        chartEmpty.style.display = "none";
        chartCanvas.style.display = "block";

        if (typeof Chart === "undefined") {
            chartEmpty.textContent = "Chart library unavailable. Please check your internet connection.";
            chartEmpty.style.display = "block";
            chartCanvas.style.display = "none";
            return;
        }

        var colors = [
            "#4f46e5", "#7c3aed", "#ec4899", "#f59e0b",
            "#16a34a", "#06b6d4", "#dc2626", "#8b5cf6",
            "#0ea5e9", "#84cc16", "#f97316", "#6366f1"
        ];

        if (chartInstance) {
            chartInstance.data.labels = labels;
            chartInstance.data.datasets[0].data = values;
            chartInstance.data.datasets[0].backgroundColor = labels.map(function (_, i) {
                return colors[i % colors.length];
            });
            chartInstance.update();
        } else {
            chartInstance = new Chart(chartCanvas, {
                type: "pie",
                data: {
                    labels: labels,
                    datasets: [{
                        data: values,
                        backgroundColor: labels.map(function (_, i) {
                            return colors[i % colors.length];
                        }),
                        borderWidth: 2,
                        borderColor: "#fff"
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            position: "bottom",
                            labels: { padding: 16, font: { size: 13 } }
                        },
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    var label = context.label || "";
                                    var value = context.parsed;
                                    var total = values.reduce(function (a, b) { return a + b; }, 0);
                                    var pct = total > 0 ? Math.round((value / total) * 100) : 0;
                                    return label + ": $" + value.toFixed(2) + " (" + pct + "%)";
                                }
                            }
                        }
                    }
                }
            });
        }
    }

    function renderMonthlySummary() {
        var months = groupByMonth(transactions);
        var monthKeys = Object.keys(months).sort().reverse();

        monthListEl.innerHTML = "";
        monthDetailEl.innerHTML = "";

        if (transactions.length === 0) {
            summaryEmpty.style.display = "block";
            return;
        }
        summaryEmpty.style.display = "none";

        var monthNames = ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"];

        monthKeys.forEach(function (key) {
            var parts = key.split("-");
            var year = parseInt(parts[0], 10);
            var monthIdx = parseInt(parts[1], 10) - 1;
            var label = monthNames[monthIdx] + " " + year;

            var chip = document.createElement("div");
            chip.className = "month-chip";
            if (selectedMonth === key) chip.classList.add("active");

            var nameSpan = document.createElement("span");
            nameSpan.textContent = label;

            var totalSpan = document.createElement("span");
            totalSpan.className = "month-total";
            totalSpan.textContent = "$" + months[key].total.toFixed(2);

            chip.appendChild(nameSpan);
            chip.appendChild(totalSpan);

            chip.addEventListener("click", function () {
                selectedMonth = (selectedMonth === key) ? null : key;
                renderMonthlySummary();
            });

            monthListEl.appendChild(chip);
        });

        if (selectedMonth && months[selectedMonth]) {
            var monthTx = months[selectedMonth].transactions;
            monthTx.forEach(function (tx) {
                var row = document.createElement("div");
                row.className = "month-detail-item";

                var left = document.createElement("div");
                var nameEl = document.createElement("div");
                nameEl.textContent = tx.name;
                var catEl = document.createElement("div");
                catEl.className = "detail-cat";
                catEl.textContent = tx.category;
                left.appendChild(nameEl);
                left.appendChild(catEl);

                var amt = document.createElement("div");
                amt.className = "detail-amount";
                amt.textContent = "$" + tx.amount.toFixed(2);

                row.appendChild(left);
                row.appendChild(amt);
                monthDetailEl.appendChild(row);
            });
        }
    }

    function renderAll() {
        renderBalance();
        renderCategorySelect();
        renderList();
        renderChart();
        renderMonthlySummary();
    }

    /* ===== Event Wiring ===== */

    function handleSubmit(e) {
        e.preventDefault();
        var data = {
            name: txNameInput.value,
            amount: txAmountInput.value,
            category: txCategorySelect.value
        };
        var result = addTransaction(data);
        if (result.ok) {
            txNameInput.value = "";
            txAmountInput.value = "";
            txCategorySelect.selectedIndex = 0;
            showFeedback(txFeedback, "Transaction added!", "success");
            renderAll();
        } else {
            showFeedback(txFeedback, result.error, "error");
        }
    }

    function handleAddCategory() {
        var name = catNameInput.value;
        var result = addCustomCategory(name);
        if (result.ok) {
            catNameInput.value = "";
            showFeedback(catFeedback, "Category added!", "success");
            renderCategorySelect();
        } else {
            showFeedback(catFeedback, result.error, "error");
        }
    }

    function handleSortChange() {
        setSortOrder(sortSelect.value);
        renderList();
    }

    /* ===== Initialization ===== */

    function init() {
        var txLoaded = safeLoadTransactions();
        transactions = txLoaded.data;
        if (txLoaded.recovered) {
            showFeedback(txFeedback, "Recovered from corrupted data. Starting fresh.", "error");
        }

        var catLoaded = safeLoadCategories();
        if (catLoaded.data) {
            categories = catLoaded.data;
            if (catLoaded.recovered) {
                showFeedback(catFeedback, "Categories were corrupted. Using defaults.", "error");
            }
        }

        sortOrder = Storage.get(STORAGE_KEYS.sortOrder, "amount");
        sortSelect.value = sortOrder;

        if (typeof localStorage === "undefined" || typeof JSON === "undefined") {
            document.body.innerHTML = "<div style='padding:40px;text-align:center'><h1>Browser Not Supported</h1><p>This app requires a modern browser with Local Storage support.</p></div>";
            return;
        }

        txForm.addEventListener("submit", handleSubmit);
        catAddBtn.addEventListener("click", handleAddCategory);
        sortSelect.addEventListener("change", handleSortChange);

        catNameInput.addEventListener("keydown", function (e) {
            if (e.key === "Enter") {
                e.preventDefault();
                handleAddCategory();
            }
        });

        renderAll();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
