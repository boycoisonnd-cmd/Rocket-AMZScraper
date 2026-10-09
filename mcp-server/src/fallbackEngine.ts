import * as cheerio from 'cheerio'

const COUNTRY_DOMAINS: Record<string, string> = {
  US: 'https://www.amazon.com',
  CA: 'https://www.amazon.ca',
  MX: 'https://www.amazon.com.mx',
  BR: 'https://www.amazon.com.br',
  GB: 'https://www.amazon.co.uk',
  DE: 'https://www.amazon.de',
  FR: 'https://www.amazon.fr',
  ES: 'https://www.amazon.es',
  IT: 'https://www.amazon.it',
  NL: 'https://www.amazon.nl',
  SE: 'https://www.amazon.se',
  PL: 'https://www.amazon.pl',
  TR: 'https://www.amazon.com.tr',
  AE: 'https://www.amazon.ae',
  SA: 'https://www.amazon.sa',
  EG: 'https://www.amazon.eg',
  IN: 'https://www.amazon.in',
  JP: 'https://www.amazon.co.jp',
  SG: 'https://www.amazon.sg',
  AU: 'https://www.amazon.com.au',
  BE: 'https://www.amazon.com.be',
  IE: 'https://www.amazon.co.uk',
  ZA: 'https://www.amazon.co.za',
}

const COMMON_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Upgrade-Insecure-Requests': '1',
  'sec-ch-ua': '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
}

export class DirectFallbackEngine {
  private getBaseUrl(country = 'US'): string {
    const code = country.toUpperCase()
    return COUNTRY_DOMAINS[code] || COUNTRY_DOMAINS.US
  }

  private async fetchHtml(url: string): Promise<string> {
    const response = await fetch(url, {
      method: 'GET',
      headers: COMMON_HEADERS,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} when fetching ${url}`)
    }

    const html = await response.text()
    if (html.includes('api-services-support@amazon.com') || html.includes('validateCaptcha')) {
      throw new Error(
        'Amazon yêu cầu Captcha khi cào qua Direct Fetch độc lập. Vui lòng mở Google Chrome có R-AMZscraper để tự động dùng phiên duyệt thật!'
      )
    }

    return html
  }

  public async scrapeProduct(asin: string, country = 'US'): Promise<any> {
    const base = this.getBaseUrl(country)
    const url = `${base}/dp/${asin}`
    const html = await this.fetchHtml(url)
    const $ = cheerio.load(html)

    const title = $('#productTitle').text().trim() || $('h1').first().text().trim()
    const priceText =
      $('.a-price .a-offscreen').first().text().trim() ||
      $('#priceblock_ourprice').text().trim() ||
      $('#priceblock_dealprice').text().trim()

    const ratingText =
      $('span[data-hook="rating-out-of-text"]').first().text().trim() ||
      $('.a-icon-alt').first().text().trim()

    const ratingMatch = ratingText.match(/([0-9.]+)/)
    const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null

    const reviewsText =
      $('#acrCustomerReviewText').first().text().trim() ||
      $('[data-hook="total-review-count"]').text().trim()
    const reviewsCountMatch = reviewsText.replace(/,/g, '').match(/(\d+)/)
    const reviewsCount = reviewsCountMatch ? parseInt(reviewsCountMatch[1], 10) : 0

    const bulletPoints: string[] = []
    $('#feature-bullets ul li span.a-list-item').each((_, el) => {
      const text = $(el).text().trim()
      if (text && !text.startsWith('Make sure this fits')) {
        bulletPoints.push(text)
      }
    })

    const mainImage =
      $('#landingImage').attr('src') ||
      $('#imgBlkFront').attr('src') ||
      $('img[data-old-hires]').attr('data-old-hires') ||
      ''

    const sellerName =
      $('#sellerProfileTriggerId').text().trim() ||
      $('#merchant-info').text().trim() ||
      'Amazon'

    return {
      source: 'direct_fallback_engine',
      asin,
      country: country.toUpperCase(),
      url,
      title,
      price: priceText,
      rating,
      reviewsCount,
      sellerName,
      mainImage,
      bulletPoints: bulletPoints.slice(0, 10),
    }
  }

  public async scrapeSearch(query: string, country = 'US', page = 1): Promise<any> {
    const base = this.getBaseUrl(country)
    const url = `${base}/s?k=${encodeURIComponent(query)}&page=${page}`
    const html = await this.fetchHtml(url)
    const $ = cheerio.load(html)

    const items: any[] = []
    $('[data-component-type="s-search-result"]').each((_, el) => {
      const asin = $(el).attr('data-asin')
      if (!asin) return

      const titleEl = $(el).find('h2 a span')
      const title = titleEl.text().trim()
      const price = $(el).find('.a-price .a-offscreen').first().text().trim()
      const ratingText = $(el).find('.a-icon-alt').first().text().trim()
      const ratingMatch = ratingText.match(/([0-9.]+)/)
      const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null

      const reviewsText = $(el).find('span[aria-label*="stars"] + span a span').text().trim() ||
        $(el).find('.s-underline-text').first().text().trim()
      const thumbnail = $(el).find('img.s-image').attr('src') || ''
      const isPrime = $(el).find('.a-icon-prime').length > 0

      items.push({
        asin,
        title,
        price,
        rating,
        reviewsCount: reviewsText,
        thumbnail,
        isPrime,
      })
    })

    return {
      source: 'direct_fallback_engine',
      query,
      country: country.toUpperCase(),
      page,
      url,
      totalFound: items.length,
      items,
    }
  }

  public async scrapeBestsellers(category: string, country = 'US'): Promise<any> {
    const base = this.getBaseUrl(country)
    const url = `${base}/gp/bestsellers/${encodeURIComponent(category.toLowerCase())}`
    const html = await this.fetchHtml(url)
    const $ = cheerio.load(html)

    const items: any[] = []
    $('.zg-grid-general-faceout, .p13n-sc-uncover-faceout, .zg-item-immersion').each((idx, el) => {
      const rank = idx + 1
      const title = $(el).find('.p13n-sc-truncate-desktop-type2, ._cDEzb_p13n-sc-css-line-clamp-1_1Fn1y, span.a-size-small').first().text().trim()
      const price = $(el).find('span._cDEzb_p13n-sc-price_3mJ9Z, .a-price .a-offscreen').first().text().trim()
      const link = $(el).find('a.a-link-normal').first().attr('href') || ''
      const asinMatch = link.match(/\/dp\/([A-Z0-9]{10})/)
      const asin = asinMatch ? asinMatch[1] : undefined

      if (title || asin) {
        items.push({
          rank,
          asin,
          title,
          price,
        })
      }
    })

    return {
      source: 'direct_fallback_engine',
      category,
      country: country.toUpperCase(),
      url,
      count: items.length,
      items: items.slice(0, 50),
    }
  }

  public async scrapeUniversal(url: string): Promise<any> {
    const html = await this.fetchHtml(url)
    const $ = cheerio.load(html)
    const title = $('title').text().trim()

    // Detect basic structure
    const asinMatch = url.match(/\/dp\/([A-Z0-9]{10})/)
    if (asinMatch) {
      return await this.scrapeProduct(asinMatch[1])
    }

    return {
      source: 'direct_fallback_engine',
      url,
      title,
      htmlPreview: $('body').text().slice(0, 1000).trim(),
    }
  }
}
