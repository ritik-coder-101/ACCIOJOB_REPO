// components/LivePreviewModal.tsx
'use client'

import React, { useEffect, useRef } from 'react';

interface LivePreviewModalProps {
  show: boolean; // Controls whether the modal is visible
  onClose: () => void; // Function to call when the modal needs to be closed
  codeToRender: { jsx: string; css: string } | null; // The code snippet to render
}

export default function LivePreviewModal({ show, onClose, codeToRender }: LivePreviewModalProps) {
  // If 'show' is false, don't render anything (modal is hidden)
  const iframeRef = useRef<HTMLIFrameElement>(null);

 useEffect(() => {
  if (!iframeRef.current || !codeToRender) return;

  const iframe = iframeRef.current;

  const sendMessage = () => {
    iframe.contentWindow?.postMessage(
      { type: 'RENDER_CODE', code: codeToRender },
      window.location.origin
    );
  };

  // Wait for iframe to load (only needed first time)
  const onLoad = () => {
    sendMessage();
  };

  iframe.addEventListener('load', onLoad);

  // If iframe is already loaded (cached), send right away after short delay
  const fallbackTimer = setTimeout(sendMessage, 200);

  return () => {
    iframe.removeEventListener('load', onLoad);
    clearTimeout(fallbackTimer);
  };
}, [codeToRender]);


  if (!show) {
    return null;
  }
  return (
    // Modal Overlay
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      {/* Modal Content Box */}
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Live Component Preview</h2>
          <button
            onClick={onClose} // Call onClose prop to close the modal
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold leading-none"
            aria-label="Close"
          >
            &times; {/* HTML entity for 'x' character */}
          </button>
        </div>

        {/* Live Preview Iframe Area */}
        <div className="flex-grow p-4 bg-gray-100 flex items-center justify-center relative">
          <iframe
            id="modal-component-preview-iframe" // Unique ID for this iframe
            title="Component Live Preview"
            sandbox="allow-scripts allow-same-origin"
            className="w-full h-full border-none rounded"
            src="/preview-frame.html" // Loads your dedicated HTML file
            ref={iframeRef} // <-- Attach the ref here
          ></iframe>
        </div>

      </div>
    </div>
  );
}