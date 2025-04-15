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
    <div className="min-h-screen flex flex-col items-center justify-center bg-primary-dark font-sans p-4"> {/* Changed background */}
      <img src="/logo.png" alt="Mirrored Whiteboard Logo" className="w-100 h-100" /> 
      <div className="space-y-5 text-center"> {/* Increased spacing */}
        <p>
          <a href="/draw" target="_blank" rel="noopener noreferrer" className="text-xl text-blue-300 hover:text-blue-100 hover:underline transition duration-150 ease-in-out"> {/* Changed text color/size */}
            Open Drawing Pad
          </a>
        </p>
        <p>
          <a href="/mirror" target="_blank" rel="noopener noreferrer" className="text-xl text-blue-300 hover:text-blue-100 hover:underline transition duration-150 ease-in-out"> {/* Changed text color/size */}
            Open Mirror View
          </a>
        </p>
      </div>
    </div>
  );
}


export default App;