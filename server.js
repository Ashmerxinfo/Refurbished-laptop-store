const express = require("express");
const cors = require("cors");
const path = require("path");
const session = require("express-session");
const multer = require("multer");
require("dotenv").config();

const mongoose = require("mongoose");
const Order = require("./models/Order");
const Product = require("./models/product");
const cloudinary = require("./Services/cloudinary");
const crypto = require("crypto");

const app = express();

const { sendEmail } = require("./Services/emailServices");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

require("dotenv").config();
const mongoURI = process.env.MONGO_URI;



app.set("trust proxy", 1);

app.use(session({
    name: "refurbtech_admin",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 2 * 60 * 60 * 1000
    }
}));








// ===============================
// MONGODB CONNECTION
// ===============================

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB Connected Successfully");
    })
    .catch((error) => {
        console.error(
            "MongoDB Connection Error:",
            error.message
        );
    });





    // CLOUDINARY CONNECTION TEST

cloudinary.api.ping()
    .then(result => {
        console.log("Cloudinary Connected Successfully");
        console.log(result);
    })
    .catch(error => {
        console.error("Cloudinary Connection Failed:", error.message);
    });





// ===============================
// MASTER ADMIN LOGIN
// ===============================

app.post("/api/admin/master-login", (req, res) => {

    const { email, password } = req.body;

    if (
        email !== process.env.MASTER_ADMIN_EMAIL ||
        password !== process.env.MASTER_ADMIN_PASSWORD
    ) {
        return res.status(401).json({
            success: false,
            message: "Invalid Email or Password"
        });
    }

    req.session.masterAdmin = true;

    res.json({
        success: true,
        message: "Master Admin Login Successful"
    });

});






// ===============================
// HOME
// ===============================

app.get("/", (req, res) => {

    res.sendFile(path.join(__dirname, "index.html"))
       
    

});


// ===============================
// CREATE NEW ORDER
// ===============================

app.post("/api/orders", async (req, res) => {

    try {

        const { customer, products } = req.body;

        // 1. Validate customer details

        if (!customer || !customer.name ||
            !customer.phone || !customer.email ||
            !customer.address || !customer.city ||
            !customer.pincode) {

            return res.status(400).json({
                success: false,
                message: "Please provide all customer details"
            });

        }

        // 2. Validate products

        if (!Array.isArray(products) || products.length === 0) {

            return res.status(400).json({
                success: false,
                message: "Cart is empty"
            });

        }

        // 3. Prepare order products

        let subtotal = 0;
        let discount = 0;

        const orderProducts = products.map(item => {

            const price = Number(item.price);
            const oldPrice = Number(item.oldPrice) || price;
            const quantity = Number(item.quantity);

            if (
                !item.name && !item.productName ||
                !Number.isFinite(price) || price < 0 ||
                !Number.isInteger(quantity) || quantity < 1
            ) {
                throw new Error("Invalid product details");
            }

            const itemTotal = price * quantity;

            subtotal += itemTotal;
            discount += Math.max(0, oldPrice - price) * quantity;

            return {
                productId: String(
                    item.id || item.productId ||
                    item.name || item.productName
                ),
                productName: item.name || item.productName,
                category: item.category || "",
                price: price,
                oldPrice: oldPrice,
                quantity: quantity,
                image: item.image || "",
                itemTotal: itemTotal
            };

        });

        // 4. Generate unique Order ID

        const orderId =
            "RTX-" +
            Date.now() +
            "-" +
            crypto.randomBytes(3).toString("hex").toUpperCase();

        // 5. Create Order

        const newOrder = new Order({

            orderId,
            customer,
            products: orderProducts,
            subtotal,
            discount,
            deliveryCharge: 0,
            total: subtotal

        });

        // 6. Save in MongoDB

        const savedOrder = await newOrder.save();


// ==================================
// SEND ORDER EMAIL
// ==================================

const productRows = savedOrder.products.map(item => `
    <tr>
        <td style="padding:12px;border-bottom:1px solid #eee;">
            ${item.productName}
        </td>
        <td style="padding:12px;border-bottom:1px solid #eee;">
            ${item.quantity}
        </td>
        <td style="padding:12px;border-bottom:1px solid #eee;">
            ₹${item.itemTotal.toLocaleString("en-IN")}
        </td>
    </tr>
`).join("");

const emailHTML = `
<div style="font-family:Arial,sans-serif;max-width:650px;margin:auto;color:#222;">

    <div style="background:#172554;padding:25px;text-align:center;color:white;">
        <h1 style="margin:0;">REFURBTECH</h1>
        <p style="margin:8px 0 0;">New Order Enquiry Received</p>
    </div>

    <div style="padding:25px;">

        <h2>New Order Details</h2>

        <p><b>Order ID:</b> ${savedOrder.orderId}</p>

        <h3>Customer Details</h3>

        <p>
            <b>Name:</b> ${savedOrder.customer.name}<br>
            <b>Mobile:</b> ${savedOrder.customer.phone}<br>
            <b>Email:</b> ${savedOrder.customer.email}<br>
            <b>Address:</b> ${savedOrder.customer.address}<br>
            <b>City:</b> ${savedOrder.customer.city}<br>
            <b>Pincode:</b> ${savedOrder.customer.pincode}
        </p>

        <h3>Ordered Products</h3>

        <table style="width:100%;border-collapse:collapse;text-align:left;">
            <thead>
                <tr style="background:#f1f5f9;">
                    <th style="padding:12px;">Product</th>
                    <th style="padding:12px;">Qty</th>
                    <th style="padding:12px;">Amount</th>
                </tr>
            </thead>
            <tbody>
                ${productRows}
            </tbody>
        </table>

        <div style="margin-top:20px;background:#f8fafc;padding:18px;">

            <p>Subtotal: ₹${savedOrder.subtotal.toLocaleString("en-IN")}</p>

            <p>Discount: ₹${savedOrder.discount.toLocaleString("en-IN")}</p>

            <h2 style="color:#15803d;">
                Total: ₹${savedOrder.total.toLocaleString("en-IN")}
            </h2>

        </div>

        <p style="margin-top:25px;color:#64748b;">
            Please contact the customer to confirm this enquiry.
        </p>

    </div>

</div>
`;

const emailSent = await sendEmail(
    "ashlinjoel05@gmail.com",
    `New Order Enquiry - ${savedOrder.orderId}`,
    emailHTML
);

console.log(
    emailSent
        ? "Order Email Sent Successfully"
        : "Order Saved, But Email Sending Failed"
);



        // 7. Send success response

        res.status(201).json({

            success: true,
            message: "Order saved successfully",
            orderId: savedOrder.orderId,
            order: savedOrder

        });

    } catch (error) {

        console.error("Order Save Error:", error);

        res.status(500).json({

            success: false,
            message: "Unable to save order",
            error: error.message

        });

    }

});





