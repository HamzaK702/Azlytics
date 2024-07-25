import mongoose from 'mongoose';
const { Schema } = mongoose;

const addressSchema = new Schema({
  id: String,
  address1: String,
  address2: String,
  city: String,
  company: String,
  country: String,
  countryCode: String,
  countryCodeV2: String,
  firstName: String,
  lastName: String,
  latitude: Number,
  longitude: Number,
  name: String,
  phone: String,
  province: String,
  provinceCode: String,
  zip: String,
});

export default addressSchema;
