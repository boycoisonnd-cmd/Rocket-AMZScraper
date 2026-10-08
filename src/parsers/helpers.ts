/**
 * Core parsing helpers: numbers, money, clean text, URL transformations,
 * and JSON extractors (balanced_json, json_after, a_state).
 * 100% Feature Parity with amazon/parsers.py helpers.
 */

import * as cheerio from 'cheerio'
import { SiteInfo } from '../shared/sites'

const AMOUNT_START_RE = /\d[\d.,  \s]*/
const WS_RE = /\s+/g
const ASIN_RE = /\/(?:dp|gp\/product|gp\/aw\/d|product-reviews)\/([A-Z0-9]{10})(?:[/?]|$)/i
const NODE_RE = /(?:node=|rh=n(?:%3A|:))(\d+)/i
const RATING_RE = /(\d+(?:[.,]\d+)?)\s*(?:out of|von|sur|su|de|of)\s*5/i
const COUNT_RE = /(\d[\d,.\s ]*)/
const PERCENT_RE = /(-?\d+(?:[.,]\d+)?)\s*%/
const RANK_RE = /#?\s*([\d,. ]+)\s+(?:in|en|dans|in der|su)\s+([^(#\n]+?)(?:\s*\(|\s*$|\s+#)/i
const HIST_RE = /(\d+)\s*(?:percent|%)[^\d]*(\d)\s*star/i
const BOUGHT_RE = /(\d+(?:[.,]\d+)?)\s*([KkMm])?\+?\s*(?:bought|purchased|gekauft|comprado|achetés|acquistato)/i
const IMAGE_SIZE_RE = /\._[^./]+_(?=\.[a-z]+$)/i

const CURRENCY_SYMBOLS: Record<string, string> = {
  $: 'USD',
  'US$': 'USD',
  '£': 'GBP',
  '€': 'EUR',
  '₹': 'INR',
  '¥': 'JPY',
  '￥': 'JPY',
  'C$': 'CAD',
  'CDN$': 'CAD',
  'A$': 'AUD',
  'AU$': 'AUD',
  'S$': 'SGD',
  'R$': 'BRL',
  'MX$': 'MXN',
  kr: 'SEK',
  'zł': 'PLN',
  TL: 'TRY',
  AED: 'AED',
  SAR: 'SAR',
  EGP: 'EGP',
  R: 'ZAR',
  SEK: 'SEK',
  PLN: 'PLN',
  USD: 'USD',
  EUR: 'EUR',
  GBP: 'GBP',
  INR: 'INR',
  JPY: 'JPY',
  CAD: 'CAD',
  AUD: 'AUD',
  SGD: 'SGD',
  BRL: 'BRL',
  MXN: 'MXN',
  TRY: 'TRY',
  ZAR: 'ZAR',
}

const DOLLAR_CURRENCIES = new Set(['USD', 'AUD', 'CAD', 'SGD', 'MXN'])

/**
 * Decode HTML entities and strip hidden zero-width and RTL/LTR marks.
 */
export function unescapeHtml(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

/**
 * Strips zero-width characters, collapses whitespace, unescapes HTML.
 */
export function clean(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null
  }
  let s = String(value)
  s = unescapeHtml(s)
    .replace(/[\u200F\u200E\u200C\u200B]/g, '')
    .replace(WS_RE, ' ')
    .trim()
  return s || null
}

/**
 * Parse localized price text -> float
 * "₹40,524" -> 40524.0, "8,104.64" -> 8104.64, "1 353 €" -> 1353.0, "8.104,64" -> 8104.64
 */
export function parseAmount(text?: string | null): number | null {
  if (!text) return null
  const strText = String(text)
  const m = strText.match(AMOUNT_START_RE)
  if (!m || m.index === undefined) return null

  const prefix = strText.slice(0, m.index)
  const negative = /[-−–]\s*[^\d]*$/.test(prefix)

  let s = m[0].replace(/[\s  ]/g, '')
  if (s.includes(',') && s.includes('.')) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      // 8.104,64 (comma decimal)
      s = s.replace(/\./g, '').replace(',', '.')
    } else {
      // 8,104.64 (dot decimal)
      s = s.replace(/,/g, '')
    }
  } else if (s.includes(',')) {
    const lastComma = s.lastIndexOf(',')
    const head = s.slice(0, lastComma)
    const tail = s.slice(lastComma + 1)
    if (!head.includes(',') && (tail.length === 1 || tail.length === 2)) {
      // 1353,5 (comma decimal)
      s = head + '.' + tail
    } else {
      // 40,524 (grouping)
      s = s.replace(/,/g, '')
    }
  } else if ((s.match(/\./g) || []).length > 1 || ((s.match(/\./g) || []).length === 1 && s.slice(s.lastIndexOf('.') + 1).length === 3)) {
    // 8.104 or 1.234.567 (dot grouping)
    s = s.replace(/\./g, '')
  }

  const val = parseFloat(s)
  if (isNaN(val)) return null
  return negative ? -val : val
}

