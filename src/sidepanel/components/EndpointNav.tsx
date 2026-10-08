import React from 'react'
import { Box, Search, Award, Store, Sparkles, Link2 } from 'lucide-react'

export type EndpointCategory = 'products' | 'search' | 'rankings' | 'sellers' | 'influencers' | 'universal'
export type EndpointGroup = EndpointCategory

interface EndpointNavProps {
  activeTab: EndpointCategory
  onSelectTab: (tab: EndpointCategory) => void
}

export const EndpointNav: React.FC<EndpointNavProps> = ({ activeTab, onSelectTab }) => {
  const tabs = [
    { id: 'products', label: 'Sản phẩm', icon: Box },
    { id: 'search', label: 'Tìm kiếm', icon: Search },
    { id: 'rankings', label: 'Xếp hạng', icon: Award },
    { id: 'sellers', label: 'Người bán', icon: Store },
    { id: 'influencers', label: 'Influencer', icon: Sparkles },
    { id: 'universal', label: 'Dán liên kết', icon: Link2 },
  ]

  return (
    <nav aria-label="Chức năng trích xuất" className="px-3.5 pt-3 select-none">
      <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200 dark:border-[#2C3246]">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id as EndpointCategory)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex items-center gap-1.5 px-3 min-h-10 rounded-t-lg text-xs font-bold transition-all shrink-0 border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                isActive
                  ? 'border-[#FF9900] text-[#FF9900] bg-amber-500/10 dark:bg-amber-400/10'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1E2230]'
              }`}
            >
              <Icon size={13} className={isActive ? 'text-[#FF9900]' : ''} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
