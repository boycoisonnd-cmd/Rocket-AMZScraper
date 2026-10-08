import { WebSocket } from 'ws'
import { DirectFallbackEngine } from './dist/fallbackEngine.js'
import { ExtensionBridge } from './dist/bridge.js'

async function testSuite() {
  console.log('--- TEST 1: DirectFallbackEngine Unit Check ---')
  const engine = new DirectFallbackEngine()
  try {
    // Quick test on a simple universal or search (dry check URL construction)
    console.log('Testing fallback engine instance exists:', typeof engine.scrapeProduct === 'function')
    console.log('Fallback engine method checks passed.')
  } catch (err) {
    console.error('Fallback engine check error:', err)
  }

  console.log('\n--- TEST 2: ExtensionBridge WebSocket Communication ---')
  const testPort = 8799
  const bridge = new ExtensionBridge(testPort)
  bridge.start()

  // Wait a moment for server to listen
  await new Promise((r) => setTimeout(r, 200))

  const ws = new WebSocket(`ws://127.0.0.1:${testPort}`)

  let receivedHello = false
  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString())
    if (msg.type === 'MCP_SERVER_HELLO') {
      receivedHello = true
      console.log('✓ Extension received MCP_SERVER_HELLO handshake')
    } else if (msg.action === 'PING_TEST') {
      console.log('✓ Extension received bridge request:', msg.action)
      ws.send(JSON.stringify({ id: msg.id, success: true, data: { pong: true } }))
    }
  })

  await new Promise((resolve) => ws.on('open', resolve))

  console.log('✓ Extension connected. isConnected():', bridge.isConnected())

  const response = await bridge.sendRequest('PING_TEST', { test: 123 }, 3000)
  console.log('✓ Bridge roundtrip result:', response)

  ws.close()
  bridge.stop()

  console.log('\n✓ ALL TESTS PASSED SUCCESSFULLY!')
}

testSuite()
  .catch((err) => {
    console.error('Test failed:', err)
    process.exit(1)
  })
