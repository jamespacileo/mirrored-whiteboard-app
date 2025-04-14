// client/src/pages/MirrorPage.tsx
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'; // Added useRef
import { getStroke } from 'perfect-freehand';
import { getSvgPathFromStroke } from '../utils/getSvgPathFromStroke.ts';

// --- Constants and Types ---
const LOCAL_STORAGE_KEY = 'whiteboard-data';
const PADDING = 40; // Padding around the drawing in the viewBox

interface Point { x: number; y: number; pressure?: number }
interface StoredStroke {
    id: number;
    points: Point[];
    color: string;
    size: number;
}
interface RenderStroke extends StoredStroke {
    pathData: string;
}
interface Bounds { minX: number; minY: number; maxX: number; maxY: number }

// --- Bounding Box Calculation ---
function getStrokesBoundingBox(strokes: StoredStroke[]): Bounds | null {
    if (strokes.length === 0) return null;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    strokes.forEach(stroke => {
        stroke.points.forEach(point => {
            minX = Math.min(minX, point.x);
            minY = Math.min(minY, point.y);
            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.y);
        });
    });

    const maxStrokeSize = strokes.reduce((max, s) => Math.max(max, s.size), 0);
    const padding = PADDING + maxStrokeSize / 2;

    return {
        minX: minX - padding,
        minY: minY - padding,
        maxX: maxX + padding,
        maxY: maxY + padding,
    };
}

// --- SVG Generation Helper ---
function generateSvgString(strokes: RenderStroke[], viewBox: string, width: number, height: number): string {
     const paths = strokes.map(stroke =>
        `<path key="${stroke.id}" d="${stroke.pathData}" fill="${stroke.color}" />`
    ).join('');

    // Note: Text color here might need adjustment if SVG background changes
    const emptyText = `<text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="20" fill="#AAAAAA" class="font-medium">Waiting for drawing...</text>`;

    return `
        <svg
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="xMidYMid meet"
            viewBox="${viewBox}"
            width="${width}"
            height="${height}"
        >
            ${strokes.length === 0 ? emptyText : paths}
        </svg>
    `.trim();
}


