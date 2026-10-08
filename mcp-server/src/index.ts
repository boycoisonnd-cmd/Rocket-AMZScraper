#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { ExtensionBridge } from './bridge.js'
import { DirectFallbackEngine } from './fallbackEngine.js'
import { registerTools } from './tools.js'

async function main() {
  const port = parseInt(process.env.MCP_PORT || '8765', 10)

  console.error('[MCP Server] Initializing Rocket-AMZScraper MCP Daemon...')

  const server = new McpServer({
    name: 'rocket-amz-scraper',
    version: '1.0.0',
  })

  const bridge = new ExtensionBridge(port)
  bridge.start()

  const fallback = new DirectFallbackEngine()

  registerTools(server, bridge, fallback)

  const transport = new StdioServerTransport()
  await server.connect(transport)

  console.error('[MCP Server] Connected via stdio. Ready to receive requests.')

  const cleanup = () => {
    console.error('[MCP Server] Shutting down...')
    bridge.stop()
    process.exit(0)
  }

  process.on('SIGINT', cleanup)
  process.on('SIGTERM', cleanup)
}

main().catch((err) => {
  console.error('[MCP Server] Fatal initialization error:', err)
  process.exit(1)
})
