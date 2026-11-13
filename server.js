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
const User = require("./models/user");
const bcrypt = require("bcryptjs");


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


function isAdminAuthenticated(req) {

    return (
        req.session.masterAdmin === true ||
        Boolean(req.session.user && req.session.user.id)
    );

}





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

    app.post("/api/admin/master-login", async (req, res) => {

    try {

        // Existing login form field

        const identifier =
            (req.body.email || req.body.username || "").trim();

        const { password } = req.body;

        if (!identifier || !password) {
            return res.status(400).json({
                success: false,
                message: "Username and password required"
            });
        }

        // =================================
        // 1. CHECK MASTER ADMIN (.env)
        // =================================

        if (
            identifier.toLowerCase() ===
                (process.env.MASTER_ADMIN_EMAIL || "").toLowerCase() &&
            password === process.env.MASTER_ADMIN_PASSWORD
        ) {

            return req.session.regenerate((error) => {

                if (error) {
                    return res.status(500).json({
                        success: false,
                        message: "Session creation failed"
                    });
                }

                req.session.masterAdmin = true;

                req.session.save((saveError) => {

                    if (saveError) {
                        return res.status(500).json({
                            success: false,
                            message: "Session save failed"
                        });
                    }

                    res.json({
                        success: true,
                        loginType: "master",
                        message: "Master Admin Login Successful"
                    });

                });

            });

        }

        // =================================
        // 2. CHECK DATABASE USER
        // =================================

        const user = await User.findOne({
            username: identifier.toLowerCase()
        });

        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                message: "Invalid Username or Password"
            });
        }

        const passwordMatch = await bcrypt.compare(
            password,
            user.passwordHash
        );

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid Username or Password"
            });
        }

        // =================================
        // 3. CREATE USER SESSION
        // =================================

        req.session.regenerate((error) => {

            if (error) {
                return res.status(500).json({
                    success: false,
                    message: "Session creation failed"
                });
            }

            req.session.user = {
                id: user._id.toString(),
                username: user.username,
                name: user.name
            };

            req.session.save((saveError) => {

                if (saveError) {
                    return res.status(500).json({
                        success: false,
                        message: "Session save failed"
                    });
                }

                res.json({
                    success: true,
                    loginType: "user",
                    message: "User Login Successful"
                });

            });

        });

    } catch (error) {

        console.error("Login Error:", error);

        res.status(500).json({
            success: false,
            message: "Login failed"
        });

    }

});














app.post("/api/user/login", async (req, res) => {

    try {

        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: "Username and password required"
            });
        }

        const user = await User.findOne({
            username: username.trim().toLowerCase()
        });

        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                message: "Invalid username or password"
            });
        }

        const isMatch = await bcrypt.compare(
            password,
            user.passwordHash
        );

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid username or password"
            });
        }

        // Create a fresh session after successful login
        req.session.regenerate((error) => {

            if (error) {
                console.error("Session Error:", error);

                return res.status(500).json({
                    success: false,
                    message: "Unable to create login session"
                });
            }

            req.session.user = {
                id: user._id.toString(),
                username: user.username,
                name: user.name
            };

            req.session.save((saveError) => {

                if (saveError) {
                    return res.status(500).json({
                        success: false,
                        message: "Unable to save login session"
                    });
                }

                res.json({
                    success: true,
                    message: "Login successful"
                });

            });

        });

    } catch (error) {

        console.error("User Login Error:", error);

        res.status(500).json({
            success: false,
            message: "Login failed"
        });

    }

});





