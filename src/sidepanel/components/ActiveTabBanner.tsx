import React from 'react'
import { Zap, ExternalLink, Globe } from 'lucide-react'
import { SITES } from '../../shared/sites'
import { getCountryFlag } from '../../shared/flags'

interface ActiveTabBannerProps {
  activeTabInfo: any
  country: string
  onScrapeActiveTab: () => void
  isScraping: boolean
}

export const ActiveTabBanner: React.FC<ActiveTabBannerProps> = ({
  activeTabInfo,
  country,
  onScrapeActiveTab,
  isScraping,
}) => {
  const isAmazon = Boolean(activeTabInfo?.isAmazon)
  const site = SITES[country] || SITES.US

  return (
    <div className="px-3.5 pt-3">
      {isAmazon ? (
        <div className="p-2.5 rounded-xl border transition-all shadow-sm bg-gradient-to-r from-amber-50 to-orange-50 dark:from-[#222838] dark:to-[#1E2332] border-amber-200 dark:border-amber-500/30">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                Đang trên Amazon {activeTabInfo.country?.toUpperCase() || country}
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded font-semibold uppercase bg-amber-200/80 dark:bg-amber-400/20 text-amber-800 dark:text-amber-300">
                {activeTabInfo.pageType || 'Trang Amazon'}
              </span>
            </div>

            <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
              Trang hiện tại
            </span>
          </div>

          <p className="text-xs text-slate-700 dark:text-slate-300 truncate mt-1" title={activeTabInfo.title}>
            {activeTabInfo.title || activeTabInfo.url}
          </p>

          <button
            type="button"
            onClick={onScrapeActiveTab}
            disabled={isScraping}
            aria-busy={isScraping}
            className="mt-2 w-full min-h-10 rounded-lg bg-gradient-to-r from-[#FF9900] to-[#FFB800] hover:from-[#E68A00] hover:to-[#FFA000] text-gray-950 font-bold text-sm flex items-center justify-center gap-1.5 transition shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 disabled:opacity-50"
          >
            <Zap size={14} className="fill-gray-950" />
            <span>{isScraping ? 'Đang trích xuất dữ liệu…' : 'Trích xuất trang này'}</span>
          </button>
        </div>
      ) : (
        <div className="p-2.5 rounded-xl border transition-all bg-slate-50 dark:bg-[#1A1D29] border-slate-200 dark:border-[#2C3246] flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Globe size={15} className="text-slate-400 shrink-0" />
            <div>
              <p className="font-medium text-slate-700 dark:text-slate-300">
                Trình duyệt chưa ở Amazon
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Chọn một chức năng bên dưới hoặc mở Amazon
              </p>
            </div>
          </div>

          <a
            href={`https://${site.domain}`}
            target="_blank"
            rel="noreferrer"
            className="min-h-9 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 bg-slate-200 hover:bg-slate-300 dark:bg-[#262B3D] dark:hover:bg-[#323950] text-slate-800 dark:text-slate-200"
          >
            <span>Mở {getCountryFlag(country)}</span>
            <ExternalLink size={11} />
          </a>
        </div>
      )}
    </div>
  )
}
