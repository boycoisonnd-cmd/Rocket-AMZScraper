export interface ScrapedCardItem {
  id: string
  asin: string
  title: string
  type: 'product' | 'offer' | 'search' | 'ranking' | 'seller' | 'influencer'
  priceText?: string
  priceAmount?: number
  currency?: string
  rating?: number
  reviewsCount?: number
  thumbnail?: string
  badge?: string // 'AMAZON' | 'PRIME' | 'DEAL' | 'CHOICE' | 'HOT'
  rank?: number
  sellerName?: string
  isSoldByAmazon?: boolean
  selected?: boolean
  dateText?: string
  raw: any
}

export type FilterCategory = 'all' | 'products' | 'offers' | 'rankings'
