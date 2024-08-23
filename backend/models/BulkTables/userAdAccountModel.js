import mongoose from 'mongoose';

const userAdAccountSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
  },
  googleAdAccessToken: {
    type: String,
  },
  googleAdRefreshToken: {
    type: String,
  },
  metaAccessToken: {
    type: String,
  },
  metaAdAccounts: [
    {
      accountId: String,
      accountName: String,
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const UserAdAccount = mongoose.model('UserAdAccount', userAdAccountSchema);

export default UserAdAccount;
