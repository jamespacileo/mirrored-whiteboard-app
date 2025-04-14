// client/src/pages/DrawPage.tsx
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { getStroke } from 'perfect-freehand';
import { getSvgPathFromStroke } from '../utils/getSvgPathFromStroke.ts';

// --- Constants and Types ---
const LOCAL_STORAGE_KEY = 'whiteboard-data';
interface Point { x: number; y: number; pressure?: number }
interface Stroke { id: number; points: Point[]; color: string; size: number; pathData: string; }

// --- Presets Definition ---
const COLOR_PRESETS = [
  '#000000', // Black
  '#FFFFFF', // White
  '#FF0000', // Red
  '#FF4500', // Orange Red
  '#FFA500', // Orange
  '#FFFF00', // Yellow
  '#00FF00', // Green
  '#008000', // Dark Green
  '#00FFFF', // Cyan
  '#0000FF', // Blue
  '#4B0082', // Indigo
  '#800080', // Purple
  '#FF00FF', // Magenta
  '#FFC0CB', // Pink
  '#A52A2A', // Brown
  '#808080', // Gray
];

const SIZE_PRESETS = [1, 2, 4, 6, 10, 16, 24];

// --- perfect-freehand Options ---
const freehandOptions = {
  // size is dynamic based on selectedSize
  thinning: 0.6,
  smoothing: 0.5,
  streamline: 0.5,
  start: { taper: 0, cap: true },
  end: { taper: 0, cap: true },
};