app.post("/api/admin/users", async (req, res) => {

    try {

        // ONLY MASTER ADMIN CAN CREATE USERS
        if (req.session.masterAdmin !== true) {
            return res.status(403).json({
                success: false,
                message: "Master Admin access required"
            });
        }

        const { username, name, password } = req.body;

        if (!username || !name || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        const cleanUsername = username.trim().toLowerCase();

        if (!/^[a-z0-9._-]{3,30}$/.test(cleanUsername)) {
            return res.status(400).json({
                success: false,
                message: "Username must be 3-30 characters"
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must contain at least 8 characters"
            });
        }

        const existingUser = await User.findOne({
            username: cleanUsername
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Username already exists"
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const newUser = new User({
            username: cleanUsername,
            name: name.trim(),
            passwordHash
        });

        await newUser.save();

        res.status(201).json({
            success: true,
            message: "User created successfully",
            user: {
                id: newUser._id,
                username: newUser.username,
                name: newUser.name,
                isActive: newUser.isActive
            }
        });

    } catch (error) {

 

    console.error("Create User Error:", error);

    res.status(500).json({

        success: false,

        message: "Unable to create user",

        error: process.env.NODE_ENV === "production"
            ? undefined
            : error.message

    });

}

});





app.get("/api/admin/users", async (req, res) => {

    try {

        if (req.session.masterAdmin !== true) {
            return res.status(403).json({
                success: false,
                message: "Master Admin access required"
            });
        }

        const users = await User.find({})
            .select("-passwordHash")
            .sort({ createdAt: -1 })
            .lean();

        res.json({
            success: true,
            count: users.length,
            users
        });

    } catch (error) {

        console.error("Get Users Error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to fetch users"
        });

    }

});







// ===============================
// HOME
// ===============================

app.get("/", (req, res) => {

    res.sendFile(path.join(__dirname, "Welcome.html"))
       
    

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

        if (!isAdminAuthenticated(req))  {
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

    const session = await mongoose.startSession();

    try {

        if (!isAdminAuthenticated(req)) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized access"
            });
        }

        let completedOrder = false;

        await session.withTransaction(async () => {

            // 1. FIND PENDING ORDER

            const order = await Order.findOne({
                orderId: req.params.orderId,
                orderStatus: "Pending"
            }).session(session);

            if (!order) {
                throw new Error("ORDER_NOT_PENDING");
            }

            // 2. VALIDATE ORDER PRODUCTS

            if (!order.products || order.products.length === 0) {
                throw new Error("NO_ORDER_PRODUCTS");
            }

            // 3. COMBINE DUPLICATE PRODUCT ITEMS

            const stockItems = new Map();

            for (const item of order.products) {

                const productId = item.productId;
                const quantity = Number(item.quantity);

                if (
                    !productId ||
                    !Number.isInteger(quantity) ||
                    quantity <= 0
                ) {
                    throw new Error("INVALID_ORDER_QUANTITY");
                }

                stockItems.set(
                    productId,
                    (stockItems.get(productId) || 0) + quantity
                );

            }

            // 4. REDUCE PRODUCT STOCK

            for (const [productId, quantity] of stockItems) {

                const result = await Product.updateOne(
                    {
                        productId: productId,
                        available: { $gte: quantity }
                    },
                    {
                        $inc: { available: -quantity }
                    },
                    { session }
                );

                if (result.modifiedCount !== 1) {
                    throw new Error("INSUFFICIENT_STOCK");
                }

            }

            // 5. COMPLETE ORDER

            order.orderStatus = "Completed";
            order.completedAt = new Date();

            await order.save({ session });

            completedOrder = true;

        });

        if (completedOrder) {
            return res.json({
                success: true,
                message: "Order completed and stock updated successfully"
            });
        }

    } catch (error) {

        console.error("Complete Order Error:", error);

        if (error.message === "ORDER_NOT_PENDING") {
            return res.status(400).json({
                success: false,
                message: "Order is not pending or already completed"
            });
        }

        if (error.message === "NO_ORDER_PRODUCTS") {
            return res.status(400).json({
                success: false,
                message: "No products found in this order"
            });
        }

        if (error.message === "INVALID_ORDER_QUANTITY") {
            return res.status(400).json({
                success: false,
                message: "Invalid product quantity in order"
            });
        }

        if (error.message === "INSUFFICIENT_STOCK") {
            return res.status(400).json({
                success: false,
                message: "Insufficient stock. Order cannot be completed."
            });
        }

        res.status(500).json({
            success: false,
            message: "Unable to complete order"
        });

    } finally {

        await session.endSession();

    }

});


// =====================================
// DELETE ORDER
// =====================================

app.delete("/api/admin/orders/:orderId", async (req, res) => {

    try {

        if (!isAdminAuthenticated(req)) {
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

        if (!isAdminAuthenticated(req)) {
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
            isActive: true,
            available: { $gte: 1}
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


// ==================================
// ADMIN - GET ALL PRODUCTS API
// ==================================

app.get("/api/admin/products", async (req, res) => {

    try {

        // ADMIN AUTHENTICATION
        if (!isAdminAuthenticated(req)) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized access"
            });
        }

        // ALL PRODUCTS - Active and Inactive
        const products = await Product.find({})
            .sort({ createdAt: -1 })
            .lean();

        // TOTAL STOCK VALUE
        const totalStockValue = products.reduce(
            (total, product) => {
                return total +
                    (product.available * product.price);
            },
            0
        );

        res.json({
            success: true,
            count: products.length,
            totalStockValue,
            products
        });

    } catch (error) {

        console.error("Admin Product List Error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to fetch products"
        });

    }

});




// ==================================
// ADMIN - STOCK VIEW API
// ==================================

app.get("/api/admin/stock", async (req, res) => {

    try {

        if (!isAdminAuthenticated(req)) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized access"
            });
        }

        const products = await Product.find({
            isActive: true,
            available: { $gte: 1 }
        })
        .select("productId name category available")
        .sort({ name: 1 })
        .lean();

        const totalQuantity = products.reduce(
            (total, product) => total + product.available,
            0
        );

        res.json({
            success: true,
            count: products.length,
            totalQuantity,
            products
        });

    } catch (error) {

        console.error("Stock View Error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to fetch stock"
        });

    }

});





app.get("/api/admin/current-user", (req, res) => {

    if (req.session.masterAdmin) {

        return res.json({
            success: true,
            name: "Master Admin",
            username: process.env.MASTER_ADMIN_EMAIL
        });

    }

    if (req.session.user) {

        return res.json({
            success: true,
            name: req.session.user.name,
            username: req.session.user.username
        });

    }

    return res.status(401).json({
        success: false,
        message: "Unauthorized"
    });

});



app.listen(PORT, () => {

    console.log(
        `RefurbTech Server running on port ${PORT}`
    );

});