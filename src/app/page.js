// src/app/page.js
'use client';
import { useState, useRef } from 'react';

export default function Home() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv'))) {
      setFile(selectedFile);
      setError(null);
    } else {
      setError('Please select a valid CSV file');
      setFile(null);
    }
  };

  const downloadSampleCsv = () => {
    const csvContent = 'url\nhttps://www.amazon.com/dp/B0BPSGJN7T\nhttps://www.amazon.com/dp/ANOTHER_ID';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'sample_amazon_urls.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/process-csv', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to process CSV');
      }

      // Handle CSV download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'shopify_products.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (err) {
      setError(err.message || 'An error occurred while processing the file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-8">Amazon to Shopify Product Scraper</h1>
        
        <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded">
          <h2 className="font-semibold mb-2">How it works:</h2>
          <ol className="list-decimal ml-4 space-y-2 text-sm">
            <li>Upload a CSV file with Amazon product URLs</li>
            <li>The scraper will collect product information from each URL</li>
            <li>A Shopify-compatible CSV file will be generated automatically</li>
            <li>Import the generated CSV file into your Shopify store</li>
          </ol>
          <div className="mt-4">
            <button
              onClick={downloadSampleCsv}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Download Sample Input CSV
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mb-8">
          <div className="flex flex-col gap-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
              />
            </div>
            
            <button
              type="submit"
              disabled={!file || loading}
              className="w-full md:w-auto px-6 py-3 bg-blue-500 text-white rounded shadow hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Processing Products...
                </span>
              ) : (
                'Generate Shopify CSV'
              )}
            </button>
          </div>
        </form>

        {error && (
          <div className="p-4 mb-4 bg-red-50 border border-red-200 text-red-700 rounded">
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}