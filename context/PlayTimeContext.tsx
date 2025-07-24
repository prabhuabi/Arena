'use client';

import React, {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import { useUnitySession } from './UnitySessionContext';
import {
    getUserDataFromPlayFab,
    updatePlayFabUserData,
} from '@/lib/playfab/playfab';

interface PlayTimeContextType {
    timeLeft: number;
    isExpired: boolean;
    startSession: () => Promise<void>;
    stopSession: () => void;
    sessionActive: boolean;
    strictMode: boolean;
    setStrictMode: (val: boolean) => void;
    playSessionDuration: number;
    elapsedTime: number;
}

const PlayTimeContext = createContext<PlayTimeContextType | undefined>(
    undefined
);

export const usePlayTimeSession = () => {
    const ctx = useContext(PlayTimeContext);
    if (!ctx) throw new Error('usePlayTime must be used within PlayTimeProvider');
    return ctx;
};

const SECONDS_PER_DAY = parseInt(process.env.NEXT_PUBLIC_DAILY_PLAYTIME_LIMIT || '0');

export const PlayTimeProvider = ({ children }: { children: React.ReactNode }) => {
    const { isUnityLoaded } = useUnitySession();
    const [timeLeft, setTimeLeft] = useState<number>(SECONDS_PER_DAY);
    const [playSessionDuration, setPlaySessionDuration] = useState(0);
    const [isExpired, setIsExpired] = useState(false);
    const [sessionActive, setSessionActive] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [strictMode, setStrictMode] = useState(true);

    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const sessionStartTime = useRef<number | null>(null);
    const [sessionTicket, setSessionTicket] = useState<string | null>(null);


    useEffect(() => {
        if (typeof window !== 'undefined') {
            const ticket = sessionStorage.getItem('playfabSessionTicket');
            setSessionTicket(ticket);
        }
    }, []);
    const titleId = process.env.NEXT_PUBLIC_PLAYFAB_TITLE_ID ?? '';

    // Load playtime from PlayFab once
    useEffect(() => {
        const loadPlayTime = async () => {
            if (!sessionTicket || !titleId) return;

            try {
                const response = await getUserDataFromPlayFab(sessionTicket, titleId);

                const today = new Date().toDateString();

                const savedDate = response?.data?.Data?.playtime_date?.Value;
                const usedToday = parseInt(response?.data?.Data?.playtime_seconds?.Value || '0');


                if (savedDate !== today) {
                    setPlaySessionDuration(0);
                    setTimeLeft(SECONDS_PER_DAY);
                    setIsExpired(false);
                } else {
                    const remaining = Math.max(SECONDS_PER_DAY - usedToday, 0);
                    setPlaySessionDuration(usedToday);
                    setTimeLeft(remaining);
                    setIsExpired(remaining <= 0);
                }
            } catch (err) {
                console.error('Failed to load PlayFab playtime:', err);
            }
        };

        loadPlayTime();
    }, [sessionTicket, titleId]);

    const updatePlayTimeToPlayFab = async (usedSeconds: number) => {
        if (!sessionTicket || !titleId) return;

        const totalUsed = Math.min(SECONDS_PER_DAY, playSessionDuration + usedSeconds);
        const remaining = Math.max(SECONDS_PER_DAY - totalUsed, 0);
        const today = new Date().toDateString();

        try {
            await updatePlayFabUserData(sessionTicket, titleId, {
                playtime_seconds: totalUsed.toString(),
                playtime_date: today,
            });

            setPlaySessionDuration(totalUsed);
            setTimeLeft(remaining);

            if (remaining <= 0) {
                setIsExpired(true);
                stopSession();
            }
        } catch (err) {
            console.error('Failed to update playtime to PlayFab:', err);
        }
    };

    const startSession = async () => {
        if (isExpired || sessionActive || !isUnityLoaded) return;

        setSessionActive(true);
        sessionStartTime.current = Date.now();
        setElapsedTime(0);

        intervalRef.current = setInterval(() => {
            if (!sessionStartTime.current) return;

            const now = Date.now();
            const elapsed = Math.floor((now - sessionStartTime.current) / 1000);
            setElapsedTime(elapsed);

            const totalUsed = playSessionDuration + elapsed;
            const remaining = Math.max(SECONDS_PER_DAY - totalUsed, 0);
            setTimeLeft(remaining);

            if (strictMode && remaining <= 0) {
                stopSession();
            }
        }, 1000);
    };

    const stopSession = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        if (sessionStartTime.current) {
            const now = Date.now();
            const elapsed = Math.floor((now - sessionStartTime.current) / 1000);
            updatePlayTimeToPlayFab(elapsed);
            sessionStartTime.current = null;
        }

        setElapsedTime(0);
        setSessionActive(false);
    };

    // start/stop session with Unity state
    useEffect(() => {
        if (isUnityLoaded && !sessionActive && !isExpired) {
            startSession();
        }

        if (!isUnityLoaded && sessionActive) {
            stopSession();
        }
    }, [isUnityLoaded]);

    return (
        <PlayTimeContext.Provider
            value={{
                timeLeft,
                isExpired,
                startSession,
                stopSession,
                sessionActive,
                strictMode,
                setStrictMode,
                playSessionDuration,
                elapsedTime,
            }}
        >
            {children}
        </PlayTimeContext.Provider>
    );
};
