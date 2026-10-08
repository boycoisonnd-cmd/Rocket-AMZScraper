/**
 * Product detail parser: /dp pages, variations matrix, AI Customers say, media, top reviews.
 * 100% Feature Parity with amazon/parsers.py (product_page).
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
  toFloat,
  ratingOf,
  percentOf,
  money,
  amountOf,
  isoDate,
  boughtPastMonth,
  snake,
  absolute,
  productLink,
  nodeIn,
  fullImage,
  jsonAfter,
  compact,
  PriceBlock,
  findMatchingTextNodeParent,
} from './helpers'
import {
  ProductDetails,
  MediaImage,
  MediaVideo,
  ReviewItem,
  CustomersSaySummary,
  VariationsMatrix,
  BestSellerRank,
  BreadcrumbCategory,
  BuyBoxInfo,
  DeliveryInfo,
  DeliverySlot,
} from '../shared/types'

const HIST_RE = /(\d+)\s*(?:percent|%)[^\d]*(\d)\s*star/i

function extractDetailsRows($: cheerio.CheerioAPI): Record<string, string> {
  const rows: [string, string][] = []

  $(
    '#prodDetails tr, #productDetails_techSpec_section_1 tr, #productDetails_techSpec_section_2 tr, #productDetails_detailBullets_sections1 tr, #productDetails_db_sections tr'
  ).each((_, tr) => {
    const th = $(tr).find('th').first()
    const td = $(tr).find('td').first()
    if (th.length && td.length) {
      const thText = clean(th.text())
      const tdText = clean(td.text())
      if (thText && tdText) {
        rows.push([thText, tdText])
      }
    }
  })

  $('#detailBullets_feature_div li, #detailBulletsWrapper_feature_div li').each((_, li) => {
    const labelSpan = $(li).find('span.a-text-bold').first()
    if (labelSpan.length) {
      const labelText = clean(labelSpan.text()) || ''
      const fullText = clean($(li).text()) || ''
      const val = clean(fullText.replace(labelText, '').trim())
      const cleanedLabel = clean(labelText.replace(/[:\s]+$/, ''))
      if (cleanedLabel && val) {
        rows.push([cleanedLabel, val])
      }
    }
  })

  $('#productFactsDesktopExpander .a-fixed-left-grid').each((_, grid) => {
    const cols = $(grid).find('.a-fixed-left-grid-col')
    if (cols.length >= 2) {
      const c0 = clean($(cols[0]).text())
      const c1 = clean($(cols[1]).text())
      if (c0 && c1) {
        rows.push([c0, c1])
      }
    }
  })

  const out: Record<string, string> = {}
  for (const [label, val] of rows) {
    const key = clean(label.replace(/[:\s]+$/, ''))
    if (key && val && !(key in out)) {
      out[key] = val
    }
  }
  return out
}

function extractBestSellersRank($: cheerio.CheerioAPI, site: SiteInfo): BestSellerRank[] {
  const regex = /Best[- ]?Sellers? Rank|Bestseller-Rang|Classement des meilleures|Posizione nella|Clasificación/i
  const matchedNode = findMatchingTextNodeParent($, regex)
  if (!matchedNode) return []
  let block = clean((matchedNode as cheerio.Cheerio<any>).text()) || ''
  block = block.replace(/\(\s*See Top \d+[^)]*\)/g, ' ')

  const links: Record<string, string | null> = {}
  ;(matchedNode as cheerio.Cheerio<any>).find('a[href]').each((_, a) => {
    const linkText = clean($(a).text())
    if (linkText) {
      links[linkText] = absolute(site, $(a).attr('href'))
    }
  })

  const ranks: BestSellerRank[] = []
  const rankRegex = /#?\s*([\d,. ]+)\s+(?:in|en|dans|su)\s+([^(#]+?)(?=\s*\(|\s*#|$)/g
  let m: RegExpExecArray | null
  while ((m = rankRegex.exec(block)) !== null) {
    const rank = toInt(m[1])
    const category = clean(m[2])
    if (!rank || !category || category.toLowerCase().startsWith('see top')) {
      continue
    }
    const foundLink = Object.entries(links).find(([k]) => k === category || category.includes(k))?.[1] || null
    let categoryId: string | null = null
    if (foundLink) {
      const idMatch = foundLink.match(/\/(\d+)(?:\/|$)/)
      if (idMatch) {
        categoryId = idMatch[1]
      }
    }
    ranks.push({
      rank,
      category,
      link: foundLink,
      category_id: categoryId,
    })
  }
  return ranks
}

function extractHistogram($: cheerio.CheerioAPI): Record<string, number | null> | null {
  const out: Record<string, number | null> = {}
  $('#histogramTable [aria-label], #histogramTable a[title]').each((_, el) => {
    const str = $(el).attr('aria-label') || $(el).attr('title') || ''
    const match = str.match(HIST_RE)
    if (match) {
      out[`${match[2]}_star`] = toInt(match[1])
    }
  })
  return Object.keys(out).length > 0 ? out : null
}

export function extractVariations(htmlText: string, site: SiteInfo): VariationsMatrix | null {
  const display = jsonAfter(htmlText, '"dimensionValuesDisplayData"')
  if (!display || typeof display !== 'object' || Array.isArray(display)) {
    return null
  }
  const labels: Record<string, string> = jsonAfter(htmlText, '"variationDisplayLabels"') || {}
  const dims: string[] = jsonAfter(htmlText, '"dimensions"', '[') || Object.keys(labels)
  const values: Record<string, string[]> = jsonAfter(htmlText, '"variationValues"') || {}

  const currentMatch = htmlText.match(/"currentAsin"\s*:\s*"([A-Z0-9]{10})"/)
  const current = currentMatch ? currentMatch[1] : null
  const parentMatch = htmlText.match(/"parentAsin"\s*:\s*"([A-Z0-9]{10})"/)
  const parent = parentMatch ? parentMatch[1] : null

  const dimensions = dims.map((key) => ({
    key,
    name: labels[key] || key,
    values: values[key] || [],
  }))

  const products = Object.entries(display).map(([asin, vals]: [string, any]) => {
    const attrs: Record<string, string> = {}
    if (Array.isArray(vals)) {
      vals.forEach((v, idx) => {
        const dimName = idx < dims.length ? labels[dims[idx]] || dims[idx] : `dimension_${idx}`
        attrs[dimName] = v
      })
    }
    return {
      asin,
      attributes: attrs,
      link: productLink(site, asin),
      is_current: asin === current,
    }
  })

  return {
    parent_asin: parent,
    current_asin: current,
    dimensions,
    products,
    count: products.length,
  }
}

export function extractImages(htmlText: string): MediaImage[] {
  const colorImages = jsonAfter(htmlText, '"colorImages"')
  const images: MediaImage[] = []
  const seen = new Set<string>()

  if (colorImages && typeof colorImages === 'object') {
    const groups = 'initial' in colorImages ? [colorImages.initial] : Object.values(colorImages)
    for (const group of groups) {
      if (Array.isArray(group)) {
        for (const entry of group) {
          const link = entry?.hiRes || entry?.large
          if (!link || seen.has(link)) continue
          seen.add(link)
          images.push({
            link,
            thumbnail: entry.thumb || null,
            large: entry.large || null,
            variant: entry.variant || null,
          })
        }
      }
    }
  }

  if (images.length === 0) {
    const landing =
      htmlText.match(/id="landingImage"[^>]*\sdata-old-hires="([^"]+)"/) ||
      htmlText.match(/id="landingImage"[^>]*\ssrc="([^"]+)"/)
    if (landing) {
      images.push({
        link: landing[1],
        thumbnail: null,
        large: landing[1],
        variant: 'MAIN',
      })
    }
  }
  return images
}

export function extractVideos(htmlText: string): MediaVideo[] {
  const raw = jsonAfter(htmlText, '"videos":', '[')
  const out: MediaVideo[] = []
  if (Array.isArray(raw)) {
    for (const v of raw) {
      if (!v || typeof v !== 'object' || !v.url) continue
      out.push(
        compact({
          title: v.title,
          link: v.url,
          thumbnail: v.thumb,
          duration_seconds: v.durationSeconds,
          language: v.languageCode,
          is_hero: v.isHeroVideo,
          creator: v.creatorProfile?.name,
        }) as MediaVideo
      )
    }
  }
  return out
}

function parseReviewCard($: cheerio.CheerioAPI, card: cheerio.Cheerio<any>, site: SiteInfo): ReviewItem {
  const rid = (card.attr('id') || '').replace('customer_review-', '').trim() || null
  const profile = card.find('a.a-profile').first()
  const profileHref = profile.attr('href') || null
  const dateText = clean(card.find('[data-hook=review-date]').first().text()) || null

  const match = dateText ? dateText.match(/Reviewed in (?:the )?(.+?) on (.+)$/) : null
  const body =
    card.find('[data-hook=reviewText] [data-hook=reviewRichContentContainer]').first().length > 0
      ? card.find('[data-hook=reviewText] [data-hook=reviewRichContentContainer]').first()
      : card.find('[data-hook=reviewText]').first().length > 0
      ? card.find('[data-hook=reviewText]').first()
      : card.find('[data-hook=review-body]').first()

  let bodyText: string | null = null
  if (body.length > 0) {
    const pElements = body.find('p')
    const rawParagraphs = pElements.length > 0 ? pElements.map((_, p) => $(p).text()).get().join(' ') : body.text()
    bodyText = clean(rawParagraphs.replace(/(Brief|Full) content visible, double tap to read (full|brief) content\./g, ''))
  }

  const helpful = clean(card.find('[data-hook=helpful-vote-statement]').first().text())
  let helpfulVotes = toInt(helpful) || 0
  if (helpful && helpful.toLowerCase().startsWith('one person')) {
    helpfulVotes = 1
  }

  const titleEl =
    card.find('[data-hook=reviewTitle]').first().length > 0
      ? card.find('[data-hook=reviewTitle]').first()
      : card.find('[data-hook=review-title]').first()

  const titleLink = card.find("a[href*='customer-reviews/srp'], a[data-hook=review-title]").first()
  const ratingText =
    card.find('[data-hook=review-star-rating] .a-icon-alt, [data-hook=cmps-review-star-rating] .a-icon-alt').first().text()

  const reviewImages: (string | null)[] = []
  card.find('img[data-hook=review-image-tile]').each((_, img) => {
    const src = $(img).attr('src')
    if (src) {
      reviewImages.push(fullImage(src))
    }
  })

  let authorId: string | null = null
  if (profileHref) {
    const mProfile = profileHref.match(/profile\/([\w.]+)/)
    if (mProfile) authorId = mProfile[1]
  }

  return {
    id: rid,
    title: clean(titleEl.text()),
    link: titleLink.length > 0
      ? absolute(site, titleLink.attr('href'))
      : rid
      ? `${site.base}/gp/customer-reviews/${rid}`
      : null,
    rating: ratingOf(ratingText),
    date: match ? isoDate(match[2]) : isoDate(dateText),
    date_text: dateText,
    country: match ? clean(match[1]) : null,
    text: bodyText,
    author: {
      name: clean(card.find('.a-profile-name').first().text()),
      link: absolute(site, profileHref),
      id: authorId,
    },
    variant: clean(card.find('[data-hook=format-strip]').first().text()),
    is_verified_purchase: card.find('[data-hook=avp-badge]').length > 0,
    is_vine: (clean(card.find('[data-hook=review-badges]').first().text()) || '').toLowerCase().includes('vine'),
    helpful_votes: helpfulVotes,
    images: reviewImages,
    has_video: card.find('[data-hook=reviewVideo], video').length > 0,
  }
}

export function extractCustomersSay(htmlText: string): CustomersSaySummary | null {
  let summary: string | null = null
  const aspects: CustomersSaySummary['aspects'] = []
  const matches = Array.from(htmlText.matchAll(/k\+b64 ([A-Za-z0-9+/=]+)/g))

  for (const m of matches) {
    try {
      const decoded = atob(m[1])
      const blob = JSON.parse(decoded)
      const component = String(blob['k-component'] || '')
      const data = blob['k-data'] || {}

      if (component.startsWith('SummaryFragments') && summary === null) {
        const frags = (data.fragments || []).map((f: any) => f?.inertText || '').join(' ')
        summary = clean(frags)
      } else if (component.startsWith('AspectList') && aspects.length === 0) {
        for (const aspect of data.aspectsFlattened || []) {
          const snippets: any[] = []
          for (const snip of aspect.snippets || []) {
            let frag = ''
            const textFrags = snip.text?.fragments || []
            for (const f of textFrags) {
              frag += f.text || f.semanticContent?.content?.text || ''
            }
            const reviewUrl = snip.review?.url || ''
            const mRid = reviewUrl.match(/\/-\/(\w+)/)
            const rid = mRid ? mRid[1] : null
            snippets.push({ text: clean(frag), review_id: rid })
          }
          aspects.push({
            name: aspect.label || null,
            sentiment: aspect.sentiment || null,
            summary: aspect.summary || null,
            mentions: aspect.mentions ?? null,
            mentions_percentage: aspect.mentionsPercentage ?? null,
            snippets,
          })
        }
      }
    } catch {
      // continue
    }
  }

  if (summary === null && aspects.length === 0) {
    return null
  }
  return {
    summary,
    aspects,
    is_ai_generated: true,
  }
}

function extractDelivery($: cheerio.CheerioAPI): DeliveryInfo | null {
  const slots: DeliverySlot[] = []
  $('[data-csa-c-delivery-time]').each((_, el) => {
    slots.push(
      compact({
        type: $(el).attr('data-csa-c-delivery-type'),
        price_text: $(el).attr('data-csa-c-delivery-price'),
        time: $(el).attr('data-csa-c-delivery-time'),
        cutoff: $(el).attr('data-csa-c-delivery-cutoff'),
        text: clean($(el).text()),
      })
    )
  })

  const seen = new Set<string>()
  const unique: DeliverySlot[] = []
  for (const s of slots) {
    const key = `${s.type}_${s.time}`
    if (!seen.has(key)) {
      seen.add(key)
      unique.push(s)
    }
  }

  const primary =
    clean($('#mir-layout-DELIVERY_BLOCK-slot-PRIMARY_DELIVERY_MESSAGE_LARGE, #deliveryBlockMessage').first().text())
  const secondary =
    clean($('#mir-layout-DELIVERY_BLOCK-slot-SECONDARY_DELIVERY_MESSAGE_LARGE').first().text())
  const location =
    clean($('#glow-ingress-line2, #contextualIngressPtLabel_deliveryShortLine').first().text())

  if (!primary && unique.length === 0 && !location) {
    return null
  }
  return {
    text: primary,
    fastest_text: secondary,
    options: unique,
    location,
  }
}

function extractBuyBox($: cheerio.CheerioAPI, site: SiteInfo): BuyBoxInfo | null {
  const sellerLink = $('#sellerProfileTriggerId').first()
  const merchantText =
    clean($('#merchantInfoFeature_feature_div, #merchant-info').first().text()) || ''
  let shipsFrom: string | null = null
  let soldBy: string | null = null

  $('#tabular-buybox [tabular-attribute-name]').each((_, cell) => {
    const label = ($(cell).attr('tabular-attribute-name') || '').toLowerCase()
    const val = clean($(cell).find('.tabular-buybox-text-message').first().text()) || clean($(cell).text())
    if (label.includes('ships from') || label.includes('dispatches from')) {
      shipsFrom = shipsFrom || val
    } else if (label.includes('sold by')) {
      soldBy = soldBy || val
    }
  })

  const both = merchantText.match(/Shipper\s*\/\s*Seller\s+(.+?)(?:\s+Shipper|\s*$)/)
  if (both) {
    let name = clean(both[1])
    if (name) {
      const parts = name.split(/\s+/)
      if (parts.length >= 2 && parts[0] === parts[1]) {
        name = parts[0]
      }
      shipsFrom = shipsFrom || name
      soldBy = soldBy || name
    }
  }

  const mShips = merchantText.match(/(?:Ships from|Dispatches from)\s*:?\s*(.+?)(?=\s+Sold by|\s*\.|\s*$)/)
  if (mShips && !shipsFrom) {
    shipsFrom = clean(mShips[1])
  }
  const mSold = merchantText.match(/Sold by\s*:?\s*(.+?)(?:\s+and\s+Fulfilled|\s*\.|$)/)
  if (mSold && !soldBy) {
    soldBy = clean(mSold[1])
  }

  let sellerId: string | null = null
  if (sellerLink.length > 0) {
    const href = sellerLink.attr('href') || ''
    try {
      const url = new URL(href, site.base)
      sellerId = url.searchParams.get('seller')
    } catch {
      // ignore
    }
    soldBy = clean(sellerLink.text()) || soldBy
  }

  if (!soldBy && !shipsFrom && !merchantText) {
    return null
  }

  return {
    seller: soldBy
      ? {
          name: soldBy,
          id: sellerId,
          link: sellerId ? `${site.base}/sp?seller=${sellerId}` : null,
        }
      : null,
    ships_from: shipsFrom,
    is_fulfilled_by_amazon:
      merchantText.toLowerCase().includes('fulfilled by amazon') || (shipsFrom || '').toLowerCase().startsWith('amazon'),
    is_sold_by_amazon: (soldBy || '').toLowerCase().startsWith('amazon'),
  }
}

function extractAvailability($: cheerio.CheerioAPI) {
  const el = $('#availability').first()
  if (el.length === 0) return null
  const status = clean(el.find('span').first().text()) || clean(el.text())
  if (!status) return null
  const low = status.toLowerCase()

  let inStock: boolean | null = null
  if (['in stock', 'only', 'usually ships', 'available', 'verfügbar', 'en stock', 'disponible'].some((k) => low.includes(k))) {
    inStock = true
  }
  if (['unavailable', 'out of stock', 'not available', 'nicht verfügbar', 'indisponible'].some((k) => low.includes(k))) {
    inStock = false
  }

  const leftMatch = low.match(/only\s+(\d+)\s+left/)
  return {
    text: status,
    is_in_stock: inStock,
    quantity_left: leftMatch ? toInt(leftMatch[1]) : null,
  }
}

function extractByline($: cheerio.CheerioAPI, site: SiteInfo) {
  const byline = $('#bylineInfo').first()
  if (byline.length === 0) {
    return { brand: null, authors: null }
  }
  const label = clean(byline.text()) || ''
  const href = byline.attr('href') || null

  const authors: { name: string; role: string | null; link: string | null }[] = []
  $('#bylineInfo .author a.a-link-normal, #bylineInfo .author a.contributorNameID').each((_, a) => {
    const name = clean($(a).text())
    if (name) {
      const parentAuthor = $(a).parents('.author').first()
      const roleText = parentAuthor.length > 0 ? clean(parentAuthor.find('.contribution').first().text()) : null
      authors.push({
        name,
        role: roleText ? clean(roleText.replace(/[()]/g, '')) : null,
        link: absolute(site, $(a).attr('href')),
      })
    }
  })

  let name: string | null = label.replace(/^(Visit the|Brand:|Marke:|Marca:|Marque\s*:)\s*/i, '')
  name = clean(name.replace(/\s+Store$/i, ''))

  let brand: any = null
  if (href && href.includes('/stores/')) {
    brand = { name, link: absolute(site, href), store_link: absolute(site, href) }
  } else if (href) {
    brand = { name, link: absolute(site, href), store_link: null }
  } else if (name && authors.length === 0) {
    brand = { name, link: null, store_link: null }
  }

  return { brand, authors: authors.length > 0 ? authors : null }
}

