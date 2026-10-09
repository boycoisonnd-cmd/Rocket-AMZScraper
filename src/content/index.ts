/**
 * Content Script entry point injected into all 23 Amazon marketplaces.
 * Mounts in-page floating widget and answers scrape queries.
 */

import React from 'react'
import { createRoot } from 'react-dom/client'
import { FloatingWidget } from './floatingWidget'
import { scrapeCurrentPage } from './inPageScraper'

function initInPageWidget() {
  if (document.getElementById('r-amzscraper-root') || document.getElementById('rocket-amz-scraper-root') || document.getElementById('amazon-scraper-pro-root')) {
    return
  }

  const container = document.createElement('div')
  container.id = 'r-amzscraper-root'
  document.body.appendChild(container)

  const root = createRoot(container)
  root.render(React.createElement(FloatingWidget))
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initInPageWidget)
} else {
  initInPageWidget()
}

// Listen for messages from popup or background script requesting live DOM data
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'SCRAPE_ACTIVE_DOM') {
    try {
      const result = scrapeCurrentPage()
      sendResponse({ success: true, data: result })
    } catch (err: any) {
      sendResponse({ success: false, error: err.message || String(err) })
    }
  }
  return true
})
