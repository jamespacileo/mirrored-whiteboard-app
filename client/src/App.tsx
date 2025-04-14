// client/src/App.tsx
import { BrowserRouter, Route, Routes } from "react-router-dom";
import DrawPage from "./pages/DrawPage.tsx"; // Create this
import MirrorPage from "./pages/MirrorPage.tsx"; // Create this
import "./App.css"; // Or your main CSS file

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Optional: Add a simple index page to navigate */}
        <Route path="/" element={<IndexPage />} />
        <Route path="/draw" element={<DrawPage />} />
        <Route path="/mirror" element={<MirrorPage />} />
        {/* Keep other routes from the template if needed */}
      </Routes>
    </BrowserRouter>
  );
}

// Optional simple Index Page component within App.tsx or in its own file
function IndexPage() {
    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
            <h1>Whiteboard App</h1>
            <p><a href="/draw">Open Drawing Pad</a></p>
            <p><a href="/mirror">Open Mirror View</a></p>
        </div>
    );
}


export default App;