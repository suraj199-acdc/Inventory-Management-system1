
// ==========================================
// INVENTORY MANAGEMENT SYSTEM
// ADD PRODUCT JAVASCRIPT
// ==========================================

const USER_KEY = "ims_single_user";
const SESSION_KEY = "ims_current_user";
const PRODUCTS_KEY = "ims_products";

// Maximum image size: 1.5 MB
const MAX_IMAGE_SIZE = 1.5 * 1024 * 1024;

let selectedImage = "";

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

        console.error("Unable to read products:", error);

        return [];

    }
}

// ==========================================
// SAVE PRODUCTS
// ==========================================

function saveProducts(products) {

    try {

        localStorage.setItem(
            PRODUCTS_KEY,
            JSON.stringify(products)
        );

        return true;

    } catch (error) {

        console.error("Unable to save products:", error);

        throw new Error(
            "Storage is full. Please use a smaller image or remove unused images."
        );

    }
}

// ==========================================
// DISPLAY MESSAGES
// ==========================================

function showSuccess(message) {

    document.getElementById("successMessage").textContent =
        message;

    document.getElementById("errorMessage").textContent = "";

}

function showError(message) {

    document.getElementById("errorMessage").textContent =
        message;

    document.getElementById("successMessage").textContent = "";

}

// ==========================================
// IMAGE PREVIEW
// ==========================================

function previewImage(event) {

    const file = event.target.files[0];

    const preview = document.getElementById("imgPreview");

    selectedImage = "";

    preview.removeAttribute("src");
    preview.style.display = "none";

    if (!file) {
        return;
    }

    if (!file.type.startsWith("image/")) {

        showError("Please select a valid image file.");

        event.target.value = "";

        return;
    }

    if (file.size > MAX_IMAGE_SIZE) {

        showError("Image must be smaller than 1.5 MB.");

        event.target.value = "";

        return;
    }

    const reader = new FileReader();

    reader.onload = function() {

        selectedImage = reader.result;

        preview.src = selectedImage;

        preview.style.display = "block";

        document.getElementById("errorMessage").textContent = "";

    };

    reader.onerror = function() {

        showError("Unable to read the selected image.");

    };

    reader.readAsDataURL(file);

}

// ==========================================
// GENERATE PRODUCT ID
// ==========================================

function generateProductId(products) {

    const highestId = products.reduce(
        (highest, product) => {

            return Math.max(
                highest,
                Number(product.id) || 0
            );

        },
        0
    );

    return highestId + 1;

}

// ==========================================
// ADD PRODUCT
// ==========================================

function addProduct(event) {

    event.preventDefault();

    const button = document.getElementById("addButton");

    if (!checkLogin()) {
        return;
    }

    const name = document.getElementById("name")
        .value.trim();

    const price = Number(
        document.getElementById("price").value
    );

    const quantity = Number(
        document.getElementById("quantity").value
    );

    const department = document.getElementById("department")
        .value.trim();

    const category = document.getElementById("category")
        .value.trim();

    const description = document.getElementById("description")
        .value.trim();

    // ======================================
    // VALIDATION
    // ======================================

    if (!name || !department || !category) {

        showError("Please fill in all required fields.");

        return;
    }

    if (!Number.isFinite(price) || price < 0) {

        showError("Please enter a valid product price.");

        return;
    }

    if (
        !Number.isSafeInteger(quantity) ||
        quantity < 0
    ) {

        showError("Please enter a valid whole number for quantity.");

        return;
    }

    button.disabled = true;
    button.textContent = "Saving Product...";

    try {

        const products = getProducts();

        // ==================================
        // CHECK FOR EXISTING PRODUCT
        // ==================================

        const existingProduct = products.find(product => {

            return String(product.name || "")
                .trim()
                .toLowerCase() === name.toLowerCase();

        });

        // ==================================
        // EXISTING PRODUCT: UPDATE STOCK
        // ==================================

        if (existingProduct) {

            const oldQuantity =
                Number(existingProduct.quantity) || 0;

            const newQuantity = oldQuantity + quantity;

            if (!Number.isSafeInteger(newQuantity)) {

                throw new Error("The resulting stock quantity is too large.");

            }

            existingProduct.quantity = newQuantity;

            // Keep existing product information,
            // including its original image and price.

            saveProducts(products);

            showSuccess(
                "Stock updated successfully! New quantity: " +
                newQuantity
            );

        }

        // ==================================
        // NEW PRODUCT: SAVE PRODUCT
        // ==================================

        else {

            const newProduct = {

                id: generateProductId(products),

                name: name,

                price: price,

                quantity: quantity,

                department: department,

                category: category,

                description: description,

                image: selectedImage,

                reorder_level: 5,

                createdAt: new Date().toISOString()

            };

            products.push(newProduct);

            saveProducts(products);

            showSuccess(
                "Product added successfully!"
            );

        }

        // ==================================
        // RESET FORM
        // ==================================

        document.getElementById("productForm").reset();

        selectedImage = "";

        const preview = document.getElementById("imgPreview");

        preview.removeAttribute("src");

        preview.style.display = "none";

        // Focus on product name for next entry
        document.getElementById("name").focus();

    } catch (error) {

        showError(error.message);

        console.error("Add product error:", error);

    } finally {

        button.disabled = false;

        button.textContent = "Add Product";

    }

}

// ==========================================
// INITIALIZE PAGE
// ==========================================

document.addEventListener("DOMContentLoaded", function() {

    if (!checkLogin()) {
        return;
    }

    document.getElementById("productForm")
        .addEventListener("submit", addProduct);

    document.getElementById("image")
        .addEventListener("change", previewImage);

    console.log("Add Product page initialized successfully.");

});
