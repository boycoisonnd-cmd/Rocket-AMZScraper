/**
 * Amazon search and category browse parser.
 * 100% Feature Parity with amazon/parsers.py (search_page, search_card, _facet).
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
  money,
  amountOf,
  boughtPastMonth,
  absolute,
  productLink,
  nodeIn,
  fullImage,
  PriceBlock,
} from './helpers'
import {
  SearchCard,
  SearchPageResult,
  RefinementFacet,
  DepartmentNode,
} from '../shared/types'

const BADGE_KEYS: [string, string][] = [
  ['best seller', 'is_best_seller'],
  ["amazon's choice", 'is_amazons_choice'],
  ['overall pick', 'is_overall_pick'],
  ['limited time deal', 'is_limited_time_deal'],
  ['climate pledge', 'is_climate_pledge_friendly'],
  ['small business', 'is_small_business'],
  ['new on amazon', 'is_new_arrival'],
  ['lowest price', 'is_lowest_price_in_days'],
]

function extractSearchPriceBlock($: cheerio.CheerioAPI, el: cheerio.Cheerio<any>, currency: string): PriceBlock & { list_price_type?: string | null } | null {
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
  const block: any = money(current, currency) || { amount: null, currency }
  block.list_price = amountOf(strike)

  const unitText = clean(el.text()) || ''
  const unitMatch = unitText.match(/\(\s*([^()]*?\d[^()]*?)\s*\/\s*([^()]+?)\s*\)/)
  if (unitMatch) {
    block.unit_price = { amount: amountOf(unitMatch[1]), per: clean(unitMatch[2]) }
  } else {
    block.unit_price = null
  }

  const labelMatch = unitText.match(/\b(Typical|List|RRP|Was|UVP|Prix conseillé|Prezzo consigliato|Precio recomendado)\b/)
  block.list_price_type = labelMatch && block.list_price !== null ? labelMatch[1] : null

  return block
}

export function parseSearchCard($: cheerio.CheerioAPI, card: cheerio.Cheerio<any>, site: SiteInfo): SearchCard | null {
  const asin = card.attr('data-asin')
  if (!asin) return null

  const currency = site.currency
  const titleEl =
    card.find('[data-cy=title-recipe] a h2').first().length > 0
      ? card.find('[data-cy=title-recipe] a h2').first()
      : card.find('h2[aria-label]').first().length > 0
      ? card.find('h2[aria-label]').first()
      : card.find('h2 span').first().length > 0
      ? card.find('h2 span').first()
      : card.find('h2').first().length > 0
      ? card.find('h2').first()
      : card.find('[data-cy=title-recipe] a').first()

  const brandEl = card.find('[data-cy=title-recipe] > .a-row h2').first()
  const link = productLink(site, asin)
  const img = card.find('img.s-image').first()
  const reviews = card.find('[data-cy=reviews-block]').first()

  const ratingEl =
    reviews.find('[data-cy=reviews-ratings-slot] .a-icon-alt').first().length > 0
      ? reviews.find('[data-cy=reviews-ratings-slot] .a-icon-alt').first()
      : reviews.find('i.a-icon-star-small .a-icon-alt').first()

  const rating =
    ratingOf(ratingEl.text()) ||
    ratingOf(reviews.find('span.a-size-small.a-color-base').first().text())

  let ratingsCount: number | null = null
  if (reviews.length > 0) {
    reviews.find('[aria-label]').each((_, el) => {
      const label = $(el).attr('aria-label') || ''
      if (/^[\d,.\u00a0]+\s+(ratings?|Bewertungen|évaluations|valutazioni|calificaciones|reseñas)$/i.test(label)) {
        ratingsCount = toInt(label)
      }
    })
  }
  if (ratingsCount === null && reviews.length > 0) {
    ratingsCount = toInt(reviews.find('span.s-underline-text').first().text())
  }

  const priceBlock = extractSearchPriceBlock($, card.find('[data-cy=price-recipe]').first(), currency)

  const secondary = clean(card.find('[data-cy=secondary-offer-recipe]').first().text())
  let more: SearchCard['more_buying_choices'] = null
  if (secondary) {
    const countMatch = secondary.match(/\((\d[\d,]*)/)
    more = {
      lowest_price: amountOf(secondary),
      offers_count: countMatch ? toInt(countMatch[1]) : null,
      text: secondary,
    }
  }

  let badgeText = ''
  card.find('.a-badge-text, [data-cy=s-pc-faceout-badge]').each((_, b) => {
    const t = clean($(b).text())
    if (t) badgeText += ' ' + t
  })
  badgeText = badgeText.trim()

  const faceoutText = clean(card.text()) || ''
  const low = (badgeText + ' ' + faceoutText.slice(0, 600)).toLowerCase()

  const badges: Record<string, boolean> = {}
  for (const [label, key] of BADGE_KEYS) {
    badges[key] = low.includes(label)
  }
  badges.is_prime = card.find('.a-icon-prime, .s-prime').length > 0

  const delivery = clean(card.find('[data-cy=delivery-recipe]').first().text())
  const coupon = clean(card.find('.s-coupon-unclipped, [data-cy=coupon-recipe]').first().text())

  const optionsMatch = faceoutText.match(/Options:\s*([^.\n]+?)(?:\s+See options|\s+\d|$)/)
  const reviewsText = reviews.length > 0 ? clean(reviews.text()) || '' : ''
  const bought = boughtPastMonth(reviewsText)
  const boughtMatch = reviewsText.match(/[\d.,]+[KkMm]?\+?\s*bought in past month/i)

  const isSponsored =
    (card.attr('class') || '').includes('AdHolder') ||
    card.find('.AdHolder, .puis-sponsored-label-text, .s-sponsored-label-text').length > 0 ||
    card.parents('.AdHolder').length > 0

  const brandText = brandEl.length > 0 && brandEl[0] !== titleEl[0] ? clean(brandEl.text()) : null

  return {
    asin,
    title: clean(titleEl.text()),
    brand: brandText,
    link,
    image: fullImage(img.attr('src')),
    thumbnail: img.attr('src') || null,
    is_sponsored: isSponsored,
    price: priceBlock,
    rating: rating !== null || ratingsCount !== null ? { average: rating, count: ratingsCount } : null,
    bought_past_month: bought,
    bought_past_month_text: boughtMatch ? boughtMatch[0] : null,
    badges,
    delivery,
    coupon,
    variations_text: optionsMatch ? clean(optionsMatch[1]) : null,
    has_variations: !!optionsMatch || faceoutText.includes('See options'),
    more_buying_choices: more,
    position: toInt(card.attr('data-index')),
  }
}

function parseFacet($: cheerio.CheerioAPI, ul: cheerio.Cheerio<any>, site: SiteInfo): RefinementFacet {
  const fid = (ul.attr('id') || '').replace('filter-', '')
  const titleDiv = ul.prev('div')
  const name = titleDiv.length > 0 ? clean(titleDiv.text()) : null

  const options: RefinementFacet['options'] = []
  ul.find('li').each((_, li) => {
    const a = $(li).find('a[href]').first()
    const label = clean($(li).find('span.a-size-base').first().text()) || clean($(li).text())
    if (!label) return

    const liId = $(li).attr('id') || ''
    let value: string | null = liId.includes('/') ? liId.split('/')[1] : null
    const href = a.length > 0 ? a.attr('href') : null

    if (value === null && href) {
      try {
        const u = new URL(href, site.base)
        const rh = u.searchParams.get('rh') || ''
        const lastPart = rh.split(',').pop() || ''
        value = lastPart.includes(':') ? lastPart.split(':')[1] : null
      } catch {
        // ignore
      }
    }

    const isSelected =
      a.length === 0 ||
      a.attr('aria-current') === 'true' ||
      (a.attr('class') || '').includes('a-text-bold')

    options.push({
      name: label,
      value,
      link: href ? absolute(site, href) : null,
      is_selected: isSelected,
    })
  })

  return { id: fid || null, name, options }
}

/**
 * Main search page parser.
 */
