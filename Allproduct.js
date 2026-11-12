/* =====================================
   ASHMERX INFOTECH
   ALL PRODUCTS PAGE
===================================== */


/* ELEMENTS */

const productGrid = document.getElementById("productGrid");
const productSearch = document.getElementById("productSearch");
const categoryList = document.getElementById("categoryList");
const categoryTitle = document.getElementById("categoryTitle");
const productCount = document.getElementById("productCount");
const sortProducts = document.getElementById("sortProducts");
const clearSearch = document.getElementById("clearSearch");


/* VARIABLES */

let allProducts = [];
let selectedCategory = "ALL";
let searchText = "";
let sortType = "latest";


/* =====================================
   COMMON FUNCTIONS
===================================== */


function escapeHTML(value) {

    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);

}


function formatPrice(price) {

    return "₹" + Number(price || 0).toLocaleString("en-IN");

}


function getProductImage(product) {

    if (Array.isArray(product.images)) {

        return product.images[0] || "";

    }

    if (product.images && typeof product.images === "object") {

        return product.images.main || "";

    }

    return "";

}


function openProduct(productId) {

    window.location.href =
        "list.html?id=" + encodeURIComponent(productId);

}


/* =====================================
   LOAD PRODUCTS FROM MONGODB
===================================== */


async function loadProducts() {

    try {

        productGrid.innerHTML = `
            <div class="loading-state">
                <i class="fa-solid fa-spinner fa-spin"></i>
                <p>Loading Products...</p>
            </div>
        `;

        const response = await fetch("/api/products");

        const result = await response.json();

        if (!response.ok || !result.success) {

            throw new Error(
                result.message || "Unable to load products"
            );

        }

        allProducts = result.products || [];

        displayProducts();

    }

    catch (error) {

        console.error("Product Loading Error:", error);

        productGrid.innerHTML = `
            <div class="error-state">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <p>Unable to load products.</p>
                <button class="retry-btn" onclick="loadProducts()">
                    Try Again
                </button>
            </div>
        `;

    }

}


/* =====================================
   CATEGORY FILTER
===================================== */


function selectCategory(category) {

    selectedCategory = category;

    document.querySelectorAll(".category-item").forEach(button => {

        button.classList.toggle(
            "active",
            button.dataset.category === category
        );

    });


    const categoryNames = {

        ALL: "All Products",
        LAPTOP: "Laptops",
        DESKTOP: "Desktops",
        ACCESSORY: "Accessories",
        STORAGE: "Storage",
        RAM: "RAM"

    };

    categoryTitle.textContent =
        categoryNames[category] || "All Products";


    updateURL();

    displayProducts();

}


categoryList.addEventListener("click", function(event) {

    const button = event.target.closest(".category-item");

    if (!button) return;

    selectCategory(button.dataset.category);

});


/* =====================================
   SEARCH
===================================== */


let searchTimer;


productSearch.addEventListener("input", function() {

    clearTimeout(searchTimer);

    searchText = this.value.trim();

    searchTimer = setTimeout(() => {

        updateURL();

        displayProducts();

    }, 250);

});


clearSearch.addEventListener("click", function() {

    productSearch.value = "";

    searchText = "";

    updateURL();

    displayProducts();

    productSearch.focus();

});


/* =====================================
   SORT PRODUCTS
===================================== */


sortProducts.addEventListener("change", function() {

    sortType = this.value;

    displayProducts();

});


/* =====================================
   DISPLAY PRODUCTS
===================================== */


