
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
        console.log(data)
        return data;
    }

    static async getOrders(shop, token) {
        const query = `
            {
              orders(first: 10) {
                edges {
                  node {
                    id
                    billingAddress {
                      id
                      address1
                      address2
                      city
                      company
                      country
                      countryCode
                      countryCodeV2
                      firstName
                      lastName
                      latitude
                      longitude
                      name
                      phone
                      province
                      provinceCode
                      zip
                    }
                    cancelReason
                    cancelledAt
                    closed
                    closedAt
                    createdAt
                    currencyCode
                    currentSubtotalLineItemsQuantity
                    customAttributes {
                      key
                      value
                    }
                    customer {
                      id
                      acceptsMarketing
                      email
                      firstName
                      lastName
                      phone
                      tags
                    }
                    customerLocale
                    discountApplications(first: 10) {
                      edges {
                        node {
                          allocationMethod
                          targetType
                          value
                        }
                      }
                    }
                    displayFinancialStatus
                    displayFulfillmentStatus
                    email
                    lineItems(first: 250) {
                      edges {
                        node {
                          id
                          title
                          quantity
                          product {
                            id
                            title
                            handle
                          }
                        }
                      }
                    }
                    name
                    note
                    originalTotalPriceSet {
                      shopMoney {
                        amount
                        currencyCode
                      }
                      presentmentMoney {
                        amount
                        currencyCode
                      }
                    }
                    paymentGatewayNames
                    phone
                    processedAt
                    shippingAddress {
                      id
                      address1
                      address2
                      city
                      company
                      country
                      countryCode
                      countryCodeV2
                      firstName
                      lastName
                      latitude
                      longitude
                      name
                      phone
                      province
                      provinceCode
                      zip
                    }
                    subtotalPrice
                    tags
                    taxLines {
                      price
                      rate
                      title
                    }
                    totalPrice
                    totalRefunded
                    transactions(first: 10) {
                      id
                      amountSet {
                        shopMoney {
                          amount
                          currencyCode
                        }
                        presentmentMoney {
                          amount
                          currencyCode
                        }
                      }
                      gateway
                      kind
                      status
                      createdAt
                      fees {
                        amount {
                          amount
                          currencyCode
                        }
                        rate
                        type
                      }
                    }
                    updatedAt
                  }
                }
              }
            }
        `;
        const orders = await this.fetchGraphQL(shop, token, query);
        return orders;
    }
    
    

      static async getProducts(shop, token) {
        const query = `
          {
            products(first: 10) {
              edges {
                node {
                  id
                  adminGraphqlApiId
                  availableForSale
                  createdAt
                  description
                  descriptionHtml
                  onlineStoreUrl
                  options {
                    id
                    name
                    values
                  }
                  productType
                  publishedAt
                  seo {
                    description
                    title
                  }
                  status
                  tags
                  title
                  totalInventory
                  updatedAt
                  variants(first: 250) { # Increased limit to potentially get all variants
                    edges {
                      node {
                        compareAtPrice
                        displayName
                        image {
                          id
                          originalSrc
                          transformedSrc
                        }
                        inventoryItem {
                          id
                          inventoryLevels(first: 250) { # Increased limit to potentially get all levels
                            edges {
                              node {
                                available
                                location {
                                  id
                                  name
                                }
                              }
                            }
                          }
                          inventoryQuantity
                        }
                        legacyResourceId
                        price
                        product {
                          id
                        }
                        quantityAvailable
                        requiresShipping
                        selectedOptions {
                          name
                          value
                        }
                        sku
                        taxCode
                        taxable
                        title
                        updatedAt
                        weight
                        weightUnit
                        vendor {
                          # Add specific vendor fields you need here
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        `;
        const products =  await this.fetchGraphQL(shop, token, query)
        console.log(products);
        return products;
      }
    }      
