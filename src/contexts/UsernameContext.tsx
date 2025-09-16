"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useOwnedNames } from "@/data/use-doma";
import { useAccount } from "wagmi";

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
        watchUsernames: []
      });
    }
  };

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

  useEffect(() => {
    if (activeUsername) {
      setProfile({
        username: activeUsername,
        watchUsernames: []
      });
    }
  }, [activeUsername]);

  const value = {
    token: null,
    isSwitching,
    activeUsername,
    setActiveUsername: _setActiveUsername,
    profile,
    availableNames:
      namesData?.pages?.flatMap((p) => p.items)?.map((name) => name.name) ?? [],
    refetchProfile,
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