'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import styles from './page.module.css';
import SignIn from '@/components/auth/SignIn';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated' && session) {
      router.push('/dashboard');
    }
  }, [status, session, router]);

  if (status === 'loading') {
    return <div className={styles.page}>Loading...</div>;
  }

  if (!session) {
    return <SignIn />;
  }

  return <div className={styles.page}>Redirecting...</div>;
}
