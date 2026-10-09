/**
 * Floating in-page controls for extracting data from the current Amazon tab.
 */

import React, { useState } from 'react'
import { scrapeCurrentPage } from './inPageScraper'
import { exportToCsv, downloadFile, copyToClipboard } from '../shared/export'
import { Layers, Download, Copy, Check, ExternalLink, X } from 'lucide-react'

const pageTypeLabels: Record<string, string> = {
  product: 'Sản phẩm',
  search: 'Kết quả tìm kiếm',
  bestsellers: 'Bán chạy',
  seller: 'Người bán',
  influencer: 'Cửa hàng Influencer',
  influencer_post: 'Bài đăng Influencer',
}

export const FloatingWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  const [scrapedData, setScrapedData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  const handleScrape = () => {
    setLoading(true)
    try {
      const result = scrapeCurrentPage()
      setScrapedData(result)
      setStatusMessage(
        result.pageType
          ? `Đã nhận diện trang ${pageTypeLabels[result.pageType] || result.pageType}.`
          : 'Chưa nhận diện được loại trang này.'
      )
    } catch (err) {
      console.error('[R-AMZscraper] In-page error:', err)
      setStatusMessage('Không thể trích xuất dữ liệu từ trang này.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyJson = async () => {
    const dataToExport = scrapedData?.data || scrapeCurrentPage().data
    const text = JSON.stringify(dataToExport, null, 2)
    const ok = await copyToClipboard(text)
    if (ok) {
      setCopied(true)
      setStatusMessage('Đã sao chép dữ liệu JSON.')
      setTimeout(() => setCopied(false), 2000)
    } else {
      setStatusMessage('Không thể sao chép dữ liệu JSON.')
    }
  }

  const handleDownloadCsv = () => {
    const dataToExport = scrapedData?.data || scrapeCurrentPage().data
    const csv = exportToCsv(dataToExport)
    const pageType = scrapedData?.pageType || 'amazon_data'
    downloadFile(csv, `amazon_${pageType}_${Date.now()}.csv`)
    setDownloaded(true)
    setStatusMessage('Đã tải tệp CSV.')
    setTimeout(() => setDownloaded(false), 2000)
  }

  const handleOpenSidePanel = () => {
    chrome.runtime.sendMessage({ action: 'OPEN_SIDE_PANEL' })
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 2147483647,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      {!isOpen ? (
        <button
          type="button"
          aria-label="Mở widget và trích xuất dữ liệu trang Amazon hiện tại"
          onClick={() => {
            setIsOpen(true)
            handleScrape()
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#131921',
            color: '#FFFFFF',
            minHeight: '44px',
            padding: '10px 16px',
            borderRadius: '9999px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
            border: '2px solid #FF9900',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '13px',
            transition: 'background-color 0.2s ease, border-color 0.2s ease',
            outlineOffset: '3px',
          }}
        >
          <Layers size={15} aria-hidden="true" />
          <span>Trích xuất trang</span>
        </button>
      ) : (
        <div
          style={{
            backgroundColor: '#181B26',
            color: '#F3F4F6',
            borderRadius: '16px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            border: '1px solid #2B3042',
            width: 'min(320px, calc(100vw - 32px))',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              backgroundColor: '#12141D',
              color: '#FFFFFF',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #282D40',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={17} aria-hidden="true" />
              <span style={{ fontWeight: 700, fontSize: '13px' }}>R-AMZscraper</span>
            </div>
            <button
              type="button"
              aria-label="Đóng widget"
              onClick={() => setIsOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#9CA3AF',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '36px',
                minHeight: '36px',
                outlineOffset: '3px',
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: '16px' }}>
            <div
              style={{
                fontSize: '13px',
                color: '#CBD5E1',
                fontWeight: 700,
                marginBottom: '6px',
              }}
            >
              Loại trang:{' '}
              <span style={{ color: '#FDBA38' }}>
                {pageTypeLabels[scrapedData?.pageType] || 'Chưa xác định'}
              </span>
            </div>

            <div role="status" aria-live="polite" style={{ fontSize: '13px', color: '#CBD5E1', marginBottom: '10px', lineHeight: 1.45 }}>
              {loading ? 'Đang trích xuất dữ liệu…' : statusMessage || 'Mở widget để trích xuất trang hiện tại.'}
            </div>

            {scrapedData?.data?.title && (
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  marginBottom: '12px',
                  lineHeight: '1.4',
                  color: '#F9FAFB',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {scrapedData.data.title}
              </div>
            )}

            {/* Quick stats */}
            {scrapedData?.data?.price && (
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#FBBF24',
                  marginBottom: '12px',
                }}
              >
                {scrapedData.data.price.currency || '$'}{' '}
                {scrapedData.data.price.amount?.toFixed(2) || 'N/A'}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                onClick={handleCopyJson}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  backgroundColor: '#212534',
                  color: '#F3F4F6',
                  border: '1px solid #2B3042',
                  borderRadius: '8px',
                  minHeight: '42px',
                  padding: '8px 12px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {copied ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
                <span>{copied ? 'Đã sao chép JSON' : 'Sao chép JSON'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadCsv}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: 'linear-gradient(135deg, #F43F5E 0%, #FF9900 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  minHeight: '42px',
                  padding: '8px 12px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {downloaded ? <Check size={14} color="#FFFFFF" /> : <Download size={14} />}
                <span>{downloaded ? 'Đã tải tệp CSV' : 'Tải CSV'}</span>
              </button>

              <button
                type="button"
                onClick={handleOpenSidePanel}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  backgroundColor: '#1E2333',
                  color: '#E5E7EB',
                  border: '1px solid #2B3042',
                  borderRadius: '8px',
                  minHeight: '42px',
                  padding: '8px 12px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <ExternalLink size={14} />
                <span>Mở bảng điều khiển bên</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
