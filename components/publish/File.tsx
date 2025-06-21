'use client';
import React, { useState } from 'react';
import styles from './file.module.css';

interface FileProps {
    label: string;
    accept?: string;
    onFileChange: (file: File | null) => void;
}

export default function File({ label, accept, onFileChange }: FileProps) {
    const [fileName, setFileName] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            setFileName(files[0].name);
            onFileChange(files[0]);
        } else {
            setFileName(null);
            onFileChange(null);
        }
    };

    return (
        <div className={styles.fileInputWrapper}>
            <label className={styles.fileLabel}>
                {label}
                <input
                    type="file"
                    accept={accept}
                    onChange={handleChange}
                    className={styles.fileInput}
                />
            </label>
            {fileName && <p className={styles.fileName}>Selected: {fileName}</p>}
        </div>
    );
}
