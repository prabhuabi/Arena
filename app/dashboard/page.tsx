'use client';

import { useSession } from 'next-auth/react';
import SignIn from '@/components/auth/SignIn';
import styles from './dashboard.module.css';
import { useEffect, useState, useRef } from 'react';
import {
    playFabLoginWithAzureAD,
    getUserDataFromPlayFab,
    getPlayerStatistics,
    getUserInventory,
    getFriendsList,
    getStoreItems,
    purchaseStoreItem,
    useInventoryItem,
    updatePlayFabUserData
} from '@/lib/playfab/playfab';
import { generateCouponCode } from '@/lib/ticket/ticket';
import { Bar, Pie } from 'react-chartjs-2';
import Popup from '../../components/popup/Popup';
import { useRouter } from 'next/navigation';

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
import { Doughnut } from 'react-chartjs-2';

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

interface StoreItem {
    ItemId: string;
    DisplayName?: string;
    CatalogVersion?: string;
    VirtualCurrencyPrices?: { [currencyCode: string]: number };
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
    const router = useRouter();

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
    const [storeItems, setStoreItems] = useState<any[]>([]);
    const [currencySelections, setCurrencySelections] = useState<Record<string, string>>({});
    const [isBuying, setIsBuying] = useState(false);
    const [popup, setPopup] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const popupTimeoutRef = useRef<NodeJS.Timeout | null>(null);


    const catalogVersion = '1';
    const storeId = 'Ticket Store';



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

                // Store
                const storeRes = await getStoreItems(_sessionTicket, titleId, storeId, catalogVersion);
                if (storeRes.data?.Store) {
                    setStoreItems(storeRes.data.Store);
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


    const totalSeconds = parseInt(process.env.NEXT_PUBLIC_DAILY_PLAYTIME_LIMIT || '0');

    const playtimeSecondsStr = userData.playtime_seconds || '0';
    const playtimeSeconds = parseInt(playtimeSecondsStr, 10) || 0;

    const data = {
        labels: ['Played', 'Remaining'],
        datasets: [
            {
                data: [playtimeSeconds, totalSeconds - playtimeSeconds],
                backgroundColor: ['#1a73e8', '#e0e0e0'],
                borderWidth: 0,
                cutout: '80%',
            },
        ],
    };

    const options = {
        responsive: true,
        cutout: '80%',
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                callbacks: {
                    label: function (context: any) {
                        const label = context.label || '';
                        const value = context.parsed || 0;
                        if (label === 'Played') {
                            return `${label}: ${value} sec (${Math.floor(value / 60)} min)`;
                        }
                        if (label === 'Remaining') {
                            return `${label}: ${value} sec (${Math.floor(value / 60)} min)`;
                        }
                        return `${label}: ${value}`;
                    },
                },
            },
        },
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

    const handleBuyStoreItem = async (item: StoreItem, price: number, selectedCurrency: string) => {
        if (!sessionTicket) return;
        setIsBuying(true);

        try {
            const res = await purchaseStoreItem(
                sessionTicket,
                titleId,
                storeId,
                catalogVersion,
                item.ItemId,
                price,
                selectedCurrency
            );

            if (res?.error) {
                showPopup(`Purchase failed: ${res.errorMessage || 'Unknown error'}`, 'error');
            } else {
                showPopup(`Purchased ${item.DisplayName || item.ItemId} with ${selectedCurrency}!`, 'success');

                const refreshedInventory = await getUserInventory(sessionTicket, titleId);
                if (refreshedInventory?.data) {
                    setInventoryItems(refreshedInventory.data.Inventory || []);
                    setVirtualCurrency(refreshedInventory.data.VirtualCurrency || {});
                }
            }
        } catch (err) {
            showPopup('Purchase failed due to a network or unexpected error.', 'error');
            console.error(err);
        } finally {
            setIsBuying(false);
        }
    };

    const handleUseInventoryItem = async (item: InventoryItem) => {
        if (!sessionTicket) return;
        try {
            const res = await useInventoryItem(sessionTicket, titleId, item.ItemInstanceId, 1);
            if (res?.error) {
                showPopup(`Failed to use item: ${res.errorMessage || 'Unknown error'}`, 'error');
            } else {
                // Generate coupon code on success
                const coupon = generateCouponCode('ARENAxVINS');

                // Update coupons in PlayFab UserData
                let coupons: string[] = [];
                try {
                    coupons = userData.Coupons ? JSON.parse(userData.Coupons) : [];
                } catch {
                    coupons = [];
                }
                coupons.push(coupon);

                // Save updated coupons to PlayFab
                await updatePlayFabUserData(sessionTicket, titleId, { Coupons: JSON.stringify(coupons) });

                // Update local state as well
                setUserData((prev) => ({ ...prev, Coupons: JSON.stringify(coupons) }));

                showPopup(`Used ${item.DisplayName || item.ItemId}! Coupon: ${coupon}`, 'success');

                // Refresh inventory after use
                const refreshedInventory = await getUserInventory(sessionTicket, titleId);
                if (refreshedInventory?.data) {
                    setInventoryItems(refreshedInventory.data.Inventory || []);
                    setVirtualCurrency(refreshedInventory.data.VirtualCurrency || {});
                }
            }
        } catch (err) {
            showPopup('Failed to use item due to a network or unexpected error.', 'error');
            console.error(err);
        }
    };

