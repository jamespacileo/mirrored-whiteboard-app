// client/src/pages/DrawPage.tsx
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { ReactSketchCanvas, ReactSketchCanvasRef, CanvasPath } from 'react-sketch-canvas';

const LOCAL_STORAGE_KEY = 'whiteboard-data'; // Key for localStorage
const CROP_MARGIN = 20; // Pixels margin around the drawing for cropping

// --- Presets Definition ---
const COLOR_PRESETS = ['#000000', '#FF0000', '#0000FF', '#00FF00', '#FFFF00', '#808080']; // Black, Red, Blue, Green, Yellow, Gray
const SIZE_PRESETS = [2, 5, 10, 20]; // Fine, Medium, Thick, Extra Thick

// --- Debounce Function ---
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: number | undefined;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// --- Bounding Box Calculation ---
function getPathsBoundingBox(paths: CanvasPath[], canvasWidth: number, canvasHeight: number): { minX: number; minY: number; maxX: number; maxY: number } | null {
    if (!paths || paths.length === 0) {
        return null;
    }
    let minX = canvasWidth, minY = canvasHeight, maxX = 0, maxY = 0;
    let hasPoints = false;
    paths.forEach(path => {
        path.paths.forEach(point => {
            hasPoints = true;
            minX = Math.min(minX, point.x); minY = Math.min(minY, point.y);
            maxX = Math.max(maxX, point.x); maxY = Math.max(maxY, point.y);
        });
    });
    return hasPoints ? { minX, minY, maxX, maxY } : null;
}

