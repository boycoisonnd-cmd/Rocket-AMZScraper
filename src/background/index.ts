/**
 * Main Extension Background Service Worker (Manifest V3).
 * Coordinates network rules, messages between UI & Content scripts, and scraping engines.
 */

import { setupNetworkRules } from './networkRules'
import { fetchEngine } from './fetchEngine'
import { countryOf, detectPageType } from '../shared/refs'
import { mcpBridge } from './mcpBridge'

// Start MCP Bridge client on initialization
mcpBridge.start()

chrome.runtime.onInstalled.addListener(async () => {
  console.log('[Background] Rocket-AMZScraper Extension Installed.')
  await setupNetworkRules()
  mcpBridge.start()
})

chrome.runtime.onStartup.addListener(async () => {
  await setupNetworkRules()
  mcpBridge.start()
})

// Enable opening Side Panel upon extension action if desired
if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((err) => console.warn('[SidePanel] setPanelBehavior:', err))
}

if (chrome.action && chrome.action.onClicked) {
  chrome.action.onClicked.addListener(async (tab) => {
    if (chrome.sidePanel && tab.windowId) {
      try {
        await chrome.sidePanel.open({ windowId: tab.windowId })
      } catch (err) {
        console.warn('[Action] Could not open side panel:', err)
      }
    }
  })
}

export interface ExtensionMessageRequest {
  action: string
  payload?: any
}

chrome.runtime.onMessage.addListener((message: ExtensionMessageRequest, sender, sendResponse) => {
  const { action, payload } = message || {}

  const handleAsync = async () => {
    switch (action) {
      case 'GET_ACTIVE_TAB': {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        if (!tab || !tab.url) {
          return { error: 'No active tab found' }
        }
        const country = countryOf(tab.url)
        const pageType = detectPageType(tab.url)
        return {
          id: tab.id,
          url: tab.url,
          title: tab.title,
          country,
          pageType,
          isAmazon: Boolean(country),
        }
      }

      case 'GET_MCP_STATUS': {
        return {
          connected: mcpBridge.isConnected(),
        }
      }

      case 'RECONNECT_MCP': {
        mcpBridge.start()
        return {
          connected: mcpBridge.isConnected(),
        }
      }

      case 'OPEN_SIDE_PANEL': {
        if (chrome.sidePanel && sender.tab?.windowId) {
          await chrome.sidePanel.open({ windowId: sender.tab.windowId })
          return { success: true }
        }
        const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true })
        if (currentTab?.windowId) {
          await chrome.sidePanel.open({ windowId: currentTab.windowId })
          return { success: true }
        }
        return { error: 'Unable to open side panel' }
      }

      case 'SCRAPE_UNIVERSAL': {
        return await fetchEngine.getUniversal(payload.url, payload.country)
      }

      case 'SCRAPE_PRODUCT': {
        return await fetchEngine.getProductDetails(payload.product, payload.country)
      }

      case 'SCRAPE_SEARCH': {
        return await fetchEngine.getSearch(payload.query, payload.country, payload.params)
      }

      case 'SCRAPE_OFFERS': {
        return await fetchEngine.getOffers(payload.product, payload.country)
      }

      case 'SCRAPE_RANKINGS': {
        return await fetchEngine.getRankings(payload.category, payload.country)
      }

      case 'SCRAPE_SELLER': {
        return await fetchEngine.getSeller(payload.seller, payload.country)
      }

      case 'SCRAPE_SELLER_FEEDBACK': {
        return await fetchEngine.getSellerFeedback(payload.seller, payload.country, payload.params)
      }

      case 'SCRAPE_INFLUENCER': {
        return await fetchEngine.getInfluencer(payload.influencer, payload.country)
      }

      case 'SCRAPE_INFLUENCER_LIST': {
        return await fetchEngine.getInfluencerList(payload.post, payload.country)
      }

      case 'SCRAPE_AUTOCOMPLETE': {
        return await fetchEngine.getAutocomplete(payload.query, payload.country)
      }

      case 'SCRAPE_BULK': {
        return await fetchEngine.getBulkProducts(payload.asins, payload.country)
      }

      default:
        throw new Error(`Unknown action: ${action}`)
    }
  }

  handleAsync()
    .then((data) => sendResponse({ success: true, data }))
    .catch((err) => sendResponse({ success: false, error: err.message || String(err) }))

  return true // Keep sendResponse open for async
})
