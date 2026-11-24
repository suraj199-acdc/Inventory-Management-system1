
// ==========================================
// INVENTORY MANAGEMENT SYSTEM
// DASHBOARD JAVASCRIPT
// ==========================================

const USER_KEY = "ims_single_user";
const SESSION_KEY = "ims_current_user";

// Shared inventory storage keys
const PRODUCTS_KEY = "ims_products";
const SALES_KEY = "ims_sales";
const PURCHASES_KEY = "ims_purchases";

// ==========================================
// CHECK LOGIN
// ==========================================

function checkLogin() {

    const user = localStorage.getItem(USER_KEY);
    const session = localStorage.getItem(SESSION_KEY);

    if (!user || !session) {
        window.location.replace("index.html");
        return false;
    }

    return true;
}

// ==========================================
// LOAD SAVED DATA
// ==========================================

function getData(key) {

    try {
        const data = JSON.parse(localStorage.getItem(key) || "[]");

        return Array.isArray(data) ? data : [];

    } catch (error) {

        console.error("Unable to read storage:", key);

        return [];
    }
}

// ==========================================
// FORMAT CURRENCY
// ==========================================

function formatCurrency(amount) {

    return "Rs. " + Number(amount || 0).toLocaleString(
        "en-IN",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );
}

// ==========================================
// LOAD USER INFORMATION
// ==========================================

function loadUser() {

    const user = JSON.parse(
        localStorage.getItem(USER_KEY)
    );

    document.getElementById("welcomeMessage").textContent =
        "Welcome, " + user.name;
}

// ==========================================
// CALCULATE DASHBOARD STATISTICS
// ==========================================

function loadDashboardStats() {

    const products = getData(PRODUCTS_KEY);
    const sales = getData(SALES_KEY);
    const purchases = getData(PURCHASES_KEY);

    // Total products
    const totalProducts = products.length;

    // Total sales amount
    const salesTotal = sales.reduce((total, sale) => {

        return total +
            (Number(sale.quantity) * Number(sale.price));

    }, 0);

    // Total purchase amount
    const purchaseTotal = purchases.reduce((total, purchase) => {

        return total +
            (Number(purchase.quantity) * Number(purchase.price));

    }, 0);

    // Low stock products
    const lowStockProducts = products.filter(product => {

        return Number(product.quantity) <= 5;

    });

    // Update dashboard
    document.getElementById("totalProducts").textContent =
        totalProducts;

    document.getElementById("totalSales").textContent =
        formatCurrency(salesTotal);

    document.getElementById("totalPurchases").textContent =
        formatCurrency(purchaseTotal);

    document.getElementById("lowStockCount").textContent =
        lowStockProducts.length;

    // Update low stock notification
    updateLowStockAlert(lowStockProducts.length);
}

// ==========================================
// LOW STOCK ALERT
// ==========================================

function updateLowStockAlert(count) {

    const bar = document.getElementById("lowStockBar");
    const icon = document.getElementById("stockIcon");
    const text = document.getElementById("lowStockText");

    if (count > 0) {

        bar.classList.remove("safe");
        bar.classList.add("low");

        icon.textContent = "⚠️";

        text.textContent =
            count + " products low in stock. Click to restock now.";

    } else {

        bar.classList.remove("low");
        bar.classList.add("safe");

        icon.textContent = "✓";

        text.textContent =
            "All products have sufficient stock!";
    }
}

// ==========================================
// PAGE NAVIGATION
// ==========================================

function openPage(page) {

    window.location.href = page;
}

// ==========================================
// LOGOUT
// ==========================================

function logout() {

    const confirmLogout = confirm(
        "Are you sure you want to logout?"
    );

    if (!confirmLogout) {
        return;
    }

    // Remove login session only.
    // Keep account and inventory information saved.
    localStorage.removeItem(SESSION_KEY);

    window.location.replace("index.html");
}

// ==========================================
// INITIALIZE DASHBOARD
// ==========================================

document.addEventListener("DOMContentLoaded", function() {

    if (!checkLogin()) {
        return;
    }

    loadUser();
    loadDashboardStats();

});

// ==========================================
// REFRESH DASHBOARD WHEN RETURNING
// ==========================================

window.addEventListener("pageshow", function() {

    if (localStorage.getItem(SESSION_KEY)) {

        loadDashboardStats();

    }

});
