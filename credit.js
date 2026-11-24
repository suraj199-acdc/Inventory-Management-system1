
/* =========================================
   CREDIT & PAYMENT MANAGER
   INVENTORY MANAGEMENT SYSTEM
========================================= */

// LOGIN CHECK

const currentUser = localStorage.getItem("ims_current_user");

if (!currentUser) {
    window.location.href = "index.html";
}

// STORAGE

function readStorage(key, fallback = []) {
    try {
        const value = JSON.parse(localStorage.getItem(key));
        return value ?? fallback;
    } catch {
        return fallback;
    }
}

let mainData = readStorage("ims_single_user_v1", {});
let oldData = readStorage("ims_single_user", {});

function loadPurchases() {

    const separate = readStorage("ims_purchases", null);

    if (Array.isArray(separate)) {
        return separate;
    }

    const records =
        mainData.purchases ??
        oldData.purchases ??
        [];

    return Array.isArray(records) ? records : [];
}

let purchases = loadPurchases();

// HELPERS

function getValue(item, ...keys) {

    for (const key of keys) {

        if (item[key] !== undefined && item[key] !== null) {
            return item[key];
        }

    }

    return "";
}

function money(value) {

    return "Rs " + Number(value || 0).toLocaleString(
        "en-IN",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );

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

function getQuantity(item) {

    return Number(getValue(item, "quantity", "qty")) || 0;

}

function getPrice(item) {

    return Number(
        getValue(item, "price", "purchasePrice", "purchase_price")
    ) || 0;

}

function getPaid(item) {

    const total = getQuantity(item) * getPrice(item);

    const storedPaid = getValue(item, "paid_amount", "paidAmount");

    if (storedPaid === "") {
        return total;
    }

    return Math.max(0, Math.min(total, Number(storedPaid) || 0));

}

function getDue(item) {

    const total = getQuantity(item) * getPrice(item);

    return Math.max(0, total - getPaid(item));

}

function getStatus(item) {

    const paid = getPaid(item);

    const due = getDue(item);

    if (due === 0) {
        return "Paid";
    }

    if (paid > 0) {
        return "Partial";
    }

    return "Credit";

}

// SAVE PURCHASES

function savePurchases() {

    localStorage.setItem(
        "ims_purchases",
        JSON.stringify(purchases)
    );

    mainData.purchases = purchases;

    localStorage.setItem(
        "ims_single_user_v1",
        JSON.stringify(mainData)
    );

}

// SUMMARY

function updateSummary() {

    let totalPurchases = 0;

    let totalPaid = 0;

    let totalDue = 0;

    let creditCount = 0;

    purchases.forEach(item => {

        const total = getQuantity(item) * getPrice(item);

        const paid = getPaid(item);

        const due = getDue(item);

        totalPurchases += total;

        totalPaid += paid;

        totalDue += due;

        if (due > 0) {
            creditCount++;
        }

    });

    document.getElementById("totalPurchases").textContent =
        money(totalPurchases);

    document.getElementById("totalPaid").textContent =
        money(totalPaid);

    document.getElementById("totalDue").textContent =
        money(totalDue);

    document.getElementById("creditCount").textContent =
        creditCount;

}

// DISPLAY PURCHASES

function displayPurchases() {

    const table = document.getElementById("purchaseTable");

    if (purchases.length === 0) {

        table.innerHTML = `
            <tr>
                <td colspan="7" class="empty-message">
                    No purchase records found.
                </td>
            </tr>
        `;

        updateSummary();

        return;
    }

    table.innerHTML = purchases.map((item, index) => {

        const product = getValue(
            item,
            "productName",
            "product_name",
            "name"
        );

        const vendor = getValue(
            item,
            "vendor_name",
            "vendorName"
        );

        const phone = getValue(
            item,
            "vendor_phone",
            "vendorPhone"
        );

        const address = getValue(
            item,
            "vendor_address",
            "vendorAddress"
        );

        const method = getValue(
            item,
            "payment_method",
            "paymentMethod"
        ) || "Cash";

        const paid = getPaid(item);

        const due = getDue(item);

        const status = getStatus(item);

        const id = item.id ?? index;

        return `

        <tr>

            <td>
                <strong>${escapeHTML(product)}</strong>
                <br>
                <small>Qty: ${getQuantity(item)}</small>
            </td>

            <td>
                ${escapeHTML(vendor)}
                <br>
                ${escapeHTML(phone)}
                <br>
                <small>${escapeHTML(address)}</small>
            </td>

            <td>
                ${escapeHTML(method)}
            </td>

            <td>
                <span class="${status.toLowerCase()}">
                    ${status}
                </span>
            </td>

            <td>${money(paid)}</td>

            <td>${money(due)}</td>

            <td>

                <form class="edit-form" data-index="${index}">

                    <input
                        type="text"
                        name="vendor_name"
                        placeholder="Vendor Name"
                        value="${escapeHTML(vendor)}"
                        required
                    >

                    <input
                        type="text"
                        name="vendor_phone"
                        placeholder="Phone"
                        value="${escapeHTML(phone)}"
                    >

                    <textarea
                        name="vendor_address"
                        placeholder="Vendor Address"
                    >${escapeHTML(address)}</textarea>

                    <select name="payment_method">

                        <option value="Cash"
                            ${method === "Cash" ? "selected" : ""}>
                            Cash
                        </option>

                        <option value="eSewa"
                            ${method === "eSewa" ? "selected" : ""}>
                            eSewa
                        </option>

                        <option value="Khalti"
                            ${method === "Khalti" ? "selected" : ""}>
                            Khalti
                        </option>

                        <option value="Bank Transfer"
                            ${method === "Bank Transfer" ? "selected" : ""}>
                            Bank Transfer
                        </option>

                    </select>

                    <select name="payment_status">

                        <option value="Paid"
                            ${status === "Paid" ? "selected" : ""}>
                            Paid
                        </option>

                        <option value="Partial"
                            ${status === "Partial" ? "selected" : ""}>
                            Partial
                        </option>

                        <option value="Credit"
                            ${status === "Credit" ? "selected" : ""}>
                            Credit
                        </option>

                    </select>

                    <input
                        type="number"
                        name="paid_amount"
                        step="0.01"
                        min="0"
                        max="${getQuantity(item) * getPrice(item)}"
                        value="${paid}"
                        required
                    >

                    <button type="submit">
                        Update All
                    </button>

                </form>

            </td>

        </tr>

        `;

    }).join("");

    updateSummary();

}

// UPDATE PURCHASE

document.getElementById("purchaseTable")
    .addEventListener("submit", function(event) {

        if (!event.target.classList.contains("edit-form")) {
            return;
        }

        event.preventDefault();

        const form = event.target;

        const index = Number(form.dataset.index);

        const item = purchases[index];

        if (!item) return;

        const total = getQuantity(item) * getPrice(item);

        const formData = new FormData(form);

        const vendorName = formData.get("vendor_name").trim();

        const vendorPhone = formData.get("vendor_phone").trim();

        const vendorAddress = formData.get("vendor_address").trim();

        const paymentMethod = formData.get("payment_method");

        let paidAmount = Number(formData.get("paid_amount"));

        if (!vendorName) {
            alert("Please enter vendor name.");
            return;
        }

        if (!Number.isFinite(paidAmount) || paidAmount < 0) {
            alert("Please enter a valid paid amount.");
            return;
        }

        // CLAMP PAID AMOUNT

        paidAmount = Math.max(
            0,
            Math.min(paidAmount, total)
        );

        const dueAmount = total - paidAmount;

        // AUTOMATIC STATUS

        let paymentStatus;

        if (dueAmount === 0) {

            paymentStatus = "Paid";

        } else if (paidAmount > 0) {

            paymentStatus = "Partial";

        } else {

            paymentStatus = "Credit";

        }

        // UPDATE DETAILS

        Object.assign(item, {

            vendor_name: vendorName,

            vendor_phone: vendorPhone,

            vendor_address: vendorAddress,

            payment_method: paymentMethod,

            payment_status: paymentStatus,

            paid_amount: paidAmount,

            due_amount: dueAmount

        });

        savePurchases();

        displayPurchases();

        showMessage("✅ Purchase Updated Successfully!");

    });

// MESSAGE

function showMessage(message) {

    const box = document.getElementById("message");

    box.textContent = message;

    setTimeout(() => {

        box.textContent = "";

    }, 3000);

}

// LOGOUT

function logout() {

    localStorage.removeItem("ims_current_user");

    window.location.href = "index.html";

}

// INITIALIZE

displayPurchases();
