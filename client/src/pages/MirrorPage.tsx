// client/src/pages/MirrorPage.tsx
import React, { useEffect, useCallback, useState } from 'react';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const LOCAL_STORAGE_KEY = 'whiteboard-data'; // Key for localStorage (must match DrawPage)
const PLACEHOLDER_IMAGE_URL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; // Transparent 1x1 pixel

function MirrorPage() {
    // State to hold the current image data URL
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    // Effect for handling localStorage updates
    useEffect(() => {
        console.log("[MirrorPage] useEffect: Adding storage event listener.");
        const handleStorageChange = (event: StorageEvent) => {
            console.log("[MirrorPage] handleStorageChange: Event received:", event);
            console.log(`[MirrorPage] handleStorageChange: Key='${event.key}', NewValue exists=${!!event.newValue}`);

            if (event.key === LOCAL_STORAGE_KEY && event.newValue) {
                console.log("[MirrorPage] handleStorageChange: Key matches. New value:", event.newValue.substring(0, 100) + "...");
                try {
                    console.log("[MirrorPage] handleStorageChange: Attempting to parse JSON.");
                    const data = JSON.parse(event.newValue);
                    console.log("[MirrorPage] handleStorageChange: JSON parsed successfully:", data);

                    if (data.type === 'update' && typeof data.dataUrl === 'string') {
                        console.log("[MirrorPage] handleStorageChange: Detected 'update' type. Setting image URL.");
                        setImageUrl(data.dataUrl);
                    } else if (data.type === 'clear') {
                        console.log("[MirrorPage] handleStorageChange: Detected 'clear' type. Clearing image URL.");
                        setImageUrl(null); // Set to null to hide image or show placeholder text
                    } else {
                         console.warn("[MirrorPage] handleStorageChange: Unknown data type or missing dataUrl:", data);
                    }
                } catch (error) {
                    console.error("[MirrorPage] handleStorageChange: Failed to parse localStorage data:", error);
                }
            } else {
                 console.log("[MirrorPage] handleStorageChange: Event key doesn't match or newValue is null.");
            }
        };

        window.addEventListener('storage', handleStorageChange);
        console.log("[MirrorPage] useEffect: Storage event listener added.");

        // Load initial state from localStorage on mount
        console.log("[MirrorPage] useEffect: Attempting to load initial state from localStorage.");
        try {
            const initialData = localStorage.getItem(LOCAL_STORAGE_KEY);
            console.log("[MirrorPage] useEffect: Initial data from localStorage:", initialData ? initialData.substring(0, 100) + "..." : null);
            if (initialData) {
                console.log("[MirrorPage] useEffect: Parsing initial data.");
                const data = JSON.parse(initialData);
                 if (data.type === 'update' && typeof data.dataUrl === 'string') {
                    console.log("[MirrorPage] useEffect: Initial state is 'update'. Setting image URL.");
                    setImageUrl(data.dataUrl);
                } else {
                    console.log("[MirrorPage] useEffect: Initial state is not 'update' or dataUrl missing/invalid.");
                    // Optionally clear if initial state is 'clear' or invalid
                    setImageUrl(null);
                }
            } else {
                 console.log("[MirrorPage] useEffect: No initial data found in localStorage.");
                 setImageUrl(null); // Ensure it's cleared if nothing is stored
            }
        } catch (error) {
             console.error("[MirrorPage] useEffect: Failed to parse initial localStorage data:", error);
             setImageUrl(null); // Clear on error
        }


        // Cleanup listener on unmount
        return () => {
            console.log("[MirrorPage] useEffect cleanup: Removing storage event listener.");
            window.removeEventListener('storage', handleStorageChange);
            console.log("[MirrorPage] useEffect cleanup: Storage event listener removed.");
        };
    }, []); // No dependencies needed as setImageUrl is stable


    // --- Render ---
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px' }}>
            <h1>Mirror View</h1>
            <div style={{
                width: `${CANVAS_WIDTH}px`,
                height: `${CANVAS_HEIGHT}px`,
                border: '1px solid #ccc',
                background: '#f0f0f0',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'hidden' // Prevent image overflow if dimensions mismatch slightly
            }}>
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt="Mirrored Whiteboard"
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    />
                ) : (
                    <p style={{ color: '#666' }}>Waiting for drawing...</p> // Placeholder text
                )}
            </div>
             <p style={{ marginTop: '10px', fontSize: '0.9em', color: '#555' }}>
                Right-click (or long-press) on the image above to copy or save.
            </p>
        </div>
    );
}

export default MirrorPage;