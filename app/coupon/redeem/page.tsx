'use client';

import { useSession } from 'next-auth/react';
import SignIn from '@/components/auth/SignIn';
import { useState, useRef, useEffect } from 'react';
import { getUserDataFromPlayFab, updatePlayFabUserData } from '@/lib/playfab/playfab';
import Popup from '@/components/popup/Popup';
import { useSearchParams } from 'next/navigation';
import styles from './coupon.module.css';

export default function ScratchToRedeem() {
    const { data: session, status } = useSession();
    const searchParams = useSearchParams();
    const [couponCode, setCouponCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [redeemed, setRedeemed] = useState(false);
    const [popup, setPopup] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const isDrawing = useRef(false);

    useEffect(() => {
        const code = searchParams?.get('code') || '';
        setCouponCode(code.trim());
    }, [searchParams]);

    useEffect(() => {
        if (!canvasRef.current || !containerRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size to container size
        const rect = containerRef.current.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        // Fill canvas with gray "scratch-off" color
        ctx.fillStyle = '#C0C0C0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Optional: add some noise texture for foil effect
        const noise = ctx.createImageData(canvas.width, canvas.height);
        for (let i = 0; i < noise.data.length; i += 4) {
            const val = Math.random() * 50 + 150; // light gray noise
            noise.data[i] = val;
            noise.data[i + 1] = val;
            noise.data[i + 2] = val;
            noise.data[i + 3] = 255;
        }
        ctx.putImageData(noise, 0, 0);
    }, [couponCode]);

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        if (redeemed) return;
        isDrawing.current = true;
        draw(e);
    };

    const stopDrawing = () => {
        if (redeemed) return;
        isDrawing.current = false;
        checkScratchPercent();
    };

    const getPos = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();

        if ('touches' in e && e.touches.length > 0) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top,
            };
        } else if ('clientX' in e) {
            return {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            };
        }
        return null;
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing.current) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const pos = getPos(e);
        if (!pos) return;

        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 50, 0, Math.PI * 2, false); // brush radius 20px
        ctx.fill();
    };

    const checkScratchPercent = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        let transparentPixels = 0;

        for (let i = 3; i < pixels.length; i += 4) {
            if (pixels[i] === 0) transparentPixels++;
        }

        const scratchedPercent = (transparentPixels / (canvas.width * canvas.height)) * 100;

        // Auto redeem if scratched more than 50%
        if (scratchedPercent > 50 && !redeemed) {
            redeemCoupon();
        }
    };

    const redeemCoupon = async () => {
        setRedeemed(true);

        // Clear scratch overlay fully
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }

        setLoading(true);

        const sessionTicket = sessionStorage.getItem('playfabSessionTicket');
        const titleId = process.env.NEXT_PUBLIC_PLAYFAB_TITLE_ID;

        if (!sessionTicket || !titleId) {
            showPopup('Missing session ticket or title ID', 'error');
            setLoading(false);
            return;
        }

        try {
            const userDataRes = await getUserDataFromPlayFab(sessionTicket, titleId);
            const coupons = userDataRes?.data?.Data?.Coupons?.Value
                ? JSON.parse(userDataRes.data.Data.Coupons.Value)
                : [];

            if (coupons.includes(couponCode)) {
                const mailRes = await fetch('/api/send-coupon-mail', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ coupon: couponCode }),
                });

                if (mailRes.ok) {
                    // Remove the used coupon from the array
                    const updatedCoupons = coupons.filter((c: string) => c !== couponCode);
                    // Update PlayFab UserData
                    await updatePlayFabUserData(sessionTicket, titleId, { Coupons: JSON.stringify(updatedCoupons) });

                    showPopup('Coupon verified! Please check your mail!', 'success');
                } else {
                    const errorText = await mailRes.text();
                    showPopup('Coupon valid, but failed to send mail. ' + errorText, 'error');
                }
            } else {
                showPopup('Invalid coupon code.', 'error');
            }
        } catch (err) {
            showPopup('Error verifying coupon.', 'error');
        } finally {
            setLoading(false);
        }
    };


    const showPopup = (message: string, type: 'success' | 'error' = 'success') => {
        setPopup({ message, type });
        setTimeout(() => setPopup(null), 3000);
    };

    if (status === 'loading') return <div style={{ textAlign: 'center', marginTop: 40 }}>Loading...</div>;
    if (!session) return <SignIn />;

    return (
        <div className={styles.container} >

            <div
                className={`${styles.couponWrapper} ${redeemed ? styles.redeemed : ''}`}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                ref={containerRef}
            >
                <img
                    src="/vgoldtickets.png"
                    alt="Golden Ticket"
                    className={`${styles.couponImage} ${redeemed ? styles.redeemed : ''}`}
                    draggable={false}
                />
                {!redeemed && (
                    <canvas
                        ref={canvasRef}
                        className={styles.scratchCanvas}
                    />
                )}
                {(redeemed && couponCode) && (
                    <div className={styles.couponOverlay}>
                        {couponCode}
                    </div>)}
            </div>

            <p className={styles.infoText}>(Scratch to Redeem)</p>


            {loading && <p className={styles.redeemingText}>Redeeming...</p>}

            {popup && (
                <Popup
                    message={popup.message}
                    type={popup.type}
                    onClose={() => setPopup(null)}
                />
            )}
        </div>

    );
}
