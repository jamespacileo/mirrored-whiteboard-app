// client/src/pages/DrawPage.tsx
import React, { useRef, useState, useCallback } from 'react';
import { ReactSketchCanvas, ReactSketchCanvasRef } from 'react-sketch-canvas';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const LOCAL_STORAGE_KEY = 'whiteboard-data'; // Key for localStorage

// Debounce function
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


function DrawPage() {
    const canvasRef = useRef<ReactSketchCanvasRef>(null);
    const [color, setColor] = useState('#000000');
    const [lineWidth, setLineWidth] = useState(3);

    // Debounced function to export image and save to localStorage
    const exportAndUpdateStorage = useCallback(debounce(async () => {
        if (!canvasRef.current) return;
        try {
            const dataUrl = await canvasRef.current.exportImage('png');
            // console.log("[DrawPage] Saving data URL to localStorage:", dataUrl.substring(0, 50) + "...");
            const dataToStore = JSON.stringify({ type: 'update', dataUrl: dataUrl });
            localStorage.setItem(LOCAL_STORAGE_KEY, dataToStore);
        } catch (error) {
            console.error("[DrawPage] Failed to export image or save to localStorage:", error);
        }
    }, 250), []); // Debounce by 250ms

    // Callback for when the canvas updates (drawing occurs)
    // Now triggers the debounced export function
    const handleCanvasChange = useCallback(() => {
        exportAndUpdateStorage();
    }, [exportAndUpdateStorage]);

    // Function to clear the canvas and notify mirror page
    const handleClear = useCallback(() => {
        canvasRef.current?.clearCanvas();
        // Send a clear signal via localStorage
        try {
            // Store null or an empty string for dataUrl to indicate cleared state
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ type: 'clear' }));
            console.log("[DrawPage] Clear signal sent to localStorage.");
        } catch (error) {
            console.error("[DrawPage] Failed to save clear state to localStorage:", error);
        }
    }, []);

    // --- Render ---
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px' }}>
            <h1>Drawing Pad</h1>
            <div style={{ marginBottom: '10px', display: 'flex', gap: '15px', alignItems: 'center', border: '1px solid #ccc', padding: '5px' }}>
                 <label>Color: <input type="color" value={color} onChange={(e) => setColor(e.target.value)} /></label>
                 <label>Width: <input type="range" min="1" max="50" value={lineWidth} onChange={(e) => setLineWidth(Number(e.target.value))} /></label>
                 <span>{lineWidth}px</span>
                 <button onClick={handleClear}>Clear</button>
                 {/* Add Undo/Redo buttons if desired */}
                 {/* <button onClick={() => canvasRef.current?.undo()}>Undo</button> */}
                 {/* <button onClick={() => canvasRef.current?.redo()}>Redo</button> */}
            </div>
            <ReactSketchCanvas
                ref={canvasRef}
                width={`${CANVAS_WIDTH}px`}
                height={`${CANVAS_HEIGHT}px`}
                strokeWidth={lineWidth}
                strokeColor={color}
                canvasColor="white" // Explicitly set background
                style={{ border: '1px solid black' }}
                onChange={handleCanvasChange} // Use the callback here
            />
        </div>
    );
}

export default DrawPage;