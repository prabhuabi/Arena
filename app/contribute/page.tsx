'use client';
import { useRouter } from 'next/navigation';
import styles from './contibute.module.css';

export default function Contribute() {

    const router = useRouter();

    const HandlePublish = () => {
        router.push('/contribute/publish');
    }

    return (
        <div className={styles.wrapper}>
            <div className={styles.left}>
                <a href="https://github.com/r-sabarish/Arena" target="_blank" rel="noopener noreferrer">
                    <div className={styles.logoContainer}>
                        <img className={styles.logo} src="/icons/logo.png" alt="Arena Logo" />
                    </div>
                </a>
            </div>

            <div className={styles.right}>
                <div className={styles.content}>
                    <h1 className={styles.heading}>Be a Contributer 🏅</h1>

                    <p className={styles.paragraph}>
                        <strong>Arena</strong> is an open-source platform that makes it easy and fun for office teams to play games together online.
                    </p>

                    <p className={styles.paragraph}>
                        Combining robust backend services with engaging gameplay, Arena delivers a smooth, interactive experience directly in your browser.
                    </p>

                    <br />

                    <p className={styles.paragraph}>
                        🔹 <strong>Website & Authentication</strong>: Built with <strong>Next.js</strong>, featuring secure sign-in powered by <strong>NextAuth</strong> and <strong>Azure AD</strong> (via Azure Entra OpenID).
                    </p>

                    <p className={styles.paragraph}>
                        🔹 <strong>Player Progress & Leaderboards</strong>: Managed through <strong>PlayFab</strong>, tracking stats, achievements, leaderboards, and virtual currencies.
                    </p>

                    <p className={styles.paragraph}>
                        🔹 <strong>Game Experience</strong>: Developed in <strong>Unity WebGL</strong>, supporting both single-player and multiplayer game modes.
                    </p>

                    <p className={styles.paragraph}>
                        🔹 <strong>Real-Time Multiplayer</strong>: Enabled by <strong>Photon Fusion 2</strong> for seamless multiplayer interactions.
                    </p>

                    <br />

                    <p className={styles.paragraph}>
                        Join the Arena community and be part of building a fun, open-source platform for team gaming.
                    </p>

                    <p className={styles.paragraph}>
                        The project is open and maintained on <a href="https://github.com/r-sabarish/Arena" target="_blank" rel="noopener noreferrer"><u>GitHub</u></a>.
                    </p>

                    <br />

                    <button className={styles.addGame} onClick={() => HandlePublish()}>Publish a Game 🎯</button>
                </div>
            </div>
        </div>
    );
}
