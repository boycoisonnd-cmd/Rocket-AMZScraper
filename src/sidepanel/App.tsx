import React, { useState, useEffect, useMemo } from 'react'
import { HeaderBar } from './components/HeaderBar'
import { ActiveTabBanner } from './components/ActiveTabBanner'
import { EndpointNav, EndpointCategory } from './components/EndpointNav'
import { EndpointForm } from './components/EndpointForm'
import { DataWorkspace } from './components/DataWorkspace'
import { ProductDetailModal } from './components/ProductDetailModal'
import { BottomExportBar } from './components/BottomExportBar'
import { ScrapedCardItem } from './types'
import { exportToCsvFile, exportToJsonFile } from '../shared/export'

export const App: React.FC = () => {
  // Theme state: dark / light
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme') as 'dark' | 'light' | null
      if (saved) return saved
    }
    return 'dark'
  })

  // Marketplace & Tab state
  const [country, setCountry] = useState<string>('US')
  const [activeTabInfo, setActiveTabInfo] = useState<any>(null)
  const [activeCategory, setActiveCategory] = useState<EndpointCategory>('products')

  // Items & UI states
  const [items, setItems] = useState<ScrapedCardItem[]>([])
  const [isScraping, setIsScraping] = useState(false)
  const [sessionNotice, setSessionNotice] = useState('Đã sẵn sàng trích xuất dữ liệu Amazon.')
  const [threads, setThreads] = useState(4)
  const [format, setFormat] = useState<'csv' | 'json'>('csv')
  const [isExporting, setIsExporting] = useState(false)
  const [modalItem, setModalItem] = useState<ScrapedCardItem | null>(null)
  const [mcpConnected, setMcpConnected] = useState(false)

  // 1. Synchronize theme with <html> element and storage
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
      root.classList.remove('light')
    } else {
      root.classList.remove('dark')
      root.classList.add('light')
    }
    localStorage.setItem('theme', theme)
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({ theme })
    }
  }, [theme])

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  // MCP Connection status checking and listeners
  const checkMcpStatus = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ action: 'GET_MCP_STATUS' }, (res) => {
        if (res?.success && res.data) {
          setMcpConnected(Boolean(res.data.connected))
        }
      })
    }
  }

  const handleReconnectMcp = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ action: 'RECONNECT_MCP' }, (res) => {
        if (res?.success && res.data) {
          setMcpConnected(Boolean(res.data.connected))
        }
      })
    }
  }

  // 2. Sync active tab on mount and restore storage
  const syncActiveTab = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ action: 'GET_ACTIVE_TAB' }, (res) => {
        if (res?.success && res.data) {
          setActiveTabInfo(res.data)
          if (res.data.country) {
            setCountry(res.data.country.toUpperCase())
          }
          if (res.data.isAmazon) {
          setSessionNotice(`Đang mở Amazon ${res.data.country?.toUpperCase()} · ${res.data.pageType || 'trang Amazon'}`)
          }
        }
      })
    }
  }

  const isHydratedRef = React.useRef(false)

  useEffect(() => {
    syncActiveTab()
    checkMcpStatus()

    // Periodically poll MCP status
    const mcpInterval = setInterval(checkMcpStatus, 5000)

    // Listen to real-time events from background
    const msgListener = (msg: any) => {
      if (msg?.action === 'MCP_STATUS_CHANGED' && msg.payload) {
        setMcpConnected(Boolean(msg.payload.connected))
      }
    }

    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener(msgListener)
    }

    // Restore from storage if exists
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get(['theme', 'scrapedItems', 'sessionNotice', 'country'], (res) => {
        if (res?.theme && (res.theme === 'dark' || res.theme === 'light')) {
          setTheme(res.theme)
        }
        if (res?.scrapedItems && Array.isArray(res.scrapedItems) && res.scrapedItems.length > 0) {
          const restoredItems = res.scrapedItems.filter(
            (item: ScrapedCardItem) => !String(item?.id || '').startsWith('demo-')
          )
          setItems(restoredItems)
          if (restoredItems.length > 0 && res.sessionNotice) setSessionNotice(res.sessionNotice)
          if (restoredItems.length === 0) setSessionNotice('Đã sẵn sàng trích xuất dữ liệu Amazon.')
        }
        if (res?.country) setCountry(res.country)
        isHydratedRef.current = true
      })
    } else {
      isHydratedRef.current = true
    }

    return () => {
      clearInterval(mcpInterval)
      if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
        chrome.runtime.onMessage.removeListener(msgListener)
      }
    }
  }, [])

  // Persist items on change
  useEffect(() => {
    if (!isHydratedRef.current) return
    if (typeof chrome !== 'undefined' && chrome.storage?.local && items.length > 0) {
      chrome.storage.local.set({ scrapedItems: items, sessionNotice, country })
    }
  }, [items, sessionNotice, country])

  // Normalizer: Convert any API/DOM response into ScrapedCardItem[]
  const normalizeData = (data: any): ScrapedCardItem[] => {
    if (!data) return []

    // 1. Array of search results
    if (Array.isArray(data.results)) {
      return data.results.map((r: any, idx: number) => ({
        id: `search-${r.asin || idx}-${Date.now()}`,
        asin: r.asin || 'N/A',
        title: r.title || 'Amazon Product',
        type: 'search',
        priceText: r.price?.raw || (r.price?.amount ? `$${r.price.amount}` : undefined),
        priceAmount: r.price?.amount,
        currency: r.price?.currency || '$',
        rating: r.rating?.average || r.rating,
        reviewsCount: r.rating?.count,
        thumbnail: r.thumbnail || r.image,
        badge: r.is_prime ? 'PRIME' : r.deal_badge ? 'DEAL' : 'AMAZON',
        sellerName: 'Amazon',
        selected: true,
        dateText: r.is_prime ? 'Prime 1-Day' : 'Sẵn hàng',
        raw: r,
      }))
    }

    // 2. Best sellers items array
    if (Array.isArray(data.items)) {
      return data.items.map((r: any, idx: number) => ({
        id: `rank-${r.asin || idx}-${Date.now()}`,
        asin: r.asin || 'N/A',
        title: r.title || `Best Seller #${r.rank || idx + 1}`,
        type: 'ranking',
        priceText: r.price?.raw || (r.price?.amount ? `$${r.price.amount}` : undefined),
        priceAmount: r.price?.amount,
        currency: r.price?.currency || '$',
        rating: r.rating?.average || r.rating,
        reviewsCount: r.rating?.count,
        thumbnail: r.thumbnail || r.image,
        badge: `TOP #${r.rank || idx + 1}`,
        sellerName: 'Best Seller',
        selected: true,
        dateText: `Rank #${r.rank || idx + 1}`,
        raw: r,
      }))
    }

    // 3. Offers array
    if (Array.isArray(data.offers)) {
      return data.offers.map((o: any, idx: number) => ({
        id: `offer-${data.asin || idx}-${Date.now()}`,
        asin: data.asin || 'N/A',
        title: `${data.title || 'Product'} (${o.condition || 'New'})`,
        type: 'offer',
        priceText: o.price?.raw || (o.price?.amount ? `$${o.price.amount}` : undefined),
        priceAmount: o.price?.amount,
        currency: o.price?.currency || '$',
        rating: o.seller?.rating,
        reviewsCount: o.seller?.ratings_count,
        thumbnail: data.images?.primary || data.thumbnail,
        badge: o.is_prime ? 'PRIME' : o.condition === 'New' ? 'NEW' : 'USED',
        sellerName: o.seller?.name || (o.is_sold_by_amazon ? 'Amazon' : 'Third-Party'),
        selected: true,
        dateText: o.ships_from ? `Từ ${o.ships_from}` : 'Giao nhanh',
        raw: o,
      }))
    }

    // 4. Single Product Detail
    if (data.asin && data.title) {
      return [
        {
          id: `product-${data.asin}-${Date.now()}`,
          asin: data.asin,
          title: data.title,
          type: 'product',
          priceText: data.price?.raw || (data.price?.amount ? `$${data.price.amount}` : undefined),
          priceAmount: data.price?.amount,
          currency: data.price?.currency || '$',
          rating: data.rating?.average || data.rating,
          reviewsCount: data.rating?.count,
          thumbnail: data.images?.primary || data.images?.gallery?.[0],
          badge: data.is_deal ? 'DEAL' : 'PRIME',
          sellerName: data.seller?.name || (data.is_sold_by_amazon ? 'Amazon.com' : 'Merchant'),
          selected: true,
          dateText: 'Chi tiết ASIN',
          raw: data,
        },
      ]
    }

    // 5. Bulk products array
    if (Array.isArray(data)) {
      return data.map((d: any, idx: number) => ({
        id: `bulk-${d.asin || idx}-${Date.now()}`,
        asin: d.asin || 'N/A',
        title: d.title || `Item ${idx + 1}`,
        type: 'product',
        priceText: d.price?.raw || (d.price?.amount ? `$${d.price.amount}` : undefined),
        priceAmount: d.price?.amount,
        currency: d.price?.currency || '$',
        rating: d.rating?.average || d.rating,
        reviewsCount: d.rating?.count,
        thumbnail: d.images?.primary || d.thumbnail || d.image,
        badge: 'HÀNG LOẠT',
        sellerName: d.seller?.name || 'Amazon',
        selected: true,
        dateText: 'Trích xuất hàng loạt',
        raw: d,
      }))
    }

    // 6. Influencer or Seller profile
    if (data.seller_id || data.seller_name || data.influencer_name) {
      return [
        {
          id: `profile-${data.seller_id || Date.now()}`,
          asin: data.seller_id || 'STORE',
          title: data.seller_name || data.influencer_name || 'Amazon Storefront',
          type: 'product',
          priceText: 'N/A',
          rating: data.rating?.average || data.rating,
          reviewsCount: data.rating?.count,
          thumbnail: data.avatar || data.logo,
          badge: 'STORE',
          sellerName: data.seller_name || data.influencer_name,
          selected: true,
          dateText: 'Hồ sơ',
          raw: data,
        },
      ]
    }

    return []
  }

  // Handle Main Scrape (Active Tab Live DOM or Universal fallback)
  const handleScrapeActiveTab = () => {
    setIsScraping(true)

    // Check if on Amazon
    if (activeTabInfo?.id && activeTabInfo.isAmazon) {
      chrome.tabs.sendMessage(activeTabInfo.id, { action: 'SCRAPE_ACTIVE_DOM' }, (res) => {
        if (!chrome.runtime.lastError && res?.success && res.data) {
          const newCards = normalizeData(res.data.data)
          if (newCards.length > 0) {
            setItems((prev) => [...newCards, ...prev])
            setSessionNotice(`Đã trích xuất ${newCards.length} mục từ trang hiện tại.`)
          } else {
            setSessionNotice('Không tìm thấy sản phẩm trên trang hiện tại.')
          }
          setIsScraping(false)
          return
        }

        // Fallback to background universal URL fetch
        chrome.runtime.sendMessage(
          { action: 'SCRAPE_UNIVERSAL', payload: { url: activeTabInfo.url, country } },
          (resp) => {
            setIsScraping(false)
            if (resp?.success && resp.data) {
              const newCards = normalizeData(resp.data.data)
              if (newCards.length > 0) {
                setItems((prev) => [...newCards, ...prev])
                setSessionNotice(`Đã trích xuất ${newCards.length} mục từ liên kết hiện tại.`)
              } else {
                setSessionNotice('Không tìm thấy dữ liệu phù hợp trên trang này.')
              }
            } else {
              setSessionNotice(`Không thể trích xuất dữ liệu: ${resp?.error || 'đã xảy ra lỗi.'}`)
            }
          }
        )
      })
    } else {
      // If not on Amazon, scrape default search
      chrome.runtime.sendMessage(
        { action: 'SCRAPE_SEARCH', payload: { query: 'laptop', country } },
        (resp) => {
          setIsScraping(false)
          if (resp?.success && resp.data) {
            const newCards = normalizeData(resp.data)
            if (newCards.length > 0) {
              setItems((prev) => [...newCards, ...prev])
              setSessionNotice(`Đã trích xuất ${newCards.length} sản phẩm.`)
            } else {
              setSessionNotice('Không tìm thấy sản phẩm phù hợp.')
            }
          } else {
            setSessionNotice(`Không thể trích xuất dữ liệu: ${resp?.error || 'đã xảy ra lỗi.'}`)
          }
        }
      )
    }
  }

  // Handle Execute from Endpoint Form
  const handleExecuteEndpoint = (action: string, payload: any) => {
    setIsScraping(true)
    setSessionNotice('Đang gửi yêu cầu trích xuất…')
    chrome.runtime.sendMessage({ action, payload: { ...payload, country, threads } }, (res) => {
      setIsScraping(false)
      if (res?.success && res.data) {
        const newCards = normalizeData(res.data)
        if (newCards.length > 0) {
          setItems((prev) => [...newCards, ...prev])
          setSessionNotice(`Đã trích xuất ${newCards.length} mục.`)
        } else {
          setSessionNotice('Không tìm thấy dữ liệu phù hợp.')
        }
      } else {
        setSessionNotice(`Không thể trích xuất dữ liệu: ${res?.error || 'đã xảy ra lỗi.'}`)
      }
    })
  }

  // Selection handlers
  const handleToggleSelect = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    )
  }

  const allSelected = useMemo(() => {
    return items.length > 0 && items.every((i) => i.selected)
  }, [items])

  const handleToggleSelectAll = () => {
    const targetState = !allSelected
    setItems((prev) => prev.map((item) => ({ ...item, selected: targetState })))
  }

  // Clear list
  const handleClear = () => {
    setItems([])
    setSessionNotice('Đã xóa danh sách dữ liệu.')
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.remove(['scrapedItems'])
    }
  }

  // Download Bulk Selected Items
  const handleDownloadSelected = () => {
    const selected = items.filter((i) => i.selected)
    const exportItems = selected.length > 0 ? selected : items
    if (exportItems.length === 0) return

    setIsExporting(true)
    const exportData = exportItems.map((i) => i.raw)
    const filename = `amazon_export_${Date.now()}`

    if (format === 'csv') {
      exportToCsvFile(exportData, `${filename}.csv`)
    } else {
      exportToJsonFile(exportData, `${filename}.json`)
    }
    setTimeout(() => setIsExporting(false), 800)
  }

  // Download Single Item
  const handleExportSingle = (item: ScrapedCardItem) => {
    const filename = `${item.asin || item.id}`
    if (format === 'csv') {
      exportToCsvFile([item.raw], `${filename}.csv`)
    } else {
      exportToJsonFile(item.raw, `${filename}.json`)
    }
  }

  const selectedCount = useMemo(() => {
    return items.filter((i) => i.selected).length
  }, [items])

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-[#12141D] text-slate-900 dark:text-gray-100 font-sans transition-colors duration-200 selection:bg-amber-500 selection:text-white">
      {/* 1. Header: brand, marketplace, theme, and tab controls */}
      <HeaderBar
        country={country}
        onCountryChange={setCountry}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onSyncTab={syncActiveTab}
        activeTabInfo={activeTabInfo}
        mcpConnected={mcpConnected}
        onReconnectMcp={handleReconnectMcp}
      />

      {/* 2. Active page status and extraction action */}
      <ActiveTabBanner
        activeTabInfo={activeTabInfo}
        country={country}
        onScrapeActiveTab={handleScrapeActiveTab}
        isScraping={isScraping}
      />

      {/* 3. Extraction categories */}
      <EndpointNav
        activeTab={activeCategory}
        onSelectTab={setActiveCategory}
      />

      {/* 4. Endpoint Action Form */}
      <EndpointForm
        category={activeCategory}
        onSubmit={handleExecuteEndpoint}
        loading={isScraping}
      />

      {/* Status notice */}
      {sessionNotice && (
        <div role="status" aria-live="polite" className="px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center justify-between border-b border-slate-200/50 dark:border-[#2C3246]/50">
          <span className="truncate">{sessionNotice}</span>
          {isScraping && (
            <span className="text-amber-500 dark:text-amber-400 animate-pulse font-bold shrink-0 ml-2">
              Đang xử lý…
            </span>
          )}
        </div>
      )}

      {/* 5. Main Data Workspace: Table / Cards / JSON Views, Search Filter, Multi-select */}
      <DataWorkspace
        items={items}
        onToggleSelect={handleToggleSelect}
        onToggleSelectAll={handleToggleSelectAll}
        allSelected={allSelected}
        onItemClick={(item) => setModalItem(item)}
        onExportSingle={handleExportSingle}
      />

      {/* 6. Sticky Bottom Export Bar: Threads (1-8), Format (CSV/JSON), Download, Clear */}
      <BottomExportBar
        selectedCount={selectedCount}
        totalCount={items.length}
        threads={threads}
        onThreadsChange={setThreads}
        format={format}
        onFormatChange={setFormat}
        onDownload={handleDownloadSelected}
        onClear={handleClear}
        isExporting={isExporting}
      />

      {/* 7. Product Detail Modal */}
      <ProductDetailModal
        item={modalItem}
        onClose={() => setModalItem(null)}
      />
    </div>
  )
}
export default App
