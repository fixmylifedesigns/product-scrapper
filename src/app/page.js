// src/app/page.js
"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

const TestSection = () => {
  const downloadTemplate = () => {
    const csvContent =
      "url\nhttps://www.amazon.com/dp/B0BPSGJN7T\nhttps://www.amazon.com/dp/B09B8DQ26F";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "amazon_urls_template.csv";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="mb-8 space-y-6">
      <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
        <h2 className="text-lg font-semibold mb-4">How it works:</h2>

        <div className="space-y-6">
          {/* Step 1 */}
          <div className="flex items-start space-x-4">
            <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center flex-shrink-0">
              1
            </div>
            <div className="flex-1">
              <h3 className="font-medium mb-2">
                Download & Prepare URL Template
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                If you don&apos;t already have a CSV file with Amazon URLs.
                Download our template CSV and add your Amazon product URLs.
              </p>
              <button
                onClick={downloadTemplate}
                className="inline-flex items-center px-4 py-2 border border-blue-500 text-blue-500 rounded-md hover:bg-blue-50 transition-colors"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Download Template
              </button>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start space-x-4">
            <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center flex-shrink-0">
              2
            </div>
            <div className="flex-1">
              <h3 className="font-medium mb-2">Generate Shopify CSV</h3>
              <p className="text-sm text-gray-600">
                Upload your completed URL template above to generate a
                Shopify-compatible CSV with product data.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start space-x-4">
            <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center flex-shrink-0">
              3
            </div>
            <div className="flex-1">
              <h3 className="font-medium mb-2">Preview Generated Products</h3>
              <p className="text-sm text-gray-600 mb-3">
                Once generated, preview your products at the preview page to
                ensure everything looks correct.
              </p>
              <a
                href="/preview"
                className="inline-flex items-center px-4 py-2 border border-blue-500 text-blue-500 rounded-md hover:bg-blue-50 transition-colors"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                Visit Preview Page
              </a>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex items-start space-x-4">
            <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center flex-shrink-0">
              4
            </div>
            <div className="flex-1">
              <h3 className="font-medium mb-2">Import CSV To Shopify</h3>
              <p className="text-sm text-gray-600">
                Import the CSV file into your Shopify store
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Home() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (
      selectedFile &&
      (selectedFile.type === "text/csv" || selectedFile.name.endsWith(".csv"))
    ) {
      setFile(selectedFile);
      setError(null);
    } else {
      setError("Please select a valid CSV file");
      setFile(null);
    }
  };

  const downloadSampleCsv = () => {
    const csvContent = "url\nhttps://www.amazon.com/dp/B0BPSGJN7T";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "sample_amazon_urls.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const loadDemoCsv = () => {
    router.push("/preview?demo=true");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/process-csv", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to process CSV");
      }

      // Handle CSV download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "shopify_products.csv";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err.message || "An error occurred while processing the file");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-8">Amazon Product Scraper</h1>

        {/* How it works section
        <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded">
          <h2 className="font-semibold mb-2">How it works:</h2>
          <ol className="list-decimal ml-4 space-y-2 text-sm">
            <li>Upload a CSV file with Amazon product URLs</li>
            <li>The scraper will collect product information</li>
            <li>Download the Shopify-compatible CSV file</li>
            <li>Import the CSV file into your Shopify store</li>
          </ol>
        </div> */}

        {/* File upload form */}
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="flex flex-col gap-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <input
                type="file"
                accept=".csv"
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
              {loading ? "Processing..." : "Process CSV"}
            </button>
          </div>
        </form>

        {/* Test it out section */}
        <TestSection />
        {error && (
          <div className="p-4 mb-4 bg-red-50 border border-red-200 text-red-700 rounded">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
