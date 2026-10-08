/**
 * Network engine for background fetching with credentials, retry, timeouts,
 * and dispatching to 100% parity parsers.
 */

import { getSite, countryForHost, SiteInfo } from '../shared/sites'
import {
  resolveProduct,
  resolveSeller,
  resolveInfluencer,
  resolvePost,
  resolveNode,
  resolveBestsellerCategory,
  resolveQuery,
  resolveLink,
  countryOf,
  detectPageType,
} from '../shared/refs'
import {
  parseProductPage,
  parseSearchPage,
  parseOffersPage,
  parseBestsellersPage,
  parseBestsellersAcpPage,
  parseSellerPage,
  parseFeedbackItem,
  parseInfluencerPage,
  parseInfluencerListPage,
  parseAutocompleteResponse,
} from '../parsers'
import { defaultQueue } from './queueManager'

export interface FetchOptions {
  timeoutMs?: number
  retries?: number
  headers?: Record<string, string>
}

/**
 * Fetch with automatic credentials, abort timeout, and exponential retry.
 */
export async function resilientFetch(
  url: string,
  options: FetchOptions = {}
): Promise<string> {
  const timeoutMs = options.timeoutMs ?? 15000
  const maxRetries = options.retries ?? 2

  let lastError: any = null
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          ...options.headers,
        },
        credentials: 'include',
        signal: controller.signal,
      })
      clearTimeout(timer)

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Resource not found (404) at ${url}`)
        }
        if (response.status === 503 && attempt < maxRetries) {
          // Throttled or transient block: backoff and retry
          await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)))
          continue
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText} at ${url}`)
      }

      return await response.text()
    } catch (err: any) {
      clearTimeout(timer)
      lastError = err
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 600 * (attempt + 1)))
      }
    }
  }

  throw lastError || new Error(`Failed to fetch ${url} after ${maxRetries} retries`)
}

export class AmazonFetchEngine {
  /**
   * Scrape product details by ASIN or product link.
   */
  async getProductDetails(productInput: string, country?: string | null) {
    const asin = resolveProduct(productInput)
    const deducedCountry = countryOf(productInput) || country
    const site = getSite(deducedCountry)

    const url = `${site.base}/dp/${asin}`
    const html = await resilientFetch(url)
    return parseProductPage(html, site)
  }

  /**
   * Scrape search results by keyword or search link.
   */
  async getSearch(
    queryInput: string,
    country?: string | null,
    params: { page?: number; sort?: string; node?: string } = {}
  ) {
    const keyword = resolveQuery(queryInput)
    const deducedCountry = countryOf(queryInput) || country
    const site = getSite(deducedCountry)

    const searchUrl = new URL(`${site.base}/s`)
    searchUrl.searchParams.set('k', keyword)
    if (params.page && params.page > 1) {
      searchUrl.searchParams.set('page', String(params.page))
    }
    if (params.sort) {
      searchUrl.searchParams.set('s', params.sort)
    }
    if (params.node) {
      searchUrl.searchParams.set('rh', `n:${params.node}`)
    }

    const html = await resilientFetch(searchUrl.toString())
    return parseSearchPage(html, site)
  }