/**
 * '43,049' / '(21)' / '1 353' / 12 -> int; null when non-numeric
 */
export function toInt(value: unknown): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'boolean') return value ? 1 : 0
  if (typeof value === 'number') return Math.floor(value)
  const match = String(value).match(COUNT_RE)
  if (!match) return null
  const digits = match[1].replace(/[^\d]/g, '')
  return digits ? parseInt(digits, 10) : null
}

/**
 * Converts string or number to rounded float.
 */
export function toFloat(value: unknown, digits = 2): number | null {
  if (value === null || value === undefined) return null
  try {
    const s = String(value).replace(',', '.')
    const parsed = parseFloat(s)
    if (isNaN(parsed)) return null
    return Math.round(parsed * Math.pow(10, digits)) / Math.pow(10, digits)
  } catch {
    return null
  }
}

/**
 * '4.7 out of 5 stars' / '4,2 von 5 Sternen' / '4.5' -> 4.7
 */
export function ratingOf(value: unknown): number | null {
  if (value === null || value === undefined) return null
  const str = String(value)
  const match = str.match(RATING_RE)
  if (match) {
    return toFloat(match[1], 1)
  }
  const simpleMatch = str.match(/^\s*(\d(?:[.,]\d)?)\s*$/)
  return simpleMatch ? toFloat(simpleMatch[1], 1) : null
}

/**
 * '15%' / '-10.5%' -> 15.0 or -10.5
 */
export function percentOf(value: unknown): number | null {
  const match = String(value || '').match(PERCENT_RE)
  return match ? toFloat(match[1], 1) : null
}

export interface MoneyBlock {
  amount: number | null
  currency: string | null
}

/**
 * Localized price text -> {amount, currency}; null when no number
 */
export function money(value: unknown, currency: string | null = null): MoneyBlock | null {
  if (value === null || value === undefined) return null
  const raw = clean(value)
  if (!raw) return null
  const amount = parseAmount(raw)
  if (amount === null) return null

  let code = currency
  const sortedSymbols = Object.entries(CURRENCY_SYMBOLS).sort((a, b) => b[0].length - a[0].length)
  for (const [symbol, iso] of sortedSymbols) {
    if (raw.includes(symbol)) {
      if (symbol === '$' && currency && DOLLAR_CURRENCIES.has(currency)) {
        break
      }
      code = iso
      break
    }
  }
  return { amount, currency: code }
}

export function amountOf(value: unknown): number | null {
  const b = money(value)
  return b ? b.amount : null
}

const MONTHS: Record<string, string> = {
  january: '01', feb: '02', february: '02', mar: '03', march: '03', apr: '04', april: '04',
  may: '05', jun: '06', june: '06', jul: '07', july: '07', aug: '08', august: '08',
  sep: '09', sept: '09', september: '09', oct: '10', october: '10', nov: '11', november: '11',
  dec: '12', december: '12',
}

/**
 * 'July 26, 2026' / '27 August 2026' -> '2026-07-26'; null when unparsed
 */
