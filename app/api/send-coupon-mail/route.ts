import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

export async function POST(req: NextRequest) {
    try {
        const { coupon } = await req.json();

        const session = await getServerSession(authOptions);

        if (!session || !session.user?.email || !session.accessToken) {
            return NextResponse.json({ error: 'Not authenticated or missing access token' }, { status: 401 });
        }

        const senderEmail = session.user.email;
        const accessToken = session.accessToken;

        const ccList = (process.env.NEXT_PUBLIC_COUPON_CC_LIST || '')
            .split(',')
            .map(email => email.trim())
            .filter(email => email);

        if (!coupon) {
            return NextResponse.json({ error: 'Missing coupon code' }, { status: 400 });
        }

        const message = {
            message: {
                subject: "🏆 Vins x Arena: You’re Our Weekly Performer!",
                body: {
                    contentType: "HTML",
                    content: `
                        <div style="font-family: Arial, sans-serif; color: #333;">
                          <h2>🎉 Congratulations!</h2>
                          <p>You’ve been selected as our <strong>Weekly Performer</strong> at <strong>Vins x Arena</strong>.</p>
                          <p>As a token of appreciation, here’s your exclusive coupon code:</p>
                          <div style="background-color: #f2f2f2; padding: 15px; font-size: 1.5em; font-weight: bold; border-radius: 8px; width: fit-content;">
                            ${coupon}
                          </div>
                          <p>Use this coupon to unlock special rewards inside the Arena. Don’t miss out — it’s valid for a limited time!</p>
                          <p style="margin-top: 30px;">Cheers,<br/>The Vins x Arena Team</p>
                        </div>
                    `,
                },
                toRecipients: [
                    {
                        emailAddress: { address: senderEmail },
                    },
                ],
                ccRecipients: ccList.map(email => ({
                    emailAddress: { address: email },
                })),
            },
        };

        const graphResponse = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(message),
        });

        if (!graphResponse.ok) {
            const error = await graphResponse.json();
            return NextResponse.json({ error: error?.error?.message || "Failed to send email" }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
    }
}
