import puppeteer from 'puppeteer-core'
import path from 'path'
import fs from 'fs'

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const EXT_PATH = path.resolve('dist')
const USER_DATA_DIR = path.resolve('tests/chrome-test-profile')

async function runTest() {
  console.log('--- STARTING REAL BROWSER E2E TEST ---')
  console.log('Chrome Path:', CHROME_PATH)
  console.log('Extension Path:', EXT_PATH)

  if (!fs.existsSync(USER_DATA_DIR)) {
    fs.mkdirSync(USER_DATA_DIR, { recursive: true })
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false,
    ignoreDefaultArgs: ['--disable-extensions'],
    userDataDir: USER_DATA_DIR,
    args: [
      `--disable-extensions-except=${EXT_PATH}`,
      `--load-extension=${EXT_PATH}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  })

  try {
    console.log('1. Waiting for extension target to initialize...')
    // Wait for the service worker target
    let extensionId = null
    const maxWait = 10000
    const start = Date.now()

    while (Date.now() - start < maxWait) {
      const targets = await browser.targets()
      for (const t of targets) {
        if (t.type() === 'service_worker') {
          const url = t.url()
          console.log('Found service worker URL:', url)
          const match = url.match(/chrome-extension:\/\/([a-z0-9]+)\//)
          if (match) {
            extensionId = match[1]
            break
          }
        }
      }
      if (extensionId) break
      await new Promise((r) => setTimeout(r, 500))
    }

    if (!extensionId) {
      console.log('Service worker not found directly, checking chrome://extensions target...')
      const page = await browser.newPage()
      await page.goto('chrome://extensions')
      // Let's get targets again
      const targets = await browser.targets()
      for (const t of targets) {
        const url = t.url()
        const match = url.match(/chrome-extension:\/\/([a-z0-9]+)\//)
        if (match) {
          extensionId = match[1]
          console.log('Found extension ID from target:', extensionId)
          break
        }
      }
    }

    console.log('Extension ID:', extensionId)
    if (!extensionId) {
      throw new Error('Failed to find extension ID. The extension may have failed to load in Chrome.')
    }

    // 2. Test Popup Page
    console.log('\n2. Testing Popup page...')
    const popupPage = await browser.newPage()
    const popupErrors = []
    popupPage.on('pageerror', (err) => popupErrors.push(err.toString()))
    popupPage.on('console', (msg) => {
      if (msg.type() === 'error') popupErrors.push(msg.text())
    })

    const popupUrl = `chrome-extension://${extensionId}/src/popup/index.html`
    console.log('Navigating to:', popupUrl)
    await popupPage.goto(popupUrl, { waitUntil: 'networkidle0' })
    const popupTitle = await popupPage.title()
    console.log('Popup page title:', popupTitle)

    // Check if React rendered the header and content
    const popupHeader = await popupPage.$eval('h1', (el) => el.textContent).catch(() => null)
    console.log('Popup Header H1 text:', popupHeader)

    if (popupErrors.length > 0) {
      console.error('❌ Popup console errors detected:', popupErrors)
    } else {
      console.log('✅ Popup rendered with 0 console errors.')
    }

    // 3. Test Side Panel Page
    console.log('\n3. Testing Side Panel page...')
    const sidepanelPage = await browser.newPage()
    const sidepanelErrors = []
    sidepanelPage.on('pageerror', (err) => sidepanelErrors.push(err.toString()))
    sidepanelPage.on('console', (msg) => {
      if (msg.type() === 'error') sidepanelErrors.push(msg.text())
      else console.log('[Sidepanel console]', msg.type(), msg.text())
    })

    const sidepanelUrl = `chrome-extension://${extensionId}/src/sidepanel/index.html`
    console.log('Navigating to:', sidepanelUrl)
    await sidepanelPage.goto(sidepanelUrl, { waitUntil: 'networkidle0' })
    const sidepanelTitle = await sidepanelPage.title()
    console.log('Sidepanel page title:', sidepanelTitle)

    // Check navigation buttons in side panel
    const navButtons = await sidepanelPage.$$eval('button', (btns) =>
      btns.map((b) => b.textContent?.trim()).filter(Boolean)
    )
    console.log('Rendered buttons in Sidepanel:', navButtons.slice(0, 10))

    if (sidepanelErrors.length > 0) {
      console.error('❌ Sidepanel console errors detected:', sidepanelErrors)
    } else {
      console.log('✅ Sidepanel rendered with 0 console errors.')
    }

    // 4. Test background messaging from sidepanel
    console.log('\n4. Testing background messaging & scraping execution...')
    // We can evaluate chrome.runtime.sendMessage inside the sidepanel page
    const response = await sidepanelPage.evaluate(async () => {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { action: 'GET_ACTIVE_TAB' },
          (res) => resolve(res)
        )
      })
    })
    console.log('GET_ACTIVE_TAB response from background worker:', response)

    console.log('\n5. Testing autocomplete suggestions through background worker...')
    const suggestRes = await sidepanelPage.evaluate(async () => {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { action: 'SCRAPE_AUTOCOMPLETE', payload: { query: 'macbook', country: 'US' } },
          (res) => resolve(res)
        )
      })
    })
    console.log('SCRAPE_AUTOCOMPLETE response success:', suggestRes?.success)
    if (suggestRes?.success) {
      console.log('Suggestions received count:', suggestRes?.data?.length)
      console.log('First 3 suggestions:', suggestRes?.data?.slice(0, 3))
    } else {
      console.log('Suggestions response:', suggestRes)
    }

    console.log('\n--- REAL BROWSER E2E TEST COMPLETED SUCCESSFULLY ---')
  } catch (err) {
    console.error('❌ Test failed with exception:', err)
  } finally {
    await browser.close()
    // Clean up test profile dir
    try {
      fs.rmSync(USER_DATA_DIR, { recursive: true, force: true })
    } catch {}
  }
}

runTest()
