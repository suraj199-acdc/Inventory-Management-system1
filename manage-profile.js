
// =====================================
// MANAGE PROFILE
// GitHub Pages / localStorage version
// =====================================

const CURRENT_USER_KEY = "ims_current_user";
const USERS_KEY = "ims_users";

const STORAGE_KEYS = [
    "ims_single_user_v1",
    "ims_single_user"
];

let admin = null;
let currentStorageKey = null;

// Get data safely from localStorage
function getStorage(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        return null;
    }
}

// Save data safely to localStorage
function saveStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

// Find the logged-in admin
function loadAdmin() {
    const currentUser = getStorage(CURRENT_USER_KEY);

    if (currentUser && typeof currentUser === "object") {
        return currentUser;
    }

    // Check combined single-user storage
    for (const key of STORAGE_KEYS) {
        const data = getStorage(key);

        if (!data) continue;

        const possibleUser =
            data.currentUser ||
            data.current_user ||
            data.user ||
            data.admin;

        if (possibleUser && typeof possibleUser === "object") {
            currentStorageKey = key;
            return possibleUser;
        }
    }

    return null;
}

// Display message
function showMessage(message, type) {
    const messageBox = document.getElementById("message");

    messageBox.textContent = message;
    messageBox.className = "message " + type;
}

// Display admin details
function displayAdmin() {
    document.getElementById("adminId").textContent =
        admin.id ?? admin.user_id ?? "-";

    document.getElementById("currentName").textContent =
        admin.name ?? admin.user_name ?? "";

    document.getElementById("currentEmail").textContent =
        admin.email ?? "";

    document.getElementById("currentPhone").textContent =
        admin.phone ?? "";

    document.getElementById("createdAt").textContent =
        admin.created_at ?? admin.createdAt ?? "-";

    document.getElementById("name").value =
        admin.name ?? admin.user_name ?? "";

    document.getElementById("email").value =
        admin.email ?? "";

    document.getElementById("phone").value =
        admin.phone ?? "";
}

// Update user in an array of users
function updateUsersArray(updatedAdmin) {
    const users = getStorage(USERS_KEY);

    if (!Array.isArray(users)) return;

    const index = users.findIndex(user =>
        String(user.id ?? user.user_id) ===
        String(updatedAdmin.id ?? updatedAdmin.user_id)
    );

    if (index !== -1) {
        users[index] = {
            ...users[index],
            ...updatedAdmin
        };

        saveStorage(USERS_KEY, users);
    }
}

// Update combined storage without deleting other data
function updateCombinedStorage(updatedAdmin) {
    for (const key of STORAGE_KEYS) {
        const data = getStorage(key);

        if (!data || typeof data !== "object") continue;

        let changed = false;

        const possibleKeys = [
            "currentUser",
            "current_user",
            "user",
            "admin"
        ];

        for (const property of possibleKeys) {
            if (data[property] && typeof data[property] === "object") {
                const storedId = data[property].id ?? data[property].user_id;
                const updatedId = updatedAdmin.id ?? updatedAdmin.user_id;

                if (
                    storedId == null ||
                    updatedId == null ||
                    String(storedId) === String(updatedId)
                ) {
                    data[property] = {
                        ...data[property],
                        ...updatedAdmin
                    };

                    changed = true;
                }
            }
        }

        if (changed) {
            saveStorage(key, data);
        }
    }
}

// Save updated profile everywhere this app stores the user
function saveUpdatedAdmin(updatedAdmin) {
    saveStorage(CURRENT_USER_KEY, updatedAdmin);

    updateUsersArray(updatedAdmin);
    updateCombinedStorage(updatedAdmin);
}

// Check login
admin = loadAdmin();

if (!admin) {
    alert("Please log in first.");
    window.location.href = "index.html";
} else {
    displayAdmin();
}

// Handle profile update
document.getElementById("profileForm").addEventListener("submit", function(event) {
    event.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();

    const currentPassword =
        document.getElementById("currentPassword").value;

    const newPassword =
        document.getElementById("newPassword").value;

    if (!name || !email) {
        showMessage("Name and email are required.", "error");
        return;
    }

    // Check whether the email is already used by another user
    const users = getStorage(USERS_KEY);

    if (Array.isArray(users)) {
        const duplicateEmail = users.some(user => {
            const sameEmail =
                String(user.email || "").toLowerCase() === email.toLowerCase();

            const sameId =
                String(user.id ?? user.user_id) ===
                String(admin.id ?? admin.user_id);

            return sameEmail && !sameId;
        });

        if (duplicateEmail) {
            showMessage("This email is already being used.", "error");
            return;
        }
    }

    // Password change validation
    if (newPassword) {
        if (!currentPassword) {
            showMessage(
                "Enter your current password to change your password.",
                "error"
            );
            return;
        }

        // Static demo comparison.
        // This assumes the password is stored as plain text.
        if (currentPassword !== String(admin.password ?? "")) {
            showMessage("Current password incorrect.", "error");
            return;
        }

        if (newPassword.length < 6) {
            showMessage(
                "New password must contain at least 6 characters.",
                "error"
            );
            return;
        }
    }

    // Prepare updated admin
    const updatedAdmin = {
        ...admin,
        name: name,
        email: email,
        phone: phone
    };

    // Update password only when requested
    if (newPassword) {
        updatedAdmin.password = newPassword;
    }

    // Save changes
    try {
        saveUpdatedAdmin(updatedAdmin);

        admin = updatedAdmin;

        displayAdmin();

        document.getElementById("currentPassword").value = "";
        document.getElementById("newPassword").value = "";

        showMessage("Profile updated successfully!", "success");

    } catch (error) {
        showMessage("Update failed. Please try again.", "error");
    }
});
