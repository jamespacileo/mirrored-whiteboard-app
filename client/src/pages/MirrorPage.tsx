// client/src/pages/MirrorPage.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { getStroke } from 'perfect-freehand'; // Import getStroke
import { getSvgPathFromStroke } from '../utils/getSvgPathFromStroke.ts'; // Import the utility

// --- Constants and Types ---
const LOCAL_STORAGE_KEY = 'whiteboard-data';
// Define the structure expected from localStorage
interface StoredStroke {
    id: number;
    points: { x: number; y: number; pressure?: number }[];
    color: string;
    size: number; // We might not use size directly for rendering pathData, but good to have
}
// Define the structure used for rendering
interface RenderStroke extends StoredStroke {
    pathData: string;
}

function MirrorPage() {
    // State to hold the strokes to be rendered
    const [strokesToRender, setStrokesToRender] = useState<RenderStroke[]>([]);

    // --- Function to process stored strokes and generate pathData ---
    const processAndSetStrokes = useCallback((storedStrokes: StoredStroke[]) => {
        const renderableStrokes = storedStrokes.map(stroke => {
            // Re-generate the path data using the utility function
            // Note: perfect-freehand options might differ slightly if not stored,
            // using default-like options here for simplicity. Adjust if needed.
            const strokeOutlinePoints = getStroke(stroke.points, {
                size: stroke.size,
                thinning: 0.6, smoothing: 0.5, streamline: 0.5,
                start: { taper: 0, cap: true }, end: { taper: 0, cap: true },
            });
            const pathData = getSvgPathFromStroke(strokeOutlinePoints);
            return { ...stroke, pathData };
        });
        setStrokesToRender(renderableStrokes);
        console.log(`[MirrorPage] Processed and set ${renderableStrokes.length} strokes for rendering.`);
    }, []);


    // --- Effect for handling localStorage updates ---
    useEffect(() => {
        console.log("[MirrorPage] useEffect: Adding storage event listener.");
        const handleStorageChange = (event: StorageEvent) => {
            console.log("[MirrorPage] handleStorageChange: Event received.");
            if (event.key === LOCAL_STORAGE_KEY && event.newValue) {
                console.log("[MirrorPage] handleStorageChange: Key matches.");
                try {
                    const data = JSON.parse(event.newValue);
                    console.log("[MirrorPage] handleStorageChange: JSON parsed:", data.type);

                    if (data.type === 'update' && Array.isArray(data.strokes)) {
                        console.log("[MirrorPage] handleStorageChange: Detected 'update'. Processing strokes.");
                        processAndSetStrokes(data.strokes);
                    } else if (data.type === 'clear') {
                        console.log("[MirrorPage] handleStorageChange: Detected 'clear'. Clearing strokes.");
                        setStrokesToRender([]);
                    } else {
                         console.warn("[MirrorPage] handleStorageChange: Unknown data type or missing strokes array:", data);
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

        // --- Load initial state from localStorage on mount ---
        console.log("[MirrorPage] useEffect: Attempting to load initial state.");
        try {
            const initialData = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (initialData) {
                const data = JSON.parse(initialData);
                 if (data.type === 'update' && Array.isArray(data.strokes)) {
                    console.log("[MirrorPage] useEffect: Initial state is 'update'. Processing strokes.");
                    processAndSetStrokes(data.strokes);
                } else {
                    console.log("[MirrorPage] useEffect: Initial state is not 'update' or strokes missing.");
                    setStrokesToRender([]);
                }
            } else {
                 console.log("[MirrorPage] useEffect: No initial data found.");
                 setStrokesToRender([]);
            }
        } catch (error) {
             console.error("[MirrorPage] useEffect: Failed to parse initial localStorage data:", error);
             setStrokesToRender([]);
        }

        // Cleanup listener on unmount
        return () => {
            console.log("[MirrorPage] useEffect cleanup: Removing storage event listener.");
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [processAndSetStrokes]); // Depend on the processing function


    // --- Render ---
    return (
        <div className="flex flex-col items-center p-4 bg-gray-100 min-h-screen">
            <h1 className="text-2xl font-bold mb-4">Mirror View</h1>
            <div className="border border-gray-300 bg-gray-50 shadow-inner">
                {/* Use SVG to render the strokes */}
                <svg
                    width="800" // Fixed size for mirror view for simplicity, adjust if needed
                    height="600"
                    viewBox="0 0 800 600" // Match width/height
                    className="bg-white" // White background for the drawing area
                >
                    {strokesToRender.length === 0 ? (
                         <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fill="#999">
                            Waiting for drawing...
                         </text>
                    ) : (
                        strokesToRender.map((stroke) => (
                            <path
                                key={stroke.id}
                                d={stroke.pathData}
                                fill={stroke.color}
                                stroke={stroke.color} // Optional: stroke for consistency, fill usually covers it
                                strokeWidth="1" // Minimal stroke width
                            />
                        ))
                    )}
                </svg>
            </div>
             <p className="mt-3 text-sm text-gray-600">
                Mirror view updates automatically.
            </p>
        </div>
    );
}

export default MirrorPage;