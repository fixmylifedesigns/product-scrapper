// src/app/api/process-csv/route.js
import { NextResponse } from "next/server";
import axios from "axios";
import * as cheerio from "cheerio";
import Papa from "papaparse";

export const dynamic = "force-dynamic";

// Convert scraped product data to Shopify format
function convertToShopifyFormat(productData, url) {
  const asin = url.match(/\/dp\/([A-Z0-9]+)/i)?.[1] || "";
  const baseHandle = asin.toLowerCase();
  const shopifyProducts = [];

  // Base product data
  const baseProduct = {
    Handle: baseHandle,
    Title: productData.title || "",
    "Body (HTML)": createProductDescription(productData),
    Vendor: "Amazon Import",
    "Product Category": "Amazon Products",
    Type: "Physical",
    Tags: "amazon-import",
    Published: "TRUE",
    Status: "active",
  };

  if (productData.hasVariants && productData.variants.length > 0) {
    // Add size as Option1
    baseProduct["Option1 Name"] = "Size";
    
    // Create a row for each variant
    productData.variants.forEach((variant, index) => {
      const variantProduct = {
        ...baseProduct,
        "Option1 Value": variant.size,
        "Variant SKU": `${baseHandle}-${index + 1}`,
        "Variant Inventory Qty": "10",
        "Variant Inventory Policy": "deny",
        "Variant Fulfillment Service": "manual",
        "Variant Price": variant.price?.replace(/[^0-9.]/g, "") || "0.00",
        "Variant Requires Shipping": "TRUE",
        "Variant Taxable": "TRUE",
        "Variant Weight Unit": "g",
        "Variant Grams": "200" // Default weight
      };

      // Only include full product details in first variant
      if (index > 0) {
        variantProduct.Title = "";
        variantProduct["Body (HTML)"] = "";
      }

      shopifyProducts.push(variantProduct);
    });
  } else {
    // Single product without variants
    baseProduct["Option1 Name"] = "Title";
    baseProduct["Option1 Value"] = "Default Title";
    baseProduct["Variant SKU"] = baseHandle;
    baseProduct["Variant Price"] = productData.basePrice?.replace(/[^0-9.]/g, "") || "0.00";
    baseProduct["Variant Inventory Qty"] = "10";
    baseProduct["Variant Inventory Policy"] = "deny";
    baseProduct["Variant Fulfillment Service"] = "manual";
    baseProduct["Variant Requires Shipping"] = "TRUE";
    baseProduct["Variant Taxable"] = "TRUE";
    baseProduct["Variant Weight Unit"] = "g";
    baseProduct["Variant Grams"] = "200";
    shopifyProducts.push(baseProduct);
  }

  // Add images
  if (productData.images && productData.images.length > 0) {
    productData.images.forEach((imageUrl, index) => {
      if (index === 0) {
        shopifyProducts[0]["Image Src"] = imageUrl;
        shopifyProducts[0]["Image Position"] = "1";
        shopifyProducts[0]["Image Alt Text"] = productData.title;
      } else {
        shopifyProducts.push({
          Handle: baseHandle,
          "Image Src": imageUrl,
          "Image Position": (index + 1).toString(),
          "Image Alt Text": `${productData.title} - View ${index + 1}`,
        });
      }
    });
  }

  return shopifyProducts;
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json(
        {
          error: true,
          message: "No file provided",
        },
        { status: 400 }
      );
    }

    // Read file content
    const text = await file.text();

    // First attempt with auto-detection
    let parsedResult = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      encoding: "UTF-8",
      complete: (results) => results,
      error: (error) => {
        throw new Error(`CSV parsing error: ${error.message}`);
      },
    });

    // If first attempt fails, try with explicit delimiters
    if (parsedResult.errors.length > 0) {
      const delimiters = [",", ";", "\t", "|"];

      for (const delimiter of delimiters) {
        parsedResult = Papa.parse(text, {
          delimiter,
          header: true,
          skipEmptyLines: true,
          encoding: "UTF-8",
          complete: (results) => results,
          error: (error) => {
            throw new Error(`CSV parsing error: ${error.message}`);
          },
        });

        if (parsedResult.errors.length === 0 && parsedResult.data.length > 0) {
          break;
        }
      }
    }

    // Validate parsed data
    if (parsedResult.errors.length > 0) {
      return NextResponse.json(
        {
          error: true,
          message: "Failed to parse CSV file",
          details: parsedResult.errors,
        },
        { status: 400 }
      );
    }

    const data = parsedResult.data;

    // Validate if URL column exists
    const hasUrlColumn =
      data.length > 0 && (data[0].url || data[0].URL || data[0].Url);
    if (!hasUrlColumn) {
      return NextResponse.json(
        {
          error: true,
          message: 'CSV must contain a column named "url", "URL", or "Url"',
        },
        { status: 400 }
      );
    }

    // Process products
    const shopifyProducts = [];
    for (const row of data) {
      const productUrl = row.url || row.URL || row.Url;

      if (!productUrl) continue;

      try {
        if (shopifyProducts.length > 0) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        const scrapedData = await scrapeProduct(productUrl);
        const productRows = convertToShopifyFormat(scrapedData, productUrl);
        shopifyProducts.push(...productRows);
      } catch (error) {
        console.error(`Error processing ${productUrl}:`, error);
      }
    }

    // Generate Shopify CSV
    const csv = Papa.unparse(shopifyProducts);

    // Return CSV file
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="shopify_products.csv"',
      },
    });
  } catch (error) {
    console.error("Processing error:", error);
    return NextResponse.json(
      {
        error: true,
        message: error.message || "Failed to process CSV file",
      },
      { status: 500 }
    );
  }
}

