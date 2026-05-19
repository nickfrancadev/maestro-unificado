const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.error('PAGE ERROR:', error.message));
  await page.goto('http://localhost:5174');
  await new Promise(r => setTimeout(r, 2000));
  
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const playsBtn = buttons.find(b => b.textContent.includes('Plays'));
    if (playsBtn) playsBtn.click();
  });
  await new Promise(r => setTimeout(r, 1000));
  await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('div.border.bg-white.rounded-xl'));
    if (cards.length > 0) cards[0].click();
  });
  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
})();