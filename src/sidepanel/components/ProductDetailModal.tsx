import React, { useState } from 'react'
import { X, Star, Copy, Download, Check, ShoppingBag } from 'lucide-react'
import { ScrapedCardItem } from '../types'
import { copyToClipboard, exportToJsonFile, exportToCsvFile } from '../../shared/export'

interface ProductDetailModalProps {
  item: ScrapedCardItem | null
  onClose: () => void
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ item, onClose }) => {
  const [copied, setCopied] = useState(false)
  const [tab, setTab] = useState<'info' | 'json'>('info')

  if (!item) return null

  const handleCopy = async () => {
    await copyToClipboard(JSON.stringify(item.raw, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in duration-200">
      <div role="dialog" aria-modal="true" aria-label={`Chi tiết sản phẩm ${item.asin}`} className="rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border bg-white dark:bg-[#181B26] border-slate-200 dark:border-[#2C3246]">
        {/* Header */}
        <div className="p-3.5 border-b flex items-center justify-between bg-slate-50 dark:bg-[#141620] border-slate-200 dark:border-[#282D40]">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase bg-[#FF9900] text-gray-950">
              {item.badge || 'AMAZON'}
            </span>
            <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">{item.asin}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng chi tiết sản phẩm"
            className="min-w-9 min-h-9 rounded-lg flex items-center justify-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 bg-slate-100 hover:bg-slate-200 dark:bg-[#212534] dark:hover:bg-[#2A3043] text-slate-600 dark:text-slate-300"
          >
            <X size={15} />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="flex border-b px-3 bg-slate-100/70 dark:bg-[#161822] border-slate-200 dark:border-[#282D40]">
          <button
            type="button"
            onClick={() => setTab('info')}
            aria-pressed={tab === 'info'}
            className={`min-h-10 py-2 px-3 text-sm font-bold border-b-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
              tab === 'info'
                ? 'border-[#FF9900] text-[#FF9900]'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Chi tiết sản phẩm
          </button>

          <button
            type="button"
            onClick={() => setTab('json')}
            aria-pressed={tab === 'json'}
            className={`min-h-10 py-2 px-3 text-sm font-bold border-b-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
              tab === 'json'
                ? 'border-[#FF9900] text-[#FF9900]'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Cấu trúc JSON
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto flex-1 flex flex-col gap-3 text-sm text-slate-800 dark:text-slate-200">
          {tab === 'info' ? (
            <>
              {/* Product overview row */}
              <div className="flex gap-3">
                <div className="w-24 h-28 rounded-xl border p-1 flex items-center justify-center shrink-0 bg-white dark:bg-[#12141D] border-slate-200 dark:border-[#282D40]">
                  {item.thumbnail ? (
                    <img src={item.thumbnail} alt="" className="max-w-full max-h-full object-contain" />
                  ) : (
                    <ShoppingBag size={24} className="text-slate-400" />
                  )}
                </div>

                <div className="flex flex-col justify-between">
                  <h3 className="text-sm font-bold leading-snug line-clamp-3 text-slate-900 dark:text-white">
                    {item.title}
                  </h3>

                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-base font-black text-amber-600 dark:text-amber-400">
                      {item.priceText || (item.priceAmount ? `${item.currency || '$'}${item.priceAmount}` : 'N/A')}
                    </span>
                    {item.rating && (
                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded font-bold text-[11px] bg-slate-100 dark:bg-[#212534] text-slate-800 dark:text-amber-300">
                        <Star size={11} className="fill-amber-400 text-amber-400" />
                        <span>{item.rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                    <span>Người bán / Thương hiệu: </span>
                    <strong className="text-slate-800 dark:text-slate-200">{item.sellerName || 'Amazon.com'}</strong>
                  </div>
                </div>
              </div>

              {/* Bullet points */}
              {item.raw?.features && Array.isArray(item.raw.features) && item.raw.features.length > 0 && (
                <div className="rounded-xl p-3 border bg-slate-50 dark:bg-[#141622] border-slate-200 dark:border-[#232738]">
                  <h4 className="font-bold text-xs mb-1.5 text-slate-900 dark:text-white">
                    Đặc điểm nổi bật
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-xs text-slate-700 dark:text-slate-300">
                    {item.raw.features.slice(0, 5).map((f: string, i: number) => (
                      <li key={i} className="line-clamp-2">{f}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Specifications */}
              {item.raw?.specifications && Object.keys(item.raw.specifications).length > 0 && (
                <div className="rounded-xl p-3 border bg-slate-50 dark:bg-[#141622] border-slate-200 dark:border-[#232738]">
                  <h4 className="font-bold text-xs mb-1.5 text-slate-900 dark:text-white">
                    Thông số kỹ thuật:
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(item.raw.specifications).slice(0, 6).map(([k, v]: any) => (
                      <div key={k} className="p-1.5 rounded border bg-white dark:bg-[#181B26] border-slate-200 dark:border-[#282D40]">
                        <span className="text-slate-500 dark:text-slate-400 block truncate">{k}</span>
                        <strong className="text-slate-900 dark:text-white block truncate">{String(v)}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <pre className="p-3 rounded-xl border text-[11px] font-mono overflow-x-auto max-h-[350px] bg-slate-950 text-emerald-400 border-slate-800">
              {JSON.stringify(item.raw, null, 2)}
            </pre>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t flex items-center justify-between bg-slate-50 dark:bg-[#141620] border-slate-200 dark:border-[#282D40]">
          <button
            type="button"
            onClick={handleCopy}
            className="min-h-10 px-3 py-1.5 rounded-lg font-bold text-sm flex items-center gap-1.5 transition border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 bg-slate-100 hover:bg-slate-200 dark:bg-[#212534] dark:hover:bg-[#2A3043] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-[#2B3042]"
          >
            {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
            <span>{copied ? 'Đã sao chép!' : 'Sao chép JSON'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => exportToCsvFile(item.raw, `${item.asin}_details.csv`)}
              className="min-h-10 px-3 py-1.5 rounded-lg font-bold text-sm flex items-center gap-1.5 transition border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 bg-slate-100 hover:bg-slate-200 dark:bg-[#212534] dark:hover:bg-[#2A3043] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-[#2B3042]"
            >
              <Download size={13} />
              <span>Tải CSV</span>
            </button>

            <button
              type="button"
              onClick={() => exportToJsonFile(item.raw, `${item.asin}_details.json`)}
              className="min-h-10 px-3.5 py-1.5 rounded-lg font-bold text-sm flex items-center gap-1.5 transition text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 bg-gradient-to-r from-[#FF9900] to-[#FFB800] hover:from-[#E68A00] hover:to-[#FFA000]"
            >
              <Download size={13} />
              <span>Tải JSON</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
