// src/app/api/preview-products/route.js
import { NextResponse } from 'next/server';

const DEMO_PRODUCTS = [
  {
    Handle: 'amazon-b0bpsgjn7t',
    Title: 'Example Product 1',
    'Body (HTML)': '<p>This is a demo product description.</p>',
    Vendor: 'Amazon Import',
    'Product Category': 'Electronics',
    Type: 'Physical',
    Price: '29.99',
    'Image Src': '/api/placeholder/400/400',
    Status: 'active'
  },
  {
    Handle: 'amazon-b0bpsgjn7t2',
    Title: 'Example Product 2',
    'Body (HTML)': '<p>Another demo product description.</p>',
    Vendor: 'Amazon Import',
    'Product Category': 'Electronics',
    Type: 'Physical',
    Price: '39.99',
    'Image Src': '/api/placeholder/400/400',
    Status: 'active'
  }
];

export async function GET(request) {
  return NextResponse.json({
    success: true,
    products: DEMO_PRODUCTS
  });
}