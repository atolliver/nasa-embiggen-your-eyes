import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App.jsx";

function Explore() {
  return (
    <main className="min-h-screen flex items-center justify-center text-white bg-black">
      <h2 className="text-3xl font-bold">Explore Page</h2>
    </main>
  );
}

const root = document.getElementById("root");
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/explore" element={<Explore />} />
        </Routes>
      </BrowserRouter>
    </React.StrictMode>
  );
}
