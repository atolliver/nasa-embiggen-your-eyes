'use client';
import React from 'react'
import { useState, useMemo } from 'react';
import Image from 'next/image';



// fake image
const FAKE_NASA_IMAGES = [
  {
    id: 1,
    title: 'Pillars of Creation',
    description: 'A stellar nursery in the Eagle Nebula, famous for star formation.',
    url: '/assets/nasa-hubble-pic.jpg',
    aspectRatio: 1.5,
  },
];

// imageviewer
const ImageViewer = ({ imageUrl, altText }: { imageUrl: string, altText: string }) => {
  //State for Zoom and Pan
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });

  //transform style
  const transformStyle = useMemo(() => ({
    transform: `scale(${zoomLevel}) translate(${panX}px, ${panY}px)`,
    transformOrigin: '0 0',
    cursor: isDragging ? 'grabbing' : zoomLevel > 1 ? 'grab' : 'default',
  }), [zoomLevel, panX, panY, isDragging]);

  //Enable dragging
  const handleMouseClick = (e: React.MouseEvent) => {
    if (isDragging) {
      setIsDragging(false);
    } else if (zoomLevel > 1) {
      setIsDragging(true);
      setLastPos({ x: e.clientX, y: e.clientY });
    }
  };

  //Handle drag
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - lastPos.x;
    const dy = e.clientY - lastPos.y;

    setPanX(prev => prev + dx / zoomLevel);
    setPanY(prev => prev + dy / zoomLevel);
    setLastPos({ x: e.clientX, y: e.clientY });
  };

  // Disable dragging
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const newZoom = Math.min(Math.max(1, zoomLevel + (e.deltaY * -0.005)), 5); //limit zoom
    setZoomLevel(newZoom);
    
    //reset pan
    if (newZoom === 1) {
        setPanX(0);
        setPanY(0);
    }
  };
  
  //zoom buttons
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(5, prev + 0.5));
  };
  
  const handleZoomOut = () => {
    const newZoom = Math.max(1, zoomLevel - 0.5);
    setZoomLevel(newZoom);
    if (newZoom === 1) {
        setPanX(0);
        setPanY(0);
    }
  };

  
  return (
    <div className="relative w-full h-[600px] bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
      
      {/* zoom*/}
      <div className="absolute top-4 right-4 z-10 flex space-x-2 bg-black bg-opacity-50 p-2 rounded-lg">
        <button 
            onClick={handleZoomIn} 
            className="text-white text-lg font-bold w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
            +
        </button>
        <button 
            onClick={handleZoomOut} 
            className="text-white text-lg font-bold w-8 h-8 rounded-full bg-red-600 hover:bg-red-700 transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-red-500"
        >
            -
        </button>
      </div>

     
      <div
        className="w-full h-full"
        onClick={handleMouseClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={transformStyle}
      >
        <Image
          src={imageUrl}
          alt={altText}
          layout="fill"
          objectFit="contain"
        />
      </div>
      
      {zoomLevel > 1 && (
        <div className="absolute bottom-4 left-4 bg-yellow-500 text-black px-3 py-1 rounded-full text-sm font-semibold shadow-xl z-10">
            Zoom: {zoomLevel.toFixed(1)}x (Drag to pan)
        </div>
      )}
    </div>
  );
};



export default function ExplorePage() {
  const [selectedImageId, setSelectedImageId] = useState(FAKE_NASA_IMAGES[0].id);

  const selectedImage = useMemo(
    () => FAKE_NASA_IMAGES.find(img => img.id === selectedImageId) || FAKE_NASA_IMAGES[0],
    [selectedImageId]
  );
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      
      {/* title*/}
      <div className="max-w-7xl mx-auto mb-8">
          <h1 className="text-4xl font-extrabold text-blue-400">Explore NASA Imagery</h1>
          <p className="text-gray-400 mt-2">Discover high-resolution wonders of space and zoom in on the details.</p>
      </div>
      
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* gallery */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-2xl font-semibold border-b border-gray-700 pb-2 mb-4">Gallery</h2>
          {FAKE_NASA_IMAGES.map((img) => (
            <div
              key={img.id}
              className={`
                p-3 rounded-lg transition-all duration-200 cursor-pointer 
                shadow-lg border-2 
                ${img.id === selectedImageId 
                    ? 'border-blue-500 bg-blue-900/50' 
                    : 'border-transparent hover:border-gray-500 hover:bg-gray-800'
                }
              `}
              onClick={() => setSelectedImageId(img.id)}
            >
              <h3 className="text-lg font-medium">{img.title}</h3>
              <p className="text-sm text-gray-400">{img.description}</p>
            </div>
          ))}
        </div>

        {/* main Image Viewer */}
        <div className="lg:col-span-3">
          <div className="mb-6">
            <h2 className="text-3xl font-bold mb-1 text-yellow-300">{selectedImage.title}</h2>
            <p className="text-gray-300">{selectedImage.description}</p>
          </div>
          <ImageViewer 
            imageUrl={selectedImage.url} 
            altText={selectedImage.title}
          />
          <p className="text-xs text-gray-500 mt-2">
            Use the scroll wheel to zoom, and click/drag to pan when zoomed in.
          </p>
        </div>
        
      </div>
      
      
      <div className="max-w-7xl mx-auto mt-12 text-center">
        <a 
          href="/" 
          className="cta-button link-style-on-hover text-blue-400"
        >
          &larr; Back to Home
        </a>
      </div>
    </div>
  );
}
