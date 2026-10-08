/**
 * Amazon reference parsing: ONE param per input that auto-detects its forms.
 * 100% Feature Parity with amazon/refs.py
 */

import { countryForHost } from './sites'

const ASIN_RE = /^[A-Z0-9]{10}$/
const ASIN_PATH_RE = /\/(?:dp|gp\/product|gp\/aw\/d|product-reviews|gp\/offer-listing|dp\/product)\/([A-Z0-9]{10})(?=[/?#]|$)/i
const ASIN_SLUG_RE = /\/dp\/([A-Z0-9]{10})/i
const SELLER_RE = /^A[A-Z0-9]{9,24}$/
const HANDLE_RE = /^[A-Za-z0-9._\-]{1,80}$/
const POST_ID_RE = /^[A-Z0-9]{8,20}$/
const BS_PATH_RE = /\/(?:zgbs|gp\/(?:bestsellers|new-releases|movers-and-shakers|most-wished-for|most-gifted))\/([^?#]*)/i

function isLink(value: string): boolean {
  const low = value.toLowerCase()
  return low.startsWith('http://') || low.startsWith('https://') || low.startsWith('//') || low.includes('amazon.')
}

function parseUrl(value: string): URL {
  const url = value.includes('://') ? value : 'https://' + value.replace(/^\/+/, '')
  try {
    return new URL(url)
  } catch {
    return new URL('https://' + value)
  }
}

/**
 * ISO country of an Amazon link, null for bare IDs or non-Amazon hosts.
 */
export function countryOf(value?: string | null): string | null {
  const val = (value || '').trim()
  if (!val || !isLink(val)) {
    return null
  }
  try {
    const parsed = parseUrl(val)
    return countryForHost(parsed.hostname)
  } catch {
    return null
  }
}

/**
 * Resolves product param: ASIN string or Amazon product link -> 10-char ASIN
 */
export function resolveProduct(value?: string | null): string {
  const val = (value || '').trim()
  if (ASIN_RE.test(val.toUpperCase()) && !/^[A-Za-z]+$/.test(val)) {
    return val.toUpperCase()
  }
  if (isLink(val)) {
    const parsed = parseUrl(val)
    const match = parsed.pathname.match(ASIN_PATH_RE) || parsed.pathname.match(ASIN_SLUG_RE)
    if (match) {
      return match[1].toUpperCase()
    }
    const asinParam = parsed.searchParams.get('asin')
    if (asinParam && ASIN_RE.test(asinParam.toUpperCase())) {
      return asinParam.toUpperCase()
    }
  }
  throw new Error('Product must be an ASIN (e.g. B00939I7EK) or an Amazon product link (.../dp/<asin>)')
}

/**
 * Resolves seller param: Seller ID or seller link -> Seller ID
 */
export function resolveSeller(value?: string | null): string {
  const val = (value || '').trim()
  if (SELLER_RE.test(val.toUpperCase()) && !isLink(val)) {
    return val.toUpperCase()
  }
  if (isLink(val)) {
    const parsed = parseUrl(val)
    for (const key of ['seller', 'me', 'sellerID', 'merchant']) {
      const sid = parsed.searchParams.get(key)
      if (sid && SELLER_RE.test(sid.toUpperCase())) {
        return sid.toUpperCase()
      }
    }
  }
  throw new Error('Seller must be an Amazon seller id (e.g. A1D09S7Q0OD6TH) or a seller link (amazon.com/sp?seller=<id>)')
}

/**
 * Resolves influencer storefront handle from handle string or shop link.
 */
export function resolveInfluencer(value?: string | null): string {
  let val = (value || '').trim()
  if (isLink(val)) {
    const parsed = parseUrl(val)
    const parts = parsed.pathname.split('/').filter(Boolean)
    if (parts.length >= 2 && parts[0].toLowerCase() === 'shop') {
      return parts[1]
    }
    throw new Error('Influencer link must look like amazon.com/shop/<name>')
  }
  val = val.replace(/^@+/, '')
  if (HANDLE_RE.test(val)) {
    return val
  }
  throw new Error('Influencer must be an Amazon storefront name (e.g. tastemade) or an amazon.com/shop/<name> link')
}

export interface ResolvedPost {
  handle: string | null
  id: string
}

/**
 * Resolves post list/idea id and handle.
 */
export function resolvePost(value?: string | null): ResolvedPost {
  const val = (value || '').trim()
  if (isLink(val)) {
    const parsed = parseUrl(val)
    const parts = parsed.pathname.split('/').filter(Boolean)
    if (
      parts.length >= 4 &&
      parts[0].toLowerCase() === 'shop' &&
      ['list', 'post', 'photo', 'video', 'idea'].includes(parts[2].toLowerCase())
    ) {
      return { handle: parts[1], id: parts[3] }
    }
    throw new Error('Post link must look like amazon.com/shop/<name>/list/<id>')
  }
  if (POST_ID_RE.test(val.toUpperCase())) {
    return { handle: null, id: val }
  }
  throw new Error('Post must be an influencer list / post id (e.g. 1N84PQ3CI4NW0) or its amazon.com/shop/<name>/list/<id> link')
}

/**
 * Resolves browse node ID: numeric string or category link -> numeric string
 */
export function resolveNode(value?: string | null): string {
  const val = (value || '').trim()
  if (/^\d+$/.test(val)) {
    return val
  }
  if (isLink(val)) {
    const parsed = parseUrl(val)
    const rh = decodeURIComponent(parsed.searchParams.get('rh') || '')
    const nodes = Array.from(rh.matchAll(/(?:^|,)n:(\d+)/g)).map((m) => m[1])
    if (nodes.length > 0) {
      return nodes[nodes.length - 1]
    }
    const node = parsed.searchParams.get('node')
    if (node && /^\d+$/.test(node)) {
      return node
    }
    const bMatch = parsed.pathname.match(/\/b\/(?:[^/]+\/)?(\d+)/) || val.match(/node=(\d+)/)
    if (bMatch) {
      return bMatch[1]
    }
  }
  throw new Error('Category must be a numeric Amazon browse node id (e.g. 172282) or a category link (amazon.com/s?rh=n:172282, amazon.com/b?node=172282)')
}

/**
 * Resolves best-sellers category: alias, path, or link -> category alias path
 */
export function resolveBestsellerCategory(value?: string | null): string {
  const val = (value || '').trim()
  if (isLink(val)) {
    const parsed = parseUrl(val)
    const match = parsed.pathname.match(BS_PATH_RE)
    if (!match) {
      throw new Error('Category link must be an Amazon best sellers / new releases / movers & shakers page')
    }
    const path = match[1].replace(/\/ref=.*$/, '').replace(/^\/+|\/+$/g, '')
    return path
  }
  const cleanPath = val.replace(/^\/+|\/+$/g, '')
  if (cleanPath === '' || cleanPath.toLowerCase() === 'all' || cleanPath.toLowerCase() === 'any') {
    return ''
  }
  if (/^[a-z0-9\-]+(\/\d+)?$/i.test(cleanPath)) {
    return cleanPath
  }
  throw new Error('Category must be a best sellers category alias (e.g. electronics or electronics/172541) or its link')
}

/**
 * Resolves query text from raw string or Amazon search link.
 */
export function resolveQuery(value?: string | null): string {
  const val = (value || '').trim()
  if (isLink(val) && val.toLowerCase().includes('amazon.')) {
    const parsed = parseUrl(val)
    const keyword = parsed.searchParams.get('k') || parsed.searchParams.get('keywords') || parsed.searchParams.get('field-keywords')
    if (keyword && keyword.trim()) {
      return keyword.trim()
    }
    throw new Error('Search link must carry a k= keyword (amazon.com/s?k=laptop)')
  }
  if (!val) {
    throw new Error('Query must not be empty')
  }
  return val
}

/**
 * Validates and normalizes Amazon link.
 */
export function resolveLink(value?: string | null): string {
  const val = (value || '').trim()
  if (!isLink(val) || !countryOf(val)) {
    throw new Error('URL must be a link on an Amazon marketplace (amazon.com, amazon.co.uk, amazon.de, ...)')
  }
  return val.includes('://') ? val : 'https://' + val.replace(/^\/+/, '')
}

export type PageType = 'product' | 'seller' | 'influencer_post' | 'influencer' | 'bestsellers' | 'deals' | 'search' | null

/**
 * Determines what kind of Amazon page a link points to.
 */
export function detectPageType(link: string): PageType {
  const parsed = parseUrl(link)
  const path = parsed.pathname.toLowerCase()
  if (ASIN_PATH_RE.test(parsed.pathname) || ASIN_SLUG_RE.test(parsed.pathname)) {
    return 'product'
  }
  if (path.startsWith('/sp') && parsed.searchParams.get('seller')) {
    return 'seller'
  }
  if (path.startsWith('/shop/')) {
    const parts = path.split('/').filter(Boolean)
    return parts.length >= 4 ? 'influencer_post' : 'influencer'
  }
  if (BS_PATH_RE.test(parsed.pathname)) {
    return 'bestsellers'
  }
  if (path.startsWith('/deals') || path.startsWith('/gp/goldbox')) {
    return 'deals'
  }
  if (
    path.startsWith('/s') ||
    parsed.searchParams.get('k') ||
    parsed.searchParams.get('me') ||
    parsed.searchParams.get('rh') ||
    path.startsWith('/b')
  ) {
    return 'search'
  }
  return null
}
