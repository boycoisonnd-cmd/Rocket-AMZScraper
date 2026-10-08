import React, { useState } from 'react'
import { EndpointCategory } from './EndpointNav'
import { Play, Loader2 } from 'lucide-react'

interface EndpointFormProps {
  category: EndpointCategory
  onSubmit: (action: string, payload: any) => void
  loading: boolean
}

export const EndpointForm: React.FC<EndpointFormProps> = ({ category, onSubmit, loading }) => {
  // Form states
  const [productMode, setProductMode] = useState<'details' | 'offers' | 'bulk'>('details')
  const [productAsin, setProductAsin] = useState('')
  const [bulkAsins, setBulkAsins] = useState('')

  const [searchMode, setSearchMode] = useState<'search' | 'autocomplete'>('search')
  const [searchQuery, setSearchQuery] = useState('')

  const [rankingsCategory, setRankingsCategory] = useState('electronics')

  const [sellerMode, setSellerMode] = useState<'profile' | 'feedback'>('profile')
  const [sellerId, setSellerId] = useState('')

  const [influencerHandle, setInfluencerHandle] = useState('')

  const [universalUrl, setUniversalUrl] = useState('')

  const handleExecute = (e: React.FormEvent) => {
    e.preventDefault()
    switch (category) {
      case 'products':
        if (productMode === 'details') {
          onSubmit('SCRAPE_PRODUCT', { product: productAsin.trim() })
        } else if (productMode === 'offers') {
          onSubmit('SCRAPE_OFFERS', { product: productAsin.trim() })
        } else {
          const asins = bulkAsins.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean)
          onSubmit('SCRAPE_BULK', { asins })
        }
        break

      case 'search':
        if (searchMode === 'search') {
          onSubmit('SCRAPE_SEARCH', { query: searchQuery.trim() })
        } else {
          onSubmit('SCRAPE_AUTOCOMPLETE', { query: searchQuery.trim() })
        }
        break

      case 'rankings':
        onSubmit('SCRAPE_RANKINGS', { category: rankingsCategory.trim() })
        break

      case 'sellers':
        if (sellerMode === 'profile') {
          onSubmit('SCRAPE_SELLER', { seller: sellerId.trim() })
        } else {
          onSubmit('SCRAPE_SELLER_FEEDBACK', { seller: sellerId.trim() })
        }
        break

      case 'influencers':
        onSubmit('SCRAPE_INFLUENCER', { influencer: influencerHandle.trim() })
        break

      case 'universal':
        onSubmit('SCRAPE_UNIVERSAL', { url: universalUrl.trim() })
        break
    }
  }

  return (
    <form onSubmit={handleExecute} className="px-3.5 pt-2.5 pb-2 text-xs">
      <div className="p-3 rounded-xl border transition-colors bg-white dark:bg-[#161922] border-slate-200 dark:border-[#2C3246] shadow-sm flex flex-col gap-2.5">
        {/* CATEGORY 1: PRODUCTS */}
        {category === 'products' && (
          <>
            {/* Sub-modes Segmented Control */}
            <div className="flex bg-slate-100 dark:bg-[#12141D] p-1 rounded-lg border border-slate-200 dark:border-[#282D40]">
              {[
                { id: 'details', label: 'Chi tiết ASIN' },
                { id: 'offers', label: 'Ưu đãi (Offers)' },
                { id: 'bulk', label: 'Nhiều ASIN' },
              ].map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setProductMode(sub.id as any)}
                  aria-pressed={productMode === sub.id}
                  className={`flex-1 min-h-8 px-1 py-1 rounded-md text-xs font-bold transition text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                    productMode === sub.id
                      ? 'bg-white dark:bg-[#1E2230] text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>

            {productMode !== 'bulk' ? (
              <div>
                <label htmlFor="product-asin" className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1 block">
                  ASIN hoặc đường dẫn sản phẩm
                </label>
                <input
                  id="product-asin"
                  type="text"
                  required
                  value={productAsin}
                  onChange={(e) => setProductAsin(e.target.value)}
                  placeholder="Ví dụ: B00939I7EK hoặc amazon.com/dp/..."
                  className="w-full min-h-10 rounded-lg px-2.5 py-2 text-sm font-mono border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 bg-slate-50 dark:bg-[#12141D] text-slate-900 dark:text-white border-slate-300 dark:border-[#2C3246]"
                />
              </div>
            ) : (
              <div>
                <label htmlFor="bulk-asins" className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1 block">
                  Danh sách ASIN (ngăn cách bằng dấu phẩy hoặc xuống dòng)
                </label>
                <textarea
                  id="bulk-asins"
                  rows={2}
                  required
                  value={bulkAsins}
                  onChange={(e) => setBulkAsins(e.target.value)}
                  placeholder="Ví dụ: B00939I7EK, B07QSFHT27"
                  className="w-full min-h-16 rounded-lg px-2.5 py-2 text-sm font-mono border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 bg-slate-50 dark:bg-[#12141D] text-slate-900 dark:text-white border-slate-300 dark:border-[#2C3246]"
                />
              </div>
            )}
          </>
        )}

        {/* CATEGORY 2: SEARCH */}
        {category === 'search' && (
          <>
            <div className="flex bg-slate-100 dark:bg-[#12141D] p-1 rounded-lg border border-slate-200 dark:border-[#282D40]">
              {[
                { id: 'search', label: 'Kết quả tìm kiếm' },
                { id: 'autocomplete', label: 'Gợi ý từ khóa' },
              ].map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setSearchMode(sub.id as any)}
                  aria-pressed={searchMode === sub.id}
                  className={`flex-1 min-h-8 px-1 py-1 rounded-md text-xs font-bold transition text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                    searchMode === sub.id
                      ? 'bg-white dark:bg-[#1E2230] text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>

            <div>
              <label htmlFor="search-query" className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1 block">
                Từ khóa tìm kiếm
              </label>
              <input
                id="search-query"
                type="text"
                required
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ví dụ: laptop, chuột không dây"
                className="w-full min-h-10 rounded-lg px-2.5 py-2 text-sm border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 bg-slate-50 dark:bg-[#12141D] text-slate-900 dark:text-white border-slate-300 dark:border-[#2C3246]"
              />
            </div>
          </>
        )}

        {/* CATEGORY 3: RANKINGS */}
        {category === 'rankings' && (
          <div>
            <label htmlFor="rankings-category" className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1 block">
              Danh mục bán chạy
            </label>
            <select
              id="rankings-category"
              value={rankingsCategory}
              onChange={(e) => setRankingsCategory(e.target.value)}
              className="w-full min-h-10 rounded-lg px-2.5 py-2 text-sm border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 bg-slate-50 dark:bg-[#12141D] text-slate-900 dark:text-white border-slate-300 dark:border-[#2C3246] cursor-pointer"
            >
              <option value="electronics">Thiết bị điện tử</option>
              <option value="computers">Máy tính và phụ kiện</option>
              <option value="software">Phần mềm</option>
              <option value="kitchen">Nhà cửa và nhà bếp</option>
              <option value="videogames">Trò chơi điện tử</option>
              <option value="books">Sách</option>
            </select>
          </div>
        )}

        {/* CATEGORY 4: SELLERS */}
        {category === 'sellers' && (
          <>
            <div className="flex bg-slate-100 dark:bg-[#12141D] p-1 rounded-lg border border-slate-200 dark:border-[#282D40]">
              {[
                { id: 'profile', label: 'Hồ sơ cửa hàng' },
                  { id: 'feedback', label: 'Đánh giá người bán' },
              ].map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setSellerMode(sub.id as any)}
                  aria-pressed={sellerMode === sub.id}
                  className={`flex-1 min-h-8 px-1 py-1 rounded-md text-xs font-bold transition text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                    sellerMode === sub.id
                      ? 'bg-white dark:bg-[#1E2230] text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>

            <div>
              <label htmlFor="seller-id" className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1 block">
                Mã người bán (Seller ID)
              </label>
              <input
                id="seller-id"
                type="text"
                required
                value={sellerId}
                onChange={(e) => setSellerId(e.target.value)}
                placeholder="Ví dụ: A1D09S7Q0OD6TH"
                className="w-full min-h-10 rounded-lg px-2.5 py-2 text-sm font-mono border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 bg-slate-50 dark:bg-[#12141D] text-slate-900 dark:text-white border-slate-300 dark:border-[#2C3246]"
              />
            </div>
          </>
        )}

        {/* CATEGORY 5: INFLUENCERS */}
        {category === 'influencers' && (
          <div>
            <label htmlFor="influencer-handle" className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1 block">
              Tên cửa hàng Influencer
            </label>
            <input
              id="influencer-handle"
              type="text"
              required
              value={influencerHandle}
              onChange={(e) => setInfluencerHandle(e.target.value)}
              placeholder="Ví dụ: tastemade"
              className="w-full min-h-10 rounded-lg px-2.5 py-2 text-sm border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 bg-slate-50 dark:bg-[#12141D] text-slate-900 dark:text-white border-slate-300 dark:border-[#2C3246]"
            />
          </div>
        )}

        {/* CATEGORY 6: UNIVERSAL URL */}
        {category === 'universal' && (
          <div>
            <label htmlFor="universal-url" className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1 block">
              Đường dẫn Amazon
            </label>
            <input
              id="universal-url"
              type="text"
              required
              value={universalUrl}
              onChange={(e) => setUniversalUrl(e.target.value)}
              placeholder="https://www.amazon.com/..."
              className="w-full min-h-10 rounded-lg px-2.5 py-2 text-sm border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 bg-slate-50 dark:bg-[#12141D] text-slate-900 dark:text-white border-slate-300 dark:border-[#2C3246]"
            />
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
              Tự nhận diện loại trang để trích xuất thông tin phù hợp.
            </p>
          </div>
        )}

        {/* Execute Button */}
        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          className="w-full min-h-10 rounded-lg bg-gradient-to-r from-[#FF9900] to-[#FFB800] hover:from-[#E68A00] hover:to-[#FFA000] text-gray-950 font-bold text-sm flex items-center justify-center gap-1.5 transition shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 disabled:opacity-50 mt-0.5"
        >
          {loading ? (
            <>
              <Loader2 size={13} className="animate-spin text-gray-950" />
              <span>Đang trích xuất dữ liệu…</span>
            </>
          ) : (
            <>
              <Play size={13} className="fill-gray-950" />
              <span>Bắt đầu trích xuất</span>
            </>
          )}
        </button>
      </div>
    </form>
  )
}
