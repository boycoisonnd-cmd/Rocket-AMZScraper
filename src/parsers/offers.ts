/**
 * Product offers parser for /gp/product/ajax/aodAjaxMain modal.
 * 100% Feature Parity with amazon/parsers.py (offers_page, _offer).
 */

import * as cheerio from 'cheerio'
import { SiteInfo } from '../shared/sites'
import {
  clean,
  text,
  first,
  firstText,
  attr,
  toInt,
  ratingOf,
  percentOf,
  money,
  amountOf,
  absolute,
} from './helpers'
import { OfferItem, OffersPageResult } from '../shared/types'

function parseOfferBlock($: cheerio.CheerioAPI, block: cheerio.Cheerio<any>, site: SiteInfo, isPinned: boolean): OfferItem {
  const currency = site.currency
  const priceEl = block.find('#aod-offer-price').first().length > 0 ? block.find('#aod-offer-price').first() : block

  const current =
    clean(priceEl.find('.a-price:not([data-a-strike]) .a-offscreen').first().text()) ||
    clean(priceEl.find('.aok-offscreen').first().text())

  const price: any = current ? money(current, currency) : null
  const strike = clean(block.find('[data-a-strike=true] .a-offscreen, .basisPrice .a-offscreen').first().text())

  if (price !== null) {
    price.list_price = amountOf(strike)
    const savings = clean(block.find('.savingsPercentage, .a-color-price').first().text())
    price.savings_percent = savings && savings.includes('%') ? Math.abs(percentOf(savings) || 0) : null
  }

  const soldByEl = block.find('#aod-offer-soldBy').first()
  const sellerA = soldByEl.find('a').first()
  const sellerHref = sellerA.attr('href') || null
  const sellerName =
    clean(sellerA.text()) ||
    clean((clean(soldByEl.text()) || '').replace(/^(Sold by|Verkauf durch|Vendu par)\s*/i, ''))

  let sellerId: string | null = null
  if (sellerHref) {
    try {
      const u = new URL(sellerHref, site.base)
      sellerId = u.searchParams.get('seller')
    } catch {
      // ignore
    }
  }

  const shipsFromRaw = clean(block.find('#aod-offer-shipsFrom').first().text()) || ''
  const shipsFrom = clean(shipsFromRaw.replace(/^(Ships from|Dispatches from|Versand durch|Expédié par)\s*/i, ''))

  const conditionHeading = clean(block.find('#aod-offer-heading').first().text())
  const condition = conditionHeading || (isPinned ? 'New' : null)

  let note = clean(block.find('#aod-condition-container').first().text())
  if (note) {
    note = clean(note.replace(/^(Condition|Zustand|État)\s*/i, ''))
  }

  const deliveryList: string[] = []
  block.find('[data-csa-c-delivery-price]').each((_, el) => {
    const t = clean($(el).text())
    if (t) deliveryList.push(t)
  })

  const qtyList: number[] = []
  block.find('select[id^=aod-qty] option, #aod-qty-option option').each((_, o) => {
    const n = toInt($(o).text())
    if (n !== null) qtyList.push(n)
  })

  const ratingText = clean(block.find('#aod-offer-seller-rating').first().text()) || ''
  const countMatch = ratingText.match(/\((\d[\d,]*)/)

  return {
    condition,
    condition_note: note || null,
    price,
    seller:
      sellerName || sellerId
        ? {
            name: sellerName || null,
            id: sellerId,
            link: sellerId ? `${site.base}/sp?seller=${sellerId}` : absolute(site, sellerHref),
            rating: ratingOf(ratingText),
            positive_percent: percentOf(ratingText),
            ratings_count: countMatch ? toInt(countMatch[1]) : null,
          }
        : null,
    ships_from: shipsFrom || null,
    is_fulfilled_by_amazon: (shipsFrom || '').toLowerCase().startsWith('amazon'),
    is_sold_by_amazon: (sellerName || '').toLowerCase().startsWith('amazon'),
    is_prime: block.find('.a-icon-prime').length > 0,
    delivery:
      deliveryList.length > 0
        ? {
            text: deliveryList[0] || null,
            fastest_text: deliveryList.length > 1 ? deliveryList[1] : null,
          }
        : null,
    max_quantity: qtyList.length > 0 ? Math.max(...qtyList) : null,
    promotion: clean(block.find('[id^=aod-offer-promotion]').first().text()) || null,
    is_pinned: isPinned,
  }
}

/**
 * Main offers page parser.
 */
export function parseOffersPage(htmlText: string, site: SiteInfo): OffersPageResult {
  const $ = cheerio.load(htmlText || '')
  const pinned = $('#aod-pinned-offer').first()
  const offers: OfferItem[] = []

  if (pinned.length > 0 && (pinned.find('.a-price').length > 0 || pinned.find('.aok-offscreen').length > 0)) {
    offers.push(parseOfferBlock($, pinned, site, true))
  }

  $('#aod-offer').each((_, block) => {
    offers.push(parseOfferBlock($, $(block), site, false))
  })

  const total = toInt($('#aod-total-offer-count').first().attr('value'))
  const unpinnedCount = offers.filter((o) => !o.is_pinned).length

  const asinVal =
    $('#aod-asin-block-asin').first().attr('value') ||
    (htmlText.match(/data-asin="([A-Z0-9]{10})"/) || [null, null])[1]

  const ratingAvg = ratingOf($('#aod-asin-reviews-star .a-icon-alt').first().text())
  const ratingCount = toInt($('#aod-asin-reviews-count-title').first().text())

  return {
    asin: asinVal,
    title: clean($('#aod-asin-title-text').first().text()),
    rating: $('#aod-asin-reviews').length > 0 ? { average: ratingAvg, count: ratingCount } : null,
    offers,
    other_offers_count: total,
    has_more: !htmlText.includes('aod-end-of-results') && total !== null && total > unpinnedCount,
  }
}
