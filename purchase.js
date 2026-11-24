
/* =========================================================
   INVENTORY MANAGEMENT SYSTEM
   PURCHASE MANAGEMENT
   Supplier-Connected Version
========================================================= */


/* =========================================================
   1. STORAGE KEYS
========================================================= */

const USER_KEY = "ims_single_user";
const SESSION_KEY = "ims_current_user";
const PRODUCTS_KEY = "ims_products";
const PURCHASES_KEY = "ims_purchases";
const SUPPLIERS_KEY = "ims_suppliers";
const ACTIVITIES_KEY = "ims_activities";


/* =========================================================
   2. LOGIN CHECK
========================================================= */

function checkLogin() {
    const user = localStorage.getItem(USER_KEY);
    const session = localStorage.getItem(SESSION_KEY);

    if (!user || !session) {
        window.location.href = "./index.html";
        return false;
    }

    return true;
}


/* =========================================================
   3. STORAGE FUNCTIONS
========================================================= */

function readStorage(key, fallback = []) {
    try {
        const data = JSON.parse(localStorage.getItem(key));

        return data ?? fallback;
    } catch (error) {
        console.error("Storage reading error:", key, error);
        return fallback;
    }
}


function writeStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}


function getProducts() {
    return readStorage(PRODUCTS_KEY);
}


function saveProducts(products) {
    writeStorage(PRODUCTS_KEY, products);
}


function getPurchases() {
    return readStorage(PURCHASES_KEY);
}


function savePurchases(purchases) {
    writeStorage(PURCHASES_KEY, purchases);
}


function getSuppliers() {
    return readStorage(SUPPLIERS_KEY);
}


function getActivities() {
    return readStorage(ACTIVITIES_KEY);
}


function saveActivities(activities) {
    writeStorage(ACTIVITIES_KEY, activities);
}


/* =========================================================
   4. GENERAL HELPERS
========================================================= */

function getElement(id) {
    return document.getElementById(id);
}


