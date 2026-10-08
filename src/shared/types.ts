/**
 * TypeScript interfaces for all 21 schemas of Rocket-AMZScraper.
 */

import { PriceBlock } from '../parsers/helpers'

export interface BreadcrumbCategory {
  name: string | null
  link: string | null
  node_id: string | null
}

export interface BestSellerRank {
  rank: number | null
  category: string | null
  link: string | null
  category_id: string | null
}

export interface ReviewAuthor {
  name: string | null
  link: string | null
  id: string | null
}

export interface ReviewItem {
  id: string | null
  title: string | null
  link: string | null
  rating: number | null
  date: string | null
  date_text: string | null
  country: string | null
  text: string | null
  author: ReviewAuthor
  variant: string | null
  is_verified_purchase: boolean
  is_vine: boolean
  helpful_votes: number
  images: (string | null)[]
  has_video: boolean
}

export interface AspectSnippet {
  text: string | null
  review_id: string | null
}

export interface CustomerSayAspect {
  name: string | null
  sentiment: string | null
  summary: string | null
  mentions: number | null
  mentions_percentage: number | null
  snippets: AspectSnippet[]
}

export interface CustomersSaySummary {
  summary: string | null
  aspects: CustomerSayAspect[]
  is_ai_generated: boolean
}

export interface VariationDimension {
  key: string
  name: string
  values: string[]
}

export interface VariationProduct {
  asin: string
  attributes: Record<string, string>
  link: string | null
  is_current: boolean
}

export interface VariationsMatrix {
  parent_asin: string | null
  current_asin: string | null
  dimensions: VariationDimension[]
  products: VariationProduct[]
  count: number
}

export interface MediaImage {
  link: string
  thumbnail: string | null
  large: string | null
  variant: string | null
}

export interface MediaVideo {
  title?: string | null
  link: string
  thumbnail?: string | null
  duration_seconds?: number | null
  language?: string | null
  is_hero?: boolean | null
  creator?: string | null
}

export interface BuyBoxInfo {
  seller: {
    name: string | null
    id: string | null
    link: string | null
  } | null
  ships_from: string | null
  is_fulfilled_by_amazon: boolean
  is_sold_by_amazon: boolean
}

export interface DeliverySlot {
  type?: string | null
  price_text?: string | null
  time?: string | null
  cutoff?: string | null
  text?: string | null
}

export interface DeliveryInfo {
  text: string | null
  fastest_text: string | null
  options: DeliverySlot[]
  location: string | null
}

export interface ProductDetails {
  asin: string | null
  title: string | null
  link: string | null
  brand: {
    name: string | null
    byline?: string | null
    link: string | null
    store_link: string | null
  } | null
  authors: { name: string; role: string | null; link: string | null }[] | null
  price: PriceBlock & { savings_percent?: number | null; savings_amount?: number | null } | null
  deal_badge: string | null
  coupon: string | null
  availability: {
    text: string | null
    is_in_stock: boolean | null
    quantity_left: number | null
  } | null
  buybox: BuyBoxInfo | null
  delivery: DeliveryInfo | null
  is_prime: boolean
  rating: {
    average: number | null
    count: number | null
    histogram: Record<string, number | null> | null
  } | null
  bought_past_month: number | null
  badges: {
    is_best_seller: boolean
    is_amazons_choice: boolean
    best_seller_text: string | null
    is_climate_pledge_friendly: boolean
  }
  categories: BreadcrumbCategory[]
  best_sellers_rank: BestSellerRank[]
  bullets: string[]
  overview: Record<string, string | null> | null
  description: string | null
  aplus_description: string | null
  details: Record<string, string> | null
  identifiers: Record<string, string> | null
  images: MediaImage[]
  videos: MediaVideo[]
  videos_count: number | null
  variations: VariationsMatrix | null
  customers_say: CustomersSaySummary | null
  top_reviews: ReviewItem[]
  has_inline_reviews: boolean
  important_information: string | null
  warranty: string | null
  country: string
  domain: string
}

export interface SearchCard {
  asin: string
  title: string | null
  brand: string | null
  link: string | null
  image: string | null
  thumbnail: string | null
  is_sponsored: boolean
  price: PriceBlock | null
  rating: { average: number | null; count: number | null } | null
  bought_past_month: number | null
  bought_past_month_text: string | null
  badges: Record<string, boolean>
  delivery: string | null
  coupon: string | null
  variations_text: string | null
  has_variations: boolean
  more_buying_choices: {
    lowest_price: number | null
    offers_count: number | null
    text: string | null
  } | null
  position: number | null
}

export interface FacetOption {
  name: string
  value: string | null
  link: string | null
  is_selected: boolean
}