    const showPopup = (message: string, type: 'success' | 'error' = 'success') => {
        setPopup({ message, type });
        if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);
        popupTimeoutRef.current = setTimeout(() => setPopup(null), 3000);
    };

    return (
        <div className={styles.page}>
            {popup && (
                <Popup
                    message={popup.message}
                    type={popup.type}
                    onClose={() => setPopup(null)}
                />
            )}
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
                <section
                    className={styles.card}
                    style={{ cursor: 'pointer' }}
                >
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
                                    plugins:
                                    {
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

                {/* Inventory Card */}
                <section
                    className={styles.card}
                    style={{ cursor: 'pointer' }}
                >
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
                                    <button
                                        className={styles.useButton}
                                        style={{ marginLeft: 12, padding: '0.3rem 0.8rem', fontSize: '0.95rem' }}
                                        onClick={() => handleUseInventoryItem(item)}
                                        disabled={isBuying}
                                    >
                                        Use
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                {/* Friends Card */}
                <section
                    className={styles.card}
                    style={{ cursor: 'pointer' }}
                >
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

                {/* Playtime Card */}
                <section className={styles.card}>
                    <h2 className={styles.cardTitle}>Playtime</h2>

                    {loading ? (
                        <>
                            <div className={styles['skeleton-title']}></div>
                            {[...Array(1)].map((_, i) => (
                                <div key={i} className={styles['skeleton-item']}></div>
                            ))}
                            <div className={styles['skeleton-chart']}></div>
                        </>
                    ) : (
                        <>
                            <Doughnut data={data} options={options} />
                            <p style={{ textAlign: 'center', marginTop: '1rem', fontWeight: 'bold' }}>
                                {`Played: ${Math.floor(playtimeSeconds / 60)} min / ${Math.floor(totalSeconds / 60)} min`}
                            </p>
                        </>)}
                </section>


                {/* Virtual Currency Card */}
                <section
                    className={styles.card}
                    style={{ cursor: 'pointer' }}
                >
                    <h2 className={styles.cardTitle}>Economy</h2>
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
                                        <span className={styles.currencyAmount}>
                                            {virtualCurrency[currency].toLocaleString('en-IN')}
                                        </span>
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

                {/* Store */}
                <section
                    className={styles.card}
                    style={{ cursor: 'pointer' }}
                >
                    <h2 className={styles.cardTitle}>Store</h2>

                    {loading ? (
                        <>
                            <div className={styles['skeleton-title']}></div>
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className={styles['skeleton-item']}></div>
                            ))}
                        </>
                    ) : storeItems.length === 0 ? (
                        <p className={styles.empty}>No store items available.</p>
                    ) : (
                        <ul className={styles.inventoryList}>
                            {storeItems.map((item) => {
                                const prices = item.VirtualCurrencyPrices || {};
                                const itemCurrencies = Object.keys(prices);
                                const selectedCurrency = currencySelections[item.ItemId] || itemCurrencies[0];
                                const price = prices[selectedCurrency];

                                return (
                                    <li key={item.ItemId} className={styles.inventoryItem}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            <strong>{item.DisplayName || item.ItemId}</strong>
                                            {/* <small>Catalog: {item.CatalogVersion || catalogVersion}</small> */}

                                            {/* Currency selector */}
                                            <select
                                                className={styles.currencySelect}
                                                value={selectedCurrency}
                                                onChange={(e) =>
                                                    setCurrencySelections((prev) => ({
                                                        ...prev,
                                                        [item.ItemId]: e.target.value,
                                                    }))
                                                }
                                                style={{ maxWidth: '120px' }}
                                            >
                                                {itemCurrencies.map((cur) => (
                                                    <option key={cur} value={cur}>
                                                        {cur} ({prices[cur]})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '1rem', color: '#888' }}>
                                                Price: {price.toLocaleString('en-IN')} {selectedCurrency}
                                            </span>
                                            <button
                                                className={styles.buyButton}
                                                onClick={() => { handleBuyStoreItem(item, price, selectedCurrency) }}
                                            >
                                                Buy
                                            </button>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </section>

                {/* Coupons Section */}
                <section
                    className={styles.card}
                    style={{ cursor: 'pointer' }}
                >
                    <h2 className={styles.cardTitle}>My Coupons</h2>
                    {userData.Coupons && JSON.parse(userData.Coupons).length > 0 ? (
                        <ul className={styles.userDataList}>
                            {JSON.parse(userData.Coupons).map((code: string, idx: number) => (
                                <li key={idx} className={styles.couponItem}>
                                    <div className={styles.couponInfo}>
                                        <span className={styles.couponLabel}>Coupon:</span>
                                        <span className={styles.couponCode}>{code}</span>
                                    </div>
                                    <button
                                        className={styles.redeemButton}
                                        onClick={() => router.push(`coupon/redeem?code=${code}`)}
                                    >
                                        Redeem
                                    </button>
                                </li>
                            ))}
                        </ul>

                    ) : (
                        <p className={styles.empty}>No coupons yet.</p>
                    )}
                </section>

            </div>
        </div>
    );
}
