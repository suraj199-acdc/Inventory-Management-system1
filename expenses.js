
document.addEventListener("DOMContentLoaded", () => {

    // =====================================
    // AUTHENTICATION
    // =====================================

   
const USER_KEY = "ims_single_user";
const SESSION_KEY = "ims_current_user";
const savedUser = localStorage.getItem(USER_KEY);
const session = localStorage.getItem(SESSION_KEY);

if (!savedUser || !session) {
    window.location.replace("index.html");
    return;
}

let user;
try {
    user = JSON.parse(savedUser);
} catch (error) {
    console.error("Invalid user data:", error);
    window.location.replace("index.html");
    return;
}

if (!user || !user.name) {
    window.location.replace("index.html");
    return;
}

const userId = String(user.id || user.name);
const userName = user.name;
const userAvatar = document.getElementById("userAvatar");

if (userAvatar) {
    userAvatar.textContent = userName.charAt(0).toUpperCase();
}



    // =====================================
    // STORAGE
    // =====================================

    const STORAGE_KEY = "ims_expenses";

    function getExpenses() {
        try {
            const expenses = JSON.parse(
                localStorage.getItem(STORAGE_KEY) || "[]"
            );

            if (!Array.isArray(expenses)) return [];

            return expenses.filter(expense =>
                expense.userId === String(userId)
            );

        } catch (error) {
            console.error("Expense loading error:", error);
            return [];
        }
    }

    function saveExpenses(expenses) {

        const allExpenses = JSON.parse(
            localStorage.getItem(STORAGE_KEY) || "[]"
        );

        const otherUsers = Array.isArray(allExpenses)
            ? allExpenses.filter(
                expense => expense.userId !== String(userId)
            )
            : [];

        const currentUserExpenses = expenses.map(expense => ({
            ...expense,
            userId: String(userId)
        }));

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify([
                ...otherUsers,
                ...currentUserExpenses
            ])
        );
    }


    // =====================================
    // ELEMENTS
    // =====================================

    const expenseForm = document.getElementById("expenseForm");

    const expenseId = document.getElementById("expenseId");
    const expenseTitle = document.getElementById("expenseTitle");
    const expenseCategory = document.getElementById("expenseCategory");
    const expenseAmount = document.getElementById("expenseAmount");
    const expenseDate = document.getElementById("expenseDate");
    const paymentMethod = document.getElementById("paymentMethod");
    const expenseReference = document.getElementById("expenseReference");
    const expenseDescription = document.getElementById("expenseDescription");

    const expenseTableBody = document.getElementById("expenseTableBody");

    const searchExpense = document.getElementById("searchExpense");
    const filterCategory = document.getElementById("filterCategory");
    const filterStartDate = document.getElementById("filterStartDate");
    const filterEndDate = document.getElementById("filterEndDate");

    const submitBtn = document.getElementById("submitBtn");

    let expenses = getExpenses();


    // =====================================
    // HELPERS
    // =====================================

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[char]);
    }

    function formatMoney(amount) {
        return "Rs. " + Number(amount).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function todayDate() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const day = String(today.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    function generateId() {
        return "EXP-" + Date.now() + "-" +
            Math.random().toString(36).slice(2, 7);
    }


    // =====================================
    // CURRENT DATE
    // =====================================

    document.getElementById("currentDate").textContent =
        new Date().toLocaleDateString("en-US", {
            weekday: "short",
            year: "numeric",
            month: "short",
            day: "numeric"
        });

    expenseDate.max = todayDate();
    expenseDate.value = todayDate();


    // =====================================
    // SUMMARY CARDS
    // =====================================

    function updateSummary() {

        const total = expenses.reduce(
            (sum, expense) => sum + Number(expense.amount),
            0
        );

        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        const monthly = expenses
            .filter(expense => {
                const date = new Date(expense.date + "T00:00:00");

                return (
                    date.getMonth() === currentMonth &&
                    date.getFullYear() === currentYear
                );
            })
            .reduce(
                (sum, expense) => sum + Number(expense.amount),
                0
            );

        const average = expenses.length
            ? total / expenses.length
            : 0;

        document.getElementById("totalExpenses").textContent =
            formatMoney(total);

        document.getElementById("monthlyExpenses").textContent =
            formatMoney(monthly);

        document.getElementById("totalTransactions").textContent =
            expenses.length;

        document.getElementById("averageExpense").textContent =
            formatMoney(average);
    }


    // =====================================
    // DISPLAY EXPENSES
    // =====================================

    function renderExpenses() {

        const search = searchExpense.value.toLowerCase().trim();
        const category = filterCategory.value;
        const startDate = filterStartDate.value;
        const endDate = filterEndDate.value;

        const filteredExpenses = expenses.filter(expense => {

            const matchesSearch = [
                expense.id,
                expense.title,
                expense.category,
                expense.payment,
                expense.reference,
                expense.description
            ].some(value =>
                String(value || "").toLowerCase().includes(search)
            );

            const matchesCategory =
                !category || expense.category === category;

            const matchesStart =
                !startDate || expense.date >= startDate;

            const matchesEnd =
                !endDate || expense.date <= endDate;

            return (
                matchesSearch &&
                matchesCategory &&
                matchesStart &&
                matchesEnd
            );
        });

        filteredExpenses.sort((a, b) =>
            b.date.localeCompare(a.date) ||
            b.createdAt - a.createdAt
        );

        if (filteredExpenses.length === 0) {

            expenseTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        No matching expenses found.
                    </td>
                </tr>
            `;

        } else {

            expenseTableBody.innerHTML = filteredExpenses.map(expense => `
                <tr>
                    <td>${escapeHTML(expense.id.slice(0, 12))}</td>

                    <td>
                        <strong>${escapeHTML(expense.title)}</strong>
                    </td>

                    <td>${escapeHTML(expense.category)}</td>

                    <td>
                        <strong>${formatMoney(expense.amount)}</strong>
                    </td>

                    <td>${escapeHTML(expense.payment)}</td>

                    <td>${escapeHTML(expense.date)}</td>

                    <td>
                        <div class="action-buttons">

                            <button
                                class="edit-btn"
                                data-id="${escapeHTML(expense.id)}"
                                type="button">
                                Edit
                            </button>

                            <button
                                class="delete-btn"
                                data-id="${escapeHTML(expense.id)}"
                                type="button">
                                Delete
                            </button>

                        </div>
                    </td>
                </tr>
            `).join("");
        }

        document.getElementById("recordCount").textContent =
            `Showing ${filteredExpenses.length} of ${expenses.length} expenses`;
    }


    // =====================================
    // ADD / UPDATE EXPENSE
    // =====================================

    expenseForm.addEventListener("submit", function(event) {

        event.preventDefault();

        const title = expenseTitle.value.trim();
        const category = expenseCategory.value;
        const amount = Number(expenseAmount.value);
        const date = expenseDate.value;
        const payment = paymentMethod.value;
        const reference = expenseReference.value.trim();
        const description = expenseDescription.value.trim();

        if (!title || !category || !date || !payment) {
            alert("Please complete all required fields.");
            return;
        }

        if (!Number.isFinite(amount) || amount <= 0) {
            alert("Please enter a valid expense amount.");
            return;
        }

        if (date > todayDate()) {
            alert("Future expense dates are not allowed.");
            return;
        }

        const existingId = expenseId.value;

        if (existingId) {

            const index = expenses.findIndex(
                expense => expense.id === existingId
            );

            if (index === -1) {
                alert("Expense record not found.");
                return;
            }

            expenses[index] = {
                ...expenses[index],
                title,
                category,
                amount,
                date,
                payment,
                reference,
                description,
                updatedAt: Date.now()
            };

            alert("Expense updated successfully!");

        } else {

            expenses.push({
                id: generateId(),
                userId: String(userId),
                title,
                category,
                amount,
                date,
                payment,
                reference,
                description,
                createdAt: Date.now()
            });

            alert("Expense added successfully!");
        }

        saveExpenses(expenses);

        expenseForm.reset();
        expenseId.value = "";
        expenseDate.value = todayDate();

        submitBtn.textContent = "+ Add Expense";

        updateSummary();
        renderExpenses();
    });


    // =====================================
    // EDIT / DELETE
    // =====================================

    expenseTableBody.addEventListener("click", function(event) {

        const editButton = event.target.closest(".edit-btn");
        const deleteButton = event.target.closest(".delete-btn");

        if (editButton) {

            const id = editButton.dataset.id;

            const expense = expenses.find(
                item => item.id === id
            );

            if (!expense) return;

            expenseId.value = expense.id;
            expenseTitle.value = expense.title;
            expenseCategory.value = expense.category;
            expenseAmount.value = expense.amount;
            expenseDate.value = expense.date;
            paymentMethod.value = expense.payment;
            expenseReference.value = expense.reference || "";
            expenseDescription.value = expense.description || "";

            submitBtn.textContent = "Update Expense";

            expenseForm.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }

        if (deleteButton) {

            const id = deleteButton.dataset.id;

            const expense = expenses.find(
                item => item.id === id
            );

            if (!expense) return;

            const confirmDelete = confirm(
                `Are you sure you want to delete "${expense.title}"?`
            );

            if (!confirmDelete) return;

            expenses = expenses.filter(
                item => item.id !== id
            );

            saveExpenses(expenses);

            if (expenseId.value === id) {
                expenseForm.reset();
                expenseId.value = "";
                expenseDate.value = todayDate();
                submitBtn.textContent = "+ Add Expense";
            }

            updateSummary();
            renderExpenses();

            alert("Expense deleted successfully!");
        }
    });


    // =====================================
    // SEARCH & FILTER
    // =====================================

    searchExpense.addEventListener("input", renderExpenses);

    filterCategory.addEventListener("change", renderExpenses);

    filterStartDate.addEventListener("change", renderExpenses);

    filterEndDate.addEventListener("change", function() {

        if (
            filterStartDate.value &&
            filterEndDate.value &&
            filterEndDate.value < filterStartDate.value
        ) {
            alert("End date cannot be earlier than start date.");
            filterEndDate.value = "";
        }

        renderExpenses();
    });

    document.getElementById("clearFilters").addEventListener("click", () => {

        searchExpense.value = "";
        filterCategory.value = "";
        filterStartDate.value = "";
        filterEndDate.value = "";

        renderExpenses();
    });


    // =====================================
    // RESET FORM
    // =====================================

    document.getElementById("resetBtn").addEventListener("click", () => {

        setTimeout(() => {
            expenseId.value = "";
            expenseDate.value = todayDate();
            submitBtn.textContent = "+ Add Expense";
        }, 0);
    });


    // =====================================
    // EXPORT CSV
    // =====================================

    document.getElementById("exportBtn").addEventListener("click", () => {

        if (expenses.length === 0) {
            alert("No expenses available to export.");
            return;
        }

        const headers = [
            "Expense ID",
            "Title",
            "Category",
            "Amount",
            "Payment Method",
            "Date",
            "Reference",
            "Description"
        ];

        function csvEscape(value) {
            return '"' + String(value ?? "").replace(/"/g, '""') + '"';
        }

        const rows = expenses.map(expense => [
            expense.id,
            expense.title,
            expense.category,
            expense.amount,
            expense.payment,
            expense.date,
            expense.reference,
            expense.description
        ]);

        const csvContent = [
            headers,
            ...rows
        ].map(row =>
            row.map(csvEscape).join(",")
        ).join("\r\n");

        const blob = new Blob(
            ["\uFEFF" + csvContent],
            { type: "text/csv;charset=utf-8;" }
        );

        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");

        link.href = url;
        link.download = "IMS_Expenses_" + todayDate() + ".csv";

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);
    });


    // =====================================
    // LOGOUT
    // =====================================

    document.getElementById("logoutBtn").addEventListener("click", () => {

        if (confirm("Are you sure you want to logout?")) {

            localStorage.removeItem("user_id");
            localStorage.removeItem("user_name");

            window.location.href = "index.html";
        }
    });


    // =====================================
    // INITIALIZE
    // =====================================

    updateSummary();
    renderExpenses();

});
