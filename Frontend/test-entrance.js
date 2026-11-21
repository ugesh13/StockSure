import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.resolve('test-results');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runTest() {
  console.log('Launching Brave Browser...');
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080'],
    defaultViewport: {
      width: 1920,
      height: 1080,
    },
  });

  const page = await browser.newPage();

  const consoleLogs = [];
  page.on('console', (msg) => {
    consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
  });

  page.on('pageerror', (err) => {
    console.error('[Browser Page Error]:', err.message);
  });

  console.log('Navigating to http://localhost:3000/...');
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });

  // 1. Initial Arrival State
  console.log('Capturing Initial Arrival...');
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_initial_arrival.png') });

  // 2. Wait for camera dolly to settle and "PRESS TO ENTER" to appear (4.5s)
  console.log('Waiting for Press to Enter prompt...');
  await new Promise((r) => setTimeout(r, 4000));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_press_to_enter_ready.png') });

  // 3. Trigger Press to Enter
  console.log('Triggering Press to Enter interaction (pressing Enter key)...');
  await page.keyboard.press('Enter');

  // 4. Mid-animation screenshot (doors sliding open, camera moving forward)
  await new Promise((r) => setTimeout(r, 900));
  console.log('Capturing sliding doors in motion...');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_doors_sliding_open.png') });

  // 5. Full inside transition completed
  await new Promise((r) => setTimeout(r, 2200));
  console.log('Capturing inside supermarket view...');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_inside_stocksure.png') });

  // 6. Test re-experience button
  console.log('Testing reset button...');
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await page.evaluate((el) => el.innerText, btn);
    if (text.includes('Re-experience') || text.includes('Step Outside')) {
      console.log('Clicking reset button:', text);
      await btn.click();
      break;
    }
  }

  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_reset_outside.png') });

  console.log('All screenshots captured in test-results/');
  await browser.close();
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
