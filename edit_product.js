
const STORAGE_KEY = "ims_products";

let products = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

const params = new URLSearchParams(window.location.search);
const productId = params.get("id");

const form = document.getElementById("editProductForm");
const message = document.getElementById("message");

let selectedImage = null;

// Find product
const product = products.find(
    item => String(item.id) === String(productId)
);

// Check product
if (!product) {

    form.style.display = "none";

    message.textContent = "Product not found!";
    message.className = "error";

} else {

    loadProduct();

}

// Load existing product information
function loadProduct() {

    document.getElementById("productId").value = product.id;

    document.getElementById("name").value = product.name || "";

    document.getElementById("department").value =
        product.department || "";

    document.getElementById("category").value =
        product.category || "";

    document.getElementById("price").value =
        product.price || 0;

    document.getElementById("quantity").value =
        product.quantity || 0;

    document.getElementById("description").value =
        product.description || "";

    document.getElementById("currentImage").src =
        product.image || "https://placehold.co/150x150?text=No+Image";

}

// Preview new image
document.getElementById("image").addEventListener("change", function() {

    const file = this.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
        alert("Please select a valid image.");
        this.value = "";
        return;
    }

    if (file.size > 2 * 1024 * 1024) {
        alert("Image must be smaller than 2MB.");
        this.value = "";
        return;
    }

    const reader = new FileReader();

    reader.onload = function(e) {

        selectedImage = e.target.result;

        document.getElementById("currentImage").src =
            selectedImage;

    };

    reader.readAsDataURL(file);

});

// Update product
form.addEventListener("submit", function(e) {

    e.preventDefault();

    const currentProducts =
        JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

    const index = currentProducts.findIndex(
        item => String(item.id) === String(productId)
    );

    if (index === -1) {
        message.textContent = "Product no longer exists!";
        message.className = "error";
        return;
    }

    const name = document.getElementById("name").value.trim();
    const department = document.getElementById("department").value.trim();
    const category = document.getElementById("category").value.trim();
    const price = Number(document.getElementById("price").value);
    const quantity = Number(document.getElementById("quantity").value);
    const description = document.getElementById("description").value.trim();

    if (
        !name ||
        !department ||
        !category ||
        !Number.isFinite(price) ||
        price < 0 ||
        !Number.isInteger(quantity) ||
        quantity < 0
    ) {
        message.textContent = "Please enter valid product details.";
        message.className = "error";
        return;
    }

    // Update without losing other existing properties
    currentProducts[index] = {
        ...currentProducts[index],

        name,
        department,
        category,
        price,
        quantity,
        description,

        image: selectedImage || currentProducts[index].image || ""
    };

    // Save updated products
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(currentProducts)
    );

    alert("Product updated successfully!");

    window.location.href = "inventory.html";

});

// Back button
function goBack() {
    window.location.href = "inventory.html";
}
