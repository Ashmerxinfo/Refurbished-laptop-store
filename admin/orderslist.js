/* =====================================
   REFURBTECH - ORDER MANAGEMENT
===================================== */


/* ELEMENTS */

const ordersList = document.getElementById("ordersList");
const pendingCount = document.getElementById("pendingCount");
const resultCount = document.getElementById("resultCount");
const orderSearch = document.getElementById("orderSearch");
const clearSearch = document.getElementById("clearSearch");
const refreshOrders = document.getElementById("refreshOrders");
const toastMessage = document.getElementById("toastMessage");


/* VARIABLES */

let orders = [];
let searchText = "";


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


function formatPrice(value) {

    return "₹" + Number(value || 0).toLocaleString("en-IN");

}


function formatDate(date) {

    if (!date) return "-";

    const value = new Date(date);

    if (Number.isNaN(value.getTime())) return "-";

    return value.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });

}


function showToast(message) {

    toastMessage.textContent = message;

    toastMessage.classList.add("show");

    setTimeout(() => {

        toastMessage.classList.remove("show");

    }, 2500);

}


/* =====================================
   LOAD PENDING ORDERS
===================================== */


async function loadOrders() {

    try {

        ordersList.innerHTML = `
            <div class="loading-state">
                <i class="fa-solid fa-spinner fa-spin"></i>
                <p>Loading Orders...</p>
            </div>
        `;

        const response = await fetch(
            "/api/admin/orders/pending"
        );

        const result = await response.json();

        if (response.status === 401) {

            window.location.href = "admin-login.html";

            return;

        }

        if (!response.ok || !result.success) {

            throw new Error(
                result.message || "Unable to load orders"
            );

        }

        orders = result.orders || [];

        pendingCount.textContent = orders.length;

        displayOrders();

    }

    catch (error) {

        console.error("Load Orders Error:", error);

        ordersList.innerHTML = `
            <div class="error-state">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <p>${escapeHTML(error.message)}</p>

                <button class="retry-btn" onclick="loadOrders()">
                    Try Again
                </button>
            </div>
        `;

    }

}


/* =====================================
   DISPLAY ORDERS
===================================== */


function displayOrders() {

    let filteredOrders = [...orders];


    /* SEARCH FILTER */

    if (searchText) {

        const search = searchText.toLowerCase();

        filteredOrders = filteredOrders.filter(order => {

            const orderId = String(order.orderId || "").toLowerCase();

            const name = String(order.customer?.name || "").toLowerCase();

            const phone = String(order.customer?.phone || "").toLowerCase();

            const email = String(order.customer?.email || "").toLowerCase();

            return (
                orderId.includes(search) ||
                name.includes(search) ||
                phone.includes(search) ||
                email.includes(search)
            );

        });

    }


    resultCount.textContent =
        filteredOrders.length + " orders found";


    /* EMPTY STATE */

    if (filteredOrders.length === 0) {

        ordersList.innerHTML = `
            <div class="empty-state">

                <i class="fa-solid fa-box-open"></i>

                <h3>
                    ${searchText ? "No Matching Orders" : "No Pending Orders"}
                </h3>

                <p>
                    ${searchText
                        ? "Try another search keyword."
                        : "New customer orders will appear here."}
                </p>

            </div>
        `;

        return;

    }


    /* ORDER CARDS */

    ordersList.innerHTML = filteredOrders.map(order => {

        const customer = order.customer || {};

        const products = Array.isArray(order.products)
            ? order.products
            : [];


        const productHTML = products.map(item => {

            return `

                <div class="order-product">

                    <div>

                        <p class="product-name">
                            ${escapeHTML(item.productName)}
                        </p>

                        <p class="product-meta">
                            Qty: ${Number(item.quantity || 0)}
                            × ${formatPrice(item.price)}
                        </p>

                    </div>

                    <div class="product-total">
                        ${formatPrice(item.itemTotal)}
                    </div>

                </div>

            `;

        }).join("");


        const address = [
            customer.address,
            customer.city,
            customer.pincode
        ].filter(Boolean).join(", ");


        return `

            <article class="order-card"
                data-order-id="${escapeHTML(order.orderId)}">

                <!-- ORDER HEADER -->

                <div class="order-card-header">

                    <div>

                        <p class="order-id">
                            ${escapeHTML(order.orderId)}
                        </p>

                        <p class="order-date">
                            <i class="fa-regular fa-calendar"></i>
                            ${formatDate(order.orderDate)}
                        </p>

                    </div>

                    <span class="pending-badge">
                        Pending
                    </span>

                </div>


                <!-- ORDER CONTENT -->

                <div class="order-content">

                    <h4 class="order-section-title">
                        Customer Details
                    </h4>

                    <div class="customer-grid">

                        <div class="detail-item">

                            <label>Customer Name</label>

                            <p>${escapeHTML(customer.name)}</p>

                        </div>


                        <div class="detail-item">

                            <label>Phone Number</label>

                            <p>${escapeHTML(customer.phone)}</p>

                        </div>


                        <div class="detail-item">

                            <label>Email Address</label>

                            <p>${escapeHTML(customer.email)}</p>

                        </div>


                        <div class="detail-item address-item">

                            <label>Delivery Address</label>

                            <p>${escapeHTML(address)}</p>

                        </div>

                    </div>


                    <!-- PRODUCTS -->

                    <div class="products-section">

                        <h4 class="order-section-title">
                            Ordered Products (${products.length})
                        </h4>

                        ${productHTML}

                    </div>


                    <!-- TOTAL -->

                    <div class="order-total-section">

                        <span>Order Total</span>

                        <strong>
                            ${formatPrice(order.total)}
                        </strong>

                    </div>

                </div>


                <!-- ACTION BUTTONS -->

                <div class="order-actions">

                    <button
                        class="delete-btn"
                        type="button"
                        data-action="delete">

                        <i class="fa-solid fa-trash"></i>
                        Delete

                    </button>


                    <button
                        class="complete-btn"
                        type="button"
                        data-action="complete">

                        <i class="fa-solid fa-check"></i>
                        Completed

                    </button>

                </div>

            </article>

        `;

    }).join("");

}