export function parseSearchPage(htmlText: string, site: SiteInfo): SearchPageResult {
  const $ = cheerio.load(htmlText || '')
  const results: SearchCard[] = []

  $('div[data-component-type="s-search-result"]').each((_, card) => {
    const item = parseSearchCard($, $(card), site)
    if (item) {
      results.push(item)
    }
  })

  const info =
    clean(
      $('[data-component-type="s-result-info-bar"] span.a-size-base, [data-component-type="s-result-info-bar"]')
        .first()
        .text()
    ) || ''

  const totalMatch =
    info.match(/of\s+(?:over\s+|more than\s+)?([\d,. ]+)\s+results/i) ||
    info.match(/([\d,. ]+)\s+results/i)
  const total = totalMatch ? toInt(totalMatch[1]) : null
  const isOver = /\b(over|more than)\b/i.test(info)

  const pages: number[] = []
  $('.s-pagination-item').each((_, p) => {
    const t = clean($(p).text())
    if (t && /^\d+$/.test(t)) {
      pages.push(parseInt(t, 10))
    }
  })

  const totalPages = pages.length > 0 ? Math.max(...pages) : results.length > 0 ? 1 : 0
  const currentPage = toInt($('.s-pagination-item.s-pagination-selected').first().text()) || 1

  const refinements: RefinementFacet[] = []
  $('#s-refinements ul[id^=filter-]').each((_, ul) => {
    const f = parseFacet($, $(ul), site)
    if (f.options.length > 0 && f.id !== 'departments') {
      refinements.push(f)
    }
  })

  const departments: DepartmentNode[] = []
  $('#departments li, #filter-departments li').each((_, li) => {
    const a = $(li).find('a[href]').first()
    const name = clean($(li).text())
    if (!name) return

    const href = a.length > 0 ? a.attr('href') : null
    const isSelected = a.length === 0 || (a.attr('class') || '').includes('a-text-bold')
    departments.push({
      name,
      node_id: href ? nodeIn(href) : null,
      link: href ? absolute(site, href) : null,
      is_selected: isSelected,
    })
  })

  const aliases: { id: string; name: string | null }[] = []
  $('#searchDropdownBox option').each((_, o) => {
    const val = $(o).attr('value') || ''
    if (val) {
      aliases.push({
        id: val.replace('search-alias=', ''),
        name: clean($(o).text()),
      })
    }
  })

  return {
    results,
    total_count: total,
    is_total_approximate: isOver,
    results_text: info ? clean(info.split(/Sort by/i)[0]) : null,
    departments,
    refinements,
    search_aliases: aliases,
    current_page: currentPage,
    total_pages: totalPages,
  }
}
