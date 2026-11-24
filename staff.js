
document.addEventListener("DOMContentLoaded", () => {
    const USER_KEY = "ims_single_user";
    const SESSION_KEY = "ims_current_user";
    const STAFF_KEY = "ims_staff";
    const ATTENDANCE_KEY = "ims_attendance";
    const PAYROLL_KEY = "ims_payroll";
    const EXPENSES_KEY = "ims_expenses";

    const user = JSON.parse(localStorage.getItem(USER_KEY) || "null");

    if (!user || !localStorage.getItem(SESSION_KEY)) {
        location.href = "./index.html";
        return;
    }

    const userId = String(user.id || user.name);
    const $ = id => document.getElementById(id);

    let staff = read(STAFF_KEY);
    let attendance = read(ATTENDANCE_KEY);
    let payroll = read(PAYROLL_KEY);

    function read(key) {
        try {
            const data = JSON.parse(localStorage.getItem(key) || "[]");
            return Array.isArray(data) ? data : [];
        } catch {
            return [];
        }
    }

    function save(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
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
        staff = read(STAFF_KEY);
        attendance = read(ATTENDANCE_KEY);
        payroll = read(PAYROLL_KEY);
    }

    function getStaffName(id) {
        return staff.find(person => String(person.id) === String(id))?.name || "Unknown Staff";
    }

    function getPayrollStatus(record) {
        if (Number(record.paid || 0) >= Number(record.netSalary || 0)) return "Paid";
        if (Number(record.paid || 0) > 0) return "Partial";
        return "Unpaid";
    }

    function getDue(record) {
        return Math.max(0, Number(record.netSalary || 0) - Number(record.paid || 0));
    }

    function renderStaffOptions() {
        const active = staff.filter(person => person.status === "Active");

        ["attendanceStaff", "payrollStaff"].forEach(id => {
            const select = $(id);
            const previous = select.value;
            select.innerHTML = '<option value="">Select Staff</option>';

            active.forEach(person => {
                const option = document.createElement("option");
                option.value = person.id;
                option.textContent = person.name;
                select.appendChild(option);
            });

            if (active.some(person => String(person.id) === previous)) {
                select.value = previous;
            }
        });

        const filter = $("attendanceStaffFilter");
        const previousFilter = filter.value;
        filter.innerHTML = '<option value="all">All Staff</option>';

        staff.forEach(person => {
            const option = document.createElement("option");
            option.value = person.id;
            option.textContent = person.name;
            filter.appendChild(option);
        });

        filter.value = previousFilter || "all";
    }

    function renderStats() {
        const active = staff.filter(person => person.status === "Active");
        const month = new Date().toISOString().slice(0, 7);
        const currentPayroll = payroll.filter(record => record.month === month);

        $("totalStaff").textContent = staff.length;
        $("activeStaff").textContent = active.length;
        $("monthlyPayroll").textContent = "Rs. " + money(
            active.reduce((sum, person) => sum + Number(person.basicSalary || 0), 0)
        );
        $("salaryOutstanding").textContent = "Rs. " + money(
            payroll.reduce((sum, record) => sum + getDue(record), 0)
        );
    }

    function renderStaff() {
        refreshData();
        const query = $("staffSearch").value.trim().toLowerCase();

        const filtered = staff.filter(person =>
            [person.name, person.contact, person.role, person.department]
                .join(" ").toLowerCase().includes(query)
        );

        $("staffTable").innerHTML = "";

        filtered.forEach((person, index) => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${escapeHTML(person.name)}</td>
                <td>${escapeHTML(person.contact)}</td>
                <td>${escapeHTML(person.role)}</td>
                <td>${escapeHTML(person.department || "—")}</td>
                <td>Rs. ${money(person.basicSalary)}</td>
                <td>${escapeHTML(person.status)}</td>
                <td class="actions">
                    <button type="button" data-action="edit" data-id="${escapeHTML(person.id)}">Edit</button>
                    <button type="button" class="danger" data-action="delete" data-id="${escapeHTML(person.id)}">Delete</button>
                </td>
            `;
            $("staffTable").appendChild(row);
        });

        $("staffEmpty").hidden = filtered.length > 0;
        renderStats();
        renderStaffOptions();
    }

    function resetStaffForm() {
        $("staffForm").reset();
        $("staffId").value = "";
        $("staffFormHeading").textContent = "Add Staff Member";
        $("saveStaffBtn").textContent = "Save Staff";
        $("cancelStaffEdit").hidden = true;
    }

    function editStaff(id) {
        const person = staff.find(item => String(item.id) === String(id));
        if (!person) return;

        $("staffId").value = person.id;
        $("staffName").value = person.name;
        $("staffContact").value = person.contact;
        $("staffEmail").value = person.email || "";
        $("staffRole").value = person.role;
        $("staffDepartment").value = person.department || "";
        $("joiningDate").value = person.joiningDate || "";
        $("basicSalary").value = person.basicSalary;
        $("staffStatus").value = person.status;
        $("staffAddress").value = person.address || "";

        $("staffFormHeading").textContent = "Edit Staff Member";
        $("saveStaffBtn").textContent = "Update Staff";
        $("cancelStaffEdit").hidden = false;
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    $("staffForm").addEventListener("submit", event => {
        event.preventDefault();
        refreshData();

        const id = $("staffId").value;
        const contact = $("staffContact").value.trim();

        const duplicate = staff.find(person =>
            String(person.id) !== String(id) &&
            person.contact.trim().toLowerCase() === contact.toLowerCase()
        );

        if (duplicate) {
            notify("A staff member with this contact number already exists.", "error");
            return;
        }

        const data = {
            name: $("staffName").value.trim(),
            contact,
            email: $("staffEmail").value.trim(),
            role: $("staffRole").value.trim(),
            department: $("staffDepartment").value.trim(),
            joiningDate: $("joiningDate").value,
            basicSalary: Number($("basicSalary").value),
            status: $("staffStatus").value,
            address: $("staffAddress").value.trim()
        };

        if (!Number.isFinite(data.basicSalary) || data.basicSalary < 0) {
            notify("Enter a valid salary amount.", "error");
            return;
        }

        if (id) {
            const person = staff.find(item => String(item.id) === String(id));
            if (!person) return;
            Object.assign(person, data, { updatedAt: new Date().toISOString() });
        } else {
            staff.push({
                id: "STF-" + Date.now() + "-" + Math.floor(Math.random() * 10000),
                ...data,
                createdAt: new Date().toISOString()
            });
        }

        save(STAFF_KEY, staff);
        resetStaffForm();
        renderStaff();
        notify(id ? "Staff details updated." : "Staff member added.");
    });

    $("staffTable").addEventListener("click", event => {
        const button = event.target.closest("button[data-action]");
        if (!button) return;

        const id = button.dataset.id;

        if (button.dataset.action === "edit") {
            editStaff(id);
        }

        if (button.dataset.action === "delete") {
            const hasPayroll = payroll.some(record => String(record.staffId) === String(id));

            if (hasPayroll) {
                notify("This staff member has payroll history. Set their status to Inactive instead of deleting them.", "error");
                return;
            }

            if (!confirm("Delete this staff member?")) return;

            staff = staff.filter(person => String(person.id) !== String(id));
            save(STAFF_KEY, staff);
            renderStaff();
            notify("Staff member deleted.");
        }
    });

    $("cancelStaffEdit").addEventListener("click", resetStaffForm);

    function renderAttendance() {
        refreshData();

        const month = $("attendanceMonth").value;
        const staffFilter = $("attendanceStaffFilter").value;

        const filtered = attendance
            .filter(record => !month || record.date.startsWith(month))
            .filter(record => staffFilter === "all" || String(record.staffId) === staffFilter)
            .sort((a, b) => b.date.localeCompare(a.date));

        $("attendanceTable").innerHTML = "";

        filtered.forEach(record => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${escapeHTML(record.date)}</td>
                <td>${escapeHTML(getStaffName(record.staffId))}</td>
                <td>${escapeHTML(record.status)}</td>
                <td>${money(record.overtimeHours)} hrs</td>
                <td><button type="button" class="danger" data-delete-attendance="${escapeHTML(record.id)}">Delete</button></td>
            `;
            $("attendanceTable").appendChild(row);
        });
    }

    $("attendanceForm").addEventListener("submit", event => {
        event.preventDefault();
        refreshData();

        const staffId = $("attendanceStaff").value;
        const date = $("attendanceDate").value;
        const hours = Number($("attendanceHours").value || 0);

        if (!staffId || !date || hours < 0 || !Number.isFinite(hours)) {
            notify("Please enter valid attendance details.", "error");
            return;
        }

        const existing = attendance.find(record =>
            String(record.staffId) === String(staffId) && record.date === date
        );

        if (existing) {
            existing.status = $("attendanceStatus").value;
            existing.overtimeHours = hours;
        } else {
            attendance.push({
                id: "ATT-" + Date.now(),
                staffId,
                date,
                status: $("attendanceStatus").value,
                overtimeHours: hours
            });
        }

        save(ATTENDANCE_KEY, attendance);
        $("attendanceHours").value = "0";
        renderAttendance();
        notify("Attendance saved.");
    });

    $("attendanceTable").addEventListener("click", event => {
        const button = event.target.closest("[data-delete-attendance]");
        if (!button) return;

        if (!confirm("Delete this attendance record?")) return;

        attendance = attendance.filter(record =>
            String(record.id) !== String(button.dataset.deleteAttendance)
        );

        save(ATTENDANCE_KEY, attendance);
        renderAttendance();
        notify("Attendance record deleted.");
    });

    function calculateSalary() {
        const person = staff.find(item =>
            String(item.id) === String($("payrollStaff").value)
        );

        const basic = Number(person?.basicSalary || 0);
        const allowance = Number($("salaryAllowance").value || 0);
        const hours = Number($("overtimeHours").value || 0);
        const rate = Number($("overtimeRate").value || 0);
        const deduction = Number($("salaryDeduction").value || 0);
        const overtime = hours * rate;
        const net = Math.max(0, basic + allowance + overtime - deduction);

        $("calcBasic").textContent = "Rs. " + money(basic);
        $("calcAllowance").textContent = "Rs. " + money(allowance);
        $("calcOvertime").textContent = "Rs. " + money(overtime);
        $("calcDeduction").textContent = "Rs. " + money(deduction);
        $("calcNet").textContent = "Rs. " + money(net);

        return { basic, allowance, hours, rate, overtime, deduction, net };
    }

    [
        "payrollStaff", "salaryAllowance", "overtimeHours",
        "overtimeRate", "salaryDeduction"
    ].forEach(id => $(id).addEventListener("input", calculateSalary));

    $("payrollForm").addEventListener("submit", event => {
        event.preventDefault();
        refreshData();

        const staffId = $("payrollStaff").value;
        const month = $("payrollMonth").value;
        const person = staff.find(item => String(item.id) === String(staffId));

        if (!person || !month) {
            notify("Select a staff member and salary month.", "error");
            return;
        }

        const existing = payroll.find(record =>
            String(record.staffId) === String(staffId) && record.month === month
        );

        if (existing) {
            notify("Payroll already exists for this staff member and month.", "error");
            return;
        }

        const calculation = calculateSalary();

        if (calculation.net <= 0) {
            notify("Net salary must be greater than zero.", "error");
            return;
        }

        payroll.push({
            id: "PAYROLL-" + Date.now() + "-" + Math.floor(Math.random() * 10000),
            staffId,
            staffName: person.name,
            month,
            basic: calculation.basic,
            allowance: calculation.allowance,
            overtimeHours: calculation.hours,
            overtimeRate: calculation.rate,
            overtime: calculation.overtime,
            deduction: calculation.deduction,
            netSalary: calculation.net,
            paid: 0,
            createdAt: new Date().toISOString()
        });

        save(PAYROLL_KEY, payroll);
        renderPayroll();
        renderStats();
        notify("Payroll generated successfully.");
    });

    function renderPayroll() {
        refreshData();

        const query = $("payrollSearch").value.trim().toLowerCase();
        const statusFilter = $("payrollStatusFilter").value;

        const filtered = payroll
            .filter(record => {
                const status = getPayrollStatus(record);
                const text = `${record.staffName} ${record.month}`.toLowerCase();

                return text.includes(query) &&
                    (statusFilter === "all" || status === statusFilter);
            })
            .sort((a, b) => b.month.localeCompare(a.month));

        $("payrollTable").innerHTML = "";

        filtered.forEach(record => {
            const due = getDue(record);
            const status = getPayrollStatus(record);

            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${escapeHTML(record.staffName)}</td>
                <td>${escapeHTML(record.month)}</td>
                <td>Rs. ${money(record.basic)}</td>
                <td>Rs. ${money(record.allowance)}</td>
                <td>Rs. ${money(record.overtime)}</td>
                <td>Rs. ${money(record.deduction)}</td>
                <td>Rs. ${money(record.netSalary)}</td>
                <td>Rs. ${money(record.paid)}</td>
                <td>Rs. ${money(due)}</td>
                <td>${status}</td>
                <td class="actions">
                    <button type="button" data-pay="${escapeHTML(record.id)}">Pay</button>
                    <button type="button" class="secondary" data-slip="${escapeHTML(record.id)}">Payslip</button>
                </td>
            `;
            $("payrollTable").appendChild(row);
        });

        $("payrollEmpty").hidden = filtered.length > 0;
        renderStats();
    }

    function recordSalaryPayment(payrollId) {
        refreshData();

        const record = payroll.find(item => String(item.id) === String(payrollId));
        if (!record) return;

        const due = getDue(record);

        if (due <= 0) {
            notify("This salary has already been fully paid.", "error");
            return;
        }

        const input = prompt(
            `Outstanding salary: Rs. ${money(due)}\nEnter payment amount:`
        );

        if (input === null) return;

        const amount = Number(input);

        if (!Number.isFinite(amount) || amount <= 0 || amount > due) {
            notify("Enter an amount greater than zero and not exceeding the outstanding salary.", "error");
            return;
        }

        const paymentDate = new Date().toISOString().slice(0, 10);
        record.paid = Number(record.paid || 0) + amount;

        const expenses = read(EXPENSES_KEY);
        expenses.push({
            id: "EXP-SALARY-" + Date.now() + "-" + Math.floor(Math.random() * 10000),
            userId,
            title: "Salary Payment - " + record.staffName,
            category: "Salary",
            amount,
            date: paymentDate,
            payment: "Cash",
            reference: record.id,
            description: `Salary payment for ${record.month}. Payroll ID: ${record.id}`,
            staffId: record.staffId,
            payrollId: record.id,
            createdAt: new Date().toISOString()
        });

        save(PAYROLL_KEY, payroll);
        save(EXPENSES_KEY, expenses);

        renderPayroll();
        renderStats();
        notify("Salary payment recorded and added to expenses.");
    }

    function printPayslip(payrollId) {
        const record = payroll.find(item => String(item.id) === String(payrollId));
        if (!record) return;

        const due = getDue(record);
        const printWindow = window.open("", "_blank");

        if (!printWindow) {
            notify("Please allow pop-ups to print the payslip.", "error");
            return;
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Salary Payslip</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 35px; color: #222; }
                    .slip { max-width: 700px; margin: auto; border: 1px solid #ddd; padding: 30px; }
                    h1, h2 { text-align: center; }
                    table { width: 100%; border-collapse: collapse; margin-top: 25px; }
                    td { padding: 12px; border-bottom: 1px solid #ddd; }
                    td:last-child { text-align: right; }
                    .total { font-weight: bold; font-size: 18px; }
                    .footer { margin-top: 40px; display: flex; justify-content: space-between; }
                    @media print { button { display: none; } }
                </style>
            </head>
            <body>
                <div class="slip">
                    <h1>INVENTORY MANAGEMENT SYSTEM</h1>
                    <h2>Salary Payslip</h2>
                    <p><strong>Employee:</strong> ${escapeHTML(record.staffName)}</p>
                    <p><strong>Salary Month:</strong> ${escapeHTML(record.month)}</p>
                    <p><strong>Payroll ID:</strong> ${escapeHTML(record.id)}</p>
                    <table>
                        <tr><td>Basic Salary</td><td>Rs. ${money(record.basic)}</td></tr>
                        <tr><td>Allowances</td><td>Rs. ${money(record.allowance)}</td></tr>
                        <tr><td>Overtime (${money(record.overtimeHours)} hours)</td><td>Rs. ${money(record.overtime)}</td></tr>
                        <tr><td>Deductions</td><td>- Rs. ${money(record.deduction)}</td></tr>
                        <tr class="total"><td>Net Salary</td><td>Rs. ${money(record.netSalary)}</td></tr>
                        <tr><td>Amount Paid</td><td>Rs. ${money(record.paid)}</td></tr>
                        <tr class="total"><td>Remaining Due</td><td>Rs. ${money(due)}</td></tr>
                    </table>
                    <div class="footer">
                        <span>Employee Signature: ______________</span>
                        <span>Authorized By: ______________</span>
                    </div>
                    <p style="text-align:center;margin-top:30px;">Generated by Inventory Management System</p>
                    <button onclick="window.print()">Print Payslip</button>
                </div>
            </body>
            </html>
        `);

        printWindow.document.close();
    }

    $("payrollTable").addEventListener("click", event => {
        const payButton = event.target.closest("[data-pay]");
        const slipButton = event.target.closest("[data-slip]");

        if (payButton) recordSalaryPayment(payButton.dataset.pay);
        if (slipButton) printPayslip(slipButton.dataset.slip);
    });

    $("payrollSearch").addEventListener("input", renderPayroll);
    $("payrollStatusFilter").addEventListener("change", renderPayroll);
    $("attendanceMonth").addEventListener("change", renderAttendance);
    $("attendanceStaffFilter").addEventListener("change", renderAttendance);

    $("logoutBtn").addEventListener("click", () => {
        localStorage.removeItem(SESSION_KEY);
        location.href = "./index.html";
    });

    const today = new Date().toISOString().slice(0, 10);
    $("joiningDate").value = today;
    $("attendanceDate").value = today;
    $("attendanceMonth").value = today.slice(0, 7);
    $("payrollMonth").value = today.slice(0, 7);

    renderStaff();
    renderAttendance();
    calculateSalary();
    renderPayroll();
});
