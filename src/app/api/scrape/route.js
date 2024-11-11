// src/app/api/scrape/route.js
import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    // Parse request body
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json({
        error: true,
        message: 'URL is required'
      }, { status: 400 });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (e) {
      return NextResponse.json({
        error: true,
        message: 'Invalid URL format'
      }, { status: 400 });
    }

    // Configure axios
    const axiosConfig = {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 15000,
      maxRedirects: 5,
      validateStatus: (status) => status < 500,
    };

    console.log('Fetching URL:', url);
    
    // Make request to Amazon
    const response = await axios.get(url, axiosConfig);
    
    console.log('Response status:', response.status);
    console.log('Response type:', typeof response.data);
    
    // Validate response
    if (!response.data || typeof response.data !== 'string') {
      throw new Error('Invalid response format from Amazon');
    }

    // Load HTML with cheerio
    const $ = cheerio.load(response.data);
    
    console.log('HTML loaded successfully');

    // Extract data with validation
    const title = $('#productTitle').text().trim() || 
                 $('.product-title-word-break').text().trim() || 
                 $('h1.a-size-large').text().trim();

    const price = $('.a-price .a-offscreen').first().text().trim() ||
                 $('#priceblock_ourprice').text().trim() ||
                 $('#price_inside_buybox').text().trim() ||
                 $('.a-price .a-text-price').first().text().trim();

    // Add validation check
    if (!title && !price) {
      console.log('No product data found in response');
      return NextResponse.json({
        error: true,
        message: 'Unable to extract product information. The page might be protected or the structure has changed.'
      }, { status: 422 });
    }

    const productData = {
      title,
      price,
      rating: $('#acrPopover').attr('title') || 
              $('.a-icon-star').first().text().trim() || 
              'Not available',
      reviewCount: $('#acrCustomerReviewText').text().trim() || 
                  'No reviews available',
      availability: $('#availability').text().trim() || 
                   $('#deliveryMessageMirId').text().trim() || 
                   'Status not available',
      description: $('#productDescription p').text().trim() || 
                  $('#feature-bullets').text().trim() || 
                  'No description available',
      features: $('#feature-bullets ul li')
        .map((i, el) => $(el).text().trim())
        .get()
        .filter(item => item !== '')
    };

    console.log('Product data extracted successfully:', productData);

    return NextResponse.json(productData);

  } catch (error) {
    console.error('Detailed error:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data ? 'Exists' : 'None'
    });

    // Handle specific error cases
    if (error.code === 'ECONNREFUSED') {
      return NextResponse.json({
        error: true,
        message: 'Failed to connect to Amazon. Please try again later.'
      }, { status: 503 });
    }

    if (error.code === 'ETIMEDOUT') {
      return NextResponse.json({
        error: true,
        message: 'Request timed out. Please try again.'
      }, { status: 504 });
    }

    if (error.response?.status === 403) {
      return NextResponse.json({
        error: true,
        message: 'Access denied by Amazon. This might be due to rate limiting.'
      }, { status: 403 });
    }

    return NextResponse.json({
      error: true,
      message: error.message || 'Failed to scrape product data',
      status: error.response?.status || 500
    }, { status: 500 });
  }
}