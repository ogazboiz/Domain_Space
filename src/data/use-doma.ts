import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { dataService } from "@/services/doma/dataservice";

export const queryKeys = {
  default: ["names"] as const,
  all: (
    page: number,
    take: number,
    listed: boolean,
    tlds: string[],
    name: string
  ) => [...queryKeys.default, page, take, listed, tlds, name] as const,
  ownedNames: (page: number, take: number, owner: string, tlds: string[]) =>
    [...queryKeys.all(page, take, false, tlds, ""), owner] as const,
  watchedNames: (page: number, take: number, names: string[], tlds: string[]) =>
    [...queryKeys.all(page, take, false, tlds, ""), names] as const,
  single: (name: string) => [...queryKeys.default, name] as const,
  nameStats: (name: string) => [...queryKeys.default, name, "stats"] as const,
  defaultOffers: ["offers"] as const,
  allOffers: (page: number, take: number, tokenId: string) =>
    [...queryKeys.defaultOffers, page, take, tokenId] as const,
};

export function useNames(
  take: number,
  listed: boolean,
  name: string,
  tlds: string[]
) {
  return useInfiniteQuery({
    queryKey: queryKeys.all(1, take, listed, tlds, name),
    queryFn: ({ pageParam = 1 }: { pageParam: number }) =>
      dataService.getNames({ page: pageParam, take, listed, tlds, name }),
    getNextPageParam: (lastPage) => {
      return lastPage.hasNextPage ? lastPage.currentPage + 1 : undefined;
    },
    getPreviousPageParam: (firstPage) => {
      return firstPage.hasPreviousPage ? firstPage.currentPage - 1 : undefined;
    },
    initialPageParam: 1,
  });
}

export function useOwnedNames(address: string, take: number, tlds: string[] | null) {
  return useInfiniteQuery({
    queryKey: queryKeys.ownedNames(1, take, address, tlds || []),
    queryFn: ({ pageParam = 1 }: { pageParam: number }) =>
      dataService.getOwnedNames({ page: pageParam, take, address }),
    getNextPageParam: (lastPage) => {
      return lastPage.hasNextPage ? lastPage.currentPage + 1 : undefined;
    },
    getPreviousPageParam: (firstPage) => {
      return firstPage.hasPreviousPage ? firstPage.currentPage - 1 : undefined;
    },
    initialPageParam: 1,
    enabled: !!address,
  });
}

export function useSelectedNames(
  names: string[],
  take: number,
  tlds: string[] | null
) {
  return useInfiniteQuery({
    queryKey: queryKeys.watchedNames(1, take, names, tlds || []),
    queryFn: async ({ pageParam = 1 }: { pageParam: number }) => {
      // If no names to watch, return empty result
      if (!names || names.length === 0) {
        return {
          items: [],
          pageSize: 0,
          totalCount: 0,
          hasNextPage: false,
          hasPreviousPage: false,
          currentPage: 1,
          totalPages: 1,
        };
      }

      // Fetch each domain individually
      const domainPromises = names.map(name => 
        dataService.getName({ name })
      );

      try {
        const domains = await Promise.all(domainPromises);
        
        return {
          items: domains.filter(d => d !== null),
          pageSize: domains.length,
          totalCount: domains.length,
          hasNextPage: false,
          hasPreviousPage: false,
          currentPage: 1,
          totalPages: 1,
        };
      } catch (error) {
        console.error('Error fetching watched domains:', error);
        return {
          items: [],
          pageSize: 0,
          totalCount: 0,
          hasNextPage: false,
          hasPreviousPage: false,
          currentPage: 1,
          totalPages: 1,
        };
      }
    },
    getNextPageParam: (lastPage) => {
      return lastPage.hasNextPage ? lastPage.currentPage + 1 : undefined;
    },
    getPreviousPageParam: (firstPage) => {
      return firstPage.hasPreviousPage ? firstPage.currentPage - 1 : undefined;
    },
    initialPageParam: 1,
    enabled: names && names.length > 0,
  });
}

export function useName(name: string) {
  return useQuery({
    queryKey: queryKeys.single(name),
    queryFn: () => dataService.getName({ name }),
    enabled: name.includes("."),
  });
}

export function useNameStats(tokenId: string) {
  return useQuery({
    queryKey: queryKeys.nameStats(tokenId),
    queryFn: () => dataService.getNameStats({ tokenId }),
  });
}

export function useOffers(take: number, tokenId: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.allOffers(1, take, tokenId),
    queryFn: ({ pageParam = 1 }: { pageParam: number }) =>
      dataService.getOffers({ page: pageParam, take, tokenId }),
    getNextPageParam: (lastPage) => {
      return lastPage.hasNextPage ? lastPage.currentPage + 1 : undefined;
    },
    getPreviousPageParam: (firstPage) => {
      return firstPage.hasPreviousPage ? firstPage.currentPage - 1 : undefined;
    },
    initialPageParam: 1,
    enabled: !!tokenId,
  });
}