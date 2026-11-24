
document.addEventListener("DOMContentLoaded", () => {
    const USER_KEY = "ims_single_user";
    const SESSION_KEY = "ims_current_user";
    const CUSTOMERS_KEY = "ims_customers";
    const SALES_KEY = "ims_sales";
    const PAYMENTS_KEY = "ims_customer_payments";

    const user = JSON.parse(localStorage.getItem(USER_KEY) || "null");

    if (!user || !localStorage.getItem(SESSION_KEY)) {
        location.href = "./index.html";
        return;
    }

    const $ = id => document.getElementById(id);
    let customers = read(CUSTOMERS_KEY);
    let sales = read(SALES_KEY);
    let payments = read(PAYMENTS_KEY);
    let selectedCustomerId = null;

    function read(key) {
        try {
            const value = JSON.parse(localStorage.getItem(key) || "[]");
            return Array.isArray(value) ? value : [];
        } catch {
            return [];
        }
    }

    function save(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    function money(value) {
        return Number(value || 0).toFixed(2);
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, c => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;",
            '"': "&quot;", "'": "&#039;"
        })[c]);
    }

    function notify(text, type = "success") {
        $("message").textContent = text;
        $("message").className = "message " + type;
        $("message").style.display = "block";
        setTimeout(() => $("message").style.display = "none", 3500);
    }

    function refreshData() {
        customers = read(CUSTOMERS_KEY);
        sales = read(SALES_KEY);
        payments = read(PAYMENTS_KEY);
    }

    // Group product rows into one transaction.
    function getTransactions(customerId) {
        const customerSales = sales.filter(sale =>
            String(sale.customer_id || "") === String(customerId)
        );

        const groups = new Map();

        customerSales.forEach(sale => {
            const key = sale.sale_id
                ? String(sale.sale_id)
                : "legacy-" + String(sale.id);

            if (!groups.has(key)) {
                const hasPaymentData =
                    Boolean(sale.sale_id) &&
                    sale.sale_total !== undefined &&
                    sale.amount_paid !== undefined;

                groups.set(key, {
                    id: key,
                    date: sale.sale_date || "",
                    total: hasPaymentData ? Number(sale.sale_total) : Number(sale.total || 0),
                    paidAtSale: hasPaymentData ? Number(sale.amount_paid) : null,
                    dueAtSale: hasPaymentData ? Number(sale.due_amount || 0) : null,
                    known: hasPaymentData
                });
            }
        });

        return Array.from(groups.values()).sort((a, b) =>
            new Date(b.date || 0) - new Date(a.date || 0)
        );
    }

    function getCustomerSummary(customer) {
        const transactions = getTransactions(customer.id);
        const knownTransactions = transactions.filter(item => item.known);

        const purchaseTotal = transactions.reduce((sum, item) => sum + item.total, 0);
        const knownSalesTotal = knownTransactions.reduce((sum, item) => sum + item.total, 0);
        const paidAtSale = knownTransactions.reduce((sum, item) => sum + item.paidAtSale, 0);

        const customerPayments = payments.filter(payment =>
            String(payment.customerId) === String(customer.id)
        );

        const laterPayments = customerPayments.reduce(
            (sum, payment) => sum + Number(payment.amount || 0), 0
        );

        const due = Math.max(0, knownSalesTotal - paidAtSale - laterPayments);
        const collected = paidAtSale + laterPayments;

        return {
            transactions,
            purchaseTotal,
            knownSalesTotal,
            paidAtSale,
            laterPayments,
            collected,
            due,
            hasUnknown: transactions.some(item => !item.known)
        };
    }

    function syncCustomersFromSales() {
        refreshData();
        let changed = false;

        sales.forEach(sale => {
            const name = String(sale.customer_name || "").trim();
            const contact = String(sale.customer_contact || "").trim();

            if (!name && !contact) return;

            const existing = customers.find(customer =>
                (sale.customer_id && String(customer.id) === String(sale.customer_id)) ||
                (contact && String(customer.contact || "").trim().toLowerCase() === contact.toLowerCase())
            );

            if (existing) {
                if (sale.customer_id && !existing.id) existing.id = sale.customer_id;
                if (!existing.contact && contact) existing.contact = contact;
                if (!existing.name && name) existing.name = name;
                return;
            }

            const customer = {
                id: sale.customer_id || ("CUS-LEGACY-" + Date.now() + "-" + Math.floor(Math.random() * 100000)),
                name: name || "Unnamed Customer",
                contact,
                email: "",
                address: "",
                notes: "Imported from existing sales records",
                createdAt: sale.sale_date || new Date().toISOString()
            };

            customers.push(customer);
            changed = true;
        });

        if (changed) save(CUSTOMERS_KEY, customers);
    }

    function renderStats() {
        const summaries = customers.map(getCustomerSummary);

        $("totalCustomers").textContent = customers.length;
        $("totalPurchases").textContent = "Rs. " + money(
            summaries.reduce((sum, item) => sum + item.purchaseTotal, 0)
        );
        $("totalCollected").textContent = "Rs. " + money(
            summaries.reduce((sum, item) => sum + item.collected, 0)
        );
        $("totalDue").textContent = "Rs. " + money(
            summaries.reduce((sum, item) => sum + item.due, 0)
        );
    }

    function renderCustomers() {
        refreshData();

        const query = $("customerSearch").value.trim().toLowerCase();
        const filter = $("statusFilter").value;

        const filtered = customers.filter(customer => {
            const summary = getCustomerSummary(customer);
            const searchable = [
                customer.name, customer.contact, customer.email, customer.address
            ].join(" ").toLowerCase();

            if (!searchable.includes(query)) return false;
            if (filter === "due" && summary.due <= 0) return false;
            if (filter === "paid" && (summary.due > 0 || summary.hasUnknown)) return false;
            if (filter === "unknown" && !summary.hasUnknown) return false;

            return true;
        });

        $("customerTable").innerHTML = "";

        filtered.forEach((customer, index) => {
            const summary = getCustomerSummary(customer);
            let status = summary.hasUnknown ? "Includes legacy records" :
                summary.due > 0 ? "Due" : "Paid";

            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${escapeHTML(customer.name)}</td>
                <td>${escapeHTML(customer.contact || "—")}</td>
                <td>Rs. ${money(summary.purchaseTotal)}</td>
                <td>Rs. ${money(summary.collected)}</td>
                <td>Rs. ${money(summary.due)}</td>
                <td><span class="status">${escapeHTML(status)}</span></td>
                <td class="actions">
                    <button type="button" data-action="view" data-id="${escapeHTML(customer.id)}">View</button>
                    <button type="button" data-action="edit" data-id="${escapeHTML(customer.id)}">Edit</button>
                </td>
            `;
            $("customerTable").appendChild(row);
        });

        $("emptyMessage").hidden = filtered.length > 0;
        renderStats();
    }

    function resetForm() {
        $("customerForm").reset();
        $("customerId").value = "";
        $("formHeading").textContent = "Add Customer";
        $("saveCustomerBtn").textContent = "Save Customer";
        $("cancelEditBtn").hidden = true;
    }

    function editCustomer(id) {
        const customer = customers.find(item => String(item.id) === String(id));
        if (!customer) return;

        $("customerId").value = customer.id;
        $("customerName").value = customer.name || "";
        $("customerContact").value = customer.contact || "";
        $("customerEmail").value = customer.email || "";
        $("customerAddress").value = customer.address || "";
        $("customerNotes").value = customer.notes || "";
        $("formHeading").textContent = "Edit Customer";
        $("saveCustomerBtn").textContent = "Update Customer";
        $("cancelEditBtn").hidden = false;

        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function renderCustomerDetails(id) {
        refreshData();

        const customer = customers.find(item => String(item.id) === String(id));
        if (!customer) return;

        selectedCustomerId = customer.id;
        const summary = getCustomerSummary(customer);

        $("customerDetailsPanel").hidden = false;
        $("detailsName").textContent = customer.name;
        $("detailsContact").textContent = customer.contact || "No contact saved";
        $("detailPurchases").textContent = "Rs. " + money(summary.purchaseTotal);
        $("detailPaid").textContent = "Rs. " + money(summary.collected);
        $("detailDue").textContent = "Rs. " + money(summary.due);
        $("paymentCustomerId").value = customer.id;
        $("paymentDate").value = new Date().toISOString().slice(0, 10);
        $("paymentAmount").max = money(summary.due);
        $("paymentAmount").value = "";

        $("purchaseHistory").innerHTML = "";
        summary.transactions.forEach(transaction => {
            const transactionPayments = transaction.known
                ? payments.filter(payment =>
                    String(payment.customerId) === String(customer.id) &&
                    payment.transactionId === transaction.id
                ).reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
                : 0;

            const remaining = transaction.known
                ? Math.max(0, transaction.dueAtSale - transactionPayments)
                : null;

            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${escapeHTML(transaction.id)}</td>
                <td>${transaction.date ? new Date(transaction.date).toLocaleDateString() : "—"}</td>
                <td>Rs. ${money(transaction.total)}</td>
                <td>${transaction.known ? "Rs. " + money(transaction.paidAtSale) : "Unknown"}</td>
                <td>${remaining === null ? "Unknown" : "Rs. " + money(remaining)}</td>
                <td>${remaining === null ? "Legacy" : remaining > 0 ? "Due" : "Paid"}</td>
            `;
            $("purchaseHistory").appendChild(row);
        });

        const customerPayments = payments
            .filter(payment => String(payment.customerId) === String(customer.id))
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        $("paymentHistory").innerHTML = "";
        customerPayments.forEach(payment => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${payment.date ? new Date(payment.date).toLocaleDateString() : "—"}</td>
                <td>Rs. ${money(payment.amount)}</td>
                <td>${escapeHTML(payment.method || "—")}</td>
                <td>${escapeHTML(payment.reference || "—")}</td>
            `;
            $("paymentHistory").appendChild(row);
        });

        $("customerDetailsPanel").scrollIntoView({ behavior: "smooth" });
    }

    $("customerForm").addEventListener("submit", event => {
        event.preventDefault();
        refreshData();

        const id = $("customerId").value;
        const name = $("customerName").value.trim();
        const contact = $("customerContact").value.trim();

        const duplicate = customers.find(customer =>
            String(customer.id) !== String(id) &&
            String(customer.contact || "").trim().toLowerCase() === contact.toLowerCase()
        );

        if (duplicate) {
            notify("A customer with this contact number already exists.", "error");
            return;
        }

        if (id) {
            const customer = customers.find(item => String(item.id) === String(id));
            if (!customer) return;

            Object.assign(customer, {
                name,
                contact,
                email: $("customerEmail").value.trim(),
                address: $("customerAddress").value.trim(),
                notes: $("customerNotes").value.trim(),
                updatedAt: new Date().toISOString()
            });
        } else {
            customers.push({
                id: "CUS-" + Date.now() + "-" + Math.floor(Math.random() * 10000),
                name,
                contact,
                email: $("customerEmail").value.trim(),
                address: $("customerAddress").value.trim(),
                notes: $("customerNotes").value.trim(),
                createdAt: new Date().toISOString()
            });
        }

        save(CUSTOMERS_KEY, customers);
        resetForm();
        renderCustomers();
        notify(id ? "Customer updated successfully." : "Customer added successfully.");
    });

    $("customerTable").addEventListener("click", event => {
        const button = event.target.closest("button[data-action]");
        if (!button) return;

        const id = button.dataset.id;
        if (button.dataset.action === "view") renderCustomerDetails(id);
        if (button.dataset.action === "edit") editCustomer(id);
    });

    $("paymentForm").addEventListener("submit", event => {
        event.preventDefault();
        refreshData();

        const customerId = $("paymentCustomerId").value;
        const customer = customers.find(item => String(item.id) === String(customerId));
        if (!customer) return;

        const summary = getCustomerSummary(customer);
        const amount = Number($("paymentAmount").value);

        if (!Number.isFinite(amount) || amount <= 0) {
            notify("Enter a valid payment amount.", "error");
            return;
        }

        if (amount > summary.due + 0.001) {
            notify("Payment cannot be greater than the outstanding due.", "error");
            return;
        }

        payments.push({
            id: "PAY-" + Date.now() + "-" + Math.floor(Math.random() * 10000),
            customerId,
            amount,
            date: $("paymentDate").value,
            method: $("customerPaymentMethod").value,
            reference: $("paymentReference").value.trim(),
            transactionId: "",
            createdAt: new Date().toISOString()
        });

        save(PAYMENTS_KEY, payments);
        $("paymentForm").reset();
        renderCustomerDetails(customerId);
        renderCustomers();
        notify("Customer payment saved successfully.");
    });

    $("customerSearch").addEventListener("input", renderCustomers);
    $("statusFilter").addEventListener("change", renderCustomers);
    $("cancelEditBtn").addEventListener("click", resetForm);
    $("closeDetailsBtn").addEventListener("click", () => {
        $("customerDetailsPanel").hidden = true;
        selectedCustomerId = null;
    });

    $("logoutBtn").addEventListener("click", () => {
        localStorage.removeItem(SESSION_KEY);
        location.href = "./index.html";
    });

    syncCustomersFromSales();
    renderCustomers();
});
