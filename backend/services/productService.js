import Product from "../models/BulkTables/BulkProduct/product.js";

export const searchProductTitles = async (query) => {
    try {
      const products = await Product.find({
        title: { $regex: query, $options: 'i' } // Case-insensitive search
      }).select('title id'); 
  
      return products;
    } catch (error) {
      throw new Error(`Error searching for product titles: ${error.message}`);
    }
  };

  export const getProductImageByTitle = async (title) => {
    try {
      const product = await Product.findOne({ title }).select('title image');
  
      if (!product) {
        throw new Error('Product not found');
      }
  
      return product;
    } catch (error) {
      throw new Error(`Error fetching product image: ${error.message}`);
    }
  };







  export const addOrUpdateCostPrice = async (shopifyProductId, costPrice) => {
    try {
      console.log(`Received productId: ${shopifyProductId}, costPrice: ${costPrice}`);
  
      // Find the product by Shopify product ID and update the costPrice field
      const product = await Product.findOneAndUpdate(
        { id: shopifyProductId },
        { costPrice: costPrice.toString() },
        { new: true, runValidators: true }
      );
  
      if (!product) {
        throw new Error('Product not found');
      }
  
      console.log(`Updated product: ${product.title}, new costPrice: ${product.costPrice}`);
  
      return product;
    } catch (error) {
      console.error(`Error in addOrUpdateCostPrice: ${error.message}`);
      throw new Error(`Error adding or updating cost price: ${error.message}`);
    }
  };
  
  