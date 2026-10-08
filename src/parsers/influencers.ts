/**
 * Amazon Influencer storefront, posts, and idea lists parser.
 * 100% Feature Parity with amazon/parsers.py (influencer_page, influencer_post, influencer_list_page).
 */

import * as cheerio from 'cheerio'
import { SiteInfo } from '../shared/sites'
import {
  clean,
  toInt,
  absolute,
  productLink,
  asinIn,
  fullImage,
  extractPriceBlock,
  findPreviousText,
} from './helpers'
import {
  InfluencerProfile,
  InfluencerPost,
  InfluencerListPage,
  InfluencerListProduct,
} from '../shared/types'

export function parseInfluencerPost(
  $: cheerio.CheerioAPI,
  card: cheerio.Cheerio<any>,
  site: SiteInfo,
  handle?: string | null
): InfluencerPost | null {
  const aci = card.attr('data-aci')
  if (!aci) return null

  const classes = card.attr('class') || ''
  let kind: InfluencerPost['type'] = 'post'
  if (classes.includes('list-item')) {
    kind = 'list'
  } else if (classes.includes('video')) {
    kind = 'video'
  } else if (classes.includes('photo') || classes.includes('image')) {
    kind = 'photo'
  }

  const linkEl = card.find("a[href*='/shop/']").first()
  const items = clean(card.find('.list-itemcount').first().text())
  const likes = clean(card.find('.heart-count').first().text())

  const asinsSet = new Set<string>()
  card.find('[data-asin]').each((_, el) => {
    const rawAsin = $(el).attr('data-asin') || ''
    const cleanAsin = rawAsin.replace('amzn1.asin.', '').trim()
    if (cleanAsin) {
      asinsSet.add(cleanAsin)
    }
  })

  const img = card.find('img.list-image, img[class*=image]').first()

  return {
    id: aci,
    type: kind,
    title: clean(card.find('.list-title, .item-title, [class*=title]').first().text()) || null,
    link: linkEl.length > 0 ? absolute(site, linkEl.attr('href')) : null,
    image: fullImage(img.attr('src')),
    items_count: items ? toInt(items) : null,
    likes: likes ? toInt(likes) : null,
    is_pinned: card.find('.full-bleed-pinned-badge').length > 0,
    product_asins: Array.from(asinsSet).sort(),
  }
}

/**
 * Main influencer page parser.
 */
export function parseInfluencerPage(
  htmlText: string,
  site: SiteInfo,
  handle?: string | null
): InfluencerProfile {
  const $ = cheerio.load(htmlText || '')
  const title = clean($('title').first().text()) || ''
  const name = clean(title.replace(/'s Amazon Page$|\s*-\s*Amazon.*$/i, '').trim()) || null

  let descEl: cheerio.Cheerio<any> | null = null
  $(
    '[class*="profile-description"], [class*="description-text"], [class*="profile-bio"], [class*="storefront-bio"]'
  ).each((_, el) => {
    if (!descEl) descEl = $(el)
  })

  let description = descEl ? clean((descEl as cheerio.Cheerio<any>).text()) : null
  if (!description) {
    const toggle = $('[data-action=see-more-toggle]').first()
    if (toggle.length > 0) {
      description = findPreviousText($, toggle)
    }
  }

  const topCreator = $('[class*="top-creator"]').length > 0
  const img = $('img[src*="influencer-profile-image"]').first()

  const posts: InfluencerPost[] = []
  $('[data-aci]').each((_, card) => {
    const p = parseInfluencerPost($, $(card), site, handle)
    if (p) posts.push(p)
  })

  const socialsSet = new Set<string>()
  $('a[href]').each((_, a) => {
    const href = $(a).attr('href') || ''
    if (
      /^https?:\/\/(www\.)?(instagram\.com|youtube\.com|youtu\.be|tiktok\.com|facebook\.com|twitter\.com|x\.com|pinterest\.com|threads\.net)\//i.test(
        href
      )
    ) {
      socialsSet.add(href)
    }
  })

  const pageToken = $('.shop-ajax-state input[name=pageToken]').first().attr('value') || null
  const shouldLoadMore = $('.shop-ajax-state input[name=shouldLoadMoreFlag]').first().attr('value') === 'true'

  return {
    name,
    handle: handle || null,
    link: handle ? `${site.base}/shop/${handle}` : null,
    description: description || null,
    image: fullImage(img.attr('src')),
    is_top_creator: topCreator,
    badge: topCreator
      ? clean($('[class*=badge-text], [class*=top-creator] .a-text-bold').first().text())
      : null,
    social_links: Array.from(socialsSet).sort(),
    posts_count_on_page: posts.length,
    has_more_posts: shouldLoadMore,
    next_page_token: pageToken && pageToken !== '0' ? pageToken : null,
    posts,
  }
}

/**
 * Influencer list / idea list products page parser (/shop/.../list/...).
 */
export function parseInfluencerListPage(htmlText: string, site: SiteInfo): InfluencerListPage {
  const $ = cheerio.load(htmlText || '')
  const rawProducts: InfluencerListProduct[] = []

  $('a.single-product-item-link[href], [data-asin] a.single-product-item-link').each((_, a) => {
    const href = $(a).attr('href') || ''
    const asin =
      asinIn(href) ||
      $(a).parents('[data-asin]').first().attr('data-asin') ||
      $(a).attr('data-asin') ||
      null

    const priceEl = $(a).find('.product-price-container').first()
    const img = $(a).find('img.product-image').first()

    rawProducts.push({
      asin,
      title: clean($(a).find('.product-title-text').first().text()),
      brand: clean($(a).find('.product-brand-text').first().text()),
      link: asin ? productLink(site, asin) : absolute(site, href),
      image: fullImage(img.attr('src')),
      price: extractPriceBlock($, priceEl, site.currency),
      delivery: clean($(a).find('.delivery-block-container').first().text()),
    })
  })

  const seen = new Set<string>()
  const unique: InfluencerListProduct[] = []
  for (const item of rawProducts) {
    if (item.asin && !seen.has(item.asin)) {
      seen.add(item.asin)
      unique.push(item)
    }
  }

  return {
    title: clean($('.list-title, h1, [class*=list-name]').first().text()),
    description: clean($('[class*=list-description]').first().text()),
    products: unique,
  }
}
