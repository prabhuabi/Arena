'use client';

import { useSession, signOut } from 'next-auth/react';
import SignIn from '@/components/auth/SignIn';
import styles from './profile.module.css';
import { useEffect, useState } from 'react';
import { addFriend } from '@/lib/playfab/playfab';
import { Game } from '@/lib/db';

export default function Profile() {
    const { data: session, status } = useSession();

    const [method, setMethod] = useState<'id' | 'username' | 'email'>('id');
    const [inputValue, setInputValue] = useState('');
    const [feedback, setFeedback] = useState('');
    const [showHelp, setShowHelp] = useState(false);
    const [myGames, setMyGames] = useState<Game[]>([]);
    const [gamesLoading, setGamesLoading] = useState(true);

    if (status === 'loading') {
        return <div className={styles.page}>Loading...</div>;
    }

    if (!session) {
        return <SignIn />;
    }

    const fetchMyGames = async () => {
        try {
            const res = await fetch('/api/profile/my-games');
            const data = await res.json();
            setMyGames(data);
        } catch (e) {
            console.error(e);
        } finally {
            setGamesLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this game?')) return;

        try {
            const res = await fetch(`/api/profile/my-games/${id}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                setMyGames((prev) => prev.filter((g) => g.id !== id));
            } else {
                alert('Failed to delete game.');
            }
        } catch (err) {
            console.error(err);
            alert('Error deleting game.');
        }
    };


    const handleAddFriend = async () => {
        const sessionTicket = sessionStorage.getItem('playfabSessionTicket');
        const titleId = process.env.NEXT_PUBLIC_PLAYFAB_TITLE_ID;

        if (!sessionTicket || !titleId) {
            setFeedback('Missing session ticket or title ID');
            return;
        }

        try {
            let res;

            if (method === 'id') {
                res = await addFriend(sessionTicket, titleId, inputValue);
            } else if (method === 'email') {
                res = await addFriend(sessionTicket, titleId, undefined, inputValue);
            } else {
                res = await addFriend(sessionTicket, titleId, undefined, undefined, inputValue);
            }

            if (res.code === 200) {
                setFeedback('Friend added successfully!');
                setInputValue('');
            } else {
                setFeedback(res.errorMessage || 'Could not add friend.');
            }
        } catch (err: any) {
            setFeedback(err?.errorMessage || 'Error occurred while adding friend.');
        }
    };

    useEffect(() => {
        fetchMyGames();
    }, []);

    return (
        <div className={styles.page}>
            <header className={styles.pageHeader}>
                <h2>Profile</h2>
            </header>

            <div className={styles.profileLayout}>
                {session.user?.image && (
                    <img
                        src={session.user.image}
                        alt="Profile"
                        className={styles.avatar}
                    />
                )}
                <div className={styles.details}>
                    <h1 className={styles.name}>{session.user?.name ?? ''}</h1>
                    <p className={styles.email}>{session.user?.email ?? ''}</p>
                    <button
                        className={styles.signOutButton}
                        onClick={() => {
                            sessionStorage.removeItem('playfabSessionTicket');
                            signOut();
                        }}
                    >
                        Sign Out
                    </button>
                </div>
            </div>

            <div className={styles.addFriendsContainer}>
                <h1>Add Friends</h1>
                <br />
                <br />

                <div className={styles.methodTabs}>
                    <button
                        className={`${styles.methodTab} ${method === 'id' ? styles.active : ''}`}
                        onClick={() => setMethod('id')}
                    >
                        ID
                    </button>
                    <button
                        className={`${styles.methodTab} ${method === 'username' ? styles.active : ''}`}
                        onClick={() => setMethod('username')}
                        disabled={true}
                    >
                        Username
                    </button>
                    <button
                        className={`${styles.methodTab} ${method === 'email' ? styles.active : ''}`}
                        onClick={() => setMethod('email')}
                        disabled={true}
                    >
                        Email
                    </button>
                </div>

                <div className={styles.AddFriends}>
                    <label className={styles.inputLabel}>
                        {method === 'id' && 'ID'}
                        {method === 'username' && 'Username'}
                        {method === 'email' && 'Email'}
                    </label>
                    <input
                        type="text"
                        className={styles.AddFriendsInput}
                        placeholder={`Enter ${method}`}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                    />
                    <button className={styles.AddFriendsButton} onClick={handleAddFriend}>
                        Add
                    </button>
                    <div className={styles.tooltipWrapper}>
                        <button
                            className={styles.AddFriendsHelp}
                            onMouseEnter={() => setShowHelp(true)}
                            onMouseLeave={() => setShowHelp(false)}
                        >
                            ?
                        </button>
                        {showHelp && (
                            <div className={styles.tooltip}>
                                <p>Select how you'd like to search for your friend - you can get the info on their dashboard.</p>
                            </div>
                        )}
                    </div>
                </div>

                {feedback && <p style={{ marginTop: '1rem', color: '#3b82f6' }}>{feedback}</p>}
            </div>

            <div className={styles.myGamesContainer}>
                <h1>My Publishings</h1>
                <br />

                {gamesLoading ? (
                    <p>Loading...</p>
                ) : myGames.length === 0 ? (
                    <p>You haven't published any games yet.</p>
                ) : (
                    <table className={styles.gamesTable}>
                        <thead>
                            <tr>
                                <th>Title</th>
                                <th>Description</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {myGames.map((game) => (
                                <tr key={game.id}>
                                    <td>{game.title}</td>
                                    <td>{game.description?.slice(0, 90)}...</td>
                                    <td>
                                        <button
                                            onClick={() => window.location.href = `/arena/${game.id}`}
                                            className={styles.viewButton}
                                        >
                                            View
                                        </button>
                                        <button
                                            onClick={() => handleDelete(game.id!)}
                                            className={styles.deleteButton}
                                        >
                                            Delete
                                        </button>
                                    </td>

                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
            <br />
            <br />

        </div>
    );
}
