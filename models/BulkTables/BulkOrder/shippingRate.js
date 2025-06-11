import mongoose from 'mongoose';

const shippingRateSchema = new mongoose.Schema({
    orderId: {
        type: String,
        required: true,
        unique: true,
    },
    title: String,
    price: String,
    shippingRateHandle: String,
    discountAllocations: Array,
});

const ShippingRate = mongoose.model('ShippingRate', shippingRateSchema);

export default ShippingRate;
