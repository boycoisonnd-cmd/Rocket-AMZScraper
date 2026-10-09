import React from 'react'
import { SITES, COUNTRIES } from '../../shared/sites'
import { getCountryFlag } from '../../shared/flags'
import { Sun, Moon, RefreshCw, Globe } from 'lucide-react'

interface HeaderBarProps {
  country: string
  onCountryChange: (c: string) => void
  theme: 'dark' | 'light'
  onToggleTheme: () => void
  onSyncTab: () => void
  activeTabInfo: any
  mcpConnected?: boolean
  onReconnectMcp?: () => void
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  country,
  onCountryChange,
  theme,
  onToggleTheme,
  onSyncTab,
  activeTabInfo,
  mcpConnected = false,
  onReconnectMcp,
}) => {
  const isDark = theme === 'dark'

  return (
    <header className="px-3.5 py-2.5 border-b transition-colors duration-200 select-none bg-white dark:bg-[#161922] border-slate-200 dark:border-[#2C3246] shadow-sm">
      <div className="flex items-center justify-between gap-2">
        {/* Brand & Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shadow-md shadow-amber-500/20 border border-slate-300 dark:border-gray-700">
            <img src="/rocket.png" alt="Rocket" className="w-full h-full object-cover" />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                R-AMZscraper
              </h1>
              <button
                type="button"
                onClick={onReconnectMcp}
                aria-label={mcpConnected ? 'Kết nối MCP đang sẵn sàng. Nhấn để kết nối lại.' : 'MCP chưa kết nối. Nhấn để thử kết nối lại.'}
                title={
                  mcpConnected
                    ? 'MCP Protocol: Sẵn sàng kết nối với Claude Desktop / Antigravity / Cursor'
                    : 'MCP Protocol: Chưa kết nối (Bấm để thử lại)'
                }
                className={`flex items-center gap-1 px-1.5 py-1 rounded-full text-[11px] font-semibold transition cursor-pointer border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                  mcpConnected
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30 hover:bg-emerald-100 dark:hover:bg-emerald-500/20'
                    : 'bg-slate-100 dark:bg-[#1E2230] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-[#2C3246] hover:bg-slate-200 dark:hover:bg-[#262B3D]'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    mcpConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                  }`}
                />
                <span>{mcpConnected ? 'MCP sẵn sàng' : 'MCP chưa kết nối'}</span>
              </button>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              23 thị trường Amazon · Trích xuất từ trình duyệt
            </p>
          </div>
        </div>

        {/* Right Controls: Country + Day/Night Toggle + Sync */}
        <div className="flex items-center gap-1.5">
          {/* Marketplace Selector */}
          <div className="relative">
            <select
              value={country}
              aria-label="Thị trường Amazon"
              onChange={(e) => onCountryChange(e.target.value)}
              className="min-h-9 text-xs font-semibold rounded-lg pl-2 pr-5 py-1 transition-colors border cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 bg-slate-100 hover:bg-slate-200 dark:bg-[#1E2230] dark:hover:bg-[#262B3D] text-slate-800 dark:text-slate-200 border-slate-200 dark:border-[#2C3246]"
            >
              {COUNTRIES.map((c) => {
                const row = SITES[c]
                return (
                  <option key={c} value={c} className="bg-white dark:bg-[#161922]">
                    {getCountryFlag(c)} {c} ({row.currency})
                  </option>
                )
              })}
            </select>
          </div>

          {/* Day / Night Theme Switcher */}
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
            title={isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition border shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 bg-slate-100 hover:bg-slate-200 dark:bg-[#1E2230] dark:hover:bg-[#262B3D] text-slate-700 dark:text-amber-400 border-slate-200 dark:border-[#2C3246]"
          >
            {isDark ? <Sun size={15} className="animate-spin-slow" /> : <Moon size={15} />}
          </button>

          {/* Sync Tab */}
          <button
            type="button"
            onClick={onSyncTab}
            aria-label="Đồng bộ trang Amazon đang mở"
            title="Đồng bộ trang Amazon đang mở"
            className="w-9 h-9 rounded-lg flex items-center justify-center transition border shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 bg-slate-100 hover:bg-slate-200 dark:bg-[#1E2230] dark:hover:bg-[#262B3D] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#2C3246]"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>
    </header>
  )
}