/* =====================================
   SEARCH
===================================== */


orderSearch.addEventListener("input", function() {

    searchText = this.value.trim().toLowerCase();

    displayOrders();

});


clearSearch.addEventListener("click", function() {

    orderSearch.value = "";

    searchText = "";

    displayOrders();

    orderSearch.focus();

});


/* =====================================
   COMPLETE / DELETE ORDER
===================================== */


ordersList.addEventListener("click", async function(event) {

    const button = event.target.closest("[data-action]");

    if (!button) return;


    const card = button.closest(".order-card");

    if (!card) return;


    const orderId = card.dataset.orderId;

    const action = button.dataset.action;


    if (action === "complete") {

        const confirmed = confirm(
            "Are you sure you want to mark this order as Completed?"
        );

        if (!confirmed) return;

    }


    if (action === "delete") {

        const confirmed = confirm(
            "Are you sure you want to permanently delete this order?"
        );

        if (!confirmed) return;

    }


    const buttons = card.querySelectorAll("button");

    buttons.forEach(item => item.disabled = true);


    try {

        let url = "";
        let method = "";


        if (action === "complete") {

            url = `/api/admin/orders/${encodeURIComponent(orderId)}/complete`;

            method = "PATCH";

        }

        else if (action === "delete") {

            url = `/api/admin/orders/${encodeURIComponent(orderId)}`;

            method = "DELETE";

        }


        const response = await fetch(url, {
            method: method
        });


        const result = await response.json();


        if (response.status === 401) {

            window.location.href = "admin-login.html";

            return;

        }


        if (!response.ok || !result.success) {

            throw new Error(
                result.message || "Action failed"
            );

        }


        if (action === "complete") {

            showToast("Order marked as Completed!");

        }

        else {

            showToast("Order deleted successfully!");

        }


        // Reload pending orders

        await loadOrders();

    }

    catch (error) {

        console.error("Order Action Error:", error);

        showToast(error.message);

        buttons.forEach(item => item.disabled = false);

    }

});


/* =====================================
   REFRESH
===================================== */


refreshOrders.addEventListener("click", function() {

    loadOrders();

});


/* =====================================
   INITIAL LOAD
===================================== */


loadOrders();