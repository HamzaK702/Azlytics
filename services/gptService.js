// services/gptService.js
import OpenAI from 'openai';
import { Readable } from 'stream';
import Order from "../models/BulkTables/BulkOrder/order.js";
import Product from "../models/BulkTables/BulkProduct/product.js";
import Customer from "../models/BulkTables/BulkCustomer/customer.js";

if(process.env.OPENAI_API_KEY){
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
}

export const generateCompletion = async (prompt, onData) => {
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
        });
         
        // Extract the full content directly
        const content = response.choices[0].message.content;
        onData(content);

        return content;
    } catch (error) {
        console.error('Error in GPT service:', error.response?.data || error.message);
        throw new Error('Error generating completion');
    }
};

export async function streamingChat(prompt, shopId){
    const stream = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        stream: true,
    });

    const outputStream = new Readable({
        read() {}
    });

    (async () => {
        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || "";
            outputStream.push(content);
        }
        outputStream.push(null); // Signal the end of the stream
    })();

    return outputStream;
}

const determineDataRequirements = (userPrompt) => {
    const dataRequirements = {
      order: false,
      product: false,
      customer: false
    };
  
    const orderKeywords = [
      'order', 'purchase', 'invoice', 'billing', 'transaction', 
      'shipping', 'subtotal', 'refund', 'payment'
    ];
    const productKeywords = [
      'product', 'inventory', 'stock', 'price', 'sku', 
      'catalog', 'variants', 'tags', 'title', 'description'
    ];
    const customerKeywords = [
      'customer', 'client', 'user', 'email', 'phone', 
      'address', 'profile', 'order history', 'loyalty'
    ];
  
    const containsKeywords = (prompt, keywords) => {
      return keywords.some(keyword => prompt.toLowerCase().includes(keyword));
    };
  
    if (containsKeywords(userPrompt, orderKeywords)) {
      dataRequirements.order = true;
    }
    if (containsKeywords(userPrompt, productKeywords)) {
      dataRequirements.product = true;
    }
    if (containsKeywords(userPrompt, customerKeywords)) {
      dataRequirements.customer = true;
    }
  
    return {
        order: dataRequirements.order, 
        product: dataRequirements.product, 
        customer: dataRequirements.customer
    };
  };

  const fetchDataForGPT = async (userShopId, requirements) => {
    const dataResponse = {};
  
    if (requirements.order) {
      const orders = await Order.find({ userShopId }).lean();
      dataResponse.orders = JSON.stringify(orders);
    }
  
    if (requirements.product) {
      const products = await Product.find({ userShopId }).lean();
      dataResponse.products = JSON.stringify(products);
    }
  
    if (requirements.customer) {
      const customers = await Customer.find({ userShopId }).lean();
      dataResponse.customers = JSON.stringify(customers);
    }
  
    return formatDataForGPT(dataResponse);
  };

  const formatDataForGPT = (data) => {
    let formattedString = "";
  
    if (data.orders) {
      formattedString += `Orders Data:\n${data.orders}\n\n`;
    }
  
    if (data.products) {
      formattedString += `Products Data:\n${data.products}\n\n`;
    }
  
    if (data.customers) {
      formattedString += `Customers Data:\n${data.customers}\n\n`;
    }
  
    return formattedString.trim();
  };

export async function middlewareChat(prompt, shopId){
    const dataRequirements = determineDataRequirements(prompt);
    const data = await fetchDataForGPT(shopId, dataRequirements);
    const fullPrompt = `You are an experienced Shopify analyst with deep expertise in e-commerce trends, store performance optimization, and data-driven decision-making. Your goal is to provide concise, accurate, and actionable insights based on the provided store data. Use industry best practices and Shopify's analytics framework to analyze the information. Ensure your responses are professional, data-focused, and easy to understand for stakeholders. Avoid unnecessary details and focus on key metrics, trends, and recommendations that drive business growth. \n${prompt} \n here is data of my shopify store: ${data}`;
    console.log(fullPrompt);
    const stream = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: fullPrompt }],
        stream: true,
    });

    const outputStream = new Readable({
        read() {}
    });

    (async () => {
        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || "";
            outputStream.push(content);
        }
        outputStream.push(null); // Signal the end of the stream
    })();

    return outputStream;
}