import React, { useState, useMemo } from 'react'
import {
  Table as TableIcon,
  LayoutGrid,
  FileCode,
  Search,
  Star,
  Download,
  ShoppingBag,
} from 'lucide-react'
import { ScrapedCardItem } from '../types'

interface DataWorkspaceProps {
  items: ScrapedCardItem[]
  onToggleSelect: (id: string) => void
  onToggleSelectAll: () => void
  allSelected: boolean
  onItemClick: (item: ScrapedCardItem) => void
  onExportSingle: (item: ScrapedCardItem) => void
}

type ViewMode = 'table' | 'cards' | 'json'

export const DataWorkspace: React.FC<DataWorkspaceProps> = ({
  items,
  onToggleSelect,
  onToggleSelectAll,
  allSelected,
  onItemClick,
  onExportSingle,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('cards')
  const [searchQuery, setSearchQuery] = useState('')

  // Filter items by local search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items
    const q = searchQuery.toLowerCase()
    return items.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.asin.toLowerCase().includes(q) ||
        (i.sellerName && i.sellerName.toLowerCase().includes(q))
    )
  }, [items, searchQuery])

  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-inner bg-slate-100 dark:bg-[#1A1D29] text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-[#2C3246]">
          <ShoppingBag size={24} aria-hidden="true" />
        </div>
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
          Chưa có dữ liệu
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-[260px] leading-relaxed">
          Mở trang Amazon rồi chọn <strong>Trích xuất trang này</strong>, hoặc nhập thông tin ở chức năng phía trên.
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Workspace Sub-header: Item Count + Search Filter + View Mode */}
      <div className="px-3.5 py-2 border-b flex items-center justify-between gap-2 bg-slate-50/70 dark:bg-[#141620] border-slate-200 dark:border-[#2C3246]">
        {/* Left: Count & Search */}
        <div className="flex items-center gap-2 flex-1 max-w-[220px]">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 shrink-0">
            {filteredItems.length} mục
          </span>

          <div className="relative flex-1">
            <Search
              size={11}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              aria-label="Lọc theo tên sản phẩm, ASIN hoặc người bán"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm trong kết quả…"
              className="w-full min-h-9 text-xs rounded-md pl-7 pr-2 py-1 border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 bg-white dark:bg-[#1E2230] text-slate-900 dark:text-white border-slate-300 dark:border-[#2C3246]"
            />
          </div>
        </div>

        {/* Right: View Mode Toggle (Table / Cards / JSON) */}
        <div className="flex bg-slate-200 dark:bg-[#1E2230] rounded-lg p-0.5 border border-slate-300 dark:border-[#2C3246]">
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            title="Dạng thẻ"
            aria-label="Xem dạng thẻ"
            aria-pressed={viewMode === 'cards'}
            className={`min-w-8 min-h-8 rounded-md flex items-center justify-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
              viewMode === 'cards'
                ? 'bg-white dark:bg-[#282D40] text-amber-600 dark:text-amber-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <LayoutGrid size={13} />
          </button>

          <button
            type="button"
            onClick={() => setViewMode('table')}
            title="Dạng bảng dữ liệu"
            aria-label="Xem dạng bảng"
            aria-pressed={viewMode === 'table'}
            className={`min-w-8 min-h-8 rounded-md flex items-center justify-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
              viewMode === 'table'
                ? 'bg-white dark:bg-[#282D40] text-amber-600 dark:text-amber-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <TableIcon size={13} />
          </button>

          <button
            type="button"
            onClick={() => setViewMode('json')}
            title="Dạng cây JSON"
            aria-label="Xem dữ liệu JSON"
            aria-pressed={viewMode === 'json'}
            className={`min-w-8 min-h-8 rounded-md flex items-center justify-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
              viewMode === 'json'
                ? 'bg-white dark:bg-[#282D40] text-amber-600 dark:text-amber-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileCode size={13} />
          </button>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {filteredItems.length === 0 && (
          <div role="status" className="p-6 text-center text-sm text-slate-600 dark:text-slate-300">
            Không có kết quả khớp. Hãy thử từ khóa khác.
          </div>
        )}
        {/* VIEW 1: E-COMMERCE CARDS (Tailored for Amazon Products) */}
        {viewMode === 'cards' && filteredItems.length > 0 && (
          <div className="grid grid-cols-2 gap-2.5 p-3.5">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className={`group relative rounded-xl border transition-all duration-200 overflow-hidden flex flex-col bg-white dark:bg-[#1A1E2B] ${
                  item.selected
                    ? 'border-amber-500 dark:border-amber-500 shadow-md shadow-amber-500/10'
                    : 'border-slate-200 dark:border-[#282D40] hover:border-slate-300 dark:hover:border-[#383E54]'
                }`}
              >
                {/* Product Thumbnail Media */}
                <div className="relative w-full aspect-[4/5] bg-slate-50 dark:bg-[#12141D] overflow-hidden">
                  <button
                    type="button"
                    aria-label={`Xem chi tiết ${item.title}`}
                    onClick={() => onItemClick(item)}
                    className="absolute inset-0 flex w-full items-center justify-center p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500"
                  >
                    {item.thumbnail ? (
                      <img
                        src={item.thumbnail}
                        alt=""
                        loading="lazy"
                        className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <span className="flex flex-col items-center justify-center text-slate-400">
                        <ShoppingBag size={24} className="opacity-40 mb-1" />
                        <span className="text-xs">Chưa có ảnh</span>
                      </span>
                    )}
                  </button>

                  {/* Top Bar inside Media: Selection Checkbox & Badge */}
                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10 pointer-events-auto">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={Boolean(item.selected)}
                        aria-label={`Chọn ${item.title}`}
                        onChange={(e) => {
                          e.stopPropagation()
                          onToggleSelect(item.id)
                        }}
                        className="w-4 h-4 rounded text-amber-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 cursor-pointer accent-[#FF9900]"
                      />

                      {item.badge && (
                        <span className="text-[11px] font-extrabold px-1.5 py-0.5 rounded uppercase bg-[#FF9900] text-gray-950 shadow-sm">
                          {item.badge}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onExportSingle(item)
                      }}
                      title="Xuất mục này"
                      aria-label={`Xuất dữ liệu ${item.asin}`}
                      className="min-w-8 min-h-8 rounded-md bg-white/90 dark:bg-black/60 hover:bg-[#FF9900] dark:hover:bg-[#FF9900] text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-black flex items-center justify-center transition border border-slate-200 dark:border-white/10 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                    >
                      <Download size={11} />
                    </button>
                  </div>

                  {/* Bottom Overlay on Media: Price & Stars */}
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between z-10 pointer-events-none">
                    <span className="px-1.5 py-0.5 rounded font-black text-xs shadow-sm bg-white/95 dark:bg-black/80 text-amber-700 dark:text-amber-300 border border-slate-200 dark:border-white/10">
                      {item.priceText || (item.priceAmount ? `${item.currency || '$'}${item.priceAmount}` : 'N/A')}
                    </span>

                    {item.rating && (
                      <span className="px-1.5 py-0.5 rounded font-bold text-xs flex items-center gap-0.5 shadow-sm bg-white/95 dark:bg-black/80 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/10">
                        <Star size={9} className="fill-amber-400 text-amber-400" />
                        <span>{item.rating.toFixed(1)}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Product Meta Content */}
                <button
                  type="button"
                  aria-label={`Xem chi tiết ${item.title}`}
                  className="w-full p-2.5 text-left flex-1 flex flex-col justify-between cursor-pointer border-t border-slate-100 dark:border-[#242838] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500"
                  onClick={() => onItemClick(item)}
                >
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 line-clamp-2 leading-snug group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    {item.title}
                  </h4>

                  <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-[#242838] flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                    <span className="font-mono font-semibold truncate max-w-[85px]">
                      {item.asin}
                    </span>

                    <span>{item.sellerName || 'Amazon'}</span>
                  </div>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* VIEW 2: E-COMMERCE TABLE */}
        {viewMode === 'table' && filteredItems.length > 0 && (
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b bg-slate-100/70 dark:bg-[#141620] border-slate-200 dark:border-[#2C3246] text-slate-700 dark:text-slate-300 text-xs uppercase font-bold tracking-wider">
                  <th scope="col" className="p-2.5 w-8 text-center">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      aria-label="Chọn tất cả kết quả"
                      onChange={onToggleSelectAll}
                      className="rounded accent-[#FF9900]"
                    />
                  </th>
                  <th scope="col" className="p-2.5 w-12">Ảnh</th>
                  <th scope="col" className="p-2.5">Tên sản phẩm</th>
                  <th scope="col" className="p-2.5 w-24">ASIN</th>
                  <th scope="col" className="p-2.5 w-20">Giá</th>
                  <th scope="col" className="p-2.5 w-16">Đánh giá</th>
                  <th scope="col" className="p-2.5 w-16 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#242838]">
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50 dark:hover:bg-[#1E2332] transition-colors cursor-pointer"
                    onClick={() => onItemClick(item)}
                  >
                    <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={Boolean(item.selected)}
                        aria-label={`Chọn ${item.title}`}
                        onChange={() => onToggleSelect(item.id)}
                        className="rounded accent-[#FF9900]"
                      />
                    </td>
                    <td className="p-2.5">
                      <div className="w-9 h-9 rounded bg-white dark:bg-[#12141D] border border-slate-200 dark:border-[#282D40] p-0.5 flex items-center justify-center overflow-hidden">
                        {item.thumbnail ? (
                          <img src={item.thumbnail} alt="" className="max-w-full max-h-full object-contain" />
                        ) : (
                          <ShoppingBag size={12} className="text-slate-400" />
                        )}
                      </div>
                    </td>
                    <td className="p-2.5">
                      <button
                        type="button"
                        aria-label={`Xem chi tiết ${item.title}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          onItemClick(item)
                        }}
                        className="max-w-[150px] text-left font-semibold text-slate-800 dark:text-slate-200 line-clamp-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                      >
                        {item.title}
                      </button>
                      <span className="text-xs text-slate-600 dark:text-slate-300 truncate block">
                        {item.sellerName || 'Amazon'}
                      </span>
                    </td>
                    <td className="p-2.5 font-mono text-xs text-slate-700 dark:text-slate-300">
                      {item.asin}
                    </td>
                    <td className="p-2.5 font-bold text-amber-600 dark:text-amber-400">
                      {item.priceText || (item.priceAmount ? `${item.currency || '$'}${item.priceAmount}` : 'N/A')}
                    </td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-300">
                      {item.rating ? `★ ${item.rating.toFixed(1)}` : '-'}
                    </td>
                    <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => onExportSingle(item)}
                        title="Xuất dòng này"
                        aria-label={`Xuất dữ liệu ${item.asin}`}
                        className="min-w-8 min-h-8 rounded hover:bg-slate-200 dark:hover:bg-[#282D40] text-slate-600 dark:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                      >
                        <Download size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* VIEW 3: RAW JSON */}
        {viewMode === 'json' && filteredItems.length > 0 && (
          <div className="p-3">
            <pre className="p-3 rounded-xl border text-xs font-mono overflow-x-auto bg-slate-900 text-emerald-400 border-slate-800">
              {JSON.stringify(
                filteredItems.map((i) => i.raw),
                null,
                2
              )}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
