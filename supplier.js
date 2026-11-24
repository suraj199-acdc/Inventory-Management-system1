// =====================================
// STORAGE KEYS
// =====================================

const USER_KEY = "ims_single_user";
const SESSION_KEY = "ims_current_user";
const SUPPLIERS_KEY = "ims_suppliers";
const PURCHASES_KEY = "ims_purchases";

let selectedSupplierId = null;


// =====================================
// LOGIN CHECK
// =====================================

function checkLogin() {
    if (
        !localStorage.getItem(USER_KEY) ||
        !localStorage.getItem(SESSION_KEY)
    ) {
        window.location.href = "./index.html";
        return false;
    }

    return true;
}


// =====================================
// STORAGE
// =====================================

function getData(key) {
    try {
        const value = JSON.parse(localStorage.getItem(key));
        return Array.isArray(value) ? value : [];
    } catch {
        return [];
    }
}

function getSuppliers() {
    return getData(SUPPLIERS_KEY);
}

function saveSuppliers(suppliers) {
    localStorage.setItem(SUPPLIERS_KEY, JSON.stringify(suppliers));
}

function getPurchases() {
    return getData(PURCHASES_KEY);
}


// =====================================
// HELPERS
// =====================================

function money(value) {
    return Number(value || 0).toLocaleString("en-IN", {
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
        "'": "&#039;"
    })[char]);
}

