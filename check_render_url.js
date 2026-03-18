import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER_LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER_ERROR:', err.message));
  
  console.log('Navigating to https://geenovate-ascent-phase-iii.onrender.com/ ...');
  await page.goto('https://geenovate-ascent-phase-iii.onrender.com/', { waitUntil: 'networkidle0' });
  
  const rootHtml = await page.evaluate(() => document.getElementById('root')?.innerHTML);
  console.log('Root HTML length:', rootHtml?.length || 0);
  
  await browser.close();
})();
