"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { useOwnedNames } from "@/data/use-doma";
import { useAccount } from "wagmi";
import { watchlistService } from "@/services/cloud-watchlist";

interface IUserProfile {
  username: string;
  watchUsernames?: string[];
}

interface UsernameContextType {
  token: string | null;
  isSwitching: boolean;
  activeUsername: string | null;
  setActiveUsername: (name: string | null) => void;
  profile: IUserProfile | null;
  availableNames: string[] | undefined;
  refetchProfile: () => void;
  watchedDomains: string[];
  watchDomain: (domainName: string) => Promise<void>;
  unwatchDomain: (domainName: string) => Promise<void>;
  isWatching: (domainName: string) => boolean;
}

const UsernameContext = createContext<UsernameContextType | undefined>(
  undefined
);

interface UsernameProviderProps {
  children: ReactNode;
}

export const UsernameProvider: React.FC<UsernameProviderProps> = ({
  children,
}) => {
  const { address } = useAccount();
  const [activeUsername, setActiveUsername] = useState<string | null>(null);
  const [isSwitching, setIsSwitching] = useState(false);
  const [profile, setProfile] = useState<IUserProfile | null>(null);
  const [watchedDomains, setWatchedDomains] = useState<string[]>([]);

  const { data: namesData } = useOwnedNames(address || "", 10, []);

  const _setActiveUsername = (newUsername: string | null) => {
    setIsSwitching(true);
    setActiveUsername(newUsername);
    setIsSwitching(false);
  };

  const refetchProfile = () => {
    // Simplified profile refetch
    if (activeUsername) {
      setProfile({
        username: activeUsername,
        watchUsernames: watchedDomains
      });
    }
  };

  // Watchlist functions
  const watchDomain = useCallback(async (domainName: string) => {
    if (!address) {
      throw new Error("No wallet connected");
    }

    try {
      await watchlistService.addToWatchlist(domainName, address);
      setWatchedDomains(prev => [...prev, domainName]);

      // Update profile
      setProfile(prev => ({
        ...prev,
        username: prev?.username || "",
        watchUsernames: [...(prev?.watchUsernames || []), domainName]
      }));
    } catch (error) {
      throw error;
    }
  }, [address]);

  const unwatchDomain = useCallback(async (domainName: string) => {
    if (!address) {
      throw new Error("No wallet connected");
    }

    try {
      await watchlistService.removeFromWatchlist(domainName, address);
      setWatchedDomains(prev => prev.filter(name => name !== domainName));

      // Update profile
      setProfile(prev => ({
        ...prev,
        username: prev?.username || "",
        watchUsernames: (prev?.watchUsernames || []).filter(name => name !== domainName)
      }));
    } catch (error) {
      throw error;
    }
  }, [address]);

  const isWatching = useCallback((domainName: string) => {
    return watchedDomains.includes(domainName);
  }, [watchedDomains]);

  useEffect(() => {
    const availableNames = namesData?.pages
      ?.flatMap((p) => p.items)
      ?.map((name) => name.name);

    if (availableNames?.length) {
      setActiveUsername(availableNames[0]);
    } else {
      setActiveUsername(null);
    }
  }, [namesData]);

  // Load watchlist when address changes
  useEffect(() => {
    const loadWatchlist = async () => {
      if (!address) {
        setWatchedDomains([]);
        setProfile(null);
        return;
      }

      try {
        const domains = await watchlistService.getWatchlist(address);
        setWatchedDomains(domains);
        
        // Update profile immediately after loading watchlist
        setProfile({
          username: activeUsername || "",
          watchUsernames: domains
        });
      } catch (error) {
        setWatchedDomains([]);
        // Still set profile even if watchlist fails
        setProfile({
          username: activeUsername || "",
          watchUsernames: []
        });
      }
    };

    loadWatchlist();
  }, [address, activeUsername]);

  // Update profile when watchedDomains changes (from watch/unwatch operations)
  useEffect(() => {
    if (address && watchedDomains.length > 0) {
      setProfile(prev => ({
        username: prev?.username || activeUsername || "",
        watchUsernames: watchedDomains
      }));
    }
  }, [watchedDomains, address, activeUsername]);

  const value = {
    token: null,
    isSwitching,
    activeUsername,
    setActiveUsername: _setActiveUsername,
    profile,
    availableNames:
      namesData?.pages?.flatMap((p) => p.items)?.map((name) => name.name) ?? [],
    refetchProfile,
    watchedDomains,
    watchDomain,
    unwatchDomain,
    isWatching,
  };

  return (
    <UsernameContext.Provider value={value}>
      {children}
    </UsernameContext.Provider>
  );
};

export const useUsername = (): UsernameContextType => {
  const context = useContext(UsernameContext);
  if (context === undefined) {
    throw new Error("useUsername must be used within a UsernameProvider");
  }
  return context;
};
