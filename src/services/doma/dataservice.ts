import { Name, Paging, Offer, NameStats } from "@/types/doma";
import { graphRequest } from "./client";
import { GET_NAME, GET_NAME_STATISTICS, GET_NAMES } from "./queries/names";

interface GetOffersProps {
  page: number;
  take: number;
  tokenId: string;
}

interface GetNamesProps {
  page: number;
  take: number;
  listed: boolean;
  name: string;
  tlds: string[] | null;
}

interface GetOwnedNamesProps {
  address: string;
  page: number;
  take: number;
}

interface GetWatchedNamesProps {
  page: number;
  take: number;
  name: string;
}

interface GetNameProps {
  name: string;
}

interface GetNameStatsProps {
  tokenId: string;
}

class DataService {
  async getNames(props: GetNamesProps): Promise<Paging<Name>> {
    const { tlds, ...restProps } = props;
    const data = await graphRequest<{ names: Paging<Name> }>(GET_NAMES, {
      skip: (props.page - 1) * props.take,
      ...restProps,
      ...(tlds && { tlds }),
    });

    return data.names;
  }

  async getOwnedNames(props: GetOwnedNamesProps): Promise<Paging<Name>> {
    const data = await graphRequest<{ names: Paging<Name> }>(GET_NAMES, {
      skip: (props.page - 1) * props.take,
      ownedBy: `eip155:97476:${props.address}`,
      ...props,
    });

    return data.names;
  }

  async getWatchedNames(props: GetWatchedNamesProps): Promise<Paging<Name>> {
    if (!props.name.length) {
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

    const data = await graphRequest<{ names: Paging<Name> }>(GET_NAMES, {
      skip: (props.page - 1) * props.take,
      ...props,
    });

    return data.names;
  }

  async getName(props: GetNameProps): Promise<Name> {
    const data = await graphRequest<{ name: Name }>(GET_NAME, {
      ...props,
    });

    return data.name;
  }

  async getNameStats(props: GetNameStatsProps): Promise<NameStats> {
    const data = await graphRequest<{ nameStatistics: NameStats }>(
      GET_NAME_STATISTICS,
      {
        ...props,
      }
    );

    return data.nameStatistics;
  }
}

export const dataService = new DataService();