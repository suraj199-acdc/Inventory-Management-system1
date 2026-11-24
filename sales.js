
document.addEventListener("DOMContentLoaded", () => {
    const USER_KEY = "ims_single_user";
    const SESSION_KEY = "ims_current_user";
    const PRODUCTS_KEY = "ims_products";
    const SALES_KEY = "ims_sales";
    const CUSTOMERS_KEY = "ims_customers";

    const user = JSON.parse(localStorage.getItem(USER_KEY) || "null");

    if (!user || !localStorage.getItem(SESSION_KEY)) {
        window.location.href = "./index.html";
        return;
    }

    const cart = document.getElementById("cart");
    const salesForm = document.getElementById("salesForm");
    const addRowButton = document.getElementById("addRowButton");
    const totalElement = document.getElementById("total");
    const paymentTotal = document.getElementById("paymentTotal");
    const amountPaidInput = document.getElementById("amountPaid");
    const paidPreview = document.getElementById("paidPreview");
    const duePreview = document.getElementById("duePreview");
    const paymentStatusPreview = document.getElementById("paymentStatusPreview");
    const salesTable = document.getElementById("salesTable");
    const salesSearch = document.getElementById("salesSearch");
    const emptyMessage = document.getElementById("emptyMessage");
    const message = document.getElementById("message");

    let products = getData(PRODUCTS_KEY);
    let sales = getData(SALES_KEY);
    let customers = getData(CUSTOMERS_KEY);

    function getData(key) {
        try {
            const data = JSON.parse(localStorage.getItem(key) || "[]");
            return Array.isArray(data) ? data : [];
        } catch {
            return [];
        }
    }

    function saveData(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }

    function money(value) {
        return Number(value || 0).toFixed(2);
    }

    function showMessage(text, type = "success") {
        message.textContent = text;
        message.className = `message ${type}`;
        message.style.display = "block";

        setTimeout(() => {
            message.style.display = "none";
        }, 4000);
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

    function getProductId(product) {
        return String(product.id);
    }

    function findCustomer(name, contact) {
        const normalizedContact = String(contact || "").trim().toLowerCase();

        return customers.find(customer =>
            String(customer.contact || "").trim().toLowerCase() === normalizedContact &&
            normalizedContact !== ""
        ) || customers.find(customer =>
            String(customer.name || "").trim().toLowerCase() === String(name).trim().toLowerCase()
        );
    }

    function getOrCreateCustomer(name, contact) {
        let customer = findCustomer(name, contact);

        if (customer) {
            customer.name = name;
            customer.contact = contact;
            customer.updatedAt = new Date().toISOString();
            return customer;
        }

        customer = {
            id: "CUS-" + Date.now() + "-" + Math.floor(Math.random() * 10000),
            name,
            contact,
            email: "",
            address: "",
            notes: "",
            createdAt: new Date().toISOString()
        };

        customers.push(customer);
        return customer;
    }

    function getProductStock(product) {
        return Number(product.quantity ?? product.stock ?? 0);
    }

    function getProductPrice(product) {
        return Number(product.price ?? 0);
    }

    function createProductOptions(select, selectedValue = "") {
        select.innerHTML = '<option value="">Select Product</option>';

        products.forEach(product => {
            const option = document.createElement("option");
            option.value = getProductId(product);
            option.textContent = `${product.name} — Rs. ${money(getProductPrice(product))} (Stock: ${getProductStock(product)})`;
            option.selected = String(selectedValue) === String(product.id);
            select.appendChild(option);
        });
    }

    function refreshAllProductOptions() {
        document.querySelectorAll(".product-select").forEach(select => {
            const selectedValue = select.value;
            createProductOptions(select, selectedValue);
        });
    }

    function updateRowPreview(row) {
        const select = row.querySelector(".product-select");
        const preview = row.querySelector(".preview");
        const product = products.find(item => String(item.id) === String(select.value));

        if (product) {
            const image = product.image || product.imageUrl || "";
            if (image) {
                preview.src = image;
                preview.hidden = false;
            } else {
                preview.removeAttribute("src");
                preview.hidden = true;
            }
        } else {
            preview.removeAttribute("src");
            preview.hidden = true;
        }

        updateTotal();
    }

    function addRow() {
        const row = document.createElement("div");
        row.className = "cart-row";

        row.innerHTML = `
            <div class="product-field">
                <input type="text" class="product-search" placeholder="Search product..." autocomplete="off">
                <select class="product-select" required>
                    <option value="">Select Product</option>
                </select>
            </div>
            <input type="number" class="quantity-input" placeholder="Quantity" min="1" step="1" required>
            <img class="preview" alt="Product preview" hidden>
            <button type="button" class="remove-row" title="Remove product">Remove</button>
        `;

        cart.appendChild(row);
        createProductOptions(row.querySelector(".product-select"));
        updateRemoveButtons();
    }

    function updateRemoveButtons() {
        const rows = cart.querySelectorAll(".cart-row");

        rows.forEach(row => {
            const button = row.querySelector(".remove-row");
            button.disabled = rows.length === 1;
        });
    }

    function getCartItems() {
        const items = [];

        cart.querySelectorAll(".cart-row").forEach(row => {
            const productId = row.querySelector(".product-select").value;
            const quantity = Number(row.querySelector(".quantity-input").value);
            const product = products.find(item => String(item.id) === String(productId));

            if (product && quantity > 0) {
                items.push({
                    product,
                    quantity,
                    price: getProductPrice(product)
                });
            }
        });

        return items;
    }

    function updateTotal() {
        const items = getCartItems();
        const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const paid = Math.max(0, Number(amountPaidInput.value || 0));
        const due = Math.max(0, total - paid);

        totalElement.textContent = money(total);
        paymentTotal.textContent = money(total);
        paidPreview.textContent = money(paid);
        duePreview.textContent = money(due);

        if (total > 0 && paid >= total) {
            paymentStatusPreview.textContent = "Paid";
        } else if (paid > 0) {
            paymentStatusPreview.textContent = "Partial";
        } else {
            paymentStatusPreview.textContent = "Unpaid";
        }
    }

    function getPaymentStatus(total, paid) {
        if (paid >= total) return "Paid";
        if (paid > 0) return "Partial";
        return "Unpaid";
    }

    function recordSale(event) {
        event.preventDefault();

        products = getData(PRODUCTS_KEY);
        sales = getData(SALES_KEY);
        customers = getData(CUSTOMERS_KEY);

        const items = getCartItems();
        const customerName = document.getElementById("customerName").value.trim();
        const customerContact = document.getElementById("customerContact").value.trim();
        const paymentMethod = document.getElementById("paymentMethod").value;
        const amountPaid = Number(amountPaidInput.value || 0);

        if (!items.length) {
            showMessage("Please select at least one product and enter its quantity.", "error");
            return;
        }

        if (!customerName || !customerContact) {
            showMessage("Please enter customer name and contact.", "error");
            return;
        }

        const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

        if (!Number.isFinite(amountPaid) || amountPaid < 0 || amountPaid > total) {
            showMessage("Amount paid must be between Rs. 0 and the sale total.", "error");
            return;
        }

        for (const item of items) {
            const currentProduct = products.find(product =>
                String(product.id) === String(item.product.id)
            );

            if (!currentProduct || getProductStock(currentProduct) < item.quantity) {
                showMessage(`Insufficient stock for ${item.product.name}.`, "error");
                return;
            }
        }

        const customer = getOrCreateCustomer(customerName, customerContact);
        const saleId = "SALE-" + Date.now() + "-" + Math.floor(Math.random() * 10000);
        const saleDate = new Date().toISOString();
        const due = total - amountPaid;
        const paymentStatus = getPaymentStatus(total, amountPaid);

        const newRecords = items.map((item, index) => {
            const currentProduct = products.find(product =>
                String(product.id) === String(item.product.id)
            );

            currentProduct.quantity = getProductStock(currentProduct) - item.quantity;

            return {
                id: Date.now() + index,
                sale_id: saleId,
                customer_id: customer.id,
                product_id: item.product.id,
                product_name: item.product.name,
                quantity: item.quantity,
                price: item.price,
                customer_name: customerName,
                customer_contact: customerContact,
                product_image: item.product.image || item.product.imageUrl || "",
                payment_method: paymentMethod,
                sale_date: saleDate,
                total: item.price * item.quantity,
                sale_total: total,
                amount_paid: amountPaid,
                due_amount: due,
                payment_status: paymentStatus
            };
        });

        sales.push(...newRecords);

        saveData(PRODUCTS_KEY, products);
        saveData(SALES_KEY, sales);
        saveData(CUSTOMERS_KEY, customers);

        salesForm.reset();
        amountPaidInput.value = "0";

        const rows = cart.querySelectorAll(".cart-row");
        rows.forEach((row, index) => {
            if (index > 0) row.remove();
        });

        const firstRow = cart.querySelector(".cart-row");
        firstRow.querySelector(".product-select").value = "";
        firstRow.querySelector(".product-search").value = "";
        firstRow.querySelector(".quantity-input").value = "";
        firstRow.querySelector(".preview").hidden = true;

        refreshAllProductOptions();
        updateRemoveButtons();
        updateTotal();
        renderSales();

        showMessage(
            `Sale recorded! Transaction ${saleId}. Outstanding due: Rs. ${money(due)}`
        );
    }

    function renderSales() {
        sales = getData(SALES_KEY);

        const search = salesSearch.value.trim().toLowerCase();

        const filtered = [...sales].reverse().filter(sale => {
            const text = [
                sale.product_name,
                sale.customer_name,
                sale.customer_contact,
                sale.sale_id
            ].join(" ").toLowerCase();

            return text.includes(search);
        });

        salesTable.innerHTML = "";

        filtered.forEach((sale, index) => {
            const hasPaymentData =
                sale.sale_id &&
                sale.sale_total !== undefined &&
                sale.amount_paid !== undefined;

            const lineTotal = Number(sale.total || 0);
            const transactionTotal = hasPaymentData
                ? Number(sale.sale_total)
                : lineTotal;

            const paid = hasPaymentData ? Number(sale.amount_paid) : null;
            const due = hasPaymentData ? Number(sale.due_amount || 0) : null;
            const status = hasPaymentData ? sale.payment_status : "Unknown";

            const image = sale.product_image
                ? `<img src="${escapeHTML(sale.product_image)}" alt="Product" class="table-image">`
                : "—";

            const date = sale.sale_date
                ? new Date(sale.sale_date).toLocaleString()
                : "—";

            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${escapeHTML(sale.sale_id || "Legacy")}</td>
                <td>${escapeHTML(sale.product_name || "—")}</td>
                <td>${image}</td>
                <td>${Number(sale.quantity || 0)}</td>
                <td>Rs. ${money(sale.price)}</td>
                <td>Rs. ${money(lineTotal)}</td>
                <td>${escapeHTML(sale.customer_name || "—")}</td>
                <td>${escapeHTML(sale.customer_contact || "—")}</td>
                <td>${paid === null ? "Unknown" : "Rs. " + money(paid)}</td>
                <td>${due === null ? "Unknown" : "Rs. " + money(due)}</td>
                <td>${escapeHTML(status)}</td>
                <td>${escapeHTML(sale.payment_method || "—")}</td>
                <td>${escapeHTML(date)}</td>
            `;

            salesTable.appendChild(row);
        });

        emptyMessage.hidden = filtered.length > 0;
    }

    cart.addEventListener("change", event => {
        if (event.target.classList.contains("product-select")) {
            updateRowPreview(event.target.closest(".cart-row"));
        }
    });

    cart.addEventListener("input", event => {
        if (
            event.target.classList.contains("quantity-input") ||
            event.target.classList.contains("product-search")
        ) {
            if (event.target.classList.contains("quantity-input")) {
                updateTotal();
            }

            if (event.target.classList.contains("product-search")) {
                const row = event.target.closest(".cart-row");
                const search = event.target.value.trim().toLowerCase();
                const select = row.querySelector(".product-select");

                const match = products.find(product =>
                    String(product.name || "").toLowerCase().includes(search)
                );

                if (match && search) {
                    select.value = String(match.id);
                    updateRowPreview(row);
                } else if (!search) {
                    select.value = "";
                    updateRowPreview(row);
                }
            }
        }
    });

    cart.addEventListener("click", event => {
        if (event.target.classList.contains("remove-row")) {
            event.target.closest(".cart-row").remove();
            updateRemoveButtons();
            updateTotal();
        }
    });

    addRowButton.addEventListener("click", addRow);
    amountPaidInput.addEventListener("input", updateTotal);
    salesForm.addEventListener("submit", recordSale);
    salesSearch.addEventListener("input", renderSales);

    window.logout = function () {
        localStorage.removeItem(SESSION_KEY);
        window.location.href = "./index.html";
    };

    refreshAllProductOptions();
    updateRemoveButtons();
    updateTotal();
    renderSales();
});
