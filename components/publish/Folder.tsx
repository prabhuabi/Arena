import React, { ChangeEvent } from 'react';

interface FolderInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    webkitdirectory?: string;
    directory?: string;
}

export function FolderInput(props: FolderInputProps) {
    return <input {...props} type="file" />;
}

export default function FolderUpload() {
    const handleFolderChange = (e: ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        for (let i = 0; i < files.length; i++) {
            console.log(files[i].name, files[i].webkitRelativePath);
        }
    };

    return (
        <FolderInput
            webkitdirectory=""
            directory=""
            multiple
            onChange={handleFolderChange}
            style={{ display: 'block', marginTop: 10 }}
        />
    );
}
