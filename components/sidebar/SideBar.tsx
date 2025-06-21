'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import styles from './sidebar.module.css';

export default function SideBar() {
    const pathname = usePathname();

    const list = [
        { name: "Dashboard", url: "/dashboard", icon: "/icons/activity.png" },
        { name: "Arena", url: "/arena", icon: "/icons/arena.png" },
        { name: "LeaderBoard", url: "/leaderboard", icon: "/icons/leaderboard.png" },
        { name: "Profile", url: "/profile", icon: "/icons/user.png" },
        { name: "Contribute", url: "/contribute", icon: "/icons/logo.png" },
    ];

    return (
        <div className={styles.sidebar}>
            <ul className={styles.navList}>
                {list.map((item) => {
                    const isSelected = pathname === item.url;
                    return (
                        <li
                            key={item.url}
                            className={`${styles.navItem} ${isSelected ? styles.selected : ''}`}
                        >
                            <Link href={item.url} className={styles.navLink}>
                                <Image
                                    src={item.icon}
                                    alt={`${item.name} icon`}
                                    width={24}
                                    height={24}
                                    className={styles.icon}
                                />
                                <span className={styles.tooltip}>{item.name}</span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
