"use client";

import { useSession } from 'next-auth/react';
import SignIn from '@/components/auth/SignIn';
import styles from './leaderboard.module.css';
import { useEffect, useState } from 'react';
import {
    getLeaderboard,
    playFabLoginWithAzureAD,
} from '@/lib/playfab/playfab';
import dynamic from 'next/dynamic';

const Model = dynamic(() => import('@/components/Model'), {
    ssr: false,
});

interface Player {
    name: string;
    trophies: number;
    gamesPlayed: number;
    rank: number;
}

type SortOption = 'Trophies' | 'Games Played';

const sortFieldMap: Record<SortOption, keyof Player> = {
    'Trophies': 'trophies',
    'Games Played': 'gamesPlayed',
};

const statKeyMap: Record<SortOption, string> = {
    'Trophies': 'Trophies',
    'Games Played': 'Games Played',
};

export default function LeaderBoard() {
    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(true);
    const [leaders, setLeaders] = useState<Player[]>([]);
    const [sortBy, setSortBy] = useState<SortOption>('Trophies');
    const titleId = process.env.NEXT_PUBLIC_PLAYFAB_TITLE_ID!;

    useEffect(() => {
        const fetchLeaderboard = async () => {
            if (!session) return;

            let sessionTicket = null;
            if (typeof window !== 'undefined') {
                sessionTicket = sessionStorage.getItem('playfabSessionTicket');
            }

            if (!sessionTicket) {
                try {
                    const response = await playFabLoginWithAzureAD(titleId, session);
                    if (!response.error && response.data?.SessionTicket) {
                        sessionTicket = response.data.SessionTicket;
                        sessionStorage.setItem('playfabSessionTicket', sessionTicket);
                    } else {
                        console.error('PlayFab login failed', response.error);
                        setLoading(false);
                        return;
                    }
                } catch (err) {
                    console.error('PlayFab login error:', err);
                    setLoading(false);
                    return;
                }
            }

            setLoading(true);
            const result = await getLeaderboard(
                sessionTicket,
                titleId,
                statKeyMap[sortBy]
            );

            if (result?.data?.Leaderboard) {
                const mapped = result.data.Leaderboard.map((entry: any) => ({
                    name: entry.DisplayName ?? entry.PlayFabId,
                    trophies: sortBy === 'Trophies' ? entry.StatValue : 0,
                    gamesPlayed: sortBy === 'Games Played' ? entry.StatValue : 0,
                    rank: entry.Position + 1,
                }));
                setLeaders(mapped);
            } else {
                setLeaders([]);
            }

            setLoading(false);
        };

        fetchLeaderboard();
    }, [session, titleId, sortBy]);

    const sortedLeaders = [...leaders].sort(
        (a, b) =>
            (b[sortFieldMap[sortBy]] as number) - (a[sortFieldMap[sortBy]] as number)
    );

    if (status === 'loading') {
        return <div className={styles.page}>Loading session...</div>;
    }

    if (!session) {
        return <SignIn />;
    }

    return (
        <div className={styles.page}>
            <h1 className={styles.heading}>Leaderboard <p className={styles.info}># weekly</p></h1>

            {/* Split container */}
            <div className={styles.splitLayout}>
                {/* Left: 3D Model */}
                <div className={styles.leftPanel}>
                    {leaders[0] && <Model name={leaders[0].name.split(' ')[0]} />}
                </div>

                {/* Right: Leaderboard Table */}
                <div className={styles.rightPanel}>
                    <div className={styles.sortControls}>
                        <label htmlFor="sort-select">Sort by:</label>
                        <select
                            id="sort-select"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as SortOption)}
                        >
                            <option value="Trophies" className={styles.sortOptions}>Trophies</option>
                            <option value="Games Played" className={styles.sortOptions}>Games Played</option>
                        </select>
                    </div>

                    <div className={styles.table}>
                        <div className={`${styles.row} ${styles.header}`}>
                            <div className={styles.rowHeader}>Rank</div>
                            <div className={styles.rowHeader}>Player</div>
                            <div className={styles.rowHeader}>{sortBy}</div>
                        </div>

                        {loading
                            ? Array.from({ length: 5 }).map((_, i) => (
                                <div
                                    key={i}
                                    className={`${styles.row} ${styles.skeletonRow}`}
                                >
                                    <div className={styles.skeletonBox} />
                                    <div className={styles.skeletonBox} />
                                    <div className={styles.skeletonBox} />
                                </div>
                            ))
                            : sortedLeaders.map((player) => (
                                <div
                                    key={player.rank}
                                    className={`${styles.row} ${styles.animatedRow}`}
                                >
                                    <div className={styles.playerinfo}>{player.rank}</div>
                                    <div className={styles.playerinfo}>{player.name}</div>
                                    <div className={styles.playerinfo}>{player[sortFieldMap[sortBy]]}</div>
                                </div>
                            ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
