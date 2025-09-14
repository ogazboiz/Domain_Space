export const GET_NAMES = `
    query NamesQuery(
        $skip: Int,
        $take: Int,
        $ownedBy: [AddressCAIP10!],
        $claimStatus: NamesQueryClaimStatus = ALL,
        $name: String,
        $networkIds: [String!],
        $registrarIanaIds: [Int!],
        $tlds: [String!],
        $sortOrder: SortOrderType,
        $sortBy: NamesQuerySortBy,
        $fractionalized: Boolean,
        $listed: Boolean,
        $active: Boolean
    ) {
        names(
            skip: $skip,
            take: $take,
            ownedBy: $ownedBy,
            claimStatus: $claimStatus,
            name: $name,
            networkIds: $networkIds,
            registrarIanaIds: $registrarIanaIds,
            tlds: $tlds,
            sortOrder: $sortOrder,
            sortBy: $sortBy,
            fractionalized: $fractionalized,
            listed: $listed,
            active: $active
        ) {
            items {
                name
                claimedBy
                eoi
                expiresAt
                isFractionalized
                tokenizedAt
                transferLock
                registrar {
                    ianaId
                    name
                    websiteUrl
                    supportEmail
                    publicKeys
                }
                tokens {
                    tokenId
                    tokenAddress
                    networkId
                    ownerAddress
                    openseaCollectionSlug
                    chain {
                        addressUrlTemplate
                        name
                        networkId
                    }
                    listings {
                        id
                        offererAddress
                        orderbook
                        externalId
                        price
                        currency {
                            name
                            symbol
                            decimals
                            usdExchangeRate
                        }

                        createdAt
                        expiresAt
                    }
                }
            }
            currentPage
            hasNextPage
            hasPreviousPage
            pageSize
            totalCount
            totalPages
        }
    }
`;

export const GET_NAME = `
    query NameQuery($name: String!) {
        name(name: $name) {
            name
            claimedBy
            eoi
            expiresAt
            isFractionalized
            tokenizedAt
            transferLock
            fractionalTokenInfo {
                boughtOutAt
                boughtOutBy
                buyoutPrice
                address
                fractionalizedTxHash
                launchpadAddress
                poolAddress
                status
                vestingWalletAddress
                fractionalizedBy
                fractionalizedAt
            }
            nameservers {
                ldhName
            }
            registrar {
                ianaId
                name
                websiteUrl
                supportEmail
                publicKeys
            }
            tokens {
                tokenId
                tokenAddress
                networkId
                explorerUrl
                ownerAddress
                openseaCollectionSlug
                chain {
                    addressUrlTemplate
                    name
                    networkId
                }
                listings {
                    id
                    offererAddress
                    orderbook
                    externalId
                    price
                    currency {
                        name
                        symbol
                        decimals
                        usdExchangeRate
                    }
                    createdAt
                    expiresAt
                }
                startsAt
                createdAt
                expiresAt
                orderbookDisabled
            }
            activities {
                ... on NameClaimedActivity {
                    type
                    txHash
                    sld
                    tld
                    createdAt
                    claimedBy
                }
                ... on NameRenewedActivity {
                    type
                    txHash
                    sld
                    tld
                    createdAt
                    expiresAt
                }
                ... on NameDetokenizedActivity {
                    type
                    txHash
                    sld
                    tld
                    createdAt
                    networkId
                }
                ... on NameTokenizedActivity {
                    type
                    txHash
                    sld
                    tld
                    createdAt
                    networkId
                }
                ... on NameClaimRequestedActivity {
                    type
                    txHash
                    sld
                    tld
                    createdAt
                }
                ... on NameClaimApprovedActivity {
                    type
                    txHash
                    sld
                    tld
                    createdAt
                }
                ... on NameClaimRejectedActivity {
                    type
                    txHash
                    sld
                    tld
                    createdAt
                }
            }
        }
    }
`;

export const GET_NAME_STATISTICS = `
    query NameStatistics($tokenId: String!) {
        nameStatistics(tokenId: $tokenId) {
            activeOffers
            offersLast3Days
            highestOffer {
                externalId
                price
                currency {
                    decimals
                    name
                    symbol
                }
                offererAddress
                orderbook
                expiresAt
                createdAt
            }
        }
    }
`;