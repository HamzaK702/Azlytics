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
