import puppeteer from 'puppeteer-core'
import path from 'path'

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const EXT_PATH = path.resolve('dist')
const USER_DATA_DIR = path.resolve('tests/chrome-test-profile')

async function checkTargets() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false,
    ignoreDefaultArgs: ['--disable-extensions'],
    userDataDir: USER_DATA_DIR,
    args: [
      `--disable-extensions-except=${EXT_PATH}`,
      `--load-extension=${EXT_PATH}`,
      '--enable-logging=stderr',
      '--v=1',
    ],
  })

  await new Promise((r) => setTimeout(r, 3000))
  const targets = await browser.targets()
  console.log('--- ALL BROWSER TARGETS ---')
  for (const t of targets) {
    console.log({
      type: t.type(),
      url: t.url(),
    })
  }

  // Also check if any page or background page exists
  const page = await browser.newPage()
  await page.goto('chrome://extensions')
  await new Promise((r) => setTimeout(r, 2000))
  const extTargets = await browser.targets()
  for (const t of extTargets) {
    console.log('After chrome://extensions target:', {
      type: t.type(),
      url: t.url(),
    })
  }

  await browser.close()
}

checkTargets()