// =====================================
// GET PENDING ORDERS
// =====================================

app.get("/api/admin/orders/pending", async (req, res) => {

    try {

        if (!req.session.masterAdmin) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized access"
            });
        }

        const orders = await Order.find({
            orderStatus: "Pending"
        }).sort({
            orderDate: -1
        }).lean();

        res.json({
            success: true,
            count: orders.length,
            orders: orders
        });

    } catch (error) {

        console.error("Pending Orders Error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to load pending orders"
        });

    }

});


// =====================================
// COMPLETE ORDER
// =====================================

app.patch("/api/admin/orders/:orderId/complete", async (req, res) => {

    try {

        if (!req.session.masterAdmin) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized access"
            });
        }

        const order = await Order.findOne({
            orderId: req.params.orderId
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        if (order.orderStatus !== "Pending") {
            return res.status(400).json({
                success: false,
                message: "Only pending orders can be completed"
            });
        }

        order.orderStatus = "Completed";
        order.completedAt = new Date();

        await order.save();

        res.json({
            success: true,
            message: "Order completed successfully"
        });

    } catch (error) {

        console.error("Complete Order Error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to complete order"
        });

    }

});


// =====================================
// DELETE ORDER
// =====================================

app.delete("/api/admin/orders/:orderId", async (req, res) => {

    try {

        if (!req.session.masterAdmin) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized access"
            });
        }

        const order = await Order.findOneAndDelete({
            orderId: req.params.orderId,
            orderStatus: "Pending"
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Pending order not found"
            });
        }

        res.json({
            success: true,
            message: "Order deleted successfully"
        });

    } catch (error) {

        console.error("Delete Order Error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to delete order"
        });

    }

});









// ===============================
// SERVER
// ===============================

const PORT = process.env.PORT || 5000;



app.use(express.json());


// ===============================
// PROTECT ADMIN SETTINGS
// ===============================

app.get(
    ["/admin-settings", "/admin-settings.html"],
    (req, res) => {

        if (!req.session.masterAdmin) {
            return res.redirect("/admin-login.html");
        }

        res.sendFile(
            path.join(__dirname, "admin-settings.html")
        );

    }
);

app.use(express.static(__dirname));





// ==================================
// SAVE PRODUCT API
// ==================================

