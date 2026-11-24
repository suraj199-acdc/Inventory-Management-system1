
/* =========================================
   INVENTORY MANAGEMENT SYSTEM
   REPORTS JAVASCRIPT
========================================= */

// AUTHENTICATION

const currentUser = localStorage.getItem("ims_current_user");

if (!currentUser) {
    window.location.href = "index.html";
}

// STORAGE

function readStorage(key, fallback = []) {
    try {
        const value = JSON.parse(localStorage.getItem(key));
        return value ?? fallback;
    } catch (error) {
        return fallback;
    }
}

const mainData = readStorage("ims_single_user_v1", {});
const oldData = readStorage("ims_single_user", {});

function getRecords(key, property) {
    const separateRecords = readStorage(key, null);

    if (Array.isArray(separateRecords)) {
        return separateRecords;
    }

    const records =
        mainData[property] ??
        oldData[property] ??
        separateRecords ??
        [];

    return Array.isArray(records) ? records : [];
}

let products = getRecords("ims_products", "products");
let sales = getRecords("ims_sales", "sales");
let purchases = getRecords("ims_purchases", "purchases");
let expenses = getRecords("ims_expenses", "expenses");

// HELPERS

function getValue(record, ...names) {
    if (!record || typeof record !== "object") return "";

    for (const name of names) {
        if (record[name] !== undefined && record[name] !== null) {
            return record[name];
        }
    }

    return "";
}

function getProductName(record) {
    return getValue(
        record,
        "productName",
        "product_name",
        "name",
        "product"
    );
}

function getQuantity(record) {
    return Number(getValue(record, "quantity", "qty", "stock")) || 0;
}

function getPrice(record) {
    return Number(getValue(
        record,
        "price",
        "sellingPrice",
        "selling_price",
        "purchasePrice",
        "purchase_price",
        "unitPrice"
    )) || 0;
}

function getCostPrice(record) {
    const value = getValue(
        record,
        "costPrice",
        "cost_price",
        "unitCost",
        "unit_cost",
        "purchasePrice",
        "purchase_price",
        "buyingPrice",
        "buying_price"
    );

    return value === "" ? null : Number(value);
}

function getDate(record) {
    return getValue(
        record,
        "date",
        "sale_date",
        "purchase_date",
        "expenseDate",
        "expense_date",
        "createdAt",
        "created_at"
    );
}

function getCustomer(record) {
    return getValue(
        record,
        "party",
        "customerName",
        "customer_name",
        "customer"
    );
}

function getSupplier(record) {
    return getValue(
        record,
        "supplierName",
        "supplier_name",
        "supplier",
        "party"
    );
}

function getExpenseName(record) {
    return getValue(
        record,
        "title",
        "expenseName",
        "expense_name",
        "name",
        "description"
    ) || "Expense";
}

function getExpenseCategory(record) {
    return getValue(record, "category", "type") || "Other";
}

function getExpenseAmount(record) {
    return Number(getValue(record, "amount", "total", "price")) || 0;
}

