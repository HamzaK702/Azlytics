import salesService from "../services/salesService.js";

export const getSalesTrends = async (req, res) => {
  try {
    const trends = await salesService.getSalesTrends();
    res.json(trends);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const getAOV = async (req, res) => {
  try {
    const aov = await salesService.getAOV();
    res.json(aov);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const getTopCities = async (req , res)=>{
  try{
    const topCities = await salesService.getTopCities();
    res.json(topCities);
  }
  catch(error){
    console.log(error);
  res.status(500).json({ message: 'Internal Server Error' });
  }
}

export const getTopSKUs = async (req, res) => {
  try {
    const skus = await salesService.getTopSKUs();
    res.json(skus);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}

export const getGrossSales = async (req, res) => {
  try {
      const totalGrossSales = await salesService.calculateGrossSales();
      res.status(200).json({ totalGrossSales });
  } catch (error) {
      console.error('Error in getGrossSales controller:', error);
      res.status(500).json({ message: 'Failed to calculate Gross Sales', error });
  }
};

export const getTotalRefunds = async (req, res) => {
  try {
      const totalRefunds = await salesService.calculateTotalRefunds();
      res.json({ totalRefunds });
  } catch (error) {
      res.status(500).json({ error: 'Failed to calculate total refunds' });
  }
};


export const getTotalTaxes = async (req, res) => {
  try {
      const totalTaxes = await salesService.calculateTotalTaxes();
      res.json({ totalTaxes });
  } catch (error) {
      res.status(500).json({ error: 'Failed to calculate total taxes' });
  }
};

export const getTotalFees = async (req, res) => {
  try {
      const totalFees = await salesService.calculateTotalFees();
      res.json({ totalFees });
  } catch (error) {
      res.status(500).json({ error: 'Failed to calculate total fees' });
  }
};

export const getTotalShippingCost = async (req, res) => {
  try {
      const totalShippingCost = await salesService.calculateTotalShippingCost();
      res.json({ totalShippingCost });
  } catch (error) {
      res.status(500).json({ error: 'Failed to calculate total shipping cost' });
  }
};


export const getTotalAdSpend = async (req, res) => {
  try {
    const totalAdSpend = await salesService.calculateTotalAdSpend();
    return res.status(200).json({ totalAdSpend });
  } catch (error) {
    return res.status(500).json({ message: 'Error calculating total ad spend', error: error.message });
  }
};


export const getTotalSales = async (req, res) => {
  try {
    const totalSales = await salesService.calculateTotalSales();
    res.status(200).json({ totalSales });
  } catch (error) {
    console.error('Error in getTotalSales controller:', error);
    res.status(500).json({ message: 'Failed to calculate Total Sales', error });
  }
};


export const getGrossProfitBreakdown = async (req, res) => {
  try {
      const breakdown = await salesService.calculateGrossProfitBreakdown();
      res.status(200).json(breakdown);
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
};


export const getProductProfitability = async (req, res) => {
  try {
    const data = await salesService.calculateProductProfitability();
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const getLeastProfitableProducts = async (req, res) => {
  try {
    const leastProfitableProducts = await salesService.calculateLeastProfitableProducts();
    res.json(leastProfitableProducts);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch least profitable products" });
  }
};

export const getBestSellers = async (req, res) => {
  try {
    const bestSellers = await salesService.calculateBestSellers();
    res.json(bestSellers);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch best sellers" });
  }
};