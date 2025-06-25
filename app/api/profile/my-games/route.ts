import { NextResponse } from 'next/server';
import { getAllGames } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const allGames = await getAllGames();
        const userGames = allGames.filter(game => game.publisher === session!.user?.email);

        return NextResponse.json(userGames);
    } catch (error) {
        console.error('Failed to fetch user games:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
