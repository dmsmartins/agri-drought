// Optional real-browser regression suite: npm install --no-save playwright@1.62.1
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(pathToFileURL(path.resolve(__dirname, '../index.html')).href);
    await page.locator('#demoHero').click();
    await page.waitForFunction(() => window.AgriApp?.state.results && !window.AgriApp.state.worker);
    assert.equal(await page.locator('#stationSelect option').count(), 3);
    await page.locator('#saveA').click();
    await page.locator('#saveB').click();
    await page.locator('[data-view="compare"]').click();
    assert.ok(await page.locator('#comparisonParameters table').isVisible());
    await page.locator('[data-view="map"]').click();
    assert.equal(await page.locator('.map-point').count(), 3);
    await page.locator('[data-view="lab"]').click();
    for (const scale of ['1', '3', '6', '12']) {
      await page.locator('#labScale').selectOption(scale);
      await page.locator('#labCompare').click();
      assert.ok(await page.locator('#labEvaluation').isVisible());
      assert.match(await page.locator('#labScores').innerText(), /Meses comuns:/);
    }
    const [download] = await Promise.all([
      page.waitForEvent('download'), page.locator('#labExport').click()
    ]);
    assert.match(download.suggestedFilename(), /indices-DEMO_A-12m\.csv$/);
    assert.equal(await download.failure(), null);
    await page.locator('#labObserved').setInputFiles({
      name: 'observacoes.csv', mimeType: 'text/csv',
      buffer: Buffer.from('station_id,month,drought,source\nDEMO_A,2015-01,1,teste_sintetico\nDEMO_A,2015-02,0,teste_sintetico\n')
    });
    await page.waitForFunction(() => document.querySelector('#labReference option[value="OBS"]'));
    await page.locator('#labReference').selectOption('OBS');
    await page.locator('#labCompare').click();
    assert.ok(await page.locator('#labEvaluation').isVisible());
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.locator('#labCalculate').isVisible());
    assert.equal(await page.locator('#errorBox').isVisible(), false);
    assert.deepEqual(errors, []);
    console.log('Browser smoke passed: demo, worker, scenarios, map, four scales, comparison, download, observed CSV, mobile viewport.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