export function isoDate(value: unknown): string | null {
  const val = clean(value)
  if (!val) return null
  try {
    const d = new Date(val)
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    }
  } catch {
    // continue
  }
  // Try regex for YYYY-MM-DD
  const isoMatch = val.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`
  }
  return null
}

/**
 * '6K+ bought in past month' -> 6000 (lower bound); null otherwise
 */
export function boughtPastMonth(value: unknown): number | null {
  const match = String(value || '').match(BOUGHT_RE)
  if (!match) return null
  const number = toFloat(match[1], 2) || 0
  const unit = (match[2] || '').toUpperCase()
  return Math.floor(number * (unit === 'K' ? 1000 : unit === 'M' ? 1000000 : 1))
}

/**
 * 'Customer Reviews' -> 'customer_reviews'
 */
export function snake(label: unknown): string | null {
  let s = clean(label) || ''
  s = s.replace(/&/g, 'and').replace(/[^\w]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase()
  s = s.replace(/_+/g, '_')
  return s || null
}

const STRIP_QUERY_PARAMS = new Set([
  'ref', 'ref_', 'qid', 'sr', 'dib', 'dib_tag', 'keywords', 'sp_csd', 'psc', 'th', 'pd_rd_i',
  'pd_rd_r', 'pd_rd_w', 'pd_rd_wg', 'pf_rd_p', 'pf_rd_r', 'tag', 'linkCode', 'creativeASIN',
  '_encoding', 'ie', 'crid', 'sprefix', 'content-id', 'smid', 'pdp_new', 'ds', 'rnid', 'dc',
  'field-lbr_brands_browse-bin', 'lp_asin', 'store_ref',
])

/**
 * Site-relative href -> absolute link without the ref= tracking tail and tracking queries.
 */
export function absolute(site: SiteInfo, href?: string | null): string | null {
  let h = clean(href)
  if (!h || h.startsWith('javascript:') || h.startsWith('#')) {
    return null
  }
  if (h.startsWith('/sspa/click')) {
    try {
      const q = new URL(h, site.base)
      const target = q.searchParams.get('url')
      if (target) {
        h = decodeURIComponent(target)
      }
    } catch {
      // keep h
    }
  }
  try {
    const fullUrl = new URL(h, site.base)
    fullUrl.pathname = fullUrl.pathname.replace(/\/ref=[^/?#]*/, '')
    const keysToDelete: string[] = []
    fullUrl.searchParams.forEach((_, key) => {
      if (STRIP_QUERY_PARAMS.has(key)) {
        keysToDelete.push(key)
      }
    })
    keysToDelete.forEach((key) => fullUrl.searchParams.delete(key))
    const res = fullUrl.toString().replace(/\?$/, '')
    return res
  } catch {
    return null
  }
}

export function productLink(site: SiteInfo, asin?: string | null): string | null {
  return asin ? `${site.base}/dp/${asin}` : null
}

export function asinIn(href?: string | null): string | null {
  const match = (href || '').match(ASIN_RE)
  return match ? match[1].toUpperCase() : null
}

export function nodeIn(href?: string | null): string | null {
  if (!href) return null
  try {
    const decoded = decodeURIComponent(href)
    const url = new URL(href, 'https://www.amazon.com')
    const rh = decodeURIComponent(url.searchParams.get('rh') || '')
    const nodes = Array.from(rh.matchAll(/(?:^|,)n:(\d+)/g)).map((m) => m[1])
    if (nodes.length > 0) {
      return nodes[nodes.length - 1]
    }
    const node = url.searchParams.get('node')
    if (node && /^\d+$/.test(node)) {
      return node
    }
    const match = decoded.match(NODE_RE)
    return match ? match[1] : null
  } catch {
    const match = (href || '').match(NODE_RE)
    return match ? match[1] : null
  }
}

/**
 * Strip the size modifier from a media-amazon image link
 * (…/71kEunh4iBL._AC_UY218_.jpg -> …/71kEunh4iBL.jpg)
 */
export function fullImage(src?: string | null): string | null {
  const s = clean(src)
  if (!s) return null
  return s.replace(IMAGE_SIZE_RE, '')
}

/**
 * Parse the JSON object/array whose opening bracket is at `start`.
 */
export function balancedJson(text: string, start: number): any {
  const opener = text[start]
  if (opener !== '{' && opener !== '[') return null
  const closer = opener === '{' ? '}' : ']'
  let depth = 0
  let inStr = false
  let esc = false

  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (inStr) {
      if (esc) {
        esc = false
      } else if (ch === '\\') {
        esc = true
      } else if (ch === '"') {
        inStr = false
      }
      continue
    }
    if (ch === '"') {
      inStr = true
    } else if (ch === opener) {
      depth++
    } else if (ch === closer) {
      depth--
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, i + 1))
        } catch {
          return null
        }
      }
    }
  }
  return null
}

/**
 * The JSON value that follows the first `marker` (e.g. '"colorImages":')
 * that is actually followed by `opener`.
 */
export function jsonAfter(text: string, marker: string, opener: '{' | '[' = '{'): any {
  let start = 0
  while (true) {
    const i = text.indexOf(marker, start)
    if (i < 0) return null
    let j = i + marker.length
    while (j < text.length && ' :\n\t\r'.includes(text[j])) {
      j++
    }
    if (j < text.length && text[j] === opener) {
      const val = balancedJson(text, j)
      if (val !== null) {
        return val
      }
    }
    start = i + marker.length
  }
}

/**
 * The JSON of a <script type="a-state" data-a-state='{"key":...}'> block.
 */
export function aState($: cheerio.CheerioAPI, key: string): any {
  let result: any = null
  $('script[type="a-state"]').each((_, el) => {
    if (result !== null) return
    const rawMeta = $(el).attr('data-a-state') || '{}'
    try {
      const meta = JSON.parse(unescapeHtml(rawMeta))
      if (meta && meta.key === key) {
        const content = $(el).text() || 'null'
        result = JSON.parse(content)
      }
    } catch {
      // ignore
    }
  })
  return result
}

/**
 * Drop null and undefined values from an object.
 */
export function compact<T extends Record<string, any>>(obj: T): Partial<T> {
  const out: Record<string, any> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v !== null && v !== undefined) {
      out[k] = v
    }
  }
  return out as Partial<T>
}

export function text(el?: cheerio.Cheerio<any> | null): string | null {
  return el && el.length > 0 ? clean(el.text()) : null
}

export function first(el: cheerio.Cheerio<any>, selector: string): cheerio.Cheerio<any> {
  return el.find(selector).first()
}

export function firstText(el: cheerio.Cheerio<any>, selector: string): string | null {
  return clean(el.find(selector).first().text())
}

export function attr(el?: cheerio.Cheerio<any> | null, name?: string): string | null {
  return el && el.length > 0 && name ? clean(el.attr(name)) : null
}

export interface PriceBlock {
  amount: number | null
  currency: string | null
  list_price?: number | null
  unit_price?: { amount: number | null; per: string | null } | number | null
  unit?: string | null
  savings_percent?: number | null
  savings_amount?: number | null
  list_price_type?: string | null
}

/**
 * Price block extraction from any element holding .a-price spans.
 */
export function extractPriceBlock($: cheerio.CheerioAPI, el: cheerio.Cheerio<any>, currency: string | null): PriceBlock | null {
  if (!el || el.length === 0) return null
  const prices = el.find('.a-price').filter((_, p) => $(p).parents('.a-price').length === 0)
  let current: string | null = null
  let strike: string | null = null

  prices.each((_, p) => {
    const offscreen = clean($(p).find('.a-offscreen').first().text()) || clean($(p).text())
    const isStrike = $(p).attr('data-a-strike') === 'true' || ($(p).attr('class') || '').includes('a-text-price')
    if (isStrike) {
      strike = strike || offscreen
    } else {
      current = current || offscreen
    }
  })

  if (!current && !strike) return null
  const m = money(current, currency) || { amount: null, currency }
  const out: PriceBlock = {
    amount: m.amount,
    currency: m.currency,
    list_price: amountOf(strike),
  }
  return out
}

/**
 * Finds the closest parent container (tr, li, div) of the first text node matching regex.
 */
export function findMatchingTextNodeParent(
  $: cheerio.CheerioAPI,
  regex: RegExp
): cheerio.Cheerio<any> | null {
  let matchedParent: cheerio.Cheerio<any> | null = null
  function walk(node: any) {
    if (matchedParent) return
    if (node.type === 'text' && regex.test(node.data)) {
      matchedParent = $(node).closest('tr, li, div')
      return
    }
    if (node.children) {
      for (const child of node.children) {
        walk(child)
        if (matchedParent) return
      }
    }
  }
  walk($.root()[0])
  return matchedParent
}

/**
 * Finds the text of the immediately preceding non-empty text node before target element.
 */
export function findPreviousText(
  $: cheerio.CheerioAPI,
  targetEl: cheerio.Cheerio<any>
): string | null {
  if (targetEl.length === 0) return null
  const target = targetEl[0]
  let prevText: string | null = null
  let stop = false

  function walk(node: any) {
    if (node === target) {
      stop = true
      return
    }
    if (stop) return
    if (node.type === 'text' && node.data && clean(node.data)) {
      prevText = clean(node.data)
    }
    if (node.children) {
      for (const child of node.children) {
        walk(child)
        if (stop) return
      }
    }
  }

  walk($.root()[0])
  return prevText
}
