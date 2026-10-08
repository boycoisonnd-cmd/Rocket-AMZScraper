/**
 * MCP Bridge - WebSocket Client running in Chrome Background Service Worker.
 * Connects to the local MCP Server daemon (ws://127.0.0.1:8765).
 * Enables AI Agents (Claude Desktop, Antigravity, Cursor) to orchestrate Amazon scraping.
 */

import { fetchEngine } from './fetchEngine'
import { countryOf, detectPageType } from '../shared/refs'

export interface MCPBridgeMessage {
  id: string
  action: string
  payload?: any
}

class MCPBridgeClient {
  private ws: WebSocket | null = null
  private port: number
  private reconnectTimer: any = null
  private isConnecting = false
  private connected = false

  constructor(port = 8765) {
    this.port = port
  }

  public isConnected(): boolean {
    return this.connected
  }

  public start(): void {
    this.connect()
  }

  private notifyStatus(): void {
    try {
      chrome.runtime.sendMessage({
        action: 'MCP_STATUS_CHANGED',
        payload: { connected: this.connected },
      }).catch(() => {
        // Ignore errors when no popup or sidepanel is currently open
      })
    } catch {
      // Safe guard
    }
  }

  private connect(): void {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return
    }

    this.isConnecting = true
    const url = `ws://127.0.0.1:${this.port}`

    try {
      this.ws = new WebSocket(url)

      this.ws.onopen = () => {
        console.log(`[MCP Bridge] Connected to MCP Server Daemon at ${url}`)
        this.connected = true
        this.isConnecting = false
        this.notifyStatus()
      }

      this.ws.onmessage = async (event: MessageEvent) => {
        try {
          const raw = typeof event.data === 'string' ? event.data : ''
          const msg = JSON.parse(raw) as MCPBridgeMessage

          if (!msg.id || !msg.action) return

          try {
            const result = await this.handleAction(msg.action, msg.payload || {})
            this.send({
              id: msg.id,
              success: true,
              data: result,
            })
          } catch (err: any) {
            console.error(`[MCP Bridge] Error handling action ${msg.action}:`, err)
            this.send({
              id: msg.id,
              success: false,
              error: err.message || String(err),
            })
          }
        } catch (err) {
          console.error('[MCP Bridge] Failed to parse message from MCP Server:', err)
        }
      }

      this.ws.onclose = () => {
        const wasConnected = this.connected
        this.connected = false
        this.isConnecting = false
        this.ws = null
        if (wasConnected) {
          console.log('[MCP Bridge] Disconnected from MCP Server. Will reconnect...')
          this.notifyStatus()
        }
        this.scheduleReconnect()
      }

      this.ws.onerror = () => {
        this.connected = false
        this.isConnecting = false
        // onclose will be called next to handle reconnection
      }
    } catch (err) {
      this.connected = false
      this.isConnecting = false
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, 5000)
  }

  private send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    }
  }

  private async handleAction(action: string, payload: any): Promise<any> {
    switch (action) {
      case 'GET_ACTIVE_TAB': {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        if (!tab || !tab.url) {
          return { error: 'Không tìm thấy tab đang kích hoạt trong Chrome' }
        }
        const country = countryOf(tab.url)
        const pageType = detectPageType(tab.url)
        return {
          id: tab.id,
          url: tab.url,
          title: tab.title,
          country,
          pageType,
          isAmazon: Boolean(country),
        }
      }

      case 'SCRAPE_UNIVERSAL': {
        return await fetchEngine.getUniversal(payload.url, payload.country)
      }

      case 'SCRAPE_PRODUCT': {
        return await fetchEngine.getProductDetails(payload.product, payload.country)
      }

      case 'SCRAPE_SEARCH': {
        return await fetchEngine.getSearch(payload.query, payload.country, payload.params)
      }

      case 'SCRAPE_OFFERS': {
        return await fetchEngine.getOffers(payload.product, payload.country)
      }

      case 'SCRAPE_RANKINGS': {
        return await fetchEngine.getRankings(payload.category, payload.country)
      }

      case 'SCRAPE_SELLER': {
        return await fetchEngine.getSeller(payload.seller, payload.country)
      }

      case 'SCRAPE_SELLER_FEEDBACK': {
        return await fetchEngine.getSellerFeedback(payload.seller, payload.country, payload.params)
      }

      case 'SCRAPE_INFLUENCER': {
        return await fetchEngine.getInfluencer(payload.influencer, payload.country)
      }

      case 'SCRAPE_INFLUENCER_LIST': {
        return await fetchEngine.getInfluencerList(payload.post, payload.country)
      }

      case 'SCRAPE_AUTOCOMPLETE': {
        return await fetchEngine.getAutocomplete(payload.query, payload.country)
      }

      case 'SCRAPE_BULK': {
        return await fetchEngine.getBulkProducts(payload.asins, payload.country)
      }

      default:
        throw new Error(`Hành động không xác định: ${action}`)
    }
  }
}

export const mcpBridge = new MCPBridgeClient()
