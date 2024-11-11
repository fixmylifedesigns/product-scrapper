// src/app/api/process-csv/route.js
import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import Papa from 'papaparse';

export const dynamic = 'force-dynamic';

// Convert scraped product data to Shopify format
function convertToShopifyFormat(productData, url) {
  // Extract ASIN from URL
  const asin = url.match(/\/dp\/([A-Z0-9]+)/i)?.[1] || '';
  
  // Clean up the price
  const price = productData.price?.replace(/[^0-9.]/g, '') || '0.00';
  
  // Format description with features
  const description = `
    ${productData.description || ''}
    
    Features:
    ${productData.features || ''}
    
    Availability: ${productData.availability || 'N/A'}
    Rating: ${productData.rating || 'N/A'}
  `.trim();

  return {
    'Handle': asin.toLowerCase(),
    'Title': productData.title || '',
    'Body (HTML)': description,
    'Vendor': 'Amazon Import',
    'Product Category': 'Amazon Products',
    'Type': 'Physical',
    'Tags': 'amazon-import',
    'Published': 'TRUE',
    'Option1 Name': 'Title',
    'Option1 Value': 'Default Title',
    'Option2 Name': '',
    'Option2 Value': '',
    'Option3 Name': '',
    'Option3 Value': '',
    'Variant SKU': asin.toLowerCase(),
    'Variant Grams': '0',
    'Variant Inventory Tracker': 'shopify',
    'Variant Inventory Qty': '1',
    'Variant Inventory Policy': 'deny',
    'Variant Fulfillment Service': 'manual',
    'Variant Price': price,
    'Variant Compare At Price': '',
    'Variant Requires Shipping': 'TRUE',
    'Variant Taxable': 'TRUE',
    'Variant Barcode': '',
    'Image Src': '',
    'Image Position': '',
    'Image Alt Text': '',
    'Gift Card': 'FALSE',
    'Status': 'active'
  };
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file) {
      return NextResponse.json({ 
        error: true, 
        message: 'No file provided' 
      }, { status: 400 });
    }

    // Read file content
    const text = await file.text();

    // First attempt with auto-detection
    let parsedResult = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: (results) => results,
      error: (error) => {
        throw new Error(`CSV parsing error: ${error.message}`);
      }
    });

    // If first attempt fails, try with explicit delimiters
    if (parsedResult.errors.length > 0) {
      const delimiters = [',', ';', '\t', '|'];
      
      for (const delimiter of delimiters) {
        parsedResult = Papa.parse(text, {
          delimiter,
          header: true,
          skipEmptyLines: true,
          encoding: 'UTF-8',
          complete: (results) => results,
          error: (error) => {
            throw new Error(`CSV parsing error: ${error.message}`);
          }
        });

        if (parsedResult.errors.length === 0 && parsedResult.data.length > 0) {
          break;
        }
      }
    }

    // Validate parsed data
    if (parsedResult.errors.length > 0) {
      return NextResponse.json({ 
        error: true, 
        message: 'Failed to parse CSV file',
        details: parsedResult.errors
      }, { status: 400 });
    }

    const data = parsedResult.data;

    // Validate if URL column exists
    const hasUrlColumn = data.length > 0 && (data[0].url || data[0].URL || data[0].Url);
    if (!hasUrlColumn) {
      return NextResponse.json({ 
        error: true, 
        message: 'CSV must contain a column named "url", "URL", or "Url"'
      }, { status: 400 });
    }

    // Process products
    const shopifyProducts = [];
    for (const row of data) {
      const productUrl = row.url || row.URL || row.Url;
      
      if (!productUrl) {
        continue;
      }

      try {
        // Add delay between requests
        if (shopifyProducts.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        const scrapedData = await scrapeProduct(productUrl);
        const shopifyProduct = convertToShopifyFormat(scrapedData, productUrl);
        shopifyProducts.push(shopifyProduct);
      } catch (error) {
        console.error(`Error processing ${productUrl}:`, error);
        // Skip failed products
      }
    }

    // Generate Shopify CSV
    const csv = Papa.unparse(shopifyProducts);

    // Return CSV file
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="shopify_products.csv"'
      }
    });

  } catch (error) {
    console.error('Processing error:', error);
    return NextResponse.json({ 
      error: true, 
      message: error.message || 'Failed to process CSV file'
    }, { status: 500 });
  }
}

async function scrapeProduct(url) {
  try {
    const cleanUrl = cleanAmazonUrl(url);
    
    const response = await axios.get(cleanUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'no-cache',
      },
      timeout: 15000,
    });

    const $ = cheerio.load(response.data);

    // Extract features
    const features = $('#feature-bullets ul li')
      .map((i, el) => $(el).text().trim())
      .get()
      .join('\n');

    return {
      title: $('#productTitle').text().trim() || null,
      price: $('.a-price .a-offscreen').first().text().trim() || null,
      rating: $('#acrPopover').attr('title') || null,
      availability: $('#availability').text().trim() || null,
      description: $('#productDescription p').text().trim() || null,
      features: features || null
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
      throw new Error('Invalid Amazon product URL');
    }
    return `https://www.amazon.com/dp/${dpPath[1]}`;
  } catch (e) {
    throw new Error('Invalid URL format');
  }
}