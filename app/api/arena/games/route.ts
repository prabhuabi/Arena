import { NextResponse } from 'next/server';
import { getAllGames } from '@/lib/db';

export async function GET() {
    try {
        const games = await getAllGames();
        return NextResponse.json(games);
    } catch (error) {
        console.error('Failed to fetch games from DB:', error);
        return NextResponse.json(
            { error: 'Failed to load games' },
            { status: 500 }
        );
    }
}

function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}