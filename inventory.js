
// ==========================================
// INVENTORY MANAGEMENT SYSTEM
// INVENTORY JAVASCRIPT
// ==========================================

const USER_KEY = "ims_single_user";
const SESSION_KEY = "ims_current_user";
const PRODUCTS_KEY = "ims_products";

// ==========================================
// CHECK LOGIN
// ==========================================

function checkLogin() {

    const user = localStorage.getItem(USER_KEY);
    const session = localStorage.getItem(SESSION_KEY);

    if (!user || !session) {
        window.location.replace("./index.html");
        return false;
    }

    return true;
}

// ==========================================
// GET PRODUCTS
// ==========================================

function getProducts() {

    try {

        const products = JSON.parse(
            localStorage.getItem(PRODUCTS_KEY) || "[]"
        );

        return Array.isArray(products) ? products : [];

    } catch (error) {

        console.error("Unable to load products:", error);
        return [];

    }
}

// ==========================================
// SAVE PRODUCTS
// ==========================================

function saveProducts(products) {

    localStorage.setItem(
        PRODUCTS_KEY,
        JSON.stringify(products)
    );

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
// LOAD INVENTORY SUMMARY
// ==========================================

function loadSummary() {

    const products = getProducts();

    const totalProducts = products.length;

    const totalStock = products.reduce(
        (total, product) => {

            return total + Number(product.quantity || 0);

        }, 0
    );

    const lowStock = products.filter(
        product => Number(product.quantity || 0) <= 5
    ).length;

    document.getElementById("totalProducts").textContent =
        totalProducts;

    document.getElementById("totalStock").textContent =
        totalStock;

    document.getElementById("lowStockCount").textContent =
        lowStock;

}

// ==========================================
// LOAD DEPARTMENT FILTER
// ==========================================

function loadDepartments() {

    const products = getProducts();

    const select = document.getElementById("departmentFilter");

    const selectedValue = select.value;

    const departments = [
        ...new Set(
            products
                .map(product => product.department)
                .filter(department =>
                    typeof department === "string" &&
                    department.trim() !== ""
                )
        )
    ];

    select.replaceChildren();

    const allOption = document.createElement("option");

    allOption.value = "";
    allOption.textContent = "All Departments";

    select.appendChild(allOption);

    departments.sort().forEach(department => {

        const option = document.createElement("option");

        option.value = department;
        option.textContent = department;

        select.appendChild(option);

    });

    select.value = departments.includes(selectedValue)
        ? selectedValue
        : "";

}

// ==========================================
// CREATE TABLE CELL
// ==========================================

function createCell(content) {

    const cell = document.createElement("td");

    if (content instanceof Node) {
        cell.appendChild(content);
    } else {
        cell.textContent = content;
    }

    return cell;

}

// ==========================================
// LOAD INVENTORY TABLE
// ==========================================

function loadInventory() {

    const products = getProducts();

    const table = document.getElementById("inventoryTable");

    const emptyMessage = document.getElementById("emptyMessage");

    const selectedDepartment =
        document.getElementById("departmentFilter").value;

    const params = new URLSearchParams(window.location.search);

    const showLowStock = params.get("low_stock") === "1";

    // Apply filters
    const filteredProducts = products.filter(product => {

        const matchesDepartment =
            !selectedDepartment ||
            product.department === selectedDepartment;

        const matchesStock =
            !showLowStock ||
            Number(product.quantity || 0) <= 5;

        return matchesDepartment && matchesStock;

    });

    // Display empty message
    table.replaceChildren();

    if (filteredProducts.length === 0) {

        emptyMessage.style.display = "block";

    } else {

        emptyMessage.style.display = "none";

    }

    // Display products
    filteredProducts
        .sort((a, b) => Number(b.id) - Number(a.id))
        .forEach((product, index) => {

            const row = document.createElement("tr");

            // Number
            row.appendChild(createCell(index + 1));

            // ID
            row.appendChild(createCell(product.id ?? "-"));

            // Name
            row.appendChild(createCell(product.name || "Unnamed"));

            // Image
            const imageCell = document.createElement("td");

            if (product.image || product.imageUrl) {

                const img = document.createElement("img");

                img.src = product.image || product.imageUrl;
                img.alt = product.name || "Product";
                img.className = "product-image";

                img.addEventListener("error", function() {
                    this.style.display = "none";
                });

                imageCell.appendChild(img);

            } else {

                const placeholder = document.createElement("span");

                placeholder.className = "no-image";
                placeholder.textContent = "📦";

                imageCell.appendChild(placeholder);

            }

            row.appendChild(imageCell);

            // Department
            row.appendChild(
                createCell(product.department || "-")
            );

            // Price
            row.appendChild(
                createCell(formatCurrency(product.price))
            );

            // Stock
            const stockCell = document.createElement("td");

            const stock = Number(product.quantity || 0);

            const stockBadge = document.createElement("span");

            if (stock <= 5) {

                stockBadge.className = "badge-low";
                stockBadge.textContent = stock + " ⚠";

                // Redirect to purchase page
                stockBadge.title = "Click to restock";

                stockBadge.addEventListener("click", function() {

                    window.location.href =
                        "purchase.html?product_id=" +
                        encodeURIComponent(product.id);

                });

            } else {

                stockBadge.className = "badge-ok";
                stockBadge.textContent = stock;

            }

            stockCell.appendChild(stockBadge);
            row.appendChild(stockCell);

            // Actions
            const actionCell = document.createElement("td");

            // EDIT BUTTON
            const editButton = document.createElement("a");

            editButton.href =
                "edit_product.html?id=" +
                encodeURIComponent(product.id);

            editButton.className = "edit-btn";
            editButton.textContent = "Edit";

            actionCell.appendChild(editButton);

            actionCell.appendChild(
                document.createElement("br")
            );

            actionCell.appendChild(
                document.createElement("br")
            );

            // DELETE BUTTON
            const deleteButton = document.createElement("button");

            deleteButton.className = "delete-btn";
            deleteButton.textContent = "Delete";

            deleteButton.addEventListener("click", function() {

                deleteProduct(product.id);

            });

            actionCell.appendChild(deleteButton);

            row.appendChild(actionCell);

            table.appendChild(row);

        });

}

// ==========================================
// DELETE PRODUCT
// ==========================================

function deleteProduct(id) {

    const confirmDelete = confirm(
        "Are you sure you want to delete this product?"
    );

    if (!confirmDelete) {
        return;
    }

    const products = getProducts();

    const updatedProducts = products.filter(
        product => String(product.id) !== String(id)
    );

    saveProducts(updatedProducts);

    loadSummary();
    loadDepartments();
    loadInventory();

    alert("Product deleted successfully!");

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

    localStorage.removeItem(SESSION_KEY);

    window.location.replace("./index.html");

}

// ==========================================
// REFRESH INVENTORY
// ==========================================

function refreshInventory() {

    if (!checkLogin()) {
        return;
    }

    loadSummary();
    loadDepartments();
    loadInventory();

}

// ==========================================
// INITIALIZE INVENTORY
// ==========================================

document.addEventListener("DOMContentLoaded", function() {

    if (!checkLogin()) {
        return;
    }

    // Department filter
    document.getElementById("departmentFilter")
        .addEventListener("change", loadInventory);

    // Active filter button
    const params = new URLSearchParams(window.location.search);

    if (params.get("low_stock") === "1") {

        document.getElementById("lowStockBtn")
            .classList.add("active");

    } else {

        document.getElementById("allProductsBtn")
            .classList.add("active");

    }

    refreshInventory();

});

// ==========================================
// REFRESH WHEN RETURNING TO PAGE
// ==========================================

window.addEventListener("pageshow", function() {

    if (localStorage.getItem(SESSION_KEY)) {
        refreshInventory();
    }

});
