"use client";

import React from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";

const GameView = dynamic(() => import("../../../components/unity/game-view"), { ssr: false });

const UnityPage: React.FC = () => {
    const searchParams = useSearchParams();
    const id = searchParams?.get("Id");
    const name = searchParams?.get("Name");

    return (
        <div
            className="aspect-video bg-white rounded-lg flex items-center justify-center"
            style={{ width: "100%", height: "100vh" }}
        >
            <GameView Id={id!} Name={name!} />
        </div>
    );
};

export default UnityPage;