function displayProducts() {

    let products = [...allProducts];


    /* CATEGORY FILTER */

    if (selectedCategory !== "ALL") {

        products = products.filter(product =>

            String(product.category || "").toUpperCase() ===
            selectedCategory

        );

    }


    /* SEARCH FILTER */

    if (searchText) {

        const search = searchText.toLowerCase();

        products = products.filter(product => {

            const name = String(product.name || "").toLowerCase();

            const category = String(product.category || "").toLowerCase();

            const specs = String(product.shortSpec || "").toLowerCase();

            const processor = String(product.processor || "").toLowerCase();

            const ram = String(product.ram || "").toLowerCase();

            const storage = String(product.storage || "").toLowerCase();

            return (
                name.includes(search) ||
                category.includes(search) ||
                specs.includes(search) ||
                processor.includes(search) ||
                ram.includes(search) ||
                storage.includes(search)
            );

        });

    }


    /* SORT */

    if (sortType === "low-high") {

        products.sort((a, b) =>
            Number(a.price || 0) - Number(b.price || 0)
        );

    }

    else if (sortType === "high-low") {

        products.sort((a, b) =>
            Number(b.price || 0) - Number(a.price || 0)
        );

    }

    else {

        products.sort((a, b) =>
            new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
        );

    }


    /* PRODUCT COUNT */

    productCount.textContent = products.length;


    /* EMPTY */

    if (products.length === 0) {

        productGrid.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-box-open"></i>
                <h3>No Products Found</h3>
                <p>Try another category or search keyword.</p>
            </div>
        `;

        return;

    }


    /* PRODUCT CARDS */

    productGrid.innerHTML = products.map(product => {

        const image = getProductImage(product);

        const imageHTML = image

            ? `
                <img
                    src="${escapeHTML(image)}"
                    alt="${escapeHTML(product.name)}"
                    class="product-photo"
                    loading="lazy"
                >
            `

            : `
                <i class="fa-solid ${escapeHTML(product.icon || "fa-laptop")} product-icon"></i>
            `;


        const badgeHTML = product.badge

            ? `
                <span class="product-badge">
                    ${escapeHTML(product.badge)}
                </span>
            `

            : "";


        const oldPriceHTML = Number(product.oldPrice) > 0

            ? `<del>${formatPrice(product.oldPrice)}</del>`

            : "";


        const available = Number(product.available || 0);


        return `

            <article
                class="product-card"
                data-product-id="${escapeHTML(product.productId)}"
                data-price="${Number(product.price || 0)}"
                data-old-price="${Number(product.oldPrice || 0)}"
                data-available="${available}"
            >

                <div class="product-image">

                    ${badgeHTML}

                    <button class="wishlist-btn" type="button">
                        <i class="fa-regular fa-heart"></i>
                    </button>

                    ${imageHTML}

                </div>


                <div class="product-info">

                    <span class="product-category">
                        ${escapeHTML(product.category)}
                    </span>

                    <h3>${escapeHTML(product.name)}</h3>

                    <p class="short-spec">
                        ${escapeHTML(product.shortSpec)}
                    </p>


                    <div class="rating">

                        <span>
                            ⭐ ${Number(product.rating || 0).toFixed(1)}
                        </span>

                        <small>
                            (${Number(product.reviews || 0)})
                        </small>

                    </div>


                    <div class="price-row">

                        <strong>
                            ${formatPrice(product.price)}
                        </strong>

                        ${oldPriceHTML}

                    </div>


                    <div class="quantity-row">

                        <span>Qty</span>

                        <div class="quantity-control">

                            <button class="qty-minus" type="button">−</button>

                            <span class="qty-value">1</span>

                            <button class="qty-plus" type="button">+</button>

                        </div>

                    </div>


                    <small class="available">
                        Available: ${available}
                    </small>


                    <button class="add-cart-btn" type="button"
                        ${available < 1 ? "disabled" : ""}>

                        <i class="fa-solid fa-cart-shopping"></i>

                        ${available < 1 ? "Out of Stock" : "Add to Cart"}

                    </button>


                    <button class="details-btn" type="button">

                        View Details

                        <i class="fa-solid fa-chevron-right"></i>

                    </button>

                </div>

            </article>

        `;

    }).join("");

}


/* =====================================
   QUANTITY CONTROL
===================================== */


productGrid.addEventListener("click", function(event) {

    const card = event.target.closest(".product-card");

    if (!card) return;


    const quantityElement = card.querySelector(".qty-value");

    const available = Number(card.dataset.available);

    let quantity = Number(quantityElement.textContent);


    if (event.target.closest(".qty-plus")) {

        if (quantity < available) {

            quantity++;

            quantityElement.textContent = quantity;

        }

    }


    if (event.target.closest(".qty-minus")) {

        if (quantity > 1) {

            quantity--;

            quantityElement.textContent = quantity;

        }

    }

});


/* =====================================
   ADD TO CART
===================================== */


productGrid.addEventListener("click", function(event) {

    const button = event.target.closest(".add-cart-btn");

    if (!button) return;


    const card = button.closest(".product-card");

    const productId = card.dataset.productId;

    const productName =
        card.querySelector("h3").textContent.trim();

    const quantity =
        Number(card.querySelector(".qty-value").textContent);

    const price = Number(card.dataset.price);

    const oldPrice = Number(card.dataset.oldPrice);

    const available = Number(card.dataset.available);


    if (available < 1) {

        alert("This product is out of stock!");

        return;

    }


    let cart = [];

    try {

        cart = JSON.parse(localStorage.getItem("cart")) || [];

    }

    catch (error) {

        cart = [];

    }


    const existing = cart.find(item =>

        item.productId === productId ||

        (!item.productId && item.name === productName)

    );


    if (existing) {

        if (Number(existing.quantity || 0) + quantity > available) {

            alert("Maximum available stock reached!");

            return;

        }

        existing.quantity =
            Number(existing.quantity || 0) + quantity;

        existing.price = price;

        existing.oldPrice = oldPrice;

        existing.available = available;

        existing.productId = productId;

    }

    else {

        cart.push({

            productId: productId,

            name: productName,

            price: price,

            oldPrice: oldPrice,

            available: available,

            quantity: quantity

        });

    }


    localStorage.setItem("cart", JSON.stringify(cart));


    updateCartCount();


    button.innerHTML =
        '<i class="fa-solid fa-check"></i> Added';

    button.disabled = true;


    setTimeout(() => {

        button.innerHTML =
            '<i class="fa-solid fa-cart-shopping"></i> Add to Cart';

        button.disabled = false;

    }, 1200);

});


/* =====================================
   VIEW DETAILS
===================================== */


productGrid.addEventListener("click", function(event) {

    const button = event.target.closest(".details-btn");

    if (!button) return;


    const card = button.closest(".product-card");

    openProduct(card.dataset.productId);

});


/* =====================================
   CART COUNT
===================================== */


function updateCartCount() {

    let cart = [];

    try {

        cart = JSON.parse(localStorage.getItem("cart")) || [];

    }

    catch (error) {

        cart = [];

    }


    const total = cart.reduce((sum, item) => {

        return sum + Number(item.quantity || 0);

    }, 0);


    const headerCount = document.getElementById("cartCount");

    const bottomCount = document.getElementById("bottomCartCount");


    if (headerCount) {

        headerCount.textContent = total;

    }

    if (bottomCount) {

        bottomCount.textContent = total;

    }

}


/* =====================================
   UPDATE URL WITHOUT RELOAD
===================================== */


function updateURL() {

    const params = new URLSearchParams();

    if (selectedCategory !== "ALL") {

        params.set("category", selectedCategory);

    }

    if (searchText) {

        params.set("search", searchText);

    }


    const query = params.toString();

    const newURL = query
        ? "all-products.html?" + query
        : "all-products.html";


    history.replaceState(
        { category: selectedCategory, search: searchText },
        "",
        newURL
    );

}


/* =====================================
   READ CATEGORY FROM URL
===================================== */


function loadURLFilters() {

    const params = new URLSearchParams(window.location.search);

    const category = (params.get("category") || "ALL").toUpperCase();

    const validCategories = [
        "ALL",
        "LAPTOP",
        "DESKTOP",
        "ACCESSORY",
        "STORAGE",
        "RAM"
    ];


    selectedCategory = validCategories.includes(category)
        ? category
        : "ALL";


    searchText = params.get("search") || "";

    productSearch.value = searchText;


    document.querySelectorAll(".category-item").forEach(button => {

        button.classList.toggle(
            "active",
            button.dataset.category === selectedCategory
        );

    });


    const categoryNames = {

        ALL: "All Products",
        LAPTOP: "Laptops",
        DESKTOP: "Desktops",
        ACCESSORY: "Accessories",
        STORAGE: "Storage",
        RAM: "RAM"

    };

    categoryTitle.textContent =
        categoryNames[selectedCategory];

}


/* =====================================
   BROWSER BACK / FORWARD
===================================== */


window.addEventListener("popstate", function() {

    loadURLFilters();

    displayProducts();

});


/* =====================================
   INITIAL LOAD
===================================== */


loadURLFilters();

updateCartCount();

loadProducts();