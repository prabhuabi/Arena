import React from 'react';

interface TimeoutProps {
    message?: string;
}

export default function Timeout({ message }: TimeoutProps) {
    return (
        <div style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#ff4d4f',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            zIndex: 9999,
            fontWeight: 'bold',
            fontSize: '16px',
            userSelect: 'none',
            textAlign: 'center',
        }}>
            {message || "Hey! Your playtime for today is over. We’ll be looking forward to seeing you again tomorrow!"}
        </div>
    );
}