async function scrapeProduct(url) {
  try {
    const cleanUrl = cleanAmazonUrl(url);
    const response = await axios.get(cleanUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Cache-Control": "no-cache",
      },
      timeout: 15000,
    });

    const $ = cheerio.load(response.data);

    // Extract all product images
    const images = [];
    const mainImage = $("#landingImage").attr("data-old-hires") || 
                     $("#landingImage").attr("src") || 
                     $("#imgBlkFront").attr("src");
    if (mainImage) images.push(mainImage);

    // Extract additional images
    $("#altImages img").each((i, el) => {
      const src = $(el).attr("src");
      if (src && src.includes("images/I/")) {
        const fullSizeUrl = src.replace(/\._[^_]*_\./, ".");
        if (!images.includes(fullSizeUrl)) {
          images.push(fullSizeUrl);
        }
      }
    });

    // Extract size options
    const sizeOptions = [];
    
    // Method 1: Check dropdown select
    $("#native-dropdown-selected-size option").each((i, el) => {
      const size = $(el).text().trim();
      const value = $(el).attr("value");
      const price = $(el).attr("data-a-price");
      if (size && size !== "Select" && value) {
        sizeOptions.push({
          size,
          value,
          price: price || null
        });
      }
    });

    // Method 2: Check size buttons
    $("#variation_size_name ul li").each((i, el) => {
      const size = $(el).find(".a-size-base").text().trim();
      const price = $(el).find(".a-price .a-offscreen").text().trim();
      if (size) {
        sizeOptions.push({
          size,
          price: price || null
        });
      }
    });

    // Extract base product information
    const basePrice = $(".a-price .a-offscreen").first().text().trim() ||
                     $("#priceblock_ourprice").text().trim() ||
                     $("#price_inside_buybox").text().trim();

    // Format sizes for Shopify
    const variants = sizeOptions.map((option, index) => ({
      size: option.size,
      price: option.price || basePrice,
      inventory: 10, // Default inventory
      sku: `${cleanUrl.split('/dp/')[1]}-${index + 1}`
    }));

    return {
      title: $("#productTitle").text().trim(),
      basePrice,
      rating: $("#acrPopover").attr("title"),
      availability: $("#availability").text().trim(),
      description: $("#productDescription p").text().trim(),
      features: $("#feature-bullets ul li")
        .map((i, el) => $(el).text().trim())
        .get()
        .filter(feature => !feature.includes("video_pop_out"))
        .join("\n"),
      images,
      variants,
      hasVariants: variants.length > 0,
      options: {
        sizes: variants.map(v => v.size),
      }
    };
  } catch (error) {
    throw new Error(`Failed to scrape product: ${error.message}`);
  }
}

function cleanAmazonUrl(url) {
  try {
    const urlObj = new URL(url);
    const dpPath = urlObj.pathname.match(/\/dp\/([A-Z0-9]+)/i);
    if (!dpPath) {
      throw new Error("Invalid Amazon product URL");
    }
    return `https://www.amazon.com/dp/${dpPath[1]}`;
  } catch (e) {
    throw new Error("Invalid URL format");
  }
}

function createProductDescription(productData) {
  return `
    <div class="product-description">
      ${
        productData.description
          ? `
        <div class="description-section">
          <h3>Description</h3>
          <p>${productData.description}</p>
        </div>
      `
          : ""
      }

      ${
        productData.features
          ? `
        <div class="features-section">
          <h3>Features</h3>
          <ul>
            ${productData.features
              .split("\n")
              .map((feature) => `<li>${feature}</li>`)
              .join("")}
          </ul>
        </div>
      `
          : ""
      }

      ${
        Object.keys(productData.details || {}).length > 0
          ? `
        <div class="specifications-section">
          <h3>Product Details</h3>
          <ul>
            ${Object.entries(productData.details)
              .map(
                ([key, value]) => `<li><strong>${key}:</strong> ${value}</li>`
              )
              .join("")}
          </ul>
        </div>
      `
          : ""
      }

      ${
        productData.availability
          ? `
        <div class="availability-section">
          <p><strong>Availability:</strong> ${productData.availability}</p>
        </div>
      `
          : ""
      }

      ${
        productData.rating
          ? `
        <div class="rating-section">
          <p><strong>Rating:</strong> ${productData.rating}</p>
        </div>
      `
          : ""
      }
    </div>
  `.trim();
}
