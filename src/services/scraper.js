// src/services/scraper.js
import { chromium } from 'playwright';
import * as cheerio from 'cheerio';

export async function scrapeTaobao(url) {
  const browser = await chromium.launch({
    headless: true
  });

  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();
    
    // Set extra headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    });

    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // Wait for main content to load
    await page.waitForSelector('.tb-main-title, .tb-detail-hd h1', {
      timeout: 5000,
    }).catch(() => console.log('Title selector timeout'));

    const content = await page.content();
    const $ = cheerio.load(content);

    const data = {
      title: $('.tb-main-title').text().trim() || 
             $('.tb-detail-hd h1').text().trim() ||
             null,
      price: $('.tm-price').text().trim() || 
             $('#J_StrPrice .tb-rmb-num').text().trim() ||
             null,
      description: $('.main-content').text().trim() || null,
      features: $('.attributes-list li').map((i, el) => $(el).text().trim()).get().join('\n') || null,
      platform: 'taobao'
    };

    return data;
  } finally {
    await browser.close();
  }
}

export async function scrapeAmazon(url) {
  const browser = await chromium.launch({
    headless: true
  });

  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();
    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    const content = await page.content();
    const $ = cheerio.load(content);

    return {
      title: $('#productTitle').text().trim() || null,
      price: $('.a-price .a-offscreen').first().text().trim() || null,
      rating: $('#acrPopover').attr('title') || null,
      availability: $('#availability').text().trim() || null,
      description: $('#productDescription p').text().trim() || null,
      features: $('#feature-bullets ul li').map((i, el) => $(el).text().trim()).get().join('\n') || null,
      platform: 'amazon'
    };
  } finally {
    await browser.close();
  }
}