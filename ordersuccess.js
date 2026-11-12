/* ==================================
   LOAD LATEST ORDER
================================== */

function loadOrder() {

    let order = null;

    try {

        order = JSON.parse(
            localStorage.getItem("latestOrder")
        );

    } catch (error) {

        order = null;

    }


    if (!order || !order.orderId) {

        document.getElementById("noOrder")
            .style.display = "block";

        return;

    }


    document.getElementById("successContent")
        .style.display = "block";


    // ORDER ID

    document.getElementById("orderId")
        .textContent = order.orderId;


    // ORDER STATUS

    document.getElementById("orderStatus")
        .textContent = order.orderStatus || "Pending";


    // CUSTOMER DETAILS

    const customer = order.customer || {};

    const customerDetails =
        document.getElementById("customerDetails");

    customerDetails.innerHTML = "";

    const fields = [
        ["Name", customer.name],
        ["Mobile", customer.phone],
        ["Email", customer.email],
        ["Address", customer.address],
        ["City", customer.city],
        ["Pincode", customer.pincode]
    ];

    fields.forEach(([label, value]) => {

        const line = document.createElement("div");

        const strong = document.createElement("strong");
        strong.textContent = label + ": ";

        line.appendChild(strong);
        line.appendChild(
            document.createTextNode(value || "-")
        );

        customerDetails.appendChild(line);

    });


    // PRODUCTS

    const products = order.products || [];

    const productList =
        document.getElementById("productList");

    productList.innerHTML = "";


    products.forEach(item => {

        const row = document.createElement("div");

        row.className = "product-row";


        const info = document.createElement("div");

        info.className = "product-info";


        const name = document.createElement("strong");

        name.textContent =
            item.productName || item.name || "Product";


        const quantity = document.createElement("span");

        quantity.textContent =
            "Quantity: " + (item.quantity || 1);


        info.appendChild(name);
        info.appendChild(quantity);


        const price = document.createElement("div");

        price.className = "product-price";

        price.textContent = formatPrice(
            item.itemTotal ||
            (Number(item.price || 0) *
            Number(item.quantity || 1))
        );


        row.appendChild(info);
        row.appendChild(price);

        productList.appendChild(row);

    });


    // PRICE DETAILS

    document.getElementById("subtotal")
        .textContent = formatPrice(order.subtotal);


    document.getElementById("discount")
        .textContent = "- " + formatPrice(order.discount);


    document.getElementById("total")
        .textContent = formatPrice(order.total);

}


/* ==================================
   PRICE FORMAT
================================== */

function formatPrice(value) {

    return "₹" + (Number(value) || 0)
        .toLocaleString("en-IN");

}


/* ==================================
   CONTINUE SHOPPING
================================== */

function continueShopping() {

    window.location.href = "index.html";

}


/* ==================================
   INITIAL LOAD
================================== */

loadOrder();