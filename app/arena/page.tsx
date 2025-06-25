'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './arena.module.css';
import { useSession } from 'next-auth/react';
import SignIn from '@/components/auth/SignIn';

interface Game {
    id: number;
    title: string;
    description: string;
    image: string[];
    category: string[];
    publisher: string
}

export default function Arena() {
    const router = useRouter();
    const [games, setGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeImageIndex, setActiveImageIndex] = useState<{ [key: number]: number }>({});
    const { data: session, status } = useSession();


    useEffect(() => {
        const fetchGames = async () => {
            try {
                const res = await fetch('/api/arena/games');
                const data = await res.json();
                setGames(data);

                const initialIndexes: { [key: number]: number } = {};
                data.forEach((game: Game) => {
                    initialIndexes[game.id] = 0;
                });
                setActiveImageIndex(initialIndexes);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchGames();
    }, []);

    // Autoplay logic
    useEffect(() => {
        const intervals: { [key: number]: NodeJS.Timeout } = {};

        games.forEach((game) => {
            if (game.image.length > 1) {
                intervals[game.id] = setInterval(() => {
                    setActiveImageIndex((prev) => ({
                        ...prev,
                        [game.id]: (prev[game.id] + 1) % game.image.length,
                    }));
                }, 3000); // Change image every 3 seconds
            }
        });

        return () => {
            Object.values(intervals).forEach(clearInterval);
        };
    }, [games]);

    const handleDotClick = (gameId: number, index: number) => {
        setActiveImageIndex((prev) => ({ ...prev, [gameId]: index }));
    };

    if (!session) return <SignIn />;


    if (loading) {
        return (
            <div className={styles.page}>
                <h1 className={styles.pageTitle}>Arena</h1>
                <div className={styles.gamesList}>
                    {[...Array(1)].map((_, i) => (
                        <div key={i} className={styles.skeletonCard}>
                            <div className={styles.skeletonTitle}></div>
                            <div className={styles.skeletonImage}></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <h1 className={styles.pageTitle}>Arena <p className={styles.info}># games</p> </h1>

            <div className={styles.gamesList}>
                {games.map((game) => {
                    const images = Array.isArray(game.image) ? game.image : [game.image];
                    const currentIndex = activeImageIndex[game.id] ?? 0;

                    return (
                        <div
                            key={game.id}
                            className={styles.gameCard}
                            tabIndex={0}
                            role="button"
                            onClick={() => router.push(`/arena/${game.id}`)}
                        >

                            <div key={game.id} className={styles.gameCard} onClick={() => router.push(`/arena/${game.id}`)} tabIndex={0}>
                                <div className={styles.imageWrapper}>
                                    <img
                                        src={images[currentIndex]}
                                        alt={`${game.title} preview`}
                                        className={styles.gameImage}
                                    />
                                    <h3 className={styles.gameTitle}>{game.title}</h3>
                                    <div className={styles.imageDots}>
                                        {images.map((_, index) => (
                                            <span
                                                key={index}
                                                className={`${styles.dot} ${currentIndex === index ? styles.activeDot : ''}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDotClick(game.id, index);
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <img
                                src={images[currentIndex]}
                                alt={`${game.title} preview`}
                                className={styles.gameImage}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
