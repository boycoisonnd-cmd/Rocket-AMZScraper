/**
 * Amazon Today's Deals and AAPI price hydration parser.
 * 100% Feature Parity with amazon/parsers.py (deal_product, aapi_product).
 */

import { SiteInfo } from '../shared/sites'
import {
  clean,
  toFloat,
  money,
  absolute,
  productLink,
  compact,
} from './helpers'
import { DealProduct } from '../shared/types'

function mediaLink(asset: any): string | null {
  if (!asset || !asset.physicalId) return null
  const base = asset.baseUrl || `https://m.media-amazon.com/images/I/${asset.physicalId}`
  return `${base}.${asset.extension || 'jpg'}`
}

export function parseDealProduct(raw: Record<string, any>, site: SiteInfo): DealProduct {
  const image = raw.image || {}
  const hi = image.hiRes || {}
  const lo = image.lowRes || {}
  const reviews = raw.customerReviews || {}
  const twister = raw.twisterVariations || {}
  const category = raw.productCategory || {}
  const brandLogo = raw.brandLogo || {}
  const logoAsset = brandLogo.mediaAsset || {}
  const meta = raw.meta || {}

  return {
    asin: raw.asin || null,
    title: raw.title || null,
    link: raw.link ? absolute(site, raw.link) : productLink(site, raw.asin),
    image: mediaLink(hi) || mediaLink(lo),
    thumbnail: mediaLink(lo),
    brand:
      brandLogo.altText || meta.brandId
        ? {
            name: brandLogo.altText || null,
            id: meta.brandId || null,
            logo: mediaLink(logoAsset),
          }
        : null,
    rating: reviews
      ? {
          average: toFloat(reviews.rating?.shortDisplayString, 1),
          count: reviews.count?.value ?? null,
        }
      : null,
    category: category
      ? {
          id: category.id || null,
          product_type: category.productType || null,
          group: category.symbol || null,
          department_ids: meta.departmentIds || [],
        }
      : null,
    variations_count:
      twister.swatches?.totalCount ||
      (Object.keys(twister.asinByVariation || {}).length || null),
    is_pinned: Boolean(meta.isPinned),
    deal: null,
  }
}

export function parseAapiProduct(raw: Record<string, any>, site: SiteInfo): Record<string, any> | null {
  const entity = raw?.entity || {}
  const options = entity.buyingOptions || []
  const option = options[0] || {}
  const priceEntity = option.price?.entity || {}
  const badgeEntity = option.dealBadge?.entity || {}
  const detailsEntity = option.dealDetails?.entity || {}

  function fragText(block: any): string | null {
    const content = block?.content || {}
    const frags = (content.fragments || []).map((f: any) => f?.text || '').join(' ')
    return clean(frags) || null
  }

  function getAmount(block: any): { amount: number | null; currency: string | null } | null {
    if (!block) return null
    const moneyBlock = block.moneyValueOrRange || {}
    const value = moneyBlock.value || block.value || {}
    if (typeof value === 'object' && value.amount !== undefined && value.amount !== null) {
      return {
        amount: toFloat(value.amount),
        currency: value.unit || site.currency,
      }
    }
    const display = block.displayString || block.price
    return display ? (money(display, site.currency) as any) : null
  }

  const price = getAmount(priceEntity.priceToPay) || { amount: null, currency: site.currency }
  const basis = getAmount(priceEntity.basisPrice)
  const savings = priceEntity.savings || {}
  const rawSavingsPercent =
    typeof savings.percentage === 'object' ? savings.percentage?.value : savings.percentage

  return compact({
    price: price.amount,
    currency: price.currency,
    list_price: basis ? basis.amount : null,
    savings_percent: toFloat(rawSavingsPercent, 1),
    badge: fragText(badgeEntity.label),
    message: fragText(badgeEntity.messaging),
    type: detailsEntity.type || null,
    state: detailsEntity.state || null,
    percent_claimed: detailsEntity.percentClaimed ?? null,
    ends_at: detailsEntity.endTime || detailsEntity.endsAt || null,
    id: detailsEntity.id || null,
  }) as Record<string, any>
}
