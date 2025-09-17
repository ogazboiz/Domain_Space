export const GET_OFFERS = `
    query OffersQuery(
        $tokenId: String!
        $offererAddresses: [AddressCAIP10!]
        $skip: Int
        $take: Int
        $status: OfferStatus
        $sortOrder: SortOrderType
    ) {
        offers(
            tokenId: $tokenId
            offeredBy: $offererAddresses
            skip: $skip
            take: $take
            status: $status
            sortOrder: $sortOrder
        ) {
            totalCount
            items {
                externalId
                price
                tokenAddress
                offererAddress
                orderbook
                expiresAt
                createdAt
                currency {
                    name
                    symbol
                    decimals
                }
                name
                id
                nameExpiresAt
                chain {
                    name
                    networkId
                }
                tokenId
            }
            pageSize
            totalPages
            hasPreviousPage
            hasNextPage
            currentPage
        }
    }
`;