function DrawPage() {
    const canvasRef = useRef<ReactSketchCanvasRef>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // State for drawing properties - separate color and size
    const [selectedColor, setSelectedColor] = useState(COLOR_PRESETS[0]);
    const [selectedLineWidth, setSelectedLineWidth] = useState(SIZE_PRESETS[1]); // Default to medium

    const [currentPaths, setCurrentPaths] = useState<CanvasPath[]>([]);
    const [canvasDimensions, setCanvasDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

    // Update dimensions on resize
    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                setCanvasDimensions({ width: containerRef.current.offsetWidth, height: containerRef.current.offsetHeight });
            } else {
                 setCanvasDimensions({ width: window.innerWidth, height: window.innerHeight });
            }
        };
        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    // --- Debounced Export and Cropping Logic ---
    const exportAndUpdateStorage = useCallback(debounce(async (pathsToExport: CanvasPath[]) => {
        if (!canvasRef.current) return;
        const { width: currentCanvasWidth, height: currentCanvasHeight } = canvasDimensions;
        const bbox = getPathsBoundingBox(pathsToExport, currentCanvasWidth, currentCanvasHeight);
        let dataToStore: string;

        if (!bbox) {
            dataToStore = JSON.stringify({ type: 'clear' });
        } else {
            let cropX = Math.max(0, bbox.minX - CROP_MARGIN);
            let cropY = Math.max(0, bbox.minY - CROP_MARGIN);
            let cropMaxX = Math.min(currentCanvasWidth, bbox.maxX + CROP_MARGIN);
            let cropMaxY = Math.min(currentCanvasHeight, bbox.maxY + CROP_MARGIN);
            let cropWidth = cropMaxX - cropX;
            let cropHeight = cropMaxY - cropY;

            if (cropWidth <= 0 || cropHeight <= 0) {
                 dataToStore = JSON.stringify({ type: 'clear' });
            } else {
                try {
                    const fullDataUrl = await canvasRef.current.exportImage('png');
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = cropWidth; tempCanvas.height = cropHeight;
                    const tempCtx = tempCanvas.getContext('2d');
                    if (!tempCtx) throw new Error("Could not get temporary canvas context");

                    const img = new Image();
                    await new Promise<void>((resolve, reject) => {
                        img.onload = () => {
                            tempCtx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
                            resolve();
                        };
                        img.onerror = reject;
                        img.src = fullDataUrl;
                    });
                    const croppedDataUrl = tempCanvas.toDataURL('image/png');
                    dataToStore = JSON.stringify({ type: 'update', dataUrl: croppedDataUrl });
                } catch (error) {
                    console.error("[DrawPage] Failed during cropping process:", error);
                    dataToStore = JSON.stringify({ type: 'clear' });
                }
            }
        }
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, dataToStore);
        } catch (error) {
            console.error("[DrawPage] Failed to save data to localStorage:", error);
        }
    }, 500), [canvasDimensions]);

    // Callback for when the canvas updates
    const handleCanvasChange = useCallback((paths: CanvasPath[]) => {
        setCurrentPaths(paths);
        exportAndUpdateStorage(paths);
    }, [exportAndUpdateStorage]);

    // Function to clear the canvas
    const handleClear = useCallback(() => {
        canvasRef.current?.clearCanvas();
        setCurrentPaths([]);
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ type: 'clear' }));
        } catch (error) {
            console.error("[DrawPage] Failed to save clear state to localStorage:", error);
        }
    }, []);

    // --- Render ---
    return (
        <div
            ref={containerRef}
            style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', background: '#eee' }}
        >
            {/* --- Overlay Controls Panel --- */}
            <div style={{
                position: 'absolute', top: '15px', right: '15px', zIndex: 10,
                background: '#FFFFFF', padding: '12px', borderRadius: '8px', // Changed background to opaque white
                boxShadow: '0 3px 6px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', gap: '10px'
            }}>
                {/* Color Presets */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                    {COLOR_PRESETS.map((color) => (
                        <button
                            key={color}
                            onClick={() => setSelectedColor(color)}
                            title={`Color: ${color}`}
                            style={{
                                width: '28px', height: '28px', borderRadius: '50%',
                                backgroundColor: color, cursor: 'pointer', padding: 0,
                                border: selectedColor === color ? '3px solid #555' : '1px solid #ccc',
                                boxShadow: selectedColor === color ? '0 0 5px rgba(0,0,0,0.3)' : 'none',
                                transition: 'border 0.2s, box-shadow 0.2s',
                            }}
                        />
                    ))}
                </div>
                {/* Size Presets */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                    {SIZE_PRESETS.map((size) => (
                        <button
                            key={size}
                            onClick={() => setSelectedLineWidth(size)}
                            title={`Line width: ${size}px`}
                            style={{
                                padding: '5px 10px', minWidth: '40px', textAlign: 'center',
                                border: selectedLineWidth === size ? '2px solid #555' : '1px solid #ccc',
                                borderRadius: '4px', cursor: 'pointer',
                                background: selectedLineWidth === size ? '#e0e0e0' : 'white',
                                fontWeight: selectedLineWidth === size ? 'bold' : 'normal',
                                transition: 'background 0.2s, border 0.2s, font-weight 0.2s',
                            }}
                        >
                            {size}px
                        </button>
                    ))}
                </div>
                 {/* Clear Button */}
                 <button
                    onClick={handleClear}
                    style={{
                        marginTop: '5px', padding: '8px 10px', border: '1px solid #ccc',
                        borderRadius: '4px', background: 'white', cursor: 'pointer',
                        fontSize: '0.9em', fontWeight: 'bold', color: '#d9534f', // Reddish color for clear
                        borderTop: '1px solid #eee', paddingTop: '10px'
                    }}
                 >
                    Clear All
                 </button>
            </div>

            {/* --- Drawing Canvas --- */}
            <ReactSketchCanvas
                ref={canvasRef}
                width="100%" height="100%"
                strokeWidth={selectedLineWidth} // Use selected size
                strokeColor={selectedColor} // Use selected color
                canvasColor="white"
                style={{ display: 'block' }}
                onChange={handleCanvasChange}
            />
        </div>
    );
}

export default DrawPage;