  /**
   * Scrape all seller offers from the aodAjaxMain modal.
   */
  async getOffers(productInput: string, country?: string | null) {
    const asin = resolveProduct(productInput)
    const deducedCountry = countryOf(productInput) || country
    const site = getSite(deducedCountry)

    const url = `${site.base}/gp/product/ajax/aodAjaxMain?asin=${asin}&m=&qid=&smid=&sourcecustomerorglistid=&sourcecustomerorglistitemid=&sr=`
    const html = await resilientFetch(url, {
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
      },
    })
    return parseOffersPage(html, site)
  }

  /**
   * Scrape Best Sellers rankings and ACP grid.
   */
  async getRankings(categoryInput: string = '', country?: string | null) {
    const cat = resolveBestsellerCategory(categoryInput)
    const deducedCountry = countryOf(categoryInput) || country
    const site = getSite(deducedCountry)

    const path = cat ? `/gp/bestsellers/${cat}` : '/gp/bestsellers'
    const url = `${site.base}${path}`
    const html = await resilientFetch(url)
    const page = parseBestsellersPage(html, site)

    // If ACP is present and has more than rendered items, hydrate ranks 31-50
    if (page.acp?.path && page.acp.rendered < page.expected_count) {
      try {
        const acpUrl = `${site.base}${page.acp.path}?${page.acp.params}`
        const acpHtml = await resilientFetch(acpUrl, {
          headers: { 'X-Requested-With': 'XMLHttpRequest' },
        })
        const metaByAsin: Record<string, any> = {}
        for (const entry of page.acp.entries || []) {
          if (entry && entry.id) {
            metaByAsin[entry.id] = entry.metadataMap
          }
        }
        const moreItems = parseBestsellersAcpPage(acpHtml, site, metaByAsin)
        for (const it of moreItems) {
          if (!page.items.some((existing) => existing.asin === it.asin)) {
            page.items.push(it)
          }
        }
      } catch (err) {
        console.warn('[Rankings] ACP hydration error:', err)
      }
    }

    return page
  }

  /**
   * Scrape seller profile by ID or seller link.
   */
  async getSeller(sellerInput: string, country?: string | null) {
    const sellerId = resolveSeller(sellerInput)
    const deducedCountry = countryOf(sellerInput) || country
    const site = getSite(deducedCountry)

    const url = `${site.base}/sp?seller=${sellerId}`
    const html = await resilientFetch(url)
    return parseSellerPage(html, site)
  }

  /**
   * Scrape seller feedback items from /sp/ajax/feedback.
   */
  async getSellerFeedback(
    sellerInput: string,
    country?: string | null,
    params: { page?: number; rating?: number } = {}
  ) {
    const sellerId = resolveSeller(sellerInput)
    const deducedCountry = countryOf(sellerInput) || country
    const site = getSite(deducedCountry)

    const fbUrl = new URL(`${site.base}/sp/ajax/feedback`)
    fbUrl.searchParams.set('seller', sellerId)
    if (params.page) {
      fbUrl.searchParams.set('page', String(params.page))
    }
    if (params.rating) {
      fbUrl.searchParams.set('rating', String(params.rating))
    }

    const jsonText = await resilientFetch(fbUrl.toString(), {
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    })
    try {
      const data = JSON.parse(jsonText)
      const details = data.details || []
      return details.map((d: any) => parseFeedbackItem(d, site))
    } catch {
      return []
    }
  }

  /**
   * Scrape Influencer storefront.
   */
  async getInfluencer(influencerInput: string, country?: string | null) {
    const handle = resolveInfluencer(influencerInput)
    const deducedCountry = countryOf(influencerInput) || country
    const site = getSite(deducedCountry)

    const url = `${site.base}/shop/${handle}`
    const html = await resilientFetch(url)
    return parseInfluencerPage(html, site, handle)
  }

  /**
   * Scrape Influencer idea list / products list.
   */
  async getInfluencerList(postInput: string, country?: string | null) {
    const post = resolvePost(postInput)
    const deducedCountry = countryOf(postInput) || country
    const site = getSite(deducedCountry)

    const url = post.handle
      ? `${site.base}/shop/${post.handle}/list/${post.id}`
      : `${site.base}/shop/list/${post.id}`
    const html = await resilientFetch(url)
    return parseInfluencerListPage(html, site)
  }

  /**
   * Scrape suggestions from Amazon Suggestions API.
   */
  async getAutocomplete(query: string, country?: string | null) {
    const site = getSite(country)
    const hosts = [site.completion_host, 'completion.amazon.com']
    let lastError: Error | null = null

    for (const host of hosts) {
      const url = new URL(`https://${host}/api/2017/suggestions`)
      url.searchParams.set('mid', site.marketplace_id)
      url.searchParams.set('alias', 'aps')
      url.searchParams.set('prefix', query)
      url.searchParams.set('site-variant', 'desktop')
      url.searchParams.set('version', '3')
      url.searchParams.set('event', 'onKeyPress')
      url.searchParams.set('lop', site.language)
      url.searchParams.set('client-info', 'amazon-search-ui')

      try {
        const jsonText = await resilientFetch(url.toString(), {
          headers: {
            Accept: 'application/json, text/plain, */*',
          },
        })
        const data = JSON.parse(jsonText)
        if (data && Array.isArray(data.suggestions)) {
          return parseAutocompleteResponse(data)
        }
      } catch (err: any) {
        lastError = err
      }
    }

    if (lastError) throw lastError
    return []
  }

  /**
   * Scrape multiple ASINs with concurrency limit.
   */
  async getBulkProducts(
    asins: string[],
    country?: string | null,
    onProgress?: (done: number, total: number, asin: string) => void
  ) {
    return defaultQueue.mapAll(
      asins,
      async (asin) => {
        try {
          return await this.getProductDetails(asin, country)
        } catch (err: any) {
          return {
            asin,
            error: err.message || 'Failed to scrape',
          }
        }
      },
      onProgress
    )
  }

  /**
   * Scrape by any Amazon URL automatically dispatching to the appropriate parser.
   */
  async getUniversal(url: string, country?: string | null) {
    const validUrl = resolveLink(url)
    const detectedCountry = countryOf(validUrl) || country
    const pageType = detectPageType(validUrl)

    switch (pageType) {
      case 'product':
        return {
          type: 'product',
          data: await this.getProductDetails(validUrl, detectedCountry),
        }
      case 'search':
        return {
          type: 'search',
          data: await this.getSearch(validUrl, detectedCountry),
        }
      case 'seller':
        return {
          type: 'seller',
          data: await this.getSeller(validUrl, detectedCountry),
        }
      case 'influencer':
        return {
          type: 'influencer',
          data: await this.getInfluencer(validUrl, detectedCountry),
        }
      case 'influencer_post':
        return {
          type: 'influencer_post',
          data: await this.getInfluencerList(validUrl, detectedCountry),
        }
      case 'bestsellers':
        return {
          type: 'bestsellers',
          data: await this.getRankings(validUrl, detectedCountry),
        }
      default: {
        const site = getSite(detectedCountry)
        const html = await resilientFetch(validUrl)
        return {
          type: 'unknown',
          data: {
            url: validUrl,
            html_length: html.length,
          },
        }
      }
    }
  }
}

export const fetchEngine = new AmazonFetchEngine()
