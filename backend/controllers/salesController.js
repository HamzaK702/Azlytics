import salesService from "../services/salesService.js";

export const getSalesTrends = async (req, res) => {
  try {
    // Extract query parameters with default values
    const { filter = 'one_month', customStartDate = null, customEndDate = null } = req.query;

    // Fetch sales trends from service
    const salesTrends = await salesService.getSalesTrends(filter, customStartDate, customEndDate);

    // Send response
    return res.json(salesTrends);
  } catch (error) {
    console.error('Error in getSalesTrendsController:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const fetchAOV = async (req, res) => {
  try {
    const { filter, customStartDate, customEndDate } = req.query;

    if (!filter) {
      return res.status(400).json({ error: 'Filter parameter is required' });
    }

    const aovData = await salesService.getAOV(filter, customStartDate, customEndDate);
    res.json(aovData);
  } catch (error) {
    console.error("Error calculating AOV:", error.message);
    res.status(500).json({ error: 'Error calculating AOV' });
  }
};

export const getTopCities = async (req , res)=>{
  try {
    const { filter, customStartDate, customEndDate , granularity  } = req.query;
    const topCitiesData = await salesService.getTopCities(filter, customStartDate, customEndDate , granularity );
    res.status(200).json(topCitiesData);
  } catch (error) {
    console.error('Error fetching top cities:', error.message);
    res.status(500).json({ message: 'An error occurred while fetching top cities.' });
  }
}

export const getTopCitiesComparison = async (req, res) => {
  try {
    const { filter, customStartDate, customEndDate , granularity } = req.query;

    // Call the service function to get the comparison data
    const comparisonData = await salesService.getTopCitiesComparison(filter, customStartDate, customEndDate , granularity);

    // Send the comparison data in the response
    res.status(200).json({
      success: true,
      data: comparisonData,
    });
  } catch (error) {
    console.error('Error in getTopCitiesComparison:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch top cities comparison',
      error: error.message,
    });
  }
};

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

export const getTotalAdSpendByDate = async (req, res) => {
  try {
    const { filter, customStartDate, customEndDate } = req.query;

    if (filter === 'custom_date_range') {
      if (!customStartDate || !customEndDate) {
        return res.status(400).json({ error: 'Custom start and end dates are required for the custom_date_range filter' });
      }
    }

    const result = await salesService.calculateTotalAdSpendByDate(filter, customStartDate, customEndDate);
    res.json(result);
  } catch (error) {
    console.error('Error in getAdSpend controller:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getBlendedCAC = async (req, res) => {
  const { filter, customStartDate, customEndDate } = req.query;

  try {
    const result = await salesService.calculateBlendedCAC(filter, customStartDate, customEndDate);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
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


export const getBlendedROAS = async (req, res) => {
  try {
    // Extract filter, customStartDate, and customEndDate from query parameters
    const { filter, customStartDate, customEndDate } = req.query;

    // Call the service function to calculate Blended ROAS
    const result = await salesService.calculateBlendedROAS(filter, customStartDate, customEndDate);

    // Send the result as a JSON response
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error in getBlendedROAS:', error.message);
    res.status(500).json({
      success: false,
      message: 'An error occurred while calculating Blended ROAS',
      error: error.message,
    });
  }
};




export const getDailyAdSpendForPastThreeMonths = async (req, res) => {
  try {
    const leastProfitableProducts = await salesService.getDailyAdSpendForPastThreeMonths();
    res.json(leastProfitableProducts);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch least profitable products" });
  }
};