const mongoose = require("mongoose");


// =====================================
// ORDER PRODUCT SCHEMA
// =====================================

const orderProductSchema = new mongoose.Schema({

    productId: {
        type: String,
        required: true
    },

    productName: {
        type: String,
        required: true,
        trim: true
    },

    category: {
        type: String,
        default: ""
    },

    price: {
        type: Number,
        required: true,
        min: 0
    },

    oldPrice: {
        type: Number,
        default: 0,
        min: 0
    },

    quantity: {
        type: Number,
        required: true,
        min: 1
    },

    image: {
        type: String,
        default: ""
    },

    itemTotal: {
        type: Number,
        required: true,
        min: 0
    }

}, { _id: false });


// =====================================
// CUSTOMER DETAILS SCHEMA
// =====================================

const customerSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true,
        trim: true
    },

    phone: {
        type: String,
        required: true,
        trim: true
    },

    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },

    address: {
        type: String,
        required: true,
        trim: true
    },

    city: {
        type: String,
        required: true,
        trim: true
    },

    pincode: {
        type: String,
        required: true,
        trim: true
    }

}, { _id: false });


// =====================================
// MAIN ORDER SCHEMA
// =====================================

const orderSchema = new mongoose.Schema({

    orderId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    customer: {
        type: customerSchema,
        required: true
    },

    products: {
        type: [orderProductSchema],
        required: true,
        validate: {
            validator: function (products) {
                return products.length > 0;
            },
            message: "Order must contain at least one product"
        }
    },

    subtotal: {
        type: Number,
        required: true,
        min: 0
    },

    discount: {
        type: Number,
        default: 0,
        min: 0
    },

    deliveryCharge: {
        type: Number,
        default: 0,
        min: 0
    },

    total: {
        type: Number,
        required: true,
        min: 0
    },

    paymentStatus: {
        type: String,
        enum: [
            "Pending",
            "Paid",
            "Failed",
            "Refunded"
        ],
        default: "Pending"
    },

    orderStatus: {
        type: String,
        enum: [
            "Pending",
            "Confirmed",
            "Processing",
            "Shipped",
            "Delivered",
            "Cancelled",
            "completed"
        ],
        default: "Pending"
    },

    orderDate: {
        type: Date,
        default: Date.now
    },
    completedAt:{
        type:Date,
        default:null

    },

}, {
    timestamps: true
});


// =====================================
// EXPORT MODEL
// =====================================

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;