function extractProductPrice($: cheerio.CheerioAPI, currency: string) {
  const selectors = [
    '#apex_desktop',
    '#corePriceDisplay_desktop_feature_div',
    '#corePrice_feature_div',
    '#corePrice_desktop',
    '#price',
    '#buybox',
  ]

  let currentText: string | null = null
  let strikeText: string | null = null
  let foundScope: cheerio.Cheerio<any> | null = null

  for (const sel of selectors) {
    const scope = $(sel).first()
    if (scope.length === 0) continue

    const currentEl =
      scope.find('.priceToPay .a-offscreen, .apexPriceToPay .a-offscreen, .a-price:not([data-a-strike=true]) .a-offscreen').first().length > 0
        ? scope.find('.priceToPay .a-offscreen, .apexPriceToPay .a-offscreen, .a-price:not([data-a-strike=true]) .a-offscreen').first()
        : scope.find('.aok-offscreen').first()

    if (currentEl.length > 0 && amountOf(currentEl.text()) !== null) {
      currentText = clean(currentEl.text())
      const strikeEl = scope.find('.basisPrice .a-offscreen, [data-a-strike=true] .a-offscreen, .a-text-price .a-offscreen').first()
      if (strikeEl.length > 0) {
        strikeText = clean(strikeEl.text())
      }
      foundScope = scope
      break
    }
  }

  if (!foundScope && !currentText) return null

  const block = money(currentText, currency) || { amount: null, currency }
  const listPrice = amountOf(strikeText)

  const savingsText = foundScope ? clean(foundScope.find('.savingsPercentage').first().text()) : null
  const parsedPercent = savingsText ? percentOf(savingsText) : null
  let savingsPercent: number | null = null
  if (parsedPercent !== null) {
    savingsPercent = Math.abs(parsedPercent)
  } else if (block.amount && listPrice && listPrice > block.amount) {
    savingsPercent = Math.round((1 - block.amount / listPrice) * 100)
  }

  let savingsAmount: number | null = null
  if (block.amount && listPrice && listPrice > block.amount) {
    savingsAmount = Math.round((listPrice - block.amount) * 100) / 100
  }

  const unitText = foundScope ? clean(foundScope.find('.pricePerUnit, #pricePerUnit').first().text()) || '' : ''
  const unitMatch = unitText.match(/\(?\s*([^()/]*?\d[^()/]*?)\s*\/\s*([^()]+?)\s*\)?$/)
  const unitPrice = unitMatch
    ? { amount: amountOf(unitMatch[1]), per: clean(unitMatch[2]) }
    : null

  if (block.amount === null && listPrice === null) {
    return null
  }

  return {
    amount: block.amount,
    currency: block.currency,
    list_price: listPrice,
    savings_percent: savingsPercent,
    savings_amount: savingsAmount,
    unit_price: unitPrice,
  }
}

