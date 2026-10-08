import { WebSocketServer, WebSocket } from 'ws'

export interface ExtensionRequest {
  id: string
  action: string
  payload?: any
}

export interface ExtensionResponse {
  id: string
  success: boolean
  data?: any
  error?: string
}

interface PendingRequest {
  resolve: (value: any) => void
  reject: (reason: any) => void
  timer: NodeJS.Timeout
}

export class ExtensionBridge {
  private wss: WebSocketServer | null = null
  private activeSocket: WebSocket | null = null
  private pendingRequests = new Map<string, PendingRequest>()
  private port: number

  constructor(port = 8765) {
    this.port = port
  }

  public start(): void {
    if (this.wss) return

    this.wss = new WebSocketServer({
      host: '127.0.0.1',
      port: this.port,
    })

    this.wss.on('listening', () => {
      console.error(`[MCP Bridge] WebSocket Server listening on ws://127.0.0.1:${this.port}`)
    })

    this.wss.on('connection', (ws: WebSocket, req) => {
      console.error(`[MCP Bridge] Chrome Extension connected from ${req.socket.remoteAddress}`)
      this.activeSocket = ws

      // Notify extension of successful connection
      try {
        ws.send(JSON.stringify({ type: 'MCP_SERVER_HELLO', version: '1.0.0' }))
      } catch (err) {
        console.error('[MCP Bridge] Failed to send hello:', err)
      }

      ws.on('message', (data: Buffer | string) => {
        try {
          const message: ExtensionResponse = JSON.parse(data.toString())
          if (message.id && this.pendingRequests.has(message.id)) {
            const pending = this.pendingRequests.get(message.id)!
            clearTimeout(pending.timer)
            this.pendingRequests.delete(message.id)

            if (message.success) {
              pending.resolve(message.data)
            } else {
              pending.reject(new Error(message.error || 'Unknown extension error'))
            }
          }
        } catch (err) {
          console.error('[MCP Bridge] Error handling incoming message:', err)
        }
      })

      ws.on('close', () => {
        console.error('[MCP Bridge] Chrome Extension disconnected.')
        if (this.activeSocket === ws) {
          this.activeSocket = null
        }
      })

      ws.on('error', (err) => {
        console.error('[MCP Bridge] WebSocket client error:', err)
      })
    })

    this.wss.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`[MCP Bridge] Port ${this.port} is already in use. Please check if another instance is running.`)
      } else {
        console.error('[MCP Bridge] WebSocket Server error:', err)
      }
    })
  }

  public isConnected(): boolean {
    return this.activeSocket !== null && this.activeSocket.readyState === WebSocket.OPEN
  }

  public async sendRequest(action: string, payload: any = {}, timeoutMs = 25000): Promise<any> {
    if (!this.isConnected()) {
      throw new Error('Chrome Extension is not connected via WebSocket.')
    }

    const id = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id)
        reject(new Error(`Request ${action} timed out after ${timeoutMs}ms waiting for extension response.`))
      }, timeoutMs)

      this.pendingRequests.set(id, { resolve, reject, timer })

      const msg: ExtensionRequest = { id, action, payload }
      try {
        this.activeSocket!.send(JSON.stringify(msg))
      } catch (err) {
        clearTimeout(timer)
        this.pendingRequests.delete(id)
        reject(err)
      }
    })
  }

  public stop(): void {
    for (const [id, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timer)
      pending.reject(new Error('MCP Bridge shutting down'))
    }
    this.pendingRequests.clear()

    if (this.activeSocket) {
      this.activeSocket.close()
      this.activeSocket = null
    }

    if (this.wss) {
      this.wss.close()
      this.wss = null
    }
  }
}
