
// =====================================
// INVENTORY MANAGEMENT SYSTEM
// SINGLE USER AUTHENTICATION
// =====================================

const USER_KEY = "ims_single_user";
const SESSION_KEY = "ims_current_user";

// =====================================
// MODAL FUNCTIONS
// =====================================

function openModal(id) {
    const modal = document.getElementById(id);

    if (modal) {
        modal.style.display = "flex";
    }
}

function closeModal(id) {
    const modal = document.getElementById(id);

    if (modal) {
        modal.style.display = "none";
    }
}

// Close modal when clicking outside
window.addEventListener("click", function(event) {
    if (event.target.classList.contains("modal")) {
        event.target.style.display = "none";
    }
});

// =====================================
// SHOW / HIDE PASSWORD
// =====================================

function togglePassword(passId, confirmId = null) {
    const password = document.getElementById(passId);

    if (password) {
        password.type =
            password.type === "password" ? "text" : "password";
    }

    if (confirmId) {
        const confirmPassword =
            document.getElementById(confirmId);

        if (confirmPassword) {
            confirmPassword.type =
                confirmPassword.type === "password"
                    ? "text"
                    : "password";
        }
    }
}

// =====================================
// PASSWORD HASHING
// =====================================

async function hashPassword(password) {

    if (!window.crypto || !window.crypto.subtle) {
        throw new Error(
            "Secure hashing unavailable. Open this website using GitHub Pages HTTPS."
        );
    }

    const encodedPassword =
        new TextEncoder().encode(password);

    const hash = await crypto.subtle.digest(
        "SHA-256",
        encodedPassword
    );

    return Array.from(new Uint8Array(hash))
        .map(byte => byte.toString(16).padStart(2, "0"))
        .join("");
}

// =====================================
// DISPLAY MESSAGES
// =====================================

function showMessage(element, message, type) {
    if (!element) return;

    element.textContent = message;
    element.style.display = "block";
}

// =====================================
// SIGNUP FUNCTION
// =====================================

async function handleSignup(event) {

    event.preventDefault();

    const name =
        document.getElementById("signupName").value.trim();

    const email =
        document.getElementById("signupEmail").value.trim().toLowerCase();

    const phone =
        document.getElementById("signupPhone").value.trim();

    const password =
        document.getElementById("signupPassword").value;

    const confirmPassword =
        document.getElementById("signupCPassword").value;

    const error = document.getElementById("signupError");
    const success = document.getElementById("signupSuccess");

    error.textContent = "";
    success.textContent = "";

    if (!name || !email || !password) {
        error.textContent = "Please fill in all required fields.";
        return;
    }

    if (password.length < 6) {
        error.textContent =
            "Password must contain at least 6 characters.";
        return;
    }

    if (password !== confirmPassword) {
        error.textContent = "Passwords do not match!";
        return;
    }

    // Only one account is allowed
    if (localStorage.getItem(USER_KEY)) {
        error.textContent =
            "An account already exists! Please login instead.";
        return;
    }

    try {

        const hashedPassword = await hashPassword(password);

        const user = {
            name: name,
            email: email,
            phone: phone,
            password: hashedPassword,
            createdAt: new Date().toISOString()
        };

        localStorage.setItem(
            USER_KEY,
            JSON.stringify(user)
        );

        document.getElementById("signupForm").reset();

        success.textContent =
            "Account created successfully! Please login.";

    } catch (err) {

        error.textContent = err.message;
        console.error("Signup error:", err);

    }
}

// =====================================
// LOGIN FUNCTION
// =====================================

async function handleLogin(event) {

    event.preventDefault();

    const email =
        document.getElementById("loginEmail").value.trim().toLowerCase();

    const password =
        document.getElementById("loginPassword").value;

    const error = document.getElementById("loginError");
    const success = document.getElementById("loginSuccess");

    error.textContent = "";
    success.textContent = "";

    let user;

    try {

        const savedUser = localStorage.getItem(USER_KEY);

        if (!savedUser) {
            error.textContent =
                "No account found! Please sign up first.";
            return;
        }

        user = JSON.parse(savedUser);

        if (!user || !user.email || !user.password) {
            throw new Error("Saved account data is invalid.");
        }

    } catch (err) {

        error.textContent = err.message;
        return;

    }

    if (email !== user.email) {
        error.textContent = "Incorrect email address!";
        return;
    }

    try {

        const hashedPassword = await hashPassword(password);

        if (hashedPassword !== user.password) {
            error.textContent = "Incorrect password!";
            return;
        }

        // Save login session
        const session = {
            name: user.name,
            email: user.email,
            loginTime: new Date().toISOString()
        };

        localStorage.setItem(
            SESSION_KEY,
            JSON.stringify(session)
        );

        success.textContent =
            "Login successful! Redirecting...";

        document.getElementById("loginForm").reset();

        setTimeout(function() {
            window.location.replace("./dashboard.html");
        }, 500);

    } catch (err) {

        error.textContent = err.message;
        console.error("Login error:", err);

    }
}

// =====================================
// INITIALIZE APPLICATION
// =====================================

document.addEventListener("DOMContentLoaded", function() {

    const signupForm =
        document.getElementById("signupForm");

    const loginForm =
        document.getElementById("loginForm");

    if (!signupForm || !loginForm) {
        console.error("Login or signup form not found.");
        return;
    }

    // Connect signup form
    signupForm.addEventListener("submit", handleSignup);

    // Connect login form
    loginForm.addEventListener("submit", handleLogin);

    // Check existing login session
    const currentUser = localStorage.getItem(SESSION_KEY);

    if (currentUser) {
        window.location.replace("./dashboard.html");
    }

    console.log("IMS authentication initialized successfully.");

});
