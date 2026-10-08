/**
 * Amazon Best Sellers, Movers & Shakers, New Releases, Most Wished For rankings parser.
 * 100% Feature Parity with amazon/parsers.py (bestsellers_page, bestseller_card, bestsellers_acp_page).
 */

import * as cheerio from 'cheerio'
import { SiteInfo } from '../shared/sites'
import {
  clean,
  toInt,
  ratingOf,
  percentOf,
  money,
  absolute,
  productLink,
  fullImage,
  unescapeHtml,
} from './helpers'
import { BestsellerCard, BestsellersPageResult } from '../shared/types'

function extractRecsList($: cheerio.CheerioAPI): any[] {
  const grid = $('[data-client-recs-list]').first()
  if (grid.length === 0) return []
  try {
    const raw = grid.attr('data-client-recs-list') || '[]'
    return JSON.parse(unescapeHtml(raw))
  } catch {
    return []
  }
}

export function parseBestsellerCard(
  $: cheerio.CheerioAPI,
  card: cheerio.Cheerio<any>,
  site: SiteInfo,
  meta?: Record<string, any>
): BestsellerCard {
  const asinEl = card.find('[data-asin]').first().length > 0 ? card.find('[data-asin]').first() : card
  const asin = asinEl.attr('data-asin') || null

  const ratingEl =
    card.find("a[aria-label*='out of 5']").first().length > 0
      ? card.find("a[aria-label*='out of 5']").first()
      : card.find('i.a-icon-star-small').first()

  const ratingLabel = ratingEl.attr('aria-label') || clean(ratingEl.find('.a-icon-alt').first().text())
  let count: number | null = null
  if (ratingLabel) {
    const m = ratingLabel.match(/stars?,\s*([\d,. ]+)/)
    if (m) {
      count = toInt(m[1])
    }
  }
  if (count === null) {
    count = toInt(card.find('span.a-size-small').first().text())
  }

  const priceText = clean(
    card.find('.p13n-sc-price, ._cDEzb_p13n-sc-price_3mJ9Z, span.a-color-price, .a-price .a-offscreen').first().text()
  )

  const mData = meta || {}
  const rank =
    toInt(card.find('.zg-bdg-text').first().text()) ||
    toInt(mData['render.zg.rank'])

  const change = percentOf(mData['render.zg.bsms.percentageChange'] || '')

  const titleEl = card.find('[class*=line-clamp]').first()
  const title = clean(titleEl.text()) || card.find('img').first().attr('alt') || null
  const img = card.find('img').first()

  return {
    rank,
    asin,
    title,
    link: productLink(site, asin),
    image: fullImage(img.attr('src')),
    rating: ratingLabel ? { average: ratingOf(ratingLabel), count } : null,
    price: priceText && /\d/.test(priceText) ? (money(priceText, site.currency) as any) : null,
    price_text: priceText,
    rank_change_percent: change,
    previous_rank: toInt(mData['render.zg.bsms.twentyFourHourOldSalesRank']),
    sales_rank: toInt(mData['render.zg.bsms.currentSalesRank']),
  }
}

/**
 * Main bestsellers page parser.
 */
export function parseBestsellersPage(htmlText: string, site: SiteInfo): BestsellersPageResult {
  const $ = cheerio.load(htmlText || '')
  const recs = extractRecsList($)
  const metaByAsin: Record<string, any> = {}
  for (const r of recs) {
    if (r && typeof r === 'object' && r.id) {
      metaByAsin[r.id] = r.metadataMap || {}
    }
  }

  const items: BestsellerCard[] = []
  $('#gridItemRoot').each((_, card) => {
    const asinEl = $(card).find('[data-asin]').first().length > 0 ? $(card).find('[data-asin]').first() : $(card)
    const asin = asinEl.attr('data-asin') || ''
    const parsed = parseBestsellerCard($, $(card), site, metaByAsin[asin])
    if (parsed.asin) {
      items.push(parsed)
    }
  })

  const tree: BestsellersPageResult['tree'] = []
  $('[class*=zg-browse-item], [class*=zg-root-browse-item]').each((_, li) => {
    const a = $(li).find('a[href]').first()
    let name = clean($(li).text())
    if (!name) return

    const href = a.length > 0 ? a.attr('href') : null
    const cleanHref = (href || '').replace(/\/ref=[^/?#]*/, '')
    const pathMatch = cleanHref.match(
      /\/(?:zgbs|gp\/(?:bestsellers|new-releases|movers-and-shakers|most-wished-for|most-gifted))\/([^?#]*)/
    )

    name = clean(name.replace(/^[‹<]\s*|\s*\(Current\)$/g, ''))
    tree.push({
      name,
      path: pathMatch ? pathMatch[1].replace(/^\/+|\/+$/g, '') || null : null,
      link: href ? absolute(site, href) : null,
      is_selected: a.length === 0,
      is_root: ($(li).attr('class') || '').includes('zg-root-browse-item'),
    })
  })

  const cardRoot = $('[data-acp-path]').first()
  const grid = $('.p13n-desktop-grid').first()
  let acp: BestsellersPageResult['acp'] = null
  if (cardRoot.length > 0) {
    acp = {
      path: cardRoot.attr('data-acp-path') || null,
      params: unescapeHtml(cardRoot.attr('data-acp-params') || ''),
      reftag: grid.length > 0 ? grid.attr('data-reftag') || null : null,
      faceout: (grid.length > 0 ? grid.attr('data-faceoutkataname') : null) || 'GeneralFaceout',
      rendered: items.length,
      entries: recs,
    }
  }

  const tabs: BestsellersPageResult['tabs'] = []
  $('[class*=mlt-list-type] a, .zg-tabs a').each((_, a) => {
    const name = clean($(a).text())
    if (name) {
      tabs.push({
        name,
        link: absolute(site, $(a).attr('href')),
      })
    }
  })

  return {
    title: clean($('h1').first().text()),
    items,
    expected_count: recs.length || items.length,
    tree,
    tabs,
    acp,
  }
}

/**
 * Hydrates items 31-50 or 51-100 from ACP Ajax HTML fragment.
 */
export function parseBestsellersAcpPage(
  htmlText: string,
  site: SiteInfo,
  metaByAsin?: Record<string, any>
): BestsellerCard[] {
  const $ = cheerio.load(htmlText || '')
  const out: BestsellerCard[] = []

  $('#gridItemRoot, .p13n-grid-content').each((_, card) => {
    const asinEl = $(card).find('[data-asin]').first().length > 0 ? $(card).find('[data-asin]').first() : $(card)
    const asin = asinEl.attr('data-asin')
    if (!asin) return

    const parsed = parseBestsellerCard($, $(card), site, metaByAsin?.[asin])
    if (!out.some((o) => o.asin === asin)) {
      out.push(parsed)
    }
  })

  return out
}