function formatMoney(amount) {
    return "Rs " + Number(amount || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function getImage(record) {
    const image = getValue(
        record,
        "image",
        "product_image",
        "imageUrl"
    );

    if (!image) return "";

    if (/^(https?:\/\/|data:image\/)/i.test(String(image))) {
        return image;
    }

    return "uploads/" + String(image);
}

function getProductCostFromInventory(saleRecord) {
    const saleId = getValue(
        saleRecord,
        "productId",
        "product_id",
        "itemId",
        "item_id"
    );

    const saleName = String(getProductName(saleRecord)).toLowerCase();

    const product = products.find(item => {
        const productId = getValue(item, "id", "productId", "product_id");
        const productName = String(getProductName(item)).toLowerCase();

        if (saleId && productId && String(saleId) === String(productId)) {
            return true;
        }

        return saleName && productName === saleName;
    });

    return product ? getCostPrice(product) : null;
}

function getSaleUnitCost(record) {
    const directCost = getCostPrice(record);

    if (directCost !== null && Number.isFinite(directCost)) {
        return directCost;
    }

    return getProductCostFromInventory(record);
}

function getDateOnly(value) {
    if (!value) return "";

    const date = String(value).substring(0, 10);

    return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";
}

function getToday() {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    return new Date(now.getTime() - offset * 60000)
        .toISOString()
        .substring(0, 10);
}

function dateDaysAgo(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);

    const offset = date.getTimezoneOffset();

    return new Date(date.getTime() - offset * 60000)
        .toISOString()
        .substring(0, 10);
}

function isWithinDateRange(record) {
    const date = getDateOnly(getDate(record));
    const start = document.getElementById("startDate").value;
    const end = document.getElementById("endDate").value;

    if (start && (!date || date < start)) return false;
    if (end && (!date || date > end)) return false;

    return true;
}

function applyPeriod() {
    const period = document.getElementById("periodFilter").value;
    const today = getToday();

    let start = "";
    let end = "";

    if (period === "today") {
        start = today;
        end = today;
    } else if (period === "yesterday") {
        start = dateDaysAgo(1);
        end = start;
    } else if (period === "week") {
        start = dateDaysAgo(6);
        end = today;
    } else if (period === "month") {
        start = today.substring(0, 7) + "-01";
        end = today;
    } else if (period === "year") {
        start = today.substring(0, 4) + "-01-01";
        end = today;
    }

    document.getElementById("startDate").value = start;
    document.getElementById("endDate").value = end;
}

function filterRecords(records) {
    const search = document.getElementById("search")
        .value.toLowerCase().trim();

    return records.filter(record => {
        if (!isWithinDateRange(record)) return false;

        if (!search) return true;

        return JSON.stringify(record)
            .toLowerCase()
            .includes(search);
    }).sort((a, b) => {
        return new Date(getDate(b) || 0) -
               new Date(getDate(a) || 0);
    });
}

function getFilteredData() {
    return {
        sales: filterRecords(sales),
        purchases: filterRecords(purchases),
        expenses: filterRecords(expenses)
    };
}

// FINANCIAL CALCULATIONS

function calculateFinancials(filteredSales, filteredExpenses) {
    let revenue = 0;
    let cogs = 0;
    let knownCostCount = 0;
    let unknownCostCount = 0;

    filteredSales.forEach(item => {
        const quantity = getQuantity(item);
        const price = getPrice(item);

        revenue += quantity * price;

        const unitCost = getSaleUnitCost(item);

        if (unitCost !== null && Number.isFinite(unitCost) && unitCost >= 0) {
            cogs += quantity * unitCost;
            knownCostCount++;
        } else {
            unknownCostCount++;
        }
    });

    const expensesTotal = filteredExpenses.reduce(
        (sum, item) => sum + getExpenseAmount(item),
        0
    );

    const completeCostData = unknownCostCount === 0;

    const grossProfit = completeCostData ? revenue - cogs : null;
    const netProfit = completeCostData ? grossProfit - expensesTotal : null;

    const margin = completeCostData && revenue > 0
        ? (grossProfit / revenue) * 100
        : null;

    return {
        revenue,
        cogs,
        expensesTotal,
        grossProfit,
        netProfit,
        margin,
        completeCostData,
        knownCostCount,
        unknownCostCount
    };
}

// SUMMARY CARDS

function updateSummary(data) {
    const filteredSales = data.sales;
    const filteredPurchases = data.purchases;
    const filteredExpenses = data.expenses;

    const revenue = filteredSales.reduce(
        (sum, item) => sum + getQuantity(item) * getPrice(item),
        0
    );

    const purchaseTotal = filteredPurchases.reduce(
        (sum, item) => sum + getQuantity(item) * getPrice(item),
        0
    );

    const financials = calculateFinancials(
        filteredSales,
        filteredExpenses
    );

    const lowStockItems = products.filter(
        item => getQuantity(item) <= 5
    );

    const customers = new Set(
        filteredSales.map(getCustomer).filter(Boolean)
    );

    document.getElementById("totalSales").textContent =
        formatMoney(revenue);

    document.getElementById("totalPurchases").textContent =
        formatMoney(purchaseTotal);

    document.getElementById("totalExpenses").textContent =
        formatMoney(financials.expensesTotal);

    document.getElementById("grossProfit").textContent =
        financials.grossProfit === null
            ? "N/A"
            : formatMoney(financials.grossProfit);

    document.getElementById("netProfit").textContent =
        financials.netProfit === null
            ? "N/A"
            : formatMoney(financials.netProfit);

    document.getElementById("totalProducts").textContent =
        products.length;

    document.getElementById("lowStockCount").textContent =
        lowStockItems.length;

    document.getElementById("totalCustomers").textContent =
        customers.size;

    const note = document.getElementById("accountingNote");

    if (financials.completeCostData) {
        note.textContent =
            "Gross profit = sales revenue − cost of goods sold. Net profit = gross profit − recorded operating expenses. Profit margin: " +
            (financials.margin === null
                ? "N/A"
                : financials.margin.toFixed(2) + "%") +
            ". Purchases are shown separately and are not automatically deducted as expenses.";
    } else {
        note.textContent =
            "Profit is unavailable for this filtered period because " +
            financials.unknownCostCount +
            " sales record(s) do not contain a reliable cost price. Add a cost price to sales records or product records to calculate gross and net profit accurately.";
    }
}

// TABLE HELPERS

function setTable(headings, rows, emptyMessage = "No records found.") {
    const head = document.getElementById("reportHead");
    const body = document.getElementById("reportBody");

    head.innerHTML = "<tr>" +
        headings.map(item => `<th>${escapeHTML(item)}</th>`).join("") +
        "</tr>";

    if (!rows.length) {
        body.innerHTML = `
            <tr>
                <td colspan="${headings.length}" class="empty-message">
                    ${escapeHTML(emptyMessage)}
                </td>
            </tr>
        `;
        return;
    }

    body.innerHTML = rows.join("");
}

function getStatus(record) {
    return getValue(record, "status", "paymentStatus", "payment_status")
        || "Recorded";
}

// SALES REPORT

function displaySales(records) {
    const rows = records.map((item, index) => {
        const quantity = getQuantity(item);
        const price = getPrice(item);
        const image = getImage(item);

        const imageHTML = image
            ? `<img class="product-image" src="${escapeHTML(image)}" alt="Product" onerror="this.style.display='none'">`
            : "No Image";

        return `
            <tr>
                <td>${index + 1}</td>
                <td>${escapeHTML(getProductName(item))}</td>
                <td>${imageHTML}</td>
                <td>${quantity}</td>
                <td>${formatMoney(price)}</td>
                <td>${formatMoney(quantity * price)}</td>
                <td>${escapeHTML(getCustomer(item) || "-")}</td>
                <td>${escapeHTML(getValue(item, "customerContact", "customer_contact", "contact", "phone") || "-")}</td>
                <td><span class="status-badge">${escapeHTML(getStatus(item))}</span></td>
                <td>${escapeHTML(getDate(item) || "-")}</td>
            </tr>
        `;
    });

    setTable(
        ["No", "Product", "Image", "Qty", "Unit Price", "Total", "Customer", "Contact", "Status", "Date"],
        rows
    );
}

// PURCHASE REPORT

function displayPurchases(records) {
    const rows = records.map((item, index) => {
        const quantity = getQuantity(item);
        const price = getPrice(item);
        const image = getImage(item);

        const imageHTML = image
            ? `<img class="product-image" src="${escapeHTML(image)}" alt="Product" onerror="this.style.display='none'">`
            : "No Image";

        return `
            <tr>
                <td>${index + 1}</td>
                <td>${escapeHTML(getProductName(item))}</td>
                <td>${imageHTML}</td>
                <td>${quantity}</td>
                <td>${formatMoney(price)}</td>
                <td>${formatMoney(quantity * price)}</td>
                <td>${escapeHTML(getSupplier(item) || "-")}</td>
                <td><span class="status-badge">${escapeHTML(getStatus(item))}</span></td>
                <td>${escapeHTML(getDate(item) || "-")}</td>
            </tr>
        `;
    });

    setTable(
        ["No", "Product", "Image", "Qty", "Unit Price", "Total", "Supplier", "Status", "Date"],
        rows
    );
}

// EXPENSE REPORT

function displayExpenses(records) {
    const rows = records.map((item, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${escapeHTML(getExpenseName(item))}</td>
            <td>${escapeHTML(getExpenseCategory(item))}</td>
            <td>${formatMoney(getExpenseAmount(item))}</td>
            <td>${escapeHTML(getValue(item, "payment", "paymentMethod", "payment_method") || "-")}</td>
            <td>${escapeHTML(getValue(item, "reference", "receipt", "referenceNumber") || "-")}</td>
            <td>${escapeHTML(getDate(item) || "-")}</td>
        </tr>
    `);

    setTable(
        ["No", "Expense", "Category", "Amount", "Payment", "Reference", "Date"],
        rows
    );
}

// PROFIT AND LOSS REPORT

function displayProfitReport(data) {
    const financials = calculateFinancials(data.sales, data.expenses);

    const rows = [
        `<tr><td>Sales Revenue</td><td>${formatMoney(financials.revenue)}</td></tr>`,
        `<tr><td>Cost of Goods Sold</td><td>${financials.completeCostData ? formatMoney(financials.cogs) : "Unavailable"}</td></tr>`,
        `<tr><td>Gross Profit</td><td>${financials.grossProfit === null ? "Unavailable" : formatMoney(financials.grossProfit)}</td></tr>`,
        `<tr><td>Operating Expenses</td><td>${formatMoney(financials.expensesTotal)}</td></tr>`,
        `<tr><td><strong>Net Profit</strong></td><td><strong>${financials.netProfit === null ? "Unavailable" : formatMoney(financials.netProfit)}</strong></td></tr>`,
        `<tr><td>Gross Profit Margin</td><td>${financials.margin === null ? "Unavailable" : financials.margin.toFixed(2) + "%"}</td></tr>`,
        `<tr><td>Sales Records With Cost Data</td><td>${financials.knownCostCount}</td></tr>`,
        `<tr><td>Sales Records Missing Cost Data</td><td>${financials.unknownCostCount}</td></tr>`
    ];

    setTable(["Financial Item", "Amount"], rows);

    document.getElementById("accountingNote").textContent =
        "This statement uses recorded sales and expenses for the selected period. Purchases are not treated as immediate operating expenses. Cost of goods sold is only calculated when a reliable unit cost is available.";
}

// INVENTORY REPORT

function displayInventory(records) {
    const rows = records.map((item, index) => {
        const quantity = getQuantity(item);
        const cost = getCostPrice(item);
        const selling = getPrice(item);

        return `
            <tr>
                <td>${index + 1}</td>
                <td>${escapeHTML(getProductName(item))}</td>
                <td>${quantity}</td>
                <td>${cost === null || !Number.isFinite(cost) ? "N/A" : formatMoney(cost)}</td>
                <td>${formatMoney(selling)}</td>
                <td>${cost === null || !Number.isFinite(cost) ? "N/A" : formatMoney(cost * quantity)}</td>
                <td>${quantity <= 5
                    ? '<span class="low-stock">Low Stock</span>'
                    : '<span class="available">Available</span>'}</td>
            </tr>
        `;
    });

    setTable(
        ["No", "Product", "Quantity", "Unit Cost", "Selling Price", "Stock Value", "Status"],
        rows,
        "No inventory products found."
    );
}

// LOW STOCK REPORT

function displayLowStock(records) {
    const lowStockItems = records.filter(
        item => getQuantity(item) <= 5
    );

    const rows = lowStockItems.map((item, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${escapeHTML(getProductName(item))}</td>
            <td>${getQuantity(item)}</td>
            <td>${formatMoney(getPrice(item))}</td>
            <td><span class="low-stock">Low Stock</span></td>
        </tr>
    `);

    setTable(
        ["No", "Product", "Available Quantity", "Selling Price", "Status"],
        rows,
        "No low stock products found."
    );
}

// TOP SELLING PRODUCTS

function displayTopProducts(filteredSales) {
    const productSales = {};

    filteredSales.forEach(item => {
        const name = getProductName(item);
        if (!name) return;

        if (!productSales[name]) {
            productSales[name] = {
                quantity: 0,
                total: 0
            };
        }

        const quantity = getQuantity(item);

        productSales[name].quantity += quantity;
        productSales[name].total += quantity * getPrice(item);
    });

    const topProducts = Object.entries(productSales)
        .sort((a, b) => b[1].quantity - a[1].quantity)
        .slice(0, 5);

    const body = document.getElementById("topProductsBody");

    if (!topProducts.length) {
        body.innerHTML = `
            <tr><td colspan="4" class="empty-message">No sales records available.</td></tr>
        `;
        return;
    }

    body.innerHTML = topProducts.map(([name, data], index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${escapeHTML(name)}</td>
            <td>${data.quantity}</td>
            <td>${formatMoney(data.total)}</td>
        </tr>
    `).join("");
}

// EXPENSE BREAKDOWN

function displayExpenseBreakdown(records) {
    const totals = {};

    records.forEach(item => {
        const category = getExpenseCategory(item);
        totals[category] = (totals[category] || 0) + getExpenseAmount(item);
    });

    const entries = Object.entries(totals)
        .sort((a, b) => b[1] - a[1]);

    const total = entries.reduce((sum, item) => sum + item[1], 0);

    const container = document.getElementById("expenseBreakdown");

    if (!entries.length) {
        container.innerHTML =
            '<p class="empty-message">No expense records available.</p>';
        return;
    }

    container.innerHTML = entries.map(([category, amount]) => {
        const percentage = total > 0 ? (amount / total) * 100 : 0;

        return `
            <div class="expense-item">
                <div class="expense-item-header">
                    <strong>${escapeHTML(category)}</strong>
                    <span>${formatMoney(amount)} (${percentage.toFixed(1)}%)</span>
                </div>
                <div class="progress-track">
                    <div class="progress-fill" style="width:${percentage}%"></div>
                </div>
            </div>
        `;
    }).join("");
}

// REPORT DISPLAY

function displayReports(data) {
    const type = document.getElementById("reportType").value;

    const title = document.getElementById("reportTitle");
    const tag = document.getElementById("reportTag");

    const topSection = document.getElementById("topProductsSection");
    const expenseSection = document.getElementById("expenseBreakdownSection");

    topSection.style.display = "none";
    expenseSection.style.display = "none";

    if (type === "sales") {
        title.textContent = "Sales Reports";
        tag.textContent = "SALES";
        displaySales(data.sales);
    } else if (type === "purchases") {
        title.textContent = "Purchase Reports";
        tag.textContent = "PURCHASES";
        displayPurchases(data.purchases);
    } else if (type === "expenses") {
        title.textContent = "Expense Reports";
        tag.textContent = "EXPENSES";
        displayExpenses(data.expenses);
        expenseSection.style.display = "block";
    } else if (type === "profit") {
        title.textContent = "Profit & Loss Statement";
        tag.textContent = "FINANCIAL";
        displayProfitReport(data);
        expenseSection.style.display = "block";
    } else if (type === "inventory") {
        title.textContent = "Inventory Valuation Report";
        tag.textContent = "INVENTORY";
        displayInventory(products);
    } else if (type === "lowstock") {
        title.textContent = "Low Stock Reports";
        tag.textContent = "LOW STOCK";
        displayLowStock(products);
    }

    if (type === "sales" || type === "profit") {
        topSection.style.display = "block";
        displayTopProducts(data.sales);
    }

    if (type === "profit" || type === "expenses") {
        displayExpenseBreakdown(data.expenses);
    }

    let count = 0;

    if (type === "sales") count = data.sales.length;
    if (type === "purchases") count = data.purchases.length;
    if (type === "expenses") count = data.expenses.length;
    if (type === "profit") count = data.sales.length + data.expenses.length;
    if (type === "inventory") count = products.length;
    if (type === "lowstock") {
        count = products.filter(item => getQuantity(item) <= 5).length;
    }

    document.getElementById("recordCount").textContent =
        count + (count === 1 ? " record found" : " records found");
}

// REFRESH

function refreshReports() {
    const data = getFilteredData();

    updateSummary(data);
    displayReports(data);
}

// FILTER EVENTS

document.getElementById("filterBtn").addEventListener("click", () => {
    refreshReports();
});

document.getElementById("filterForm")?.addEventListener("submit", event => {
    event.preventDefault();
    refreshReports();
});

document.getElementById("reportType").addEventListener("change", refreshReports);

document.getElementById("search").addEventListener("input", refreshReports);

document.getElementById("periodFilter").addEventListener("change", () => {
    applyPeriod();
    refreshReports();
});

document.getElementById("startDate").addEventListener("change", () => {
    document.getElementById("periodFilter").value = "all";
    refreshReports();
});

document.getElementById("endDate").addEventListener("change", () => {
    document.getElementById("periodFilter").value = "all";
    refreshReports();
});

document.getElementById("resetBtn").addEventListener("click", () => {
    document.getElementById("reportType").value = "sales";
    document.getElementById("periodFilter").value = "all";
    document.getElementById("startDate").value = "";
    document.getElementById("endDate").value = "";
    document.getElementById("search").value = "";

    refreshReports();
});

// CSV EXPORT

function exportCSV() {
    const type = document.getElementById("reportType").value;
    const table = document.querySelector("#reportContent table");
    const rows = Array.from(table.querySelectorAll("tr"));

    const csv = rows.map(row => {
        return Array.from(row.querySelectorAll("th, td"))
            .map(cell => {
                const text = cell.innerText.replace(/\s+/g, " ").trim();
                return '"' + text.replace(/"/g, '""') + '"';
            })
            .join(",");
    }).join("\n");

    downloadFile(
        csv,
        "ims-" + type + "-report-" + getToday() + ".csv",
        "text/csv;charset=utf-8;"
    );
}

function downloadFile(content, filename, type) {
    const blob = new Blob(["\uFEFF" + content], { type });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
}

document.getElementById("csvBtn").addEventListener("click", exportCSV);

// PDF EXPORT

async function exportPDF() {
    if (!window.html2canvas || !window.jspdf) {
        alert("PDF export libraries could not load. Check your internet connection.");
        return;
    }

    const button = document.getElementById("pdfBtn");
    button.disabled = true;
    button.textContent = "Preparing...";

    try {
        const canvas = await html2canvas(
            document.getElementById("reportContent"),
            {
                scale: 1.5,
                backgroundColor: "#667eea",
                useCORS: true
            }
        );

        const image = canvas.toDataURL("image/png");
        const { jsPDF } = window.jspdf;

        const pdf = new jsPDF("l", "mm", "a4");
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        const imageHeight = canvas.height * pageWidth / canvas.width;

        let heightLeft = imageHeight;
        let position = 0;

        pdf.addImage(image, "PNG", 0, position, pageWidth, imageHeight);
        heightLeft -= pageHeight;

        while (heightLeft > 0) {
            position = heightLeft - imageHeight;
            pdf.addPage();
            pdf.addImage(image, "PNG", 0, position, pageWidth, imageHeight);
            heightLeft -= pageHeight;
        }

        pdf.save("ims-report-" + getToday() + ".pdf");
    } catch (error) {
        console.error(error);
        alert("Could not generate PDF. Please try again.");
    } finally {
        button.disabled = false;
        button.textContent = "Export PDF";
    }
}

document.getElementById("pdfBtn").addEventListener("click", exportPDF);

// JPG EXPORT

async function exportJPG() {
    if (!window.html2canvas) {
        alert("Image export library could not load. Check your internet connection.");
        return;
    }

    const button = document.getElementById("jpgBtn");
    button.disabled = true;
    button.textContent = "Preparing...";

    try {
        const canvas = await html2canvas(
            document.getElementById("reportContent"),
            {
                scale: 2,
                backgroundColor: "#667eea",
                useCORS: true
            }
        );

        const link = document.createElement("a");
        link.download = "ims-report-" + getToday() + ".jpg";
        link.href = canvas.toDataURL("image/jpeg", 0.95);

        document.body.appendChild(link);
        link.click();
        link.remove();
    } catch (error) {
        console.error(error);
        alert("Could not generate JPG. Please try again.");
    } finally {
        button.disabled = false;
        button.textContent = "Export JPG";
    }
}

document.getElementById("jpgBtn").addEventListener("click", exportJPG);

// LOGOUT

function logout() {
    localStorage.removeItem("ims_current_user");
    window.location.href = "index.html";
}

window.logout = logout;

// INITIALIZE

document.getElementById("generatedDate").textContent =
    "Report generated: " + new Date().toLocaleString();

document.getElementById("footerDate").textContent =
    new Date().toLocaleString();

refreshReports();
