const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({

    // PRODUCT BASIC INFORMATION

    productId: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },

    name: {
        type: String,
        required: true,
        trim: true
    },

    category: {
        type: String,
        required: true,
        enum: ["LAPTOP", "DESKTOP", "ACCESSORY", "STORAGE", "RAM"]
    },

    badge: {
        type: String,
        default: ""
    },

    icon: {
        type: String,
        required: true,
        default: "fa-laptop"
    },

    shortSpec: {
        type: String,
        required: true
    },

    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },

    reviews: {
        type: Number,
        default: 0,
        min: 0
    },


    // PRICE AND STOCK

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

    available: {
        type: Number,
        required: true,
        min: 0
    },


    // PRODUCT SPECIFICATIONS

    processor: {
        type: String,
        default: "N/A"
    },

    ram: {
        type: String,
        default: "N/A"
    },

    storage: {
        type: String,
        default: "N/A"
    },

    batteryHealth: {
        type: String,
        default: "N/A"
    },

    condition: {
        type: String,
        default: "N/A"
    },

    display: {
        type: String,
        default: "N/A"
    },

    graphics: {
        type: String,
        default: "N/A"
    },

    ports: {
        type: String,
        default: "N/A"
    },

    sensors: {
        type: String,
        default: "N/A"
    },

    os: {
        type: String,
        default: "N/A"
    },

    backup: {
        type: String,
        default: "N/A"
    },

    warranty: {
        type: String,
        default: "N/A"
    },


    // PRODUCT IMAGES

    images: {
    type: [String],
    default: [],
    validate: {
        validator: function(images) {
            return images.length <= 5;
        },
        message: "Maximum 5 images allowed"
    }
},

    isActive: {
        type: Boolean,
        default: true
    }

}, {
    timestamps: true
});


// EXPORT MODEL

module.exports = mongoose.model("Product", productSchema);