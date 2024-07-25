
import fetch from 'node-fetch';

export class BulkOperationService {
    static async runBulkOperation(shop, token, query) {
        const url = `https://${shop}/admin/api/2023-04/graphql.json`;
        const mutation = `
            mutation bulkOperationRunQuery($query: String!) {
                bulkOperationRunQuery(query: $query) {
                    bulkOperation {
                        id
                        status
                        errorCode
                        createdAt
                        completedAt
                        objectCount
                        fileSize
                        url
                    }
                    userErrors {
                        field
                        message
                    }
                }
            }
        `;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': token
            },
            body: JSON.stringify({
                query: mutation,
                variables: { query }
            })
        });
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.indexOf('application/json') !== -1) {
            const data = await response.json();
            console.log(data);
            return data;
        } else {
            const text = await response.text();
            console.error('Non-JSON response received:', text);
            throw new Error('Unexpected response format');
        }
    }

    static async pollBulkOperationStatus(shop, token, bulkOperationId) {
        const query = `
            query {
                node(id: "${bulkOperationId}") {
                    ... on BulkOperation {
                        status
                        errorCode
                        createdAt
                        completedAt
                        objectCount
                        fileSize
                        url
                        partialDataUrl
                    }
                }
            }
        `;

        const url = `https://${shop}/admin/api/2023-04/graphql.json`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': token
            },
            body: JSON.stringify({ query })
        });
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.indexOf('application/json') !== -1) {
            const data = await response.json();
            console.log('Full response from Shopify API:', data);
            if (!data || !data.data || !data.data.node) {
               
                throw new Error('Invalid response from Shopify API');
            }
            return data.data.node;
        } else {
            const text = await response.text();
            console.error('Non-JSON response received:', text);
            throw new Error('Unexpected response format');
        }
    }

    static async fetchBulkOperationResults(url) {
        const response = await fetch(url);
        const contentType = response.headers.get('content-type');
        if (contentType && (contentType.indexOf('application/json') !== -1 || contentType.indexOf('text/plain') !== -1)) {
            const data = await response.text(); // JSONL is plain text
            return data.split('\n').filter(line => line).map(line => JSON.parse(line));
        } else {
            const text = await response.text();
            console.error('Non-JSON response received:', text);
            throw new Error('Unexpected response format');
        }
    }

    static get customerQuery() {
        return `
            {
                customers {
                    edges {
                        node {
                            id
                            addresses {
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
                            createdAt
                            updatedAt
                            displayName
                            email
                            firstName
                            lastName
                            phone
                            lastOrder {
                                id
                                name
                                totalPrice
                                currencyCode
                                processedAt
                            }
                            note
                            orders {
                                edges {
                                    node {
                                        id
                                        name
                                        totalPrice
                                        currencyCode
                                        processedAt
                                        lineItems {
                                            edges {
                                                node {
                                                    id
                                                    title
                                                    quantity
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            defaultAddress {
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
                            state
                            tags
                            numberOfOrders
                            verifiedEmail
                            createdAt
                            updatedAt
                        }
                    }
                }
            }
        `;
    }

    static get productQuery() {
        return `
            {
                products {
                    edges {
                        node {
                            id
                            status
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
                            tags
                            title
                            totalInventory
                            updatedAt
                            variants {
                                edges {
                                    node {
                                        id
                                        compareAtPrice
                                        displayName
                                        image {
                                            id
                                            originalSrc
                                            transformedSrc
                                        }
                                        inventoryItem {
                                            id
                                            inventoryLevels {
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
                                        }
                                        legacyResourceId
                                        price
                                        product {
                                            id
                                        }
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
                                    }
                                }
                            }
                        }
                    }
                }
            }
        `;
    }

    static get orderQuery() {
        return `
            {
                orders {
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
                            discountApplications {
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
                            lineItems {
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
                            transactions {
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
    }
}