function MirrorPage() {
    const [strokesToRender, setStrokesToRender] = useState<RenderStroke[]>([]);
    const [pngImageSrc, setPngImageSrc] = useState<string | null>(null); // State for PNG data URI
    const [isConverting, setIsConverting] = useState<boolean>(false); // Conversion status
    const canvasRef = useRef<HTMLCanvasElement>(null); // Ref for offscreen canvas

    // --- Function to process stored strokes and generate pathData ---
    const processAndSetStrokes = useCallback((storedStrokes: StoredStroke[]) => {
        const renderableStrokes = storedStrokes.map(stroke => {
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
                        setPngImageSrc(null); // Clear PNG image too
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
                    setPngImageSrc(null);
                }
            } else {
                 console.log("[MirrorPage] useEffect: No initial data found.");
                 setStrokesToRender([]);
                 setPngImageSrc(null);
            }
        } catch (error) {
             console.error("[MirrorPage] useEffect: Failed to parse initial localStorage data:", error);
             setStrokesToRender([]);
             setPngImageSrc(null);
        }

        return () => {
            console.log("[MirrorPage] useEffect cleanup: Removing storage event listener.");
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [processAndSetStrokes]); // End of storage useEffect

    // --- Calculate Bounds and ViewBox ---
    const bounds = useMemo(() => getStrokesBoundingBox(strokesToRender), [strokesToRender]);

    const { viewBox, width, height } = useMemo(() => {
        if (!bounds) {
            return { viewBox: `0 0 800 600`, width: 800, height: 600 }; // Default
        }
        const w = bounds.maxX - bounds.minX;
        const h = bounds.maxY - bounds.minY;
        const effectiveWidth = Math.max(w, 1);
        const effectiveHeight = Math.max(h, 1);
        return {
            viewBox: `${bounds.minX} ${bounds.minY} ${effectiveWidth} ${effectiveHeight}`,
            width: Math.round(effectiveWidth), // Use rounded width/height for canvas
            height: Math.round(effectiveHeight)
        };
    }, [bounds]);


    // --- Generate SVG String ---
    const svgString = useMemo(() => {
        // Pass width and height to ensure SVG size matches canvas target
        return generateSvgString(strokesToRender, viewBox, width, height);
    }, [strokesToRender, viewBox, width, height]);

    // --- Effect for SVG to PNG Conversion ---
    useEffect(() => {
        if (!svgString || !canvasRef.current || !width || !height || strokesToRender.length === 0) {
             // If no strokes, clear the image
             if (strokesToRender.length === 0) setPngImageSrc(null);
             return;
        }

        setIsConverting(true);
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error("Failed to get canvas context");
            setIsConverting(false);
            return;
        }

        // Set canvas dimensions based on calculated bounds
        canvas.width = width;
        canvas.height = height;

        const img = new Image();
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear previous drawing
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(url);
            const pngUrl = canvas.toDataURL('image/png');
            setPngImageSrc(pngUrl);
            setIsConverting(false);
            console.log("[MirrorPage] SVG to PNG conversion successful.");
        };

        img.onerror = (error) => {
            console.error("Error loading SVG image for canvas conversion:", error);
            URL.revokeObjectURL(url);
            setIsConverting(false);
            setPngImageSrc(null); // Clear image on error
        };

        img.src = url;

        // Cleanup function for the effect
        return () => {
            img.onload = null; // Prevent callbacks on unmounted component
            img.onerror = null;
            URL.revokeObjectURL(url); // Revoke URL if component unmounts before load/error
        };

    }, [svgString, width, height, strokesToRender.length]); // Depend on svgString and dimensions

    // --- Download Handlers ---
    const handleDownloadSvg = useCallback(() => {
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'drawing.svg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [svgString]);

    const handleDownloadPng = useCallback(() => {
        if (!pngImageSrc) return;
        const a = document.createElement('a');
        a.href = pngImageSrc;
        a.download = 'drawing.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }, [pngImageSrc]);


    // --- Render ---
    return (
        <div className="flex flex-col items-center justify-center p-4 bg-primary-dark min-h-screen font-sans">
            {/* Hidden canvas for rendering */}
            <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>

            <h1 className="text-3xl font-bold mb-6 text-gray-100">Mirror View</h1>
            {/* Container for the Image */}
            <div className="w-full max-w-4xl aspect-[4/3] bg-white rounded-lg shadow-xl overflow-hidden border border-gray-300 mb-4 flex items-center justify-center relative">
                {isConverting && (
                    <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
                        <p className="text-gray-700">Converting to PNG...</p>
                        {/* Optional: Add a spinner here */}
                    </div>
                )}
                {pngImageSrc ? (
                    <img
                        src={pngImageSrc}
                        alt="Drawing Mirror"
                        className="w-full h-full object-contain"
                    />
                ) : (
                     <div className="flex items-center justify-center w-full h-full bg-gray-50">
                         <p className="text-gray-500 font-medium">
                             {strokesToRender.length > 0 ? 'Generating image...' : 'Waiting for drawing...'}
                         </p>
                     </div>
                )}
            </div>

            {/* Download Buttons */}
            <div className="flex space-x-4">
                 <button
                    onClick={handleDownloadPng}
                    disabled={!pngImageSrc || isConverting}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition duration-150 ease-in-out"
                >
                    Download PNG
                </button>
                <button
                    onClick={handleDownloadSvg}
                    disabled={strokesToRender.length === 0 || isConverting}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition duration-150 ease-in-out"
                >
                    Download SVG
                </button>
            </div>

             <p className="mt-4 text-sm text-gray-400 italic">
                Mirror view updates automatically. Right-click the image to copy.
            </p>
        </div>
    );
}

export default MirrorPage;