function formatCurrency(amount) {
    return Number(amount || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}


function roundMoney(amount) {
    return Math.round((Number(amount) + Number.EPSILON) * 100) / 100;
}


function generateId(prefix) {
    return prefix + "-" + Date.now() + "-" +
        Math.random().toString(36).substring(2, 8).toUpperCase();
}


function showMessage(message, type = "success") {
    const element = getElement("message");

    if (!element) {
        alert(message);
        return;
    }

    element.textContent = message;
    element.className = "message " + type;
    element.hidden = false;

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


function hideMessage() {
    const element = getElement("message");

    if (element) {
        element.hidden = true;
        element.textContent = "";
    }
}


function logout() {
    if (confirm("Are you sure you want to logout?")) {
        localStorage.removeItem(SESSION_KEY);
        window.location.href = "./index.html";
    }
}


/* =========================================================
   5. SUPPLIER MANAGEMENT CONNECTION
========================================================= */

function populateSupplierSelect() {
    const select = getElement("supplierSelect");

    if (!select) return;

    const suppliers = getSuppliers();

    select.replaceChildren();

    const defaultOption = document.createElement("option");

    defaultOption.value = "";
    defaultOption.textContent = "-- Select Registered Supplier --";

    select.appendChild(defaultOption);

    const activeSuppliers = suppliers
        .filter(supplier => supplier.status !== "inactive")
        .sort((a, b) =>
            String(a.companyName || "").localeCompare(
                String(b.companyName || "")
            )
        );

    activeSuppliers.forEach(supplier => {
        const option = document.createElement("option");

        option.value = String(supplier.id);

        option.textContent =
            `${supplier.companyName || "Unnamed Supplier"} ` +
            (supplier.contactPerson
                ? `- ${supplier.contactPerson}`
                : "");

        select.appendChild(option);
    });

    updateSupplierPreview();
}


function getSelectedSupplier() {
    const select = getElement("supplierSelect");

    if (!select || !select.value) {
        return null;
    }

    return getSuppliers().find(
        supplier => String(supplier.id) === String(select.value)
    ) || null;
}


function updateSupplierPreview() {
    const supplier = getSelectedSupplier();

    const preview = getElement("supplierPreview");

    if (!preview) return;

    if (!supplier) {
        preview.hidden = true;
        return;
    }

    preview.hidden = false;

    const contact = getElement("supplierContact");
    const phone = getElement("supplierPhoneDisplay");
    const email = getElement("supplierEmailDisplay");
    const address = getElement("supplierAddressDisplay");

    if (contact) {
        contact.textContent =
            supplier.contactPerson || "Not provided";
    }

    if (phone) {
        phone.textContent =
            supplier.phone || "Not provided";
    }

    if (email) {
        email.textContent =
            supplier.email || "Not provided";
    }

    if (address) {
        address.textContent =
            supplier.address || "Not provided";
    }
}


/* =========================================================
   6. PRODUCT MANAGEMENT CONNECTION
========================================================= */

function getProductPurchasePrice(product) {
    const price =
        product.purchasePrice ??
        product.costPrice ??
        product.price ??
        0;

    return Number(price) || 0;
}


function populateProductSelect(select) {
    if (!select) return;

    const products = getProducts();

    select.replaceChildren();

    const defaultOption = document.createElement("option");

    defaultOption.value = "";
    defaultOption.textContent = "-- Select Product --";

    select.appendChild(defaultOption);

    const sortedProducts = [...products].sort((a, b) =>
        String(a.name || "").localeCompare(
            String(b.name || "")
        )
    );

    sortedProducts.forEach(product => {
        const option = document.createElement("option");

        option.value = String(product.id);

        option.textContent =
            `${product.name || "Unnamed Product"} ` +
            `(Stock: ${Number(product.quantity) || 0})`;

        option.dataset.price = String(
            getProductPurchasePrice(product)
        );

        if (Number(product.quantity) < 0) {
            option.disabled = true;
        }

        select.appendChild(option);
    });
}


function updatePurchaseRowPrice(select) {
    if (!select) return;

    const row = select.closest(".product-row");

    if (!row) return;

    const priceInput = row.querySelector(".price-input");

    if (!priceInput) return;

    const selectedOption =
        select.options[select.selectedIndex];

    if (!select.value || !selectedOption) {
        priceInput.value = "";
        calculatePurchaseTotal();
        return;
    }

    priceInput.value = selectedOption.dataset.price || 0;

    calculatePurchaseTotal();
}


/* =========================================================
   7. ADD PRODUCT ROW
========================================================= */

function addProductRow() {
    const container = getElement("productContainer");

    if (!container) return;

    const firstRow = container.querySelector(".product-row");

    if (!firstRow) return;

    const newRow = firstRow.cloneNode(true);

    const productSelect =
        newRow.querySelector(".product-select");

    const quantityInput =
        newRow.querySelector(".quantity-input");

    const priceInput =
        newRow.querySelector(".price-input");

    if (productSelect) {
        productSelect.value = "";
        populateProductSelect(productSelect);
    }

    if (quantityInput) {
        quantityInput.value = "";
    }

    if (priceInput) {
        priceInput.value = "";
    }

    container.appendChild(newRow);

    updateRemoveButtons();
    calculatePurchaseTotal();
}


/* =========================================================
   8. REMOVE PRODUCT ROW
========================================================= */

function removeRow(button) {
    const container = getElement("productContainer");

    if (!container) return;

    const rows = container.querySelectorAll(".product-row");

    if (rows.length <= 1) {
        return;
    }

    const row = button.closest(".product-row");

    if (row) {
        row.remove();
    }

    updateRemoveButtons();
    calculatePurchaseTotal();
}


function updateRemoveButtons() {
    const rows = document.querySelectorAll(
        "#productContainer .product-row"
    );

    rows.forEach(row => {
        const button = row.querySelector(".remove-btn");

        if (button) {
            button.disabled = rows.length === 1;
        }
    });
}


/* =========================================================
   9. COLLECT PURCHASE ROWS
========================================================= */

function collectPurchaseRows() {
    const rows = document.querySelectorAll(
        "#productContainer .product-row"
    );

    const products = getProducts();

    const items = [];

    for (const row of rows) {
        const productId =
            row.querySelector(".product-select")?.value;

        const quantity = Number(
            row.querySelector(".quantity-input")?.value
        );

        const price = Number(
            row.querySelector(".price-input")?.value
        );

        if (!productId) {
            return {
                valid: false,
                message: "Please select a product in every row."
            };
        }

        if (
            !Number.isSafeInteger(quantity) ||
            quantity <= 0
        ) {
            return {
                valid: false,
                message: "Enter a valid whole-number purchase quantity."
            };
        }

        if (
            !Number.isFinite(price) ||
            price < 0
        ) {
            return {
                valid: false,
                message: "Enter a valid purchase price."
            };
        }

        const product = products.find(
            item => String(item.id) === String(productId)
        );

        if (!product) {
            return {
                valid: false,
                message: "A selected product could not be found."
            };
        }

        const currentStock = Number(product.quantity);

        if (
            !Number.isSafeInteger(currentStock) ||
            currentStock < 0
        ) {
            return {
                valid: false,
                message: `Invalid stock information for ${product.name}.`
            };
        }

        const lineTotal = roundMoney(quantity * price);

        if (!Number.isFinite(lineTotal)) {
            return {
                valid: false,
                message: "Purchase amount is too large."
            };
        }

        items.push({
            product,
            product_id: product.id,
            product_name: product.name,
            quantity,
            price: roundMoney(price),
            total: lineTotal,
            product_image:
                product.image || product.imageUrl || ""
        });
    }

    if (items.length === 0) {
        return {
            valid: false,
            message: "Please add at least one product."
        };
    }

    return {
        valid: true,
        items
    };
}


/* =========================================================
   10. PURCHASE TOTAL CALCULATION
========================================================= */

function calculatePurchaseTotal() {
    const rows = document.querySelectorAll(
        "#productContainer .product-row"
    );

    let total = 0;

    rows.forEach(row => {
        const quantity = Number(
            row.querySelector(".quantity-input")?.value
        ) || 0;

        const price = Number(
            row.querySelector(".price-input")?.value
        ) || 0;

        if (
            quantity > 0 &&
            price >= 0 &&
            Number.isFinite(price)
        ) {
            total += quantity * price;
        }
    });

    total = roundMoney(total);

    const amountPaidInput = getElement("amountPaid");

    let paid = Number(amountPaidInput?.value) || 0;

    paid = Math.max(0, roundMoney(paid));

    const due = roundMoney(Math.max(0, total - paid));

    const status =
        total <= 0
            ? "Not Calculated"
            : paid >= total
                ? "Paid"
                : paid > 0
                    ? "Partially Paid"
                    : "Credit";

    const totalElement = getElement("totalAmount");
    const grandTotalElement = getElement("purchaseGrandTotal");
    const paidElement = getElement("purchasePaidDisplay");
    const dueElement = getElement("purchaseDueDisplay");
    const statusElement = getElement("purchasePaymentStatus");

    if (totalElement) {
        totalElement.textContent = formatCurrency(total);
    }

    if (grandTotalElement) {
        grandTotalElement.textContent = "Rs. " + formatCurrency(total);
    }

    if (paidElement) {
        paidElement.textContent = "Rs. " + formatCurrency(paid);
    }

    if (dueElement) {
        dueElement.textContent = "Rs. " + formatCurrency(due);
    }

    if (statusElement) {
        statusElement.textContent = status;
        statusElement.dataset.status = status.toLowerCase()
            .replace(/\s+/g, "-");
    }

    return total;
}


/* =========================================================
   11. ALLOCATE PAYMENT TO PURCHASE ITEMS
========================================================= */

function allocatePayment(items, amountPaid) {
    const total = roundMoney(
        items.reduce((sum, item) => sum + item.total, 0)
    );

    let remainingPaidCents = Math.round(amountPaid * 100);

    const totalCents = Math.round(total * 100);

    return items.map((item, index) => {
        const itemCents = Math.round(item.total * 100);

        let paidCents;

        if (index === items.length - 1) {
            paidCents = remainingPaidCents;
        } else if (totalCents > 0) {
            paidCents = Math.round(
                remainingPaidCents * (itemCents / totalCents)
            );

            paidCents = Math.min(paidCents, itemCents);
        } else {
            paidCents = 0;
        }

        remainingPaidCents -= paidCents;

        const paid = paidCents / 100;
        const due = roundMoney(item.total - paid);

        return {
            ...item,
            paid_amount: paid,
            due_amount: due
        };
    });
}


/* =========================================================
   12. UPDATE PRODUCT STOCK AND PURCHASE COST
========================================================= */

function updateProductsAfterPurchase(products, items) {
    const grouped = {};

    items.forEach(item => {
        const key = String(item.product_id);

        if (!grouped[key]) {
            grouped[key] = {
                quantity: 0,
                cost: 0
            };
        }

        grouped[key].quantity += item.quantity;
        grouped[key].cost += item.total;
    });

    return products.map(product => {
        const key = String(product.id);

        const purchase = grouped[key];

        if (!purchase) {
            return product;
        }

        const oldQuantity = Number(product.quantity) || 0;

        const newQuantity =
            oldQuantity + purchase.quantity;

        if (!Number.isSafeInteger(newQuantity)) {
            throw new Error(
                `Stock limit exceeded for ${product.name}.`
            );
        }

        const oldPurchasePrice = getProductPurchasePrice(product);

        const oldStockValue =
            oldQuantity * oldPurchasePrice;

        const totalStockValue =
            oldStockValue + purchase.cost;

        const averagePurchasePrice =
            newQuantity > 0
                ? roundMoney(totalStockValue / newQuantity)
                : 0;

        return {
            ...product,
            quantity: newQuantity,
            purchasePrice: averagePurchasePrice
        };
    });
}


/* =========================================================
   13. ACTIVITY LOG
========================================================= */

function logPurchaseActivity(purchaseId, supplierName, total) {
    const activities = getActivities();

    activities.unshift({
        id: generateId("ACT"),
        type: "Purchase",
        action: "New purchase recorded",
        description:
            `Purchase ${purchaseId} recorded from ${supplierName}. ` +
            `Total: Rs. ${formatCurrency(total)}`,
        date: new Date().toISOString()
    });

    try {
        saveActivities(activities.slice(0, 500));
    } catch (error) {
        console.warn("Activity log could not be saved:", error);
    }
}


/* =========================================================
   14. RECORD PURCHASE
========================================================= */

function recordPurchase(event) {
    event.preventDefault();

    hideMessage();

    const supplier = getSelectedSupplier();

    if (!supplier) {
        showMessage("Please select a registered supplier.", "error");
        return;
    }

    if (supplier.status === "inactive") {
        showMessage("This supplier is inactive.", "error");
        return;
    }

    const paymentMethod = getElement("paymentMethod")?.value;

    if (!paymentMethod) {
        showMessage("Please select a payment method.", "error");
        return;
    }

    const collected = collectPurchaseRows();

    if (!collected.valid) {
        showMessage(collected.message, "error");
        return;
    }

    const items = collected.items;

    const total = roundMoney(
        items.reduce((sum, item) => sum + item.total, 0)
    );

    const amountPaid = roundMoney(
        Number(getElement("amountPaid")?.value) || 0
    );

    if (!Number.isFinite(amountPaid) || amountPaid < 0) {
        showMessage("Enter a valid amount paid.", "error");
        return;
    }

    if (amountPaid > total) {
        showMessage(
            "Amount paid cannot be greater than the purchase total.",
            "error"
        );
        return;
    }

    const purchaseId = generateId("PUR");
    const purchaseDate = new Date().toISOString();

    const due = roundMoney(total - amountPaid);

    const paymentStatus =
        due <= 0
            ? "Paid"
            : amountPaid > 0
                ? "Partially Paid"
                : "Credit";

    const allocatedItems = allocatePayment(items, amountPaid);

    const newPurchases = allocatedItems.map(item => ({
        id: generateId("ITEM"),

        purchase_id: purchaseId,

        supplier_id: supplier.id,
        supplier_name: supplier.companyName || "",
        supplier_contact: supplier.contactPerson || "",
        supplier_phone: supplier.phone || "",
        supplier_email: supplier.email || "",
        supplier_address: supplier.address || "",

        product_id: item.product_id,
        product_name: item.product_name,
        product_image: item.product_image,

        quantity: item.quantity,
        price: item.price,
        total: item.total,

        paid_amount: item.paid_amount,
        due_amount: item.due_amount,

        purchase_total: total,
        purchase_paid: amountPaid,
        purchase_due: due,

        payment_method: paymentMethod,
        payment_status: paymentStatus,

        received: true,
        purchase_date: purchaseDate
    }));

    const products = getProducts();
    const purchases = getPurchases();

    let updatedProducts;

    try {
        updatedProducts = updateProductsAfterPurchase(
            products,
            items
        );
    } catch (error) {
        showMessage(error.message, "error");
        return;
    }

    const oldProducts = localStorage.getItem(PRODUCTS_KEY);
    const oldPurchases = localStorage.getItem(PURCHASES_KEY);

    try {
        saveProducts(updatedProducts);

        savePurchases([
            ...purchases,
            ...newPurchases
        ]);

        logPurchaseActivity(
            purchaseId,
            supplier.companyName || "Supplier",
            total
        );

        showMessage(
            `Purchase recorded successfully! ` +
            `Purchase ID: ${purchaseId}. ` +
            `Total: Rs. ${formatCurrency(total)}. ` +
            `Due: Rs. ${formatCurrency(due)}.`,
            "success"
        );

        resetPurchaseForm();

        loadLowStock();

        renderPurchases(
            getElement("purchaseSearch")?.value
                .trim()
                .toLowerCase() || ""
        );

    } catch (error) {
        console.error("Purchase saving error:", error);

        try {
            if (oldProducts === null) {
                localStorage.removeItem(PRODUCTS_KEY);
            } else {
                localStorage.setItem(PRODUCTS_KEY, oldProducts);
            }

            if (oldPurchases === null) {
                localStorage.removeItem(PURCHASES_KEY);
            } else {
                localStorage.setItem(PURCHASES_KEY, oldPurchases);
            }
        } catch (rollbackError) {
            console.error("Purchase rollback failed:", rollbackError);
        }

        showMessage(
            "Unable to save purchase. Please check browser storage.",
            "error"
        );
    }
}


/* =========================================================
   15. RESET PURCHASE FORM
========================================================= */

function resetPurchaseForm() {
    const form = getElement("purchaseForm");
    const container = getElement("productContainer");

    if (!form || !container) return;

    form.reset();

    const firstRow = container.querySelector(".product-row");

    if (firstRow) {
        container.replaceChildren(firstRow);

        const select = firstRow.querySelector(".product-select");
        const quantity = firstRow.querySelector(".quantity-input");
        const price = firstRow.querySelector(".price-input");

        if (select) {
            select.value = "";
            populateProductSelect(select);
        }

        if (quantity) {
            quantity.value = "";
        }

        if (price) {
            price.value = "";
        }
    }

    const supplierSelect = getElement("supplierSelect");

    if (supplierSelect) {
        supplierSelect.value = "";
    }

    updateSupplierPreview();
    updateRemoveButtons();
    calculatePurchaseTotal();
}


/* =========================================================
   16. LOW STOCK ALERT
========================================================= */

function loadLowStock() {
    const products = getProducts();

    const lowStockProducts = products
        .filter(product => Number(product.quantity) <= 5)
        .sort((a, b) =>
            Number(a.quantity) - Number(b.quantity)
        );

    const container = getElement("lowStockContainer");
    const noLowStock = getElement("noLowStock");

    if (!container || !noLowStock) return;

    container.replaceChildren();

    if (lowStockProducts.length === 0) {
        noLowStock.hidden = false;
        return;
    }

    noLowStock.hidden = true;

    lowStockProducts.forEach(product => {
        const card = document.createElement("div");

        card.className = "low-card";

        const image = document.createElement("img");

        image.alt = product.name || "Product image";
        image.src = product.image || product.imageUrl || "";

        image.onerror = function () {
            this.style.display = "none";
        };

        const name = document.createElement("p");

        name.textContent = product.name || "Unknown Product";

        const stock = document.createElement("p");

        stock.className = "stock-warning";
        stock.textContent =
            "Stock: " + Number(product.quantity || 0);

        card.appendChild(image);
        card.appendChild(name);
        card.appendChild(stock);

        container.appendChild(card);
    });
}


/* =========================================================
   17. TOGGLE LOW STOCK ALERT
========================================================= */

function toggleAlert() {
    const box = getElement("alertBox");

    if (!box) return;

    box.hidden = !box.hidden;

    if (!box.hidden) {
        loadLowStock();
    }
}


/* =========================================================
   18. PURCHASE HISTORY
========================================================= */

function renderPurchases(search = "") {
    const table = getElement("purchaseTable");
    const emptyMessage = getElement("emptyMessage");

    if (!table || !emptyMessage) return;

    table.replaceChildren();

    const purchases = getPurchases();

    const filteredPurchases = purchases
        .filter(purchase => {
            const product = String(
                purchase.product_name || ""
            ).toLowerCase();

            const supplier = String(
                purchase.supplier_name ||
                purchase.vendor_name ||
                ""
            ).toLowerCase();

            const purchaseId = String(
                purchase.purchase_id || purchase.id || ""
            ).toLowerCase();

            return (
                product.includes(search) ||
                supplier.includes(search) ||
                purchaseId.includes(search)
            );
        })
        .sort((a, b) =>
            new Date(b.purchase_date || 0) -
            new Date(a.purchase_date || 0)
        )
        .slice(0, 100);

    if (filteredPurchases.length === 0) {
        emptyMessage.hidden = false;
        return;
    }

    emptyMessage.hidden = true;

    filteredPurchases.forEach((purchase, index) => {
        const row = document.createElement("tr");

        const quantity = Number(purchase.quantity) || 0;
        const price = Number(purchase.price) || 0;

        const total = Number(purchase.total) ||
            quantity * price;

        const paid = Number(purchase.paid_amount) || 0;
        const due = Number(purchase.due_amount) || 0;

        const supplierName =
            purchase.supplier_name ||
            purchase.vendor_name ||
            "Not available";

        const date = purchase.purchase_date
            ? new Date(purchase.purchase_date).toLocaleString()
            : "N/A";

        const values = [
            index + 1,
            purchase.product_name || "Unknown Product",
            supplierName,
            null,
            quantity,
            "Rs. " + formatCurrency(price),
            "Rs. " + formatCurrency(total),
            purchase.payment_method || "",
            purchase.payment_status || "",
            "Rs. " + formatCurrency(paid),
            "Rs. " + formatCurrency(due),
            date
        ];

        values.forEach((value, cellIndex) => {
            const cell = document.createElement("td");

            if (cellIndex === 3) {
                const image = document.createElement("img");

                image.alt = "Product image";
                image.src = purchase.product_image || "";

                image.onerror = function () {
                    this.style.display = "none";
                };

                cell.appendChild(image);
            } else {
                cell.textContent = String(value);
            }

            row.appendChild(cell);
        });

        table.appendChild(row);
    });
}


/* =========================================================
   19. REFRESH PURCHASE DATA
========================================================= */

function refreshPurchasePage() {
    populateSupplierSelect();

    const selects = document.querySelectorAll(".product-select");

    selects.forEach(select => {
        const currentValue = select.value;

        populateProductSelect(select);

        if (
            [...select.options].some(
                option => option.value === currentValue
            )
        ) {
            select.value = currentValue;
        }
    });

    loadLowStock();
    renderPurchases();

    updateRemoveButtons();
    calculatePurchaseTotal();
}


/* =========================================================
   20. INITIALIZE PURCHASE PAGE
========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    if (!checkLogin()) {
        return;
    }

    /* Load suppliers */

    populateSupplierSelect();


    /* Load products */

    const firstSelect = document.querySelector(".product-select");

    if (firstSelect) {
        populateProductSelect(firstSelect);
    }


    /* Add product row */

    const addButton = getElement("addProductButton");

    if (addButton) {
        addButton.addEventListener("click", addProductRow);
    }


    /* Remove product row */

    const productContainer = getElement("productContainer");

    if (productContainer) {

        productContainer.addEventListener("click", function (event) {

            const removeButton = event.target.closest(".remove-btn");

            if (removeButton) {
                removeRow(removeButton);
            }

        });


        /* Product selection and price updates */

        productContainer.addEventListener("change", function (event) {

            if (event.target.classList.contains("product-select")) {
                updatePurchaseRowPrice(event.target);
            }

            calculatePurchaseTotal();

        });


        /* Quantity and purchase price updates */

        productContainer.addEventListener("input", function () {
            calculatePurchaseTotal();
        });

    }


    /* Supplier selection */

    const supplierSelect = getElement("supplierSelect");

    if (supplierSelect) {
        supplierSelect.addEventListener("change", function () {
            updateSupplierPreview();
        });
    }


    /* Payment amount updates */

    const amountPaid = getElement("amountPaid");

    if (amountPaid) {
        amountPaid.addEventListener("input", calculatePurchaseTotal);
    }


    /* Purchase form submission */

    const purchaseForm = getElement("purchaseForm");

    if (purchaseForm) {
        purchaseForm.addEventListener("submit", recordPurchase);
    }


    /* Low stock alert */

    const lowStockButton = getElement("lowStockButton");

    if (lowStockButton) {
        lowStockButton.addEventListener("click", toggleAlert);
    }


    /* Purchase history search */

    const purchaseSearch = getElement("purchaseSearch");

    if (purchaseSearch) {
        purchaseSearch.addEventListener("input", function () {
            renderPurchases(
                this.value.trim().toLowerCase()
            );
        });
    }


    /* Logout */

    document.querySelectorAll(".logout-btn").forEach(button => {
        button.addEventListener("click", logout);
    });


    /* Initial page setup */

    updateRemoveButtons();

    calculatePurchaseTotal();

    loadLowStock();

    renderPurchases();

});