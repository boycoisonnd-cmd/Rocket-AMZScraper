/**
 * Amazon seller profile and customer feedback parser.
 * 100% Feature Parity with amazon/parsers.py (seller_page, feedback_item).
 */

import * as cheerio from 'cheerio'
import { SiteInfo } from '../shared/sites'
import {
  clean,
  toInt,
  ratingOf,
  percentOf,
  isoDate,
  snake,
  absolute,
  aState,
} from './helpers'
import {
  SellerProfile,
  SellerFeedbackItem,
  SellerRatingsPeriod,
} from '../shared/types'

function parseRatingsPeriod(raw: any): SellerRatingsPeriod | null {
  if (!raw || typeof raw !== 'object') return null
  const count = raw.ratingCount ?? null

  const stars: Record<string, number | null> = {}
  const percents: Record<string, number | null> = {}
  for (let n = 5; n >= 1; n--) {
    stars[`${n}_star`] = raw[`star${n}Count`] ?? null
    percents[`${n}_star`] = raw[`star${n}`] ?? null
  }

  const positive = (raw.star5Count || 0) + (raw.star4Count || 0)
  const positivePercent = count ? Math.round((positive * 1000) / count) / 10 : null

  return {
    count,
    positive_percent: positivePercent,
    stars,
    stars_percent: percents,
  }
}

/**
 * Main seller page parser.
 */
export function parseSellerPage(htmlText: string, site: SiteInfo): SellerProfile {
  const $ = cheerio.load(htmlText || '')
  const state = aState($, 'spp-page-var-page-state') || {}

  const sellerMatch = htmlText.match(/seller=([A-Z0-9]+)/)
  const sellerId = state.sellerID || (sellerMatch ? sellerMatch[1] : null)
  const header = clean($('#page-section-seller-header').first().text()) || ''

  const info: Record<string, string> = {}
  let currentKey: string | null = null

  $('#page-section-detail-seller-info .a-row').each((_, row) => {
    if ($(row).find('h3').length > 0 || $(row).attr('id') === 'page-section-detail-seller-info') {
      return
    }
    const labelSpan = $(row).find('span.a-text-bold').first()
    if (labelSpan.length > 0) {
      const labelText = clean(labelSpan.text()) || ''
      currentKey = snake(labelText.replace(/[:\s]+$/, ''))
      const full = clean($(row).text()) || ''
      const val = clean(full.replace(labelText, '').trim())
      if (currentKey && val) {
        info[currentKey] = val
      }
    } else if (currentKey && clean($(row).text())) {
      info[currentKey] = clean([info[currentKey], clean($(row).text())].filter(Boolean).join(' ')) || ''
    }
  })

  let about = clean($('#page-section-about-seller').first().text())
  if (about) {
    about = clean(about.replace(/^About Seller\s*/i, ''))
    about = clean(about?.replace(/Have a question for .+?\?$/i, ''))
  }

  const logo = $('#seller-logo img, #seller-profile-container img[src*="seller"]').first()
  const logoSrc = logo.attr('src')
  const validLogo = logo.length > 0 && logoSrc && !logoSrc.includes('loading') ? logoSrc : null

  const storefront = $('#seller-info-storefront-link a').first()
  const storefrontHref = storefront.attr('href')

  const totalMatch = header.match(/\(([\d,.]+)\s+total/)
  const lifetimeCount = totalMatch ? toInt(totalMatch[1]) : toInt($('#rating-lifetime-num').first().text())

  const businessName = info.business_name || null
  const businessAddress = info.business_address || null
  delete info.business_name
  delete info.business_address

  return {
    id: sellerId,
    name: clean($('#seller-name').first().text()) || clean($('h1').first().text()),
    link: sellerId ? `${site.base}/sp?seller=${sellerId}` : null,
    storefront_link: storefrontHref
      ? absolute(site, storefrontHref)
      : sellerId
      ? `${site.base}/s?me=${sellerId}`
      : null,
    logo: validLogo,
    rating: {
      average:
        ratingOf($('#effective-timeperiod-rating-lifetime-description').first().text()) ||
        ratingOf(header),
      positive_percent: percentOf(header),
      count: lifetimeCount,
    },
    ratings: {
      lifetime: parseRatingsPeriod(aState($, 'lifetimeRatingsData')),
      twelve_months: parseRatingsPeriod(aState($, 'twelveMonthRatingsData')),
      three_months: parseRatingsPeriod(aState($, 'threeMonthRatingsData')),
      one_month: parseRatingsPeriod(aState($, 'oneMonthRatingsData')),
    },
    business: {
      name: businessName,
      address: businessAddress,
    },
    about: about || null,
    info: Object.keys(info).length > 0 ? info : null,
    country: site.country,
    domain: site.host,
  }
}

/**
 * Parser for individual feedback JSON rows from /sp/ajax/feedback.
 */
export function parseFeedbackItem(raw: Record<string, any>, site: SiteInfo): SellerFeedbackItem {
  const data = raw.ratingData || {}
  const textBlock = data.text || {}
  const response = raw.responseRatingData || {}

  return {
    rating: raw.rating ?? null,
    text: clean(textBlock.expandedText || textBlock.truncatedText),
    date: isoDate(data.date),
    date_text: data.date || null,
    author: {
      name: raw.rater || null,
      link: absolute(site, raw.raterProfileUrl),
      avatar: raw.raterAvatarUrl || null,
    },
    is_fulfilled_by_amazon: Boolean(raw.hasFulfillmentBadge || raw.fulfillmentChannel === 'AFN'),
    has_response: Boolean(raw.hasResponse),
    response: clean(typeof response === 'object' ? response.text?.expandedText : null),
    is_suppressed: Boolean(data.wasSuppressed),
  }
}
