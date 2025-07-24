import React from 'react';

export default function Popup({
    message,
    type = 'success',
    onClose,
}: {
    message: string;
    type?: 'success' | 'error';
    onClose: () => void;
}) {
    const styles = {
        base: {
            position: 'fixed' as const,
            top: '2rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            padding: '1rem 2rem',
            borderRadius: '12px',
            fontWeight: 700,
            boxShadow: '0 4px 24px #0008',
            minWidth: '220px',
            textAlign: 'center' as const,
            animation: 'fadeIn 0.3s ease-in-out',
        },
        success: {
            background: '#079486',
            color: '#fff',
        },
        error: {
            background: '#330000',
            color: '#ff5555',
        },
        closeButton: {
            marginLeft: 16,
            background: 'none',
            border: 'none',
            color: '#ff5555',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '1.1rem',
        },
    };

    const typeStyles = type === 'success' ? styles.success : styles.error;

    return (
        <div
            style={{
                ...styles.base,
                ...typeStyles,
            }}
            role="alert"
        >
            {message}
            <button
                onClick={onClose}
                style={styles.closeButton}
                aria-label="Close"
            >
                ✖
            </button>
        </div>
    );
}
