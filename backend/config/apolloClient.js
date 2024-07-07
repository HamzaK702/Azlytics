
import { ApolloClient, InMemoryCache, HttpLink, gql } from '@apollo/client';
import fetch from 'node-fetch';

export const createApolloClient = (shop, token) => {
    const link = new HttpLink({
        uri: `https://${shop}/admin/api/2023-04/graphql.json`,
        headers: {
            'X-Shopify-Access-Token': token
        },
        fetch
    });

    return new ApolloClient({
        link,
        cache: new InMemoryCache()
    });
};

export { gql };