app.post("/api/products", async (req, res) => {

    try {

        const {
            name,
            category,
            badge,
            icon,
            shortSpec,
            rating,
            reviews,
            price,
            oldPrice,
            available,
            processor,
            ram,
            storage,
            batteryHealth,
            condition,
            display,
            graphics,
            ports,
            sensors,
            os,
            backup,
            warranty
        } = req.body;


        // 1. VALIDATE BASIC DETAILS

        if (!name || !category || !shortSpec) {

            return res.status(400).json({
                success: false,
                message: "Please provide all required product details"
            });

        }


        // 2. VALIDATE PRICE AND STOCK

        const productPrice = Number(price);
        const productOldPrice = Number(oldPrice) || 0;
        const productStock = Number(available);

        if (
            !Number.isFinite(productPrice) ||
            productPrice < 0 ||
            !Number.isFinite(productOldPrice) ||
            productOldPrice < 0 ||
            !Number.isInteger(productStock) ||
            productStock < 0
        ) {

            return res.status(400).json({
                success: false,
                message: "Invalid price or stock quantity"
            });

        }


        // 3. GENERATE PRODUCT ID

        const slug = name
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");

        const productId =
            slug + "-" +
            crypto.randomBytes(3).toString("hex");


        // 4. CREATE PRODUCT

        const newProduct = new Product({

            productId,

            name: name.trim(),

            category,

            badge: badge || "",

            icon: icon || "fa-laptop",

            shortSpec,

            rating: Number(rating) || 0,

            reviews: Number(reviews) || 0,

            price: productPrice,

            oldPrice: productOldPrice,

            available: productStock,

            processor,
            ram,
            storage,
            batteryHealth,
            condition,
            display,
            graphics,
            ports,
            sensors,
            os,
            backup,
            warranty

        });


        // 5. SAVE IN MONGODB

        const savedProduct = await newProduct.save();


        // 6. SUCCESS RESPONSE

        res.status(201).json({

            success: true,

            message: "Product saved successfully",

            product: savedProduct

        });


    } catch (error) {

        console.error("Product Save Error:", error);

        res.status(500).json({

            success: false,

            message: "Unable to save product",

            error: error.message

        });

    }

});




// ==================================
// PRODUCT IMAGE UPLOAD CONFIG
// ==================================

const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 5
    },
    fileFilter: (req, file, cb) => {

        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(new Error("Only image files are allowed"));
        }

    }
});



// ==================================
// PRODUCT IMAGE UPLOAD API
// ==================================

const streamifier = require("streamifier");

app.post(
    "/api/products/:productId/images",
    upload.array("images", 5),
    async (req, res) => {

        try {

            const { productId } = req.params;

            if (!req.files || req.files.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Please select at least one image"
                });
            }

            const product = await Product.findOne({ productId });

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: "Product not found"
                });
            }

            if (product.images.length + req.files.length > 5) {
                return res.status(400).json({
                    success: false,
                    message: "Maximum 5 images allowed"
                });
            }

            const uploadedImages = [];

            for (const file of req.files) {

                const imageUrl = await new Promise((resolve, reject) => {

                    const stream = cloudinary.uploader.upload_stream(
                        {
                            folder: "refurbtech/products",
                            resource_type: "image"
                        },
                        (error, result) => {

                            if (error) {
                                return reject(error);
                            }

                            resolve(result.secure_url);

                        }
                    );

                    streamifier.createReadStream(file.buffer).pipe(stream);

                });

                uploadedImages.push(imageUrl);
            }

            product.images.push(...uploadedImages);

            await product.save();

            res.json({
                success: true,
                message: "Product images uploaded successfully",
                images: product.images
            });

        } catch (error) {

            console.error("Product Image Upload Error:", error);

            res.status(500).json({
                success: false,
                message: "Product image upload failed",
                error: error.message
            });

        }

    }
);

// ==================================
// GET PRODUCTS API
// ==================================

app.get("/api/products", async (req, res) => {

    try {

        const { category, search, limit } = req.query;

        // Active Products மட்டும்
        const filter = {
            isActive: true
        };

        // Category Filter
        if (category && category !== "ALL") {
            filter.category = category.toUpperCase();
        }

        // Search Filter
        if (search && search.trim()) {

            filter.$or = [
                { name: { $regex: search.trim(), $options: "i" } },
                { shortSpec: { $regex: search.trim(), $options: "i" } },
                { category: { $regex: search.trim(), $options: "i" } }
            ];

        }

        let query = Product.find(filter)
            .sort({ createdAt: -1 });

        // Optional Product Limit
        if (limit) {
            const productLimit = Number(limit);

            if (!Number.isInteger(productLimit) ||
                productLimit < 1 ||
                productLimit > 100) {

                return res.status(400).json({
                    success: false,
                    message: "Invalid product limit"
                });

            }

            query = query.limit(productLimit);
        }

        const products = await query.lean();

        res.json({
            success: true,
            count: products.length,
            products: products
        });

    } catch (error) {

        console.error("Get Products Error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to fetch products"
        });

    }

});






app.listen(PORT, () => {

    console.log(
        `RefurbTech Server running on port ${PORT}`
    );

});