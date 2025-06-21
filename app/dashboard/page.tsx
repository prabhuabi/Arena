'use client';

import { useSession } from 'next-auth/react';
import SignIn from '@/components/auth/SignIn';
import styles from './dashboard.module.css';
import { useEffect, useState } from 'react';
import {
    playFabLoginWithAzureAD,
    getUserDataFromPlayFab,
    getPlayerStatistics,
    getUserInventory,
    getFriendsList,
} from '@/lib/playfab/playfab';
import { Bar, Pie } from 'react-chartjs-2';

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
} from 'chart.js';
import { string } from 'three/tsl';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const titleId = process.env.NEXT_PUBLIC_PLAYFAB_TITLE_ID ?? '';

interface PlayerStat {
    StatisticName: string;
    Value: number;
    Version?: number;
}

interface UserDataRecord {
    Value: string;
    LastUpdated?: string;
}

interface VirtualCurrency {
    [currencyCode: string]: number;
}

interface Currency {
    currencyCode: string;
    displayName: string
}

interface InventoryItem {
    ItemInstanceId: string;
    ItemId: string;
    DisplayName?: string;
    RemainingUses?: number;
}

interface Friend {
    FriendPlayFabId: string;
    Username?: string;
    TitleDisplayName?: string;
}

const arenaTaglines = [
    "The Ultimate Coffee Break Showdown",
    "Where Office Legends Are Made",
    "Enter the Arena, Rule the Floor",
    "Challenge. Compete. Conquer.",
    "Outplay. Outlast. Outscore.",
    "Turning Colleagues into Champions",
    "Work Hard, Play Smarter",
    "Battle Your Buddies—Break the Routine",
    "Unleash the Competitive Spirit at Work",
    "Gamify Your Workday",
    "Raise the Stakes of Your 9 to 5",
    "Step Into the Spotlight",
    "Every Click Counts",
    "Office Just Got Interesting",
    "Be the MVP of Your Team",
];

