import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import { parseProductPage, extractVariations, extractCustomersSay } from '../../src/parsers/products'
import { parseSearchPage } from '../../src/parsers/search'
import { parseOffersPage } from '../../src/parsers/offers'
import { parseBestsellersPage, parseBestsellersAcpPage } from '../../src/parsers/rankings'
import { parseSellerPage, parseFeedbackItem } from '../../src/parsers/sellers'
import { parseInfluencerPage, parseInfluencerListPage } from '../../src/parsers/influencers'
import { parseSuggestion } from '../../src/parsers/autocomplete'
import { getSite } from '../../src/shared/sites'

const FIXTURES_DIR = path.resolve('tests/fixtures')

function readFixture(name: string): string {
  const filePath = path.join(FIXTURES_DIR, name)
  const buffer = fs.readFileSync(filePath)
  return zlib.gunzipSync(buffer).toString('utf-8')
}

describe('Product Page Parser', () => {
  it('parses dp_B00939I7EK_reviews.html.gz with 100% parity', () => {
    const html = readFixture('dp_B00939I7EK_reviews.html.gz')
    const site = getSite('US')
    const product = parseProductPage(html, site)

    expect(product.asin).toBe('B00939I7EK')
    expect(product.title).toBeDefined()
    expect(product.title?.startsWith('Ninja')).toBe(true)
    expect(product.availability?.is_in_stock).toBe(true)
    expect(product.buybox?.is_sold_by_amazon).toBe(true)
    expect(product.buybox?.ships_from).toBe('Amazon.com')
    expect(product.rating?.average).toBe(4.7)
    expect(product.rating?.count).toBe(43049)
    expect(product.rating?.histogram?.['5_star']).toBe(85)
    expect(product.bought_past_month).toBe(6000)
    expect(product.categories[0].name).toBe('Home & Kitchen')
    expect(product.categories[1].name).toBe('Kitchen & Dining')
    expect(product.best_sellers_rank[0].rank).toBe(649)
    expect(product.overview?.brand).toBe('Ninja')
    expect(product.details?.model_number).toBe('BL770')
    expect(product.identifiers?.upc?.startsWith('622356532419')).toBe(true)
    expect(product.images[0].variant).toBe('MAIN')
    expect(product.top_reviews.length).toBe(13)
    expect(product.has_inline_reviews).toBe(true)
  })

  it('parses variations matrix', () => {
    const html = readFixture('dp_B00939I7EK.html.gz')
    const site = getSite('US')
    const variations = extractVariations(html, site)
    expect(variations).toBeDefined()
    expect(variations?.current_asin).toBe('B00939I7EK')
    expect(variations?.dimensions[0].name).toBe('Style')
    expect(variations?.products.some((p) => p.asin === 'B00939FV8K')).toBe(true)
  })

  it('parses AI Customers say summary', () => {
    const html = readFixture('dp_B00939I7EK.html.gz')
    const aiSummary = extractCustomersSay(html)
    expect(aiSummary).toBeDefined()
    expect(aiSummary?.is_ai_generated).toBe(true)
    expect(aiSummary?.summary?.startsWith('Customers find')).toBe(true)
    expect(aiSummary?.aspects[0].sentiment).toBeDefined()
  })
})

describe('Search Page Parser', () => {
  it('parses search_laptop_filtered.html.gz correctly', () => {
    const html = readFixture('search_laptop_filtered.html.gz')
    const site = getSite('US')
    const search = parseSearchPage(html, site)

    expect(search.results.length).toBeGreaterThan(0)
    expect(search.results[0].asin).toBeDefined()
    expect(search.refinements.length).toBeGreaterThan(0)
  })
})

describe('Offers Page Parser', () => {
  it('parses aod_B00939I7EK.html.gz with 100% parity', () => {
    const html = readFixture('aod_B00939I7EK.html.gz')
    const site = getSite('US')
    const offers = parseOffersPage(html, site)

    expect(offers.title?.startsWith('Ninja')).toBe(true)
    expect(offers.rating?.count).toBe(43049)
    expect(offers.other_offers_count).toBe(4)
    expect(offers.offers[0].is_pinned).toBe(true)
    expect(offers.offers[0].condition).toBe('New')
    expect(offers.offers[0].price?.amount).toBe(179.99)
    expect(offers.offers[0].price?.list_price).toBe(219.99)
    expect(offers.offers[0].price?.savings_percent).toBe(18)
  })
})

describe('Rankings Page Parser', () => {
  it('parses bestsellers_electronics.html.gz and acp correctly', () => {
    const html = readFixture('bestsellers_electronics.html.gz')
    const site = getSite('US')
    const bestsellers = parseBestsellersPage(html, site)

    expect(bestsellers.title).toBe('Amazon Best Sellers')
    expect(bestsellers.items.length).toBe(30)
    expect(bestsellers.expected_count).toBe(50)
    expect(bestsellers.items[0].rank).toBe(1)
    expect(bestsellers.items[0].asin).toBe('B08JHCVHTY')

    const meta: Record<string, any> = {}
    bestsellers.acp?.entries.forEach((e) => {
      meta[e.id] = e.metadataMap
    })

    const acpHtml = readFixture('bestsellers_electronics_acp.html.gz')
    const more = parseBestsellersAcpPage(acpHtml, site, meta)
    expect(more.length).toBe(20)
    expect(more[0].rank).toBe(31)
    expect(more[more.length - 1].rank).toBe(50)
  })
})

describe('Seller Page Parser', () => {
  it('parses seller_A1D09S7Q0OD6TH.html.gz and feedback JSON correctly', () => {
    const html = readFixture('seller_A1D09S7Q0OD6TH.html.gz')
    const site = getSite('US')
    const seller = parseSellerPage(html, site)

    expect(seller.id).toBe('A1D09S7Q0OD6TH')
    expect(seller.name).toBe('FBA Top G')
    expect(seller.rating.positive_percent).toBe(84.0)
    expect(seller.rating.count).toBe(304)
    expect(seller.ratings.lifetime?.stars['5_star']).toBe(235)
    expect(seller.business.name).toBe('Fba fund llc')

    const fbJson = JSON.parse(readFixture('seller_feedback_A1D09S7Q0OD6TH.json.gz'))
    const fbItem = parseFeedbackItem(fbJson.details[0], site)
    expect(fbItem.rating).toBe(1)
    expect(fbItem.date).toBe('2024-08-08')
    expect(fbItem.author.name).toBe('Terry Brogan')
  })
})

describe('Influencer Page Parser', () => {
  it('parses influencer_tastemade.html.gz correctly', () => {
    const html = readFixture('influencer_tastemade.html.gz')
    const site = getSite('US')
    const inf = parseInfluencerPage(html, site, 'tastemade')

    expect(inf.name).toBe('Tastemade')
    expect(inf.is_top_creator).toBe(true)
    expect(inf.description?.startsWith('A global community')).toBe(true)
  })
})
