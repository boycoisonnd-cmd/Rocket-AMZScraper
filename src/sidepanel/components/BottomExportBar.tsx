import React from 'react'
import { Download, FileSpreadsheet, FileCode, Trash2 } from 'lucide-react'

interface BottomExportBarProps {
  selectedCount: number
  totalCount: number
  threads: number
  onThreadsChange: (t: number) => void
  format: 'csv' | 'json'
  onFormatChange: (f: 'csv' | 'json') => void
  onDownload: () => void
  onClear: () => void
  isExporting: boolean
}

export const BottomExportBar: React.FC<BottomExportBarProps> = ({
  selectedCount,
  totalCount,
  threads,
  onThreadsChange,
  format,
  onFormatChange,
  onDownload,
  onClear,
  isExporting,
}) => {
  return (
    <footer className="sticky bottom-0 left-0 right-0 border-t z-20 px-3.5 py-2.5 flex flex-col gap-1.5 transition-colors duration-200 select-none bg-white/95 dark:bg-[#161922]/95 backdrop-blur-md border-slate-200 dark:border-[#2C3246] shadow-xl">
      <div className="flex items-center gap-2">
        {/* Threads Concurrency */}
        <div className="relative">
          <select
            value={threads}
            aria-label="Số luồng xử lý"
            onChange={(e) => onThreadsChange(Number(e.target.value))}
            className="h-9 text-xs font-bold rounded-lg pl-2 pr-5 transition-colors border cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 bg-slate-100 hover:bg-slate-200 dark:bg-[#1E2230] dark:hover:bg-[#262B3D] text-slate-800 dark:text-slate-200 border-slate-200 dark:border-[#2C3246]"
          >
            <option value={1} className="bg-white dark:bg-[#161922]">1 luồng</option>
            <option value={2} className="bg-white dark:bg-[#161922]">2 luồng</option>
            <option value={4} className="bg-white dark:bg-[#161922]">4 luồng</option>
          </select>
        </div>

        {/* Format Selector: CSV / JSON */}
        <div className="flex rounded-lg border p-0.5 bg-slate-100 dark:bg-[#1E2230] border-slate-200 dark:border-[#2C3246]">
          <button
            type="button"
            onClick={() => onFormatChange('csv')}
            aria-pressed={format === 'csv'}
            className={`min-h-8 px-2 py-1 rounded-md text-xs font-bold transition flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
              format === 'csv'
                ? 'bg-white dark:bg-[#2A3043] text-amber-600 dark:text-amber-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet size={11} />
            <span>CSV</span>
          </button>

          <button
            type="button"
            onClick={() => onFormatChange('json')}
            aria-pressed={format === 'json'}
            className={`min-h-8 px-2 py-1 rounded-md text-xs font-bold transition flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
              format === 'json'
                ? 'bg-white dark:bg-[#2A3043] text-amber-600 dark:text-amber-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileCode size={11} />
            <span>JSON</span>
          </button>
        </div>

        {/* Clear List */}
        <button
          type="button"
          onClick={onClear}
          title="Xóa danh sách dữ liệu"
          aria-label="Xóa danh sách dữ liệu"
          className="h-9 w-9 rounded-lg flex items-center justify-center transition border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 bg-slate-100 hover:bg-slate-200 dark:bg-[#1E2230] dark:hover:bg-[#262B3D] text-slate-500 hover:text-rose-500 dark:text-slate-400 dark:hover:text-rose-400 border-slate-200 dark:border-[#2C3246]"
        >
          <Trash2 size={13} />
        </button>

        {/* Big Export Button */}
        <button
          type="button"
          onClick={onDownload}
          disabled={selectedCount === 0 || isExporting}
          aria-busy={isExporting}
          className="flex-1 min-h-10 rounded-lg bg-gradient-to-r from-[#FF9900] to-[#FFB800] hover:from-[#E68A00] hover:to-[#FFA000] active:scale-[0.99] text-gray-950 font-bold text-sm flex items-center justify-center gap-1.5 transition shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 disabled:opacity-40 disabled:pointer-events-none"
        >
          <Download size={14} />
          <span>{isExporting ? 'Đang xuất…' : `Tải ${format.toUpperCase()} (${selectedCount})`}</span>
        </button>
      </div>

      {/* Footer Sub-row */}
      <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 px-0.5">
        <div>
          <span>Đã chọn: </span>
          <strong className="text-slate-800 dark:text-slate-200 font-bold">{selectedCount}</strong>
          <span> / {totalCount} mục</span>
        </div>

        <span>CSV tương thích Excel (UTF-8 BOM)</span>
      </div>
    </footer>
  )
}
