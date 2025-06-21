"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useUnityContext, Unity } from "react-unity-webgl";
import { AddArenaCoins, AddGamePlayedCount, AddTrophies } from "@/lib/playfab/playfab";
import styles from './game.module.css';
import { useRouter } from 'next/navigation';
interface PlayGameProps {
    Id?: string;
    Name?: string
}

interface Event {
    eventName?: string;
    rewards?: {
        arenaCoins?: number;
        trophies?: number;
    }
}

const titleId = process.env.NEXT_PUBLIC_PLAYFAB_TITLE_ID ?? '';


const GameView: React.FC<PlayGameProps> = (props) => {
    const router = useRouter();


    const Id = props.Id;
    const Name = props.Name;
    const gameId = Id;

    const {
        unityProvider,
        addEventListener,
        removeEventListener
    } = useUnityContext({
        loaderUrl: `/games/${gameId}/Build/${Name}.loader.js`,
        dataUrl: `/games/${gameId}/Build/${Name}.data`,
        frameworkUrl: `/games/${gameId}/Build/${Name}.framework.js`,
        codeUrl: `/games/${gameId}/Build/${Name}.wasm`,
        streamingAssetsUrl: `games/${gameId}/StreamingAssets`,
    });

    // Message Output : {"eventName":"ended","rewards":{"arenaCoins":40,"trophies":0}}

    const handleMessage = (message: any) => {
        try {
            const event: Event = JSON.parse(message);

            if (event.eventName === "ended") {
                const _sessionTicket = sessionStorage.getItem('playfabSessionTicket');
                AddGamePlayedCount(_sessionTicket!, titleId);
                AddTrophies(_sessionTicket!, titleId, event.rewards?.trophies!);
                AddArenaCoins(_sessionTicket!, titleId, event.rewards?.arenaCoins!);
            }

        } catch (error) {
            console.error("Failed to parse message", error);
        }
    };

    const handleExit = () => {
        router.push(`/arena/${Id}`);
    }

    useEffect(() => {
        addEventListener("OnMessage", (message) => {
            handleMessage(message);
        });
    }, [addEventListener, removeEventListener]);

    return (
        <div style={{ width: "100%", height: "100vh", position: "relative" }}>
            <Unity
                unityProvider={unityProvider}
                style={{
                    width: "100%",
                    height: "100%",
                }}
            />
            
            <button className={styles.backButton} onClick={handleExit}>
                ← Back
            </button> 

        </div>
    );

};


export default dynamic(() => Promise.resolve(GameView), { ssr: false });
