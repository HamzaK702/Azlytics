
import fetch from 'node-fetch';

export class ShopifyService {
    static async getAccessToken(shop, code) {
        const url = `https://${shop}/admin/oauth/access_token`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                client_id: process.env.SHOPIFY_API_KEY,
                client_secret: process.env.SHOPIFY_API_SECRET,
                code
            })
        });
        const data = await response.json();
        return data.access_token;
    }

    static async getShopData(shop, token) {
        const url = `https://${shop}/admin/shop.json`;
        const response = await fetch(url, {
            headers: {
                'X-Shopify-Access-Token': token
            }
        });
        return await response.json();
    }

    static async fetchGraphQL(shop, token, query) {
        const url = `https://${shop}/admin/api/2023-04/graphql.json`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': token
            },
            body: JSON.stringify({ query })
        });
        const data = await response.json();
        return data;
    }

    static async getOrders(shop, token) {
        const query = `
            {
                orders(first: 10) {
                    edges {
                        node {
                            id
                            name
                            totalPrice
                            createdAt
                            lineItems(first: 5) {
                                edges {
                                    node {
                                        name
                                        quantity
                                        price
                                    }
                                }
                            }
                        }
                    }
                }
            }
        `;
        return await this.fetchGraphQL(shop, token, query);
    }

    static async getProducts(shop, token) {
        const query = `
            {
                products(first: 10) {
                    edges {
                        node {
                            id
                            title
                            variants(first: 5) {
                                edges {
                                    node {
                                        id
                                        title
                                        price
                                    }
                                }
                            }
                        }
                    }
                }
            }
        `;
        return await this.fetchGraphQL(shop, token, query);
    }
}
