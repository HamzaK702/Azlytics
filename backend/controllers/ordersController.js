import getOrdersTrend from "../services/ordersService.js";

const ordersTrend = async (req, res) => {
  try {
    const trends = await getOrdersTrend();
    res.json(trends);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export default ordersTrend;
