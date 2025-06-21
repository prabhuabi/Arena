'use client';

import { signIn } from 'next-auth/react';
import styles from './auth.module.css';
import Image from 'next/image';
import microsoftLogo from '../../public/icons/msoft.png';

// const arenaTaglines = [
//     "The Ultimate Coffee Break Showdown",
//     "Where Office Legends Are Made",
//     "Enter the Arena, Rule the Floor",
//     "Challenge. Compete. Conquer.",
//     "Outplay. Outlast. Outscore.",
//     "Turning Colleagues into Champions",
//     "Work Hard, Play Smarter",
//     "Battle Your Buddies—Break the Routine",
//     "Unleash the Competitive Spirit at Work",
//     "Gamify Your Workday",
//     "Raise the Stakes of Your 9 to 5",
//     "Step Into the Spotlight",
//     "Every Click Counts",
//     "Office Just Got Interesting",
//     "Be the MVP of Your Team"
// ];

export default function SignIn() {
    // const tagline = arenaTaglines[Math.floor(Math.random() * arenaTaglines.length)];

    const handleSignIn = () => {
        signIn('azure-ad')
    };

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                {/* <h1 className={styles.tagline}>Arena: {tagline}</h1> */}
                <h3 className={styles.heading}>Please sign in to continue 🚀</h3>
                <button className={styles.signInButton} onClick={handleSignIn}>
                    <Image
                        alt="Microsoft logo"
                        src={microsoftLogo}
                        width={20}
                        height={20}
                        className={styles.logo}
                    />
                    <span>Continue with Microsoft</span>
                </button>
                <p className={styles.info}>
                    Sign in with your work account to participate, save your progress, and maintain a fair competitive environment.
                </p>
            </div>
        </div>
    );
}
