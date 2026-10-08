import { describe, it, expect } from 'vitest'
import { parseAmount, money, ratingOf, boughtPastMonth, snake, balancedJson, jsonAfter } from '../../src/parsers/helpers'
import { getSite, countryForHost } from '../../src/shared/sites'
import { resolveProduct, resolveSeller, resolveInfluencer, resolveNode, countryOf, detectPageType } from '../../src/shared/refs'

describe('Sites & Refs', () => {
  it('resolves sites and hostnames correctly', () => {
    const us = getSite('US')
    expect(us.domain).toBe('amazon.com')
    expect(us.currency).toBe('USD')

    expect(countryForHost('www.amazon.co.uk')).toBe('GB')
    expect(countryForHost('amazon.de')).toBe('DE')
    expect(countryForHost('data.amazon.co.jp')).toBe('JP')
    expect(countryForHost('google.com')).toBeNull()
  })

  it('resolves product ASINs and URLs', () => {
    expect(resolveProduct('B00939I7EK')).toBe('B00939I7EK')
    expect(resolveProduct('https://www.amazon.com/dp/B00939I7EK')).toBe('B00939I7EK')
    expect(resolveProduct('https://www.amazon.de/Kindle-Paperwhite/dp/B07QSFHT27/ref=sr_1_1')).toBe('B07QSFHT27')
    expect(countryOf('https://www.amazon.de/dp/B07QSFHT27')).toBe('DE')
  })

  it('detects page types', () => {
    expect(detectPageType('https://www.amazon.com/dp/B00939I7EK')).toBe('product')
    expect(detectPageType('https://www.amazon.com/s?k=laptop')).toBe('search')
    expect(detectPageType('https://www.amazon.com/gp/bestsellers/electronics')).toBe('bestsellers')
    expect(detectPageType('https://www.amazon.com/sp?seller=A1D09S7Q0OD6TH')).toBe('seller')
    expect(detectPageType('https://www.amazon.com/shop/tastemade')).toBe('influencer')
    expect(detectPageType('https://www.amazon.com/shop/tastemade/list/1N84PQ3CI4NW0')).toBe('influencer_post')
  })
})

describe('Helpers parsing', () => {
  it('parses localized amounts', () => {
    expect(parseAmount('$40,524.99')).toBe(40524.99)
    expect(parseAmount('8.104,64 €')).toBe(8104.64)
    expect(parseAmount('1 353 €')).toBe(1353)
    expect(parseAmount('- $15.50')).toBe(-15.5)
  })

  it('parses ratings and bought counts', () => {
    expect(ratingOf('4.7 out of 5 stars')).toBe(4.7)
    expect(ratingOf('4,2 von 5 Sternen')).toBe(4.2)
    expect(boughtPastMonth('6K+ bought in past month')).toBe(6000)
    expect(boughtPastMonth('2M+ bought in past month')).toBe(2000000)
  })

  it('parses balanced json and json_after', () => {
    const raw = 'var data = {"colorImages": {"initial": [{"hiRes": "https://img.jpg"}]}};'
    const parsed = jsonAfter(raw, '"colorImages":', '{')
    expect(parsed).toEqual({ initial: [{ hiRes: 'https://img.jpg' }] })
  })
})
