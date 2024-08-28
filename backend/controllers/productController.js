import { searchProductTitles , getProductImageByTitle, addOrUpdateCostPrice } from "../services/productService.js";


export const searchProductTitlesController = async (req, res) => {
    const { query } = req.query; 
  
    try {
      if (!query) {
        return res.status(400).json({ message: 'Query parameter is required' });
      }
  
      const products = await searchProductTitles(query);
      return res.status(200).json(products);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  };


  export const getProductImage = async (req, res) => {
    const { title } = req.query;
  
    try {
      if (!title) {
        return res.status(400).json({ message: 'Title query parameter is required' });
      }
  
      const image = await getProductImageByTitle(title);
      return res.status(200).json({ image });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  };




  export const updateCostPrice = async (req, res) => {
    const { productId, costPrice } = req.query;
  
    try {
      if (!productId || costPrice === undefined) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
  
      const product = await addOrUpdateCostPrice(productId, costPrice.toString());
      return res.status(200).json(product);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  };
  