function showMessage(message, type) {
    const element = document.getElementById("message");

    element.textContent = message;
    element.className = "message " + type;

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

function logout() {
    if (confirm("Are you sure you want to logout?")) {
        localStorage.removeItem(SESSION_KEY);
        window.location.href = "./index.html";
    }
}

function generateSupplierId() {
    const suppliers = getSuppliers();

    let highest = 0;

    suppliers.forEach(supplier => {
        const match = String(supplier.id || "").match(/^SUP-(\d+)$/);

        if (match) {
            highest = Math.max(highest, Number(match[1]));
        }
    });

    return "SUP-" + String(highest + 1).padStart(5, "0");
}


// =====================================
// SUPPLIER ACCOUNT CALCULATIONS
// =====================================

function getSupplierAccount(supplierId) {
    const purchases = getPurchases().filter(purchase =>
        String(purchase.supplier_id) === String(supplierId)
    );

    const total = purchases.reduce(
        (sum, purchase) => sum + Number(purchase.total || 0),
        0
    );

    const paid = purchases.reduce(
        (sum, purchase) => sum + Number(purchase.paid_amount || 0),
        0
    );

    const due = purchases.reduce(
        (sum, purchase) => sum + Number(purchase.due_amount || 0),
        0
    );

    return {
        purchases,
        total,
        paid,
        due
    };
}


// =====================================
// DASHBOARD STATISTICS
// =====================================

function updateStatistics() {
    const suppliers = getSuppliers();

    const active = suppliers.filter(supplier =>
        supplier.status === "active"
    );

    let totalPurchases = 0;
    let totalDue = 0;

    suppliers.forEach(supplier => {
        const account = getSupplierAccount(supplier.id);

        totalPurchases += account.total;
        totalDue += account.due;
    });

    document.getElementById("totalSuppliers").textContent =
        suppliers.length;

    document.getElementById("activeSuppliers").textContent =
        active.length;

    document.getElementById("totalSupplierPurchases").textContent =
        "Rs. " + money(totalPurchases);

    document.getElementById("totalSupplierDue").textContent =
        "Rs. " + money(totalDue);
}


// =====================================
// REGISTER / UPDATE SUPPLIER
// =====================================

function resetForm() {
    document.getElementById("supplierForm").reset();

    document.getElementById("supplierId").value = "";

    document.getElementById("status").value = "active";

    document.getElementById("formTitle").textContent =
        "➕ Register New Supplier";

    document.getElementById("saveSupplierButton").textContent =
        "💾 Save Supplier";
}

function handleSupplierSubmit(event) {
    event.preventDefault();

    const id = document.getElementById("supplierId").value;

    const companyName =
        document.getElementById("companyName").value.trim();

    const contactPerson =
        document.getElementById("contactPerson").value.trim();

    const phone =
        document.getElementById("phone").value.trim();

    const email =
        document.getElementById("email").value.trim();

    const taxNumber =
        document.getElementById("taxNumber").value.trim();

    const address =
        document.getElementById("address").value.trim();

    const notes =
        document.getElementById("notes").value.trim();

    const status =
        document.getElementById("status").value;

    if (!companyName || !phone) {
        showMessage("Company name and phone are required.", "error");
        return;
    }

    const suppliers = getSuppliers();

    const duplicate = suppliers.find(supplier =>
        supplier.id !== id &&
        supplier.phone.trim().toLowerCase() === phone.toLowerCase()
    );

    if (duplicate) {
        showMessage("A supplier with this phone number already exists.", "error");
        return;
    }

    const now = new Date().toISOString();

    if (id) {
        const index = suppliers.findIndex(
            supplier => String(supplier.id) === String(id)
        );

        if (index === -1) {
            showMessage("Supplier could not be found.", "error");
            return;
        }

        suppliers[index] = {
            ...suppliers[index],
            companyName,
            contactPerson,
            phone,
            email,
            taxNumber,
            address,
            notes,
            status,
            updatedAt: now
        };

    } else {
        suppliers.push({
            id: generateSupplierId(),
            companyName,
            contactPerson,
            phone,
            email,
            taxNumber,
            address,
            notes,
            status,
            createdAt: now,
            updatedAt: now
        });
    }

    try {
        saveSuppliers(suppliers);

        showMessage(
            id ? "Supplier updated successfully." : "Supplier registered successfully.",
            "success"
        );

        resetForm();
        renderSuppliers();
        updateStatistics();

    } catch (error) {
        console.error(error);
        showMessage("Unable to save supplier. Browser storage may be full.", "error");
    }
}


// =====================================
// EDIT SUPPLIER
// =====================================

function editSupplier(id) {
    const supplier = getSuppliers().find(
        item => String(item.id) === String(id)
    );

    if (!supplier) {
        showMessage("Supplier not found.", "error");
        return;
    }

    document.getElementById("supplierId").value = supplier.id;
    document.getElementById("companyName").value = supplier.companyName || "";
    document.getElementById("contactPerson").value = supplier.contactPerson || "";
    document.getElementById("phone").value = supplier.phone || "";
    document.getElementById("email").value = supplier.email || "";
    document.getElementById("taxNumber").value = supplier.taxNumber || "";
    document.getElementById("address").value = supplier.address || "";
    document.getElementById("notes").value = supplier.notes || "";
    document.getElementById("status").value = supplier.status || "active";

    document.getElementById("formTitle").textContent =
        "✏️ Update Supplier";

    document.getElementById("saveSupplierButton").textContent =
        "💾 Update Supplier";

    document.getElementById("supplierForm").scrollIntoView({
        behavior: "smooth"
    });
}


// =====================================
// DELETE SUPPLIER
// =====================================

function deleteSupplier(id) {
    const supplier = getSuppliers().find(
        item => String(item.id) === String(id)
    );

    if (!supplier) return;

    const hasPurchases = getPurchases().some(
        purchase => String(purchase.supplier_id) === String(id)
    );

    if (hasPurchases) {
        showMessage(
            "This supplier has purchase records. Set the supplier to inactive instead of deleting it.",
            "error"
        );
        return;
    }

    if (!confirm(`Delete supplier "${supplier.companyName}"?`)) {
        return;
    }

    const suppliers = getSuppliers().filter(
        item => String(item.id) !== String(id)
    );

    try {
        saveSuppliers(suppliers);
        renderSuppliers();
        updateStatistics();

        showMessage("Supplier deleted successfully.", "success");
    } catch (error) {
        showMessage("Unable to delete supplier.", "error");
    }
}


// =====================================
// DISPLAY SUPPLIERS
// =====================================

function renderSuppliers() {
    const table = document.getElementById("supplierTable");
    const emptyMessage = document.getElementById("emptyMessage");

    const search = document.getElementById("supplierSearch")
        .value.trim().toLowerCase();

    const filter = document.getElementById("supplierFilter").value;

    table.replaceChildren();

    const suppliers = getSuppliers();

    const filtered = suppliers.filter(supplier => {
        const matchesSearch = [
            supplier.id,
            supplier.companyName,
            supplier.contactPerson,
            supplier.phone,
            supplier.email
        ].some(value =>
            String(value || "").toLowerCase().includes(search)
        );

        const matchesStatus =
            filter === "all" || supplier.status === filter;

        return matchesSearch && matchesStatus;
    });

    if (filtered.length === 0) {
        emptyMessage.hidden = false;
        return;
    }

    emptyMessage.hidden = true;

    filtered.forEach((supplier, index) => {
        const account = getSupplierAccount(supplier.id);

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${escapeHTML(supplier.id)}</td>
            <td>${escapeHTML(supplier.companyName)}</td>
            <td>${escapeHTML(supplier.contactPerson || "-")}</td>
            <td>${escapeHTML(supplier.phone)}</td>
            <td>${escapeHTML(supplier.email || "-")}</td>
            <td>Rs. ${money(account.total)}</td>
            <td>Rs. ${money(account.paid)}</td>
            <td>Rs. ${money(account.due)}</td>
            <td>
                <span class="status ${supplier.status}">
                    ${escapeHTML(supplier.status)}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn view-btn" data-action="view" data-id="${escapeHTML(supplier.id)}">View</button>
                    <button class="action-btn edit-btn" data-action="edit" data-id="${escapeHTML(supplier.id)}">Edit</button>
                    <button class="action-btn delete-btn" data-action="delete" data-id="${escapeHTML(supplier.id)}">Delete</button>
                </div>
            </td>
        `;

        table.appendChild(row);
    });
}


// =====================================
// VIEW SUPPLIER ACCOUNT
// =====================================

function viewSupplier(id) {
    const supplier = getSuppliers().find(
        item => String(item.id) === String(id)
    );

    if (!supplier) return;

    selectedSupplierId = id;

    const account = getSupplierAccount(id);

    document.getElementById("supplierDetailsName").textContent =
        supplier.companyName + " (" + supplier.id + ")";

    document.getElementById("supplierAccountTotal").textContent =
        "Rs. " + money(account.total);

    document.getElementById("supplierAccountPaid").textContent =
        "Rs. " + money(account.paid);

    document.getElementById("supplierAccountDue").textContent =
        "Rs. " + money(account.due);

    renderSupplierPurchases(account.purchases);

    const section = document.getElementById("supplierDetailsSection");

    section.hidden = false;

    section.scrollIntoView({
        behavior: "smooth"
    });
}


// =====================================
// SUPPLIER PURCHASE HISTORY
// =====================================

function renderSupplierPurchases(purchases) {
    const table = document.getElementById("supplierPurchaseTable");
    const empty = document.getElementById("supplierPurchaseEmpty");

    table.replaceChildren();

    if (!purchases.length) {
        empty.hidden = false;
        return;
    }

    empty.hidden = true;

    const sorted = [...purchases].sort((a, b) =>
        new Date(b.purchase_date || 0) -
        new Date(a.purchase_date || 0)
    );

    sorted.forEach(purchase => {
        const row = document.createElement("tr");

        const date = purchase.purchase_date
            ? new Date(purchase.purchase_date).toLocaleString()
            : "N/A";

        row.innerHTML = `
            <td>${escapeHTML(purchase.purchase_id || purchase.id || "-")}</td>
            <td>${escapeHTML(purchase.product_name || "-")}</td>
            <td>${Number(purchase.quantity || 0)}</td>
            <td>Rs. ${money(purchase.price)}</td>
            <td>Rs. ${money(purchase.total)}</td>
            <td>Rs. ${money(purchase.paid_amount)}</td>
            <td>Rs. ${money(purchase.due_amount)}</td>
            <td>${escapeHTML(purchase.payment_status || "-")}</td>
            <td>${escapeHTML(date)}</td>
        `;

        table.appendChild(row);
    });
}


// =====================================
// INITIALIZE
// =====================================

document.addEventListener("DOMContentLoaded", function () {
    if (!checkLogin()) return;

    document.getElementById("supplierForm")
        .addEventListener("submit", handleSupplierSubmit);

    document.getElementById("resetSupplierButton")
        .addEventListener("click", resetForm);

    document.getElementById("supplierSearch")
        .addEventListener("input", renderSuppliers);

    document.getElementById("supplierFilter")
        .addEventListener("change", renderSuppliers);

    document.getElementById("supplierTable")
        .addEventListener("click", function (event) {
            const button = event.target.closest("button[data-action]");

            if (!button) return;

            const id = button.dataset.id;
            const action = button.dataset.action;

            if (action === "view") viewSupplier(id);
            if (action === "edit") editSupplier(id);
            if (action === "delete") deleteSupplier(id);
        });

    document.getElementById("closeDetailsButton")
        .addEventListener("click", function () {
            document.getElementById("supplierDetailsSection").hidden = true;
            selectedSupplierId = null;
        });

    renderSuppliers();
    updateStatistics();
});