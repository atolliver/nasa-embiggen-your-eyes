// App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";

function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="absolute flex items-center space-x-3 top-4 right-4">
        <h1 className="text-m font-bold mb-4 mt-4">B[U]ILT & Boujee</h1>
        <img
          src="/assets/built-logo.png"
          alt="B[U]ILT Logo"
          width={50}
          height={50}
        />
      </div>

      <div className="text-center px-6">
        <h1 className="text-5xl font-bold mb-4">
          Welcome to B[U]ILT&apos;s Embiggen Your Eyes
        </h1>
        <p className="text-lg text-gray-300 mb-8 max-w-xl mx-auto">
          Explore the wonders of the universe through high-resolution NASA
          imagery. Zoom, discover, and get inspired.
        </p>

        <Link to="/explore" className="cta-button link-style-on-hover">
          Start Exploring
        </Link>
      </div>

      <div className="mt-12">
        <img
          src="/assets/nasa-hubble-pic.jpg"
          alt="Space view"
          width={600}
          height={400}
          className="rounded-2xl shadow-2xl"
        />
      </div>
    </main>
  );
}

function Explore() {
  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center">
      <h2 className="text-3xl font-semibold">Explore Page (placeholder)</h2>
    </main>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route index element={<Home />} />
        <Route path="/explore" element={<Explore />} />
      </Routes>
    </BrowserRouter>
  );
}
