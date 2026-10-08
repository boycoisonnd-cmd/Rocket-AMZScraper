/**
 * In-Page instant scraper extracting directly from the live DOM of the active Amazon tab.
 * Gives sub-100ms instant feedback without any network latency.
 */

import { getSite, countryForHost } from '../shared/sites'
import { detectPageType } from '../shared/refs'
import {
  parseProductPage,
  parseSearchPage,
  parseBestsellersPage,
  parseSellerPage,
  parseInfluencerPage,
  parseInfluencerListPage,
} from '../parsers'

export interface InPageScrapeResult {
  url: string
  pageType: string | null
  country: string | null
  timestamp: string
  data: any
}

export function scrapeCurrentPage(): InPageScrapeResult {
  const currentUrl = window.location.href
  const host = window.location.hostname
  const country = countryForHost(host)
  const site = getSite(country)
  const pageType = detectPageType(currentUrl)

  const html = document.documentElement.outerHTML
  let data: any = null

  switch (pageType) {
    case 'product':
      data = parseProductPage(html, site)
      break
    case 'search':
      data = parseSearchPage(html, site)
      break
    case 'bestsellers':
      data = parseBestsellersPage(html, site)
      break
    case 'seller':
      data = parseSellerPage(html, site)
      break
    case 'influencer':
      data = parseInfluencerPage(html, site)
      break
    case 'influencer_post':
      data = parseInfluencerListPage(html, site)
      break
    default:
      data = {
        title: document.title,
        url: currentUrl,
        meta_description:
          document.querySelector('meta[name="description"]')?.getAttribute('content') || null,
      }
      break
  }

  return {
    url: currentUrl,
    pageType,
    country,
    timestamp: new Date().toISOString(),
    data,
  }
}