/**
 * Main product page parser.
 */
export function parseProductPage(htmlText: string, site: SiteInfo): ProductDetails {
  const $ = cheerio.load(htmlText || '')
  const currency = site.currency

  const asinMatch =
    htmlText.match(/"currentAsin"\s*:\s*"([A-Z0-9]{10})"/) ||
    htmlText.match(/name="ASIN"\s+value="([A-Z0-9]{10})"/) ||
    htmlText.match(/data-asin="([A-Z0-9]{10})"/)
  const asin = asinMatch ? asinMatch[1] : null

  const detailsRaw = extractDetailsRows($)
  const details: Record<string, string> = {}
  for (const [k, v] of Object.entries(detailsRaw)) {
    const sKey = snake(k)
    if (!sKey || ['best_sellers_rank', 'customer_reviews', 'customer_reviews_rank', 'asin'].includes(sKey)) {
      continue
    }
    details[sKey] = v
  }

  const identifiers: Record<string, string> = {}
  for (const key of [
    'upc', 'ean', 'isbn_10', 'isbn_13', 'gtin', 'global_trade_identification_number',
    'model_number', 'item_model_number', 'part_number', 'manufacturer_part_number',
  ]) {
    if (details[key]) {
      const canonical = key
        .replace('global_trade_identification_number', 'gtin')
        .replace('item_model_number', 'model_number')
        .replace('manufacturer_part_number', 'part_number')
      identifiers[canonical] = details[key]
    }
  }

  let { brand, authors } = extractByline($, site)
  const overview: Record<string, string | null> = {}
  $('#productOverview_feature_div tr').each((_, tr) => {
    const cells = $(tr).find('td')
    if (cells.length >= 2 && clean($(cells[0]).text())) {
      const label = snake($(cells[0]).text())
      if (label) {
        overview[label] = clean($(cells[1]).text())
      }
    }
  })

  const brandName = overview.brand || details.brand_name || details.brand
  if (!brand && brandName) {
    brand = { name: brandName, link: null, store_link: null }
  }
  if (brand) {
    brand = {
      name: brandName || brand.name,
      byline: brand.name,
      link: brand.link,
      store_link: brand.store_link,
    }
  }

  let bullets: string[] = []
  $('#feature-bullets li span.a-list-item').each((_, li) => {
    const t = clean($(li).text())
    if (t) bullets.push(t)
  })
  if (bullets.length === 0) {
    $('#productFactsDesktopExpander ul li, #pqv-feature-bullets li').each((_, li) => {
      const t = clean($(li).text())
      if (t && !bullets.includes(t)) bullets.push(t)
    })
  }

  const ratingStr = $('#acrPopover').first().attr('title') || $('#acrPopover').first().text()
  const ratingAvg = ratingOf(ratingStr)
  const ratingsCount =
    toInt($('#acrCustomerReviewText').first().text()) ||
    toInt($('[data-hook=total-review-count]').first().text())

  const topReviews: ReviewItem[] = []
  $('[data-hook=review]').each((_, card) => {
    const rev = parseReviewCard($, $(card), site)
    if (rev.id) {
      topReviews.push(rev)
    }
  })

  let badgeText = ''
  $('#zeitgeistBadge_feature_div, #acBadge_feature_div, .badge-wrapper').each((_, b) => {
    const t = clean($(b).text())
    if (t) badgeText += ' ' + t
  })
  badgeText = badgeText.trim()

  let dealBadge =
    clean($('#dealBadgeSupportingText').first().text()) ||
    clean($('#dealBadge_feature_div span').first().text())
  if (dealBadge && dealBadge.includes('NO_OF_')) {
    dealBadge = clean(dealBadge.split(/\s+NO_OF_|\s+Limited time deal\s+NO_OF/)[0])
  }

  const coupon =
    clean($('#promoPriceBlockMessage_feature_div label, #promoPriceBlockMessage_feature_div .a-color-success').first().text())

  const breadcrumbs: BreadcrumbCategory[] = []
  $('#wayfinding-breadcrumbs_feature_div li a').each((_, a) => {
    const name = clean($(a).text())
    const href = $(a).attr('href')
    if (name) {
      breadcrumbs.push({
        name,
        link: absolute(site, href),
        node_id: nodeIn(href),
      })
    }
  })

  const videos = extractVideos(htmlText)
  const rawVideoCount = toInt($('#videoCount').first().text())
  const videosCount = rawVideoCount !== null ? rawVideoCount : videos.length > 0 ? videos.length : null

  const aplusText = clean($('#aplus_feature_div, #aplus').first().text())
  const aplusDescription = aplusText && aplusText.length > 60 ? aplusText : null

  return {
    asin,
    title: clean($('#productTitle').first().text()) || clean($('#title').first().text()),
    link: productLink(site, asin),
    brand,
    authors,
    price: extractProductPrice($, currency) as any,
    deal_badge: dealBadge,
    coupon,
    availability: extractAvailability($),
    buybox: extractBuyBox($, site),
    delivery: extractDelivery($),
    is_prime: $(
      '#desktop_buybox .a-icon-prime, #buybox .a-icon-prime, #deliveryBlockMessage .a-icon-prime, #mir-layout-DELIVERY_BLOCK .a-icon-prime, #prime-badge, #primeExclusivePricingMessage'
    ).length > 0,
    rating:
      ratingAvg !== null || ratingsCount !== null
        ? {
            average: ratingAvg,
            count: ratingsCount,
            histogram: extractHistogram($),
          }
        : null,
    bought_past_month: boughtPastMonth($('#social-proofing-faceout-title-tk_bought').first().text()),
    badges: {
      is_best_seller: badgeText.toLowerCase().includes('best seller'),
      is_amazons_choice: badgeText.toLowerCase().includes("amazon's choice"),
      best_seller_text: badgeText || null,
      is_climate_pledge_friendly: $('#climatePledgeFriendly, #climatePledgeFriendlyBadge').length > 0,
    },
    categories: breadcrumbs,
    best_sellers_rank: extractBestSellersRank($, site),
    bullets,
    overview: Object.keys(overview).length > 0 ? overview : null,
    description: clean($('#productDescription').first().text()) || clean($('#bookDescription_feature_div').first().text()),
    aplus_description: aplusDescription,
    details: Object.keys(details).length > 0 ? details : null,
    identifiers: Object.keys(identifiers).length > 0 ? identifiers : null,
    images: extractImages(htmlText),
    videos,
    videos_count: videosCount,
    variations: extractVariations(htmlText, site),
    customers_say: extractCustomersSay(htmlText),
    top_reviews: topReviews,
    has_inline_reviews: topReviews.length > 0,
    important_information: clean($('#important-information').first().text()),
    warranty: clean($('#warrantyInfo').first().text()),
    country: site.country,
    domain: site.host,
  }
}

/**
 * Reviews treatment A/B test detector ("C" renders inline reviews, "T1" does not).
 */
export function reviewTreatment(htmlText: string): string | null {
  const match = htmlText.match(/cr-weblab-state&quot;\}:\{"[0-9a-f]+":"(\w+)"\}/)
  return match ? match[1] : null
}
