// components/LivePreviewModal.tsx
'use client'

import React, { useEffect, useRef, useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';

interface LivePreviewModalProps {
  show: boolean; 
  onClose: () => void; 
  codeToRender: { jsx?: string; css?: string; html?: string } | null;
}

export default function LivePreviewModal({ show, onClose, codeToRender }: LivePreviewModalProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [copyFeedback, setCopyFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<'jsx' | 'css' | 'html'>('jsx');

  const NO_JSX_CODE = '// No JSX generated for this prompt.';
  const NO_CSS_CODE = '/* No CSS generated for this prompt. */';
  const NO_HTML_CODE = ''; 

  useEffect(() => {
    if (show && iframeRef.current && codeToRender) {
      const iframe = iframeRef.current;

      const sendMessage = () => {
        iframe.contentWindow?.postMessage(
          {
            type: 'RENDER_CODE',
            code: {
              jsx: codeToRender.jsx,
              css: codeToRender.css,
              html: codeToRender.html,
            }
          },
          window.location.origin
        );
        console.log('Sent code to iframe:', codeToRender);
      };

      const onLoad = () => { sendMessage(); };
      iframe.addEventListener('load', onLoad);
      const fallbackTimer = setTimeout(sendMessage, 200);

      return () => {
        iframe.removeEventListener('load', onLoad);
        clearTimeout(fallbackTimer);
      };
    }
  }, [show, codeToRender]);

  useEffect(() => {
    if (copyFeedback) {
      const timer = setTimeout(() => {
        setCopyFeedback(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [copyFeedback]);

  const copyToClipboard = async (text: string | undefined, label: string) => {
    if (!text || text.trim() === '') {
      setCopyFeedback({ message: `No ${label} code to copy.`, type: 'error' });
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback({ message: `${label} copied to clipboard successfully!`, type: 'success' });
    } catch (err) {
      console.error(`Failed to copy ${label}:`, err);
      setCopyFeedback({ message: `Failed to copy ${label}. Please try again.`, type: 'error' });
    }
  };

  const downloadZip = async () => {
    if (!codeToRender || (!codeToRender.jsx && !codeToRender.css && !codeToRender.html)) {
      alert('No code to download!');
      return;
    }

    const zip = new JSZip();
    let hasContent = false;
    let baseFileName = 'component';

    if (codeToRender.jsx && codeToRender.jsx.trim() !== NO_JSX_CODE) {
      const nameMatch = codeToRender.jsx.match(/(function|class)\s+(\w+)\s*(\(|extends)/);
      if (nameMatch && nameMatch[2]) { baseFileName = nameMatch[2]; } else { baseFileName = 'GeneratedComponent'; }
      zip.file(`${baseFileName}.jsx`, codeToRender.jsx);
      hasContent = true;
    }

    if (codeToRender.css && codeToRender.css.trim() !== NO_CSS_CODE) {
      zip.file(`${baseFileName}.css`, codeToRender.css);
      hasContent = true;
    }

    if (codeToRender.html && codeToRender.html.trim() !== NO_HTML_CODE) {
      if (!codeToRender.jsx && !codeToRender.css) { zip.file(`index.html`, codeToRender.html); }
      else { zip.file(`${baseFileName}.html`, codeToRender.html); }
      hasContent = true;
    }

    if (!hasContent) {
      alert('No actual code content to download!');
      return;
    }

    zip.generateAsync({ type: 'blob' })
      .then(function (content) {
        saveAs(content, `${baseFileName}.zip`);
      })
      .catch(err => {
        console.error('Error generating zip:', err);
        alert('Failed to generate zip file. See console for details.');
      });
  };

  if (!show) {
    return null;
  }

  const hasActualCode = codeToRender && (
    (codeToRender.jsx && codeToRender.jsx.trim() !== NO_JSX_CODE) ||
    (codeToRender.css && codeToRender.css.trim() !== NO_CSS_CODE) ||
    (codeToRender.html && codeToRender.html.trim() !== NO_HTML_CODE)
  );

  

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Live Component Preview</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="flex-grow p-4 bg-gray-100 flex items-center justify-center relative overflow-hidden">
          <iframe
            id="modal-component-preview-iframe"
            title="Component Live Preview"
            sandbox="allow-scripts allow-same-origin"
            className="w-full h-full border-none rounded"
            src="/preview-frame.html"
            ref={iframeRef}
          ></iframe>
        </div>

        <div className="p-4 border-t border-gray-200 flex flex-col" style={{ flexBasis: '40%', minHeight: '200px' }}>
            {hasActualCode ? (
                <>
                    
                    <div className="flex border-b border-gray-200 mb-3  h-12 w-full">
                        {codeToRender?.jsx && codeToRender.jsx.trim() !== NO_JSX_CODE && (
                            <button
                                onClick={() => setActiveTab('jsx')}
                                className={`px-4 py-2 text-sm font-medium text-black ${ 
                                    activeTab === 'jsx' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600 hover:text-gray-800'
                                }`}
                            >
                                JSX
                            </button>
                        )}
                        {codeToRender?.css && codeToRender.css.trim() !== NO_CSS_CODE && (
                            <button
                                onClick={() => setActiveTab('css')}
                                className={`px-4 py-2 text-sm font-medium  text-black ${
                                    activeTab === 'css' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600 hover:text-gray-800'
                                }`}
                            >
                                CSS
                            </button>
                        )}
                        {codeToRender?.html && codeToRender.html.trim() !== NO_HTML_CODE && (
                            <button
                                onClick={() => setActiveTab('html')}
                                className={`px-4 py-2 text-sm font-medium  text-black ${ 
                                    activeTab === 'html' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600 hover:text-gray-800'
                                }`}
                            >
                                HTML
                            </button>
                        )}
                    </div>
                    
                    <div className="flex-grow bg-gray-800 rounded-lg overflow-auto text-white p-3 text-sm" style={{ minHeight: '100px' }}>
                        <SyntaxHighlighter
                            style={vscDarkPlus}
                            language={activeTab === 'jsx' ? 'jsx' : activeTab === 'css' ? 'css' : 'html'}
                            showLineNumbers={true}
                            wrapLines={true}
                            customStyle={{ background: 'transparent', padding: '0', margin: '0' }}
                        >
                            {activeTab === 'jsx' ? (codeToRender?.jsx || '') :
                             activeTab === 'css' ? (codeToRender?.css || '') :
                             (codeToRender?.html || '')}
                        </SyntaxHighlighter>
                    </div>
                </>
            ) : (
                <div className="flex-grow flex items-center justify-center text-gray-500 text-sm py-4">
                    <p>No code available to display for this session.</p>
                </div>
            )}
            <div className="mt-3 flex justify-end gap-2">
                {codeToRender?.jsx && codeToRender.jsx.trim() !== NO_JSX_CODE && (
                    <button
                        onClick={() => copyToClipboard(codeToRender.jsx, 'JSX')}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!hasActualCode}
                    >
                        Copy JSX
                    </button>
                )}
                {codeToRender?.css && codeToRender.css.trim() !== NO_CSS_CODE && (
                    <button
                        onClick={() => copyToClipboard(codeToRender.css, 'CSS')}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!hasActualCode}
                    >
                        Copy CSS
                    </button>
                )}
                {codeToRender?.html && codeToRender.html.trim() !== NO_HTML_CODE && (
                    <button
                        onClick={() => copyToClipboard(codeToRender.html, 'HTML')}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!hasActualCode}
                    >
                        Copy HTML
                    </button>
                )}
                <button
                    onClick={downloadZip}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!hasActualCode}
                >
                    Download All (.zip)
                </button>
            </div>
        </div>
        {copyFeedback && (
          <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 p-3 rounded-lg shadow-lg text-white font-semibold transition-all duration-300 transform ${
            copyFeedback.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          }`}>
            {copyFeedback.message}
          </div>
        )}
      </div>
    </div>
  );
}