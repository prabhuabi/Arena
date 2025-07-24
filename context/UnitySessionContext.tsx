"use client";
import React, { createContext, useContext, useState } from "react";

interface UnitySessionContextProps {
    isUnityLoaded: boolean;
    setIsUnityLoaded: (value: boolean) => void;
}

const UnitySessionContext = createContext<UnitySessionContextProps | null>(null);

export const UnitySessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isUnityLoaded, setIsUnityLoaded] = useState(false);

    return (
        <UnitySessionContext.Provider value={{ isUnityLoaded, setIsUnityLoaded }}>
            {children}
        </UnitySessionContext.Provider>
    );
};

export const useUnitySession = () => {
    const ctx = useContext(UnitySessionContext);
    if (!ctx) throw new Error("useUnitySession must be used within UnitySessionProvider");
    return ctx;
};
