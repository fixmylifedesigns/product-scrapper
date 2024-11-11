"use client";
import { useState } from "react";
import Papa from "papaparse";

export default function PreviewStorefront() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const processCSVData = (data) => {
    const groupedProducts = {};
  
    data.forEach((row, index) => {
      const isMainProduct = row.Title && row.Handle;
  
      if (isMainProduct) {
        // Initialize the main product structure if it doesn’t exist
        if (!groupedProducts[row.Handle]) {
          groupedProducts[row.Handle] = {
            Handle: row.Handle,
            Title: row.Title,
            "Body (HTML)": row["Body (HTML)"] || "",
            Vendor: row.Vendor || "",
            "Product Category": row["Product Category"] || "",
            Type: row.Type || "",
            Tags: row.Tags || "",
            Published: row.Published || "",
            Status: row.Status || "",
            "Image Src": row["Image Src"] || "",
            "Image Alt Text": row["Image Alt Text"] || "",
            "SEO Title": row["SEO Title"] || "",
            "SEO Description": row["SEO Description"] || "",
            "Option1 Name": row["Option1 Name"] || "",
            "Option1 Value": row["Option1 Value"] || "",
            "Variant Price": row["Variant Price"] || "",
            "Variant Compare At Price": row["Variant Compare At Price"] || "",
            "Variant Inventory Qty": row["Variant Inventory Qty"] || "",
            variants: [],
            images: row["Image Src"]
              ? [
                  {
                    src: row["Image Src"],
                    alt: row["Image Alt Text"] || row.Title,
                  },
                ]
              : [],
          };
  
          // Add the first row's variant info as the primary variant
          groupedProducts[row.Handle].variants.push({
            option: row["Option1 Name"] || "",
            value: row["Option1 Value"] || "",
            sku: row["Variant SKU"] || "",
            price: row["Variant Price"] || "",
            compareAtPrice: row["Variant Compare At Price"] || "",
            inventory: row["Variant Inventory Qty"] || "",
            weight: row["Variant Grams"] || "",
            weightUnit: row["Variant Weight Unit"] || "",
          });
        }
      }
  
      const isVariantRow =
        row.Handle &&
        !row.Title &&
        !row["Image Src"] &&
        groupedProducts[row.Handle];
  
      const isImageRow =
        row.Handle && row["Image Src"] && !row.Title && !row["Option1 Value"];
  
      if (isVariantRow) {
        // Add variant details to the main product's variants array
        groupedProducts[row.Handle].variants.push({
          option: groupedProducts[row.Handle]["Option1 Name"],
          value: row["Option1 Value"] || "",
          sku: row["Variant SKU"] || "",
          price: row["Variant Price"] || "",
          compareAtPrice: row["Variant Compare At Price"] || "",
          inventory: row["Variant Inventory Qty"] || "",
          weight: row["Variant Grams"] || "",
          weightUnit: row["Variant Weight Unit"] || "",
        });
      } else if (isImageRow) {
        // Handle extra images
        groupedProducts[row.Handle].images.push({
          src: row["Image Src"],
          alt: row["Image Alt Text"] || groupedProducts[row.Handle].Title,
        });
      }
    });
  
    return Object.values(groupedProducts);
  };
  

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const text = await file.text();
      const result = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
        transform: (value) => value.trim(),
        complete: (results) => {
          console.log("Parse Results:", {
            rows: results.data.length,
            fields: results.meta.fields,
            errors: results.errors,
          });
        },
      });

      if (result.errors.length > 0) {
        throw new Error(
          `CSV parsing errors: ${result.errors
            .map((e) => e.message)
            .join(", ")}`
        );
      }

      if (!result.data || result.data.length === 0) {
        throw new Error("No data found in CSV file");
      }

      if (!result.meta.fields.includes("Handle")) {
        throw new Error("CSV must contain a Handle column");
      }

      const processedProducts = processCSVData(result.data);
      if (processedProducts.length === 0) {
        throw new Error("No valid products found in CSV");
      }

      setProducts(processedProducts);
    } catch (err) {
      setError(err.message || "Failed to process CSV file");
    } finally {
      setLoading(false);
    }
  };
  console.log(products);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <span className="text-xl font-bold">Shopify CSV Preview</span>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Shopify CSV File
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading products...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-8">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <div
              key={product.Handle}
              className="bg-white rounded-lg shadow overflow-hidden"
            >
              <div className="aspect-w-3 aspect-h-4 bg-gray-200">
                {product.images.length > 0 ? (
                  [product.images[0]].map((image, idx) => (
                    <img
                      key={idx}
                      src={image.src}
                      alt={image.alt}
                      className="w-full h-full object-cover"
                    />
                  ))
                ) : (
                  <div className="aspect-w-3 aspect-h-4 bg-gray-200">
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                      <span className="text-gray-400">No image</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {product.Title}
                </h3>

                <div className="mt-2 text-sm text-gray-500">
                  <p>Vendor: {product.Vendor}</p>
                  <p>Type: {product.Type}</p>
                  {product["Product Category"] && (
                    <p>Category: {product["Product Category"]}</p>
                  )}
                  {product.Tags && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {product.Tags.split(",").map((tag, index) => (
                        <span
                          key={index}
                          className="bg-gray-100 px-2 py-1 rounded-full text-xs"
                        >
                          {tag.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Variants */}
                {product.variants && product.variants.length > 0 ? (
                  <div className="mt-4">
                    <h4 className="font-medium text-sm mb-2">
                      Available {product.variants[0].option}s:
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {product.variants.map((variant, idx) => (
                        <div
                          key={variant.sku || idx}
                          className="border rounded p-2"
                        >
                          <p className="font-medium">{variant.value}</p>
                          <p className="text-sm">
                            ${parseFloat(variant.price).toFixed(2)}
                            {variant.compareAtPrice && (
                              <span className="line-through text-gray-500 ml-2">
                                ${parseFloat(variant.compareAtPrice).toFixed(2)}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500">
                            Stock: {variant.inventory}
                            {/* {variant.weight && (
                              <span className="ml-2">
                                Weight: {variant.weight}
                                {variant.weightUnit}
                              </span>
                            )} */}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-4">
                    <p className="text-lg font-bold">
                      ${parseFloat(product["Variant Price"]).toFixed(2)}
                      {product["Variant Compare At Price"] && (
                        <span className="line-through text-gray-500 ml-2">
                          $
                          {parseFloat(
                            product["Variant Compare At Price"]
                          ).toFixed(2)}
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-gray-600">
                      Stock: {product["Variant Inventory Qty"]}
                    </p>
                  </div>
                )}

                {product["SEO Description"] && (
                  <p className="mt-4 text-sm text-gray-600">
                    {product["SEO Description"]}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