// --- Debounce Function ---
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: number | undefined;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => { clearTimeout(timeout); func(...args); };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function DrawPage() {
    // State for drawing properties
    const [selectedColor, setSelectedColor] = useState(COLOR_PRESETS[0]);
    const [selectedSize, setSelectedSize] = useState(SIZE_PRESETS[2]);
    const [isEraser, setIsEraser] = useState(false);
    const svgRef = useRef<SVGSVGElement>(null);

    // State for strokes
    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
    const isDrawingRef = useRef(false);
    
    // Use eraser or selected color
    const activeColor = isEraser ? '#FFFFFF' : selectedColor;

    // --- Load strokes from localStorage on mount ---
    useEffect(() => {
        try {
            const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (savedData) {
                const parsed = JSON.parse(savedData);
                if (parsed.type === 'update' && Array.isArray(parsed.strokes)) {
                    // Process and restore strokes with pathData
                    const restoredStrokes = parsed.strokes.map((s: any) => {
                        const strokeOutlinePoints = getStroke(s.points, {
                            ...freehandOptions,
                            size: s.size,
                        });
                        return {
                            ...s,
                            pathData: getSvgPathFromStroke(strokeOutlinePoints),
                        };
                    });
                    setStrokes(restoredStrokes);
                    console.log("[DrawPage] Loaded strokes from localStorage:", restoredStrokes.length);
                }
            }
        } catch (error) {
            console.error("[DrawPage] Failed to load strokes from localStorage:", error);
        }
    }, []);

    // --- Debounced Update for localStorage ---
    const updateLocalStorage = useCallback(debounce((strokesToSave: Stroke[]) => {
        try {
            const storableStrokes = strokesToSave.map(s => ({
                id: s.id, points: s.points, color: s.color, size: s.size,
            }));
            const dataToStore = JSON.stringify({ type: 'update', strokes: storableStrokes });
            localStorage.setItem(LOCAL_STORAGE_KEY, dataToStore);
        } catch (error) {
            console.error("[DrawPage] Failed to save strokes to localStorage:", error);
        }
    }, 500), []);

    // --- Get Point using clientX/clientY for better accuracy ---
    const getPoint = (e: React.PointerEvent<SVGSVGElement>): Point => {
        if (!svgRef.current) return { x: e.clientX, y: e.clientY, pressure: e.pressure };
        
        // Get point in SVG coordinates
        const svgRect = svgRef.current.getBoundingClientRect();
        const point = {
            x: e.clientX - svgRect.left,
            y: e.clientY - svgRect.top,
            pressure: e.pressure
        };
        return point;
    };

    // --- Pointer Event Handlers ---
    const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
        isDrawingRef.current = true;
        const point = getPoint(e);
        e.currentTarget.setPointerCapture(e.pointerId);
        setCurrentPoints([point]);
    };

    const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
        if (!isDrawingRef.current) return;
        const point = getPoint(e);
        setCurrentPoints(prev => [...prev, point]);
    };

    const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
        if (!isDrawingRef.current) return;
        isDrawingRef.current = false;

        if (currentPoints.length < 2) {
            setCurrentPoints([]);
            return;
        }

        const strokeOutlinePoints = getStroke(currentPoints, {
            ...freehandOptions,
            size: selectedSize,
        });
        
        const pathData = getSvgPathFromStroke(strokeOutlinePoints);

        const newStroke: Stroke = {
            id: Date.now(),
            points: currentPoints,
            color: activeColor,
            size: selectedSize,
            pathData: pathData,
        };

        setStrokes(prevStrokes => {
            const updatedStrokes = [...prevStrokes, newStroke];
            updateLocalStorage(updatedStrokes);
            return updatedStrokes;
        });

        setCurrentPoints([]);
    };

    // --- Clear Canvas ---
    const handleClear = useCallback(() => {
        setStrokes([]);
        setCurrentPoints([]);
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ type: 'clear' }));
        } catch (error) {
            console.error("[DrawPage] Failed to save clear state to localStorage:", error);
        }
    }, []);

    // --- Undo Last Stroke ---
    const handleUndo = useCallback(() => {
        setStrokes(prevStrokes => {
            if (prevStrokes.length === 0) return prevStrokes;
            
            const updatedStrokes = prevStrokes.slice(0, -1);
            updateLocalStorage(updatedStrokes);
            return updatedStrokes;
        });
    }, [updateLocalStorage]);

    // --- Toggle Eraser ---
    const toggleEraser = useCallback(() => {
        setIsEraser(prev => !prev);
    }, []);

    // --- Memoized SVG Path for Current Drawing Stroke ---
    const currentDrawingPath = useMemo(() => {
        if (currentPoints.length < 2) return null;
        const strokeOutlinePoints = getStroke(currentPoints, {
            ...freehandOptions,
            size: selectedSize,
        });
        return getSvgPathFromStroke(strokeOutlinePoints);
    }, [currentPoints, selectedSize]);

    // --- Render ---
    return (
        <div className="fixed inset-0 w-screen h-screen bg-white overflow-hidden">
            {/* Main Content Area with Drawing Surface */}
            <div className="relative flex-grow w-screen h-screen overflow-hidden">
                {/* SVG Drawing Canvas */}
                <svg
                    ref={svgRef}
                    className="absolute top-0 left-0 w-screen h-screen"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    style={{ touchAction: 'none' }}
                >
                    {/* Define dot grid pattern */}
                    <defs>
                        <pattern id="dotGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                            <circle cx="10" cy="10" r="1" fill="#AAAAAA" />
                        </pattern>
                    </defs>
                    
                    {/* Dot grid background */}
                    <rect width="100%" height="100%" fill="url(#dotGrid)" />
                    
                    {/* Render completed strokes */}
                    {strokes.map((stroke) => (
                        <path 
                            key={stroke.id} 
                            d={stroke.pathData} 
                            fill={stroke.color} 
                        />
                    ))}
                    
                    {/* Render the current drawing stroke */}
                    {currentDrawingPath && (
                        <path 
                            d={currentDrawingPath} 
                            fill={activeColor}
                        />
                    )}
                </svg>

                {/* Control Panel - Fixed to the top right corner */}
                <div className="fixed top-10 left-10 bg-white shadow-lg rounded-lg p-3 z-50">
                    <div className="mb-3">
                        <div className="font-medium text-sm mb-2">Tools</div>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={toggleEraser}
                                title={isEraser ? "Switch to drawing" : "Switch to eraser"}
                                className={`p-2 rounded ${isEraser ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M8.086 2.207a2 2 0 0 1 2.828 0l3.879 3.879a2 2 0 0 1 0 2.828l-5.5 5.5A2 2 0 0 1 7.879 15H5.12a2 2 0 0 1-1.414-.586l-2.5-2.5a2 2 0 0 1 0-2.828l6.879-6.879zm.66 11.34L3.453 8.254 1.914 9.793a1 1 0 0 0 0 1.414l2.5 2.5a1 1 0 0 0 .707.293H7.88a1 1 0 0 0 .707-.293l.16-.16z"/>
                                </svg>
                            </button>
                            <button
                                onClick={handleUndo}
                                title="Undo last stroke"
                                className="p-2 bg-gray-200 rounded"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                    <path fillRule="evenodd" d="M8 3a5 5 0 1 1-4.546 2.914.5.5 0 0 0-.908-.417A6 6 0 1 0 8 2v1z"/>
                                    <path d="M8 4.466V.534a.25.25 0 0 0-.41-.192L5.23 2.308a.25.25 0 0 0 0 .384l2.36 1.966A.25.25 0 0 0 8 4.466z"/>
                                </svg>
                            </button>
                            <button
                                onClick={handleClear}
                                title="Clear canvas"
                                className="p-2 bg-red-100 text-red-600 rounded"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M11 1.5v1h3.5a.5.5 0 0 1 0 1h-.538l-.853 10.66A2 2 0 0 1 11.115 16h-6.23a2 2 0 0 1-1.994-1.84L2.038 3.5H1.5a.5.5 0 0 1 0-1H5v-1A1.5 1.5 0 0 1 6.5 0h3A1.5 1.5 0 0 1 11 1.5Zm-5 0v1h4v-1a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5ZM4.5 5.029l.5 8.5a.5.5 0 1 0 .998-.06l-.5-8.5a.5.5 0 1 0-.998.06Zm6.53-.528a.5.5 0 0 0-.528.47l-.5 8.5a.5.5 0 0 0 .998.058l.5-8.5a.5.5 0 0 0-.47-.528ZM8 4.5a.5.5 0 0 0-.5.5v8.5a.5.5 0 0 0 1 0V5a.5.5 0 0 0-.5-.5Z"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    
                    <div className="mb-3">
                        <div className="font-medium text-sm mb-2">Size</div>
                        <div className="grid grid-cols-4 gap-1">
                            {SIZE_PRESETS.map((size) => (
                                <button
                                    key={size}
                                    onClick={() => setSelectedSize(size)}
                                    className={`w-8 h-8 flex items-center justify-center rounded ${
                                        selectedSize === size ? 'bg-blue-100 border-2 border-blue-500' : 'bg-gray-100'
                                    }`}
                                >
                                    <div 
                                        className="rounded-full bg-black" 
                                        style={{ 
                                            width: Math.max(2, Math.min(size * 0.8, 16)) + 'px',
                                            height: Math.max(2, Math.min(size * 0.8, 16)) + 'px'
                                        }} 
                                    />
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div>
                        <div className="font-medium text-sm mb-2">Colors</div>
                        <div className="grid grid-cols-4 gap-1">
                            {COLOR_PRESETS.map((color) => (
                                <button
                                    key={color}
                                    onClick={() => {
                                        setSelectedColor(color);
                                        setIsEraser(false);
                                    }}
                                    className={`w-8 h-8 rounded border ${
                                        selectedColor === color && !isEraser 
                                            ? 'border-2 border-blue-500 scale-110' 
                                            : color === '#FFFFFF' ? 'border-gray-300' : 'border-transparent'
                                    }`}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default DrawPage;