export interface RefinementFacet {
  id: string | null
  name: string | null
  options: FacetOption[]
}

export interface DepartmentNode {
  name: string
  node_id: string | null
  link: string | null
  is_selected: boolean
}

export interface SearchPageResult {
  results: SearchCard[]
  total_count: number | null
  is_total_approximate: boolean
  results_text: string | null
  departments: DepartmentNode[]
  refinements: RefinementFacet[]
  search_aliases: { id: string; name: string | null }[]
  current_page: number
  total_pages: number
}

export interface OfferItem {
  condition: string | null
  condition_note: string | null
  price: (PriceBlock & { savings_percent?: number | null }) | null
  seller: {
    name: string | null
    id: string | null
    link: string | null
    rating: number | null
    positive_percent: number | null
    ratings_count: number | null
  } | null
  ships_from: string | null
  is_fulfilled_by_amazon: boolean
  is_sold_by_amazon: boolean
  is_prime: boolean
  delivery: { text: string | null; fastest_text: string | null } | null
  max_quantity: number | null
  promotion: string | null
  is_pinned: boolean
}

export interface OffersPageResult {
  asin: string | null
  title: string | null
  rating: { average: number | null; count: number | null } | null
  offers: OfferItem[]
  other_offers_count: number | null
  has_more: boolean
}

export interface BestsellerCard {
  rank: number | null
  asin: string | null
  title: string | null
  link: string | null
  image: string | null
  rating: { average: number | null; count: number | null } | null
  price: PriceBlock | null
  price_text: string | null
  rank_change_percent: number | null
  previous_rank: number | null
  sales_rank: number | null
}

export interface BestsellersPageResult {
  title: string | null
  items: BestsellerCard[]
  expected_count: number
  tree: {
    name: string | null
    path: string | null
    link: string | null
    is_selected: boolean
    is_root: boolean
  }[]
  tabs: { name: string | null; link: string | null }[]
  acp: {
    path: string | null
    params: string
    reftag: string | null
    faceout: string
    rendered: number
    entries: any[]
  } | null
}

export interface SellerRatingsPeriod {
  count: number | null
  positive_percent: number | null
  stars: Record<string, number | null>
  stars_percent: Record<string, number | null>
}

export interface SellerProfile {
  id: string | null
  name: string | null
  link: string | null
  storefront_link: string | null
  logo: string | null
  rating: {
    average: number | null
    positive_percent: number | null
    count: number | null
  }
  ratings: {
    lifetime: SellerRatingsPeriod | null
    twelve_months: SellerRatingsPeriod | null
    three_months: SellerRatingsPeriod | null
    one_month: SellerRatingsPeriod | null
  }
  business: {
    name?: string | null
    address?: string | null
  }
  about: string | null
  info: Record<string, string> | null
  country: string
  domain: string
}

export interface SellerFeedbackItem {
  rating: number | null
  text: string | null
  date: string | null
  date_text: string | null
  author: {
    name: string | null
    link: string | null
    avatar: string | null
  }
  is_fulfilled_by_amazon: boolean
  has_response: boolean
  response: string | null
  is_suppressed: boolean
}

export interface InfluencerPost {
  id: string
  type: 'list' | 'video' | 'photo' | 'post'
  title: string | null
  link: string | null
  image: string | null
  items_count: number | null
  likes: number | null
  is_pinned: boolean
  product_asins: string[]
}

export interface InfluencerProfile {
  name: string | null
  handle?: string | null
  link: string | null
  description: string | null
  image: string | null
  is_top_creator: boolean
  badge: string | null
  social_links: string[]
  posts_count_on_page: number
  has_more_posts: boolean
  next_page_token: string | null
  posts: InfluencerPost[]
}

export interface InfluencerListProduct {
  asin: string | null
  title: string | null
  brand: string | null
  link: string | null
  image: string | null
  price: PriceBlock | null
  delivery: string | null
}

export interface InfluencerListPage {
  title: string | null
  description: string | null
  products: InfluencerListProduct[]
}

export interface DealProduct {
  asin: string | null
  title: string | null
  link: string | null
  image: string | null
  thumbnail: string | null
  brand: {
    name: string | null
    id: string | null
    logo: string | null
  } | null
  rating: {
    average: number | null
    count: number | null
  } | null
  category: {
    id: string | null
    product_type: string | null
    group: string | null
    department_ids: string[]
  } | null
  variations_count: number | null
  is_pinned: boolean
  deal: Record<string, any> | null
}

export interface AutocompleteSuggestion {
  value: string | null
  type: string | null
  department: string | null
  department_alias: string | null
  is_ghost?: boolean | null
}