export default function Dashboard() {
    const { data: session, status } = useSession();

    const [playFabId, setPlayFabId] = useState<string | null>(null);
    const [playerStats, setPlayerStats] = useState<PlayerStat[]>([]);
    const [virtualCurrency, setVirtualCurrency] = useState<VirtualCurrency>({});
    const [userData, setUserData] = useState<Record<string, string>>({});
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const [friends, setFriends] = useState<Friend[]>([]);
    const [friendAddStatus, setFriendAddStatus] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [sessionTicket, setSessionTicket] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [tagline, setTagline] = useState('');


    useEffect(() => {
        if (status !== 'authenticated' || !session) return;

        const randomTagline = arenaTaglines[Math.floor(Math.random() * arenaTaglines.length)];
        setTagline(randomTagline);

        const loginAndLoadData = async () => {
            setLoading(true);
            setError(null);
            setFriendAddStatus(null);

            try {
                let _sessionTicket = null;
                let _playFabId = null;

                if (typeof window !== 'undefined') {
                    _sessionTicket = sessionStorage.getItem('playfabSessionTicket');
                    _playFabId = sessionStorage.getItem('playfabId');
                }

                if (!_sessionTicket || !_playFabId) {
                    try {
                        const loginRes = await playFabLoginWithAzureAD(titleId, session!);

                        if (!loginRes.data?.PlayFabId || !loginRes.data?.SessionTicket) {
                            throw new Error('Missing PlayFabId or SessionTicket in login response');
                        }

                        _sessionTicket = loginRes.data.SessionTicket;
                        _playFabId = loginRes.data.PlayFabId;

                        if (typeof window !== 'undefined') {
                            sessionStorage.setItem('playfabSessionTicket', _sessionTicket);
                            sessionStorage.setItem('playfabId', _playFabId);
                        }
                    } catch (e) {
                        console.warn('Session ticket or PlayFab ID missing. Trying silent sign-in with Azure AD...');

                        const { signOut, signIn } = await import('next-auth/react');

                        await signOut({ redirect: false });
                        await signIn('azure-ad', { redirect: false });

                        setTimeout(() => {
                            loginAndLoadData();
                        }, 1000);

                        return;
                    }
                }


                setPlayFabId(_playFabId);
                setSessionTicket(_sessionTicket);

                // User Data
                const userDataRes = await getUserDataFromPlayFab(_sessionTicket, titleId);
                if (userDataRes.data?.Data) {
                    const cleanedUserData = Object.entries(userDataRes.data.Data).reduce<Record<string, string>>(
                        (acc, [key, val]) => {
                            const record = val as UserDataRecord;
                            acc[key] = record?.Value || '';
                            return acc;
                        },
                        {}
                    );
                    setUserData(cleanedUserData);
                }

                if (String(userDataRes.code) === "401") {
                    await handleUnAuthorized(userDataRes.error, loginAndLoadData);
                }


                // Player Stats
                const statsRes = await getPlayerStatistics(_sessionTicket, titleId);
                if (statsRes.data?.Statistics) {
                    setPlayerStats(statsRes.data.Statistics);
                }

                // Inventory & Virtual Currency
                const inventoryRes = await getUserInventory(_sessionTicket, titleId);
                if (inventoryRes.data) {
                    setVirtualCurrency(inventoryRes.data.VirtualCurrency || {});
                    setInventoryItems(inventoryRes.data.Inventory || []);
                }

                // Friends
                const friendsRes = await getFriendsList(_sessionTicket, titleId);
                if (friendsRes.data?.Friends) {
                    setFriends(friendsRes.data.Friends);
                }
            } catch (err: any) {
                console.log("UnAuthorized !");
                const errorMessage = err?.message || 'Unknown error';
                setError(errorMessage);

                const isUnauthorized =
                    errorMessage.includes('401') ||
                    errorMessage.toLowerCase().includes('unauthorized') ||
                    errorMessage.toLowerCase().includes('invalid session');

                if (isUnauthorized) {
                    handleUnAuthorized(errorMessage, loginAndLoadData);
                }
            } finally {
                setLoading(false);
            }
        };

        loginAndLoadData();
    }, [session, status]);

    async function handleUnAuthorized(error: string, onSuccess: Function) {
        const errorMessage = error;
        setError(errorMessage);

        if (typeof window !== 'undefined') {
            sessionStorage.removeItem('playfabSessionTicket');
            sessionStorage.removeItem('playfabId');
        }

        const { signOut, signIn } = await import('next-auth/react');

        await signOut({ redirect: false });
        await signIn('azure-ad', { redirect: false });

        setTimeout(() => {
            onSuccess();
        }, 1000);
    }

    if (status === 'loading') {
        return <div className={styles.page}>Loading session...</div>;
    }

    if (!session) {
        return <SignIn />;
    }

    const copyPlayFabId = () => {
        if (!playFabId) return;
        navigator.clipboard.writeText(playFabId).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const playerStatsChartData = {
        labels: playerStats.map((stat) => stat.StatisticName),
        datasets: [
            {
                label: 'Value',
                data: playerStats.map((stat) => stat.Value),
                backgroundColor: [
                    '#ff073a',
                    '#2655FF',
                ],
                borderColor: [
                    '#ffff',
                ],
                borderWidth: 1,
            },
        ],
    };

    const virtualCurrencyLabels = Object.keys(virtualCurrency);
    const virtualCurrencyValues = Object.values(virtualCurrency);
    const virtualCurrencyChartData = {
        labels: virtualCurrencyLabels,
        datasets: [
            {
                label: 'Arena Economy',
                data: virtualCurrencyValues,
                backgroundColor: [
                    '#FFB22C',
                    '#ff073a',
                ],
                borderWidth: 1,
            },
        ],
    };

    const StatisticNameWithEmoji = (name: string): string => {
        let prefix: string;
        switch (name) {
            case "Games Played":
                prefix = "🎲 "
                break;
            case "Trophies":
                prefix = "🏆 ";
                break;
            default:
                prefix = ""
                break;
        }
        return prefix + name;
    }

    return (
        <div className={styles.page}>
            {tagline && <h1 className={styles.tagline}># Arena: {tagline}</h1>}
            <div className={styles.header}>
                <h1 className={styles.title}>Welcome 🎉, {session.user?.name ?? 'Player'}</h1>

                {playFabId && (
                    <span className={styles.playfabId}>
                        ID: {playFabId}{' '}
                        <button
                            onClick={copyPlayFabId}
                            className={styles.copyButton}
                            aria-label="Copy PlayFab ID"
                            type="button"
                        >
                            📋
                        </button>
                        {copied && <small className={styles.copiedText}>Copied!</small>}
                    </span>
                )}
            </div>

            {error && <p className={styles.error}>Error: {error}</p>}

            <div className={styles.grid}>
                {/* Player Statistics Card */}
                <section className={styles.card}>
                    <h2 className={styles.cardTitle}>Statistics</h2>
                    {loading ? (
                        <>
                            <div className={styles['skeleton-title']}></div>
                            {[...Array(1)].map((_, i) => (
                                <div key={i} className={styles['skeleton-item']}></div>
                            ))}
                            <div className={styles['skeleton-chart']}></div>
                        </>
                    ) : playerStats.length === 0 ? (
                        <p className={styles.empty}>No statistics available.</p>
                    ) : (
                        <>
                            <ul className={styles.statList}>
                                {playerStats.map(({ StatisticName, Value }) => (
                                    <li key={StatisticName} className={styles.statItem}>
                                        <span className={styles.statName}>{StatisticNameWithEmoji(StatisticName)}</span>
                                        <span className={styles.statValue}>{Value}</span>
                                    </li>
                                ))}
                            </ul>
                            <Bar
                                data={playerStatsChartData}
                                options={{
                                    responsive: true,
                                    plugins: {
                                        legend: { display: false },
                                        title: { display: true, text: 'Player Statistics Chart' },
                                    },
                                    scales: {
                                        y: { beginAtZero: true },
                                    },
                                }}
                            />
                        </>
                    )}
                </section>

                {/* Virtual Currency Card */}
                <section className={styles.card}>
                    <h2 className={styles.cardTitle}>Arena Economy</h2>
                    {loading ? (
                        <>
                            <div className={styles['skeleton-title']}></div>
                            {[...Array(1)].map((_, i) => (
                                <div key={i} className={styles['skeleton-item']}></div>
                            ))}
                            <div className={styles['skeleton-chart']}></div>
                        </>
                    ) : virtualCurrencyLabels.length === 0 ? (
                        <p className={styles.empty}>No economy available.</p>
                    ) : (
                        <>
                            <ul className={styles.currencyList}>
                                {virtualCurrencyLabels.map((currency) => (
                                    <li key={currency} className={styles.currencyItem}>
                                        <span className={styles.currencyCode}>{currency}</span>
                                        <span className={styles.currencyAmount}>{virtualCurrency[currency]}</span>
                                    </li>
                                ))}
                            </ul>
                            <Pie
                                data={virtualCurrencyChartData}
                                options={{
                                    responsive: true,
                                    plugins: {
                                        legend: { position: 'bottom' },
                                        title: { display: true, text: 'Arena economy distribution' },
                                    },
                                }}
                            />
                        </>
                    )}
                </section>

                {/* Friends Card */}
                <section className={styles.card}>
                    <h2 className={styles.cardTitle}>Friends</h2>

                    {friendAddStatus && <p className={styles.status}>{friendAddStatus}</p>}

                    {loading ? (
                        <>
                            <div className={styles['skeleton-title']}></div>
                            {[...Array(1)].map((_, i) => (
                                <div key={i} className={styles['skeleton-item']}></div>
                            ))}
                        </>
                    ) : friends.length === 0 ? (
                        <p className={styles.empty}>No friends found.</p>
                    ) : (
                        <ul className={styles.friendsList}>
                            {friends.map((friend) => (
                                <li key={friend.FriendPlayFabId} className={styles.friendItem}>
                                    <p> <b>{friend.TitleDisplayName}</b> <span className={styles.friendPlayfabID}>{friend.FriendPlayFabId}</span></p>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                {/* Inventory Card */}
                <section className={styles.card}>
                    <h2 className={styles.cardTitle}>Inventory</h2>
                    {loading ? (
                        <>
                            <div className={styles['skeleton-title']}></div>
                            {[...Array(1)].map((_, i) => (
                                <div key={i} className={styles['skeleton-item']}></div>
                            ))}
                        </>
                    ) : inventoryItems.length === 0 ? (
                        <p className={styles.empty}>No items in inventory.</p>
                    ) : (
                        <ul className={styles.inventoryList}>
                            {inventoryItems.map((item) => (
                                <li key={item.ItemInstanceId} className={styles.inventoryItem}>
                                    <strong>{item.DisplayName || item.ItemId}</strong> - Qty: {item.RemainingUses ?? 1}
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </div>
    );
}
