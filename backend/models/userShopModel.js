import mongoose from 'mongoose';

const userShopSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    shop: { type: String, required: true },
    token: { type: String, required: true }
});

const UserShop = mongoose.model('UserShop', userShopSchema);

export default UserShop;
