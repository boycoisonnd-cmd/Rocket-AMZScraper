import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { ExtensionBridge } from './bridge.js'
import { DirectFallbackEngine } from './fallbackEngine.js'

export function registerTools(
  server: McpServer,
  bridge: ExtensionBridge,
  fallback: DirectFallbackEngine
): void {
  // 1. amazon_get_active_tab
  server.tool(
    'amazon_get_active_tab',
    'Trích xuất dữ liệu trang Amazon mà người dùng đang mở trên Chrome (Live DOM). Yêu cầu Chrome đang mở.',
    {},
    async () => {
      if (!bridge.isConnected()) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                status: 'extension_offline',
                message:
                  'Google Chrome Extension chưa được kết nối. Vui lòng mở Chrome có tiện ích Rocket-AMZScraper để trích xuất tab đang hoạt động.',
              }),
            },
          ],
        }
      }

      try {
        const data = await bridge.sendRequest('GET_ACTIVE_TAB')
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ source: 'chrome_extension_live', ...data }, null, 2),
            },
          ],
        }
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Lỗi khi lấy tab Chrome: ${err.message}` }],
        }
      }
    }
  )

  // 2. amazon_scrape_product
  server.tool(
    'amazon_scrape_product',
    'Cào chi tiết thông tin sản phẩm Amazon theo mã ASIN (giá, tiêu đề, buybox seller, rating, reviews, ảnh, bullet points).',
    {
      asin: z.string().describe('Mã ASIN 10 ký tự của sản phẩm (vd: B00939I7EK)'),
      country: z
        .string()
        .optional()
        .default('US')
        .describe('Mã quốc gia thị trường (US, JP, DE, GB, FR, CA, AU...). Mặc định là US.'),
    },
    async ({ asin, country }) => {
      try {
        if (bridge.isConnected()) {
          const data = await bridge.sendRequest('SCRAPE_PRODUCT', {
            product: asin,
            country: country || 'US',
          })
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ source: 'chrome_extension_engine', asin, country, ...data }, null, 2),
              },
            ],
          }
        } else {
          const data = await fallback.scrapeProduct(asin, country || 'US')
          return {
            content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
          }
        }
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Lỗi cào sản phẩm ${asin}: ${err.message}` }],
        }
      }
    }
  )

  // 3. amazon_scrape_search
  server.tool(
    'amazon_scrape_search',
    'Tìm kiếm sản phẩm theo từ khóa trên Amazon (trả về danh sách ASIN, tiêu đề, giá, rating, ảnh, prime).',
    {
      query: z.string().describe('Từ khóa tìm kiếm (vd: mechanical keyboard, running shoes)'),
      country: z
        .string()
        .optional()
        .default('US')
        .describe('Mã quốc gia thị trường (US, JP, DE...). Mặc định US.'),
      page: z.number().optional().default(1).describe('Số trang tìm kiếm (mặc định là 1)'),
    },
    async ({ query, country, page }) => {
      try {
        if (bridge.isConnected()) {
          const data = await bridge.sendRequest('SCRAPE_SEARCH', {
            query,
            country: country || 'US',
            params: { page: page || 1 },
          })
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ source: 'chrome_extension_engine', query, country, ...data }, null, 2),
              },
            ],
          }
        } else {
          const data = await fallback.scrapeSearch(query, country || 'US', page || 1)
          return {
            content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
          }
        }
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Lỗi tìm kiếm "${query}": ${err.message}` }],
        }
      }
    }
  )

  // 4. amazon_scrape_bestsellers
  server.tool(
    'amazon_scrape_bestsellers',
    'Lấy danh sách Top sản phẩm Bán chạy nhất (Best Sellers) theo ngành hàng.',
    {
      category: z
        .string()
        .describe('Danh mục sản phẩm (vd: electronics, computers, kitchen, videogames, books)'),
      country: z.string().optional().default('US').describe('Mã quốc gia thị trường. Mặc định US.'),
    },
    async ({ category, country }) => {
      try {
        if (bridge.isConnected()) {
          const data = await bridge.sendRequest('SCRAPE_RANKINGS', {
            category,
            country: country || 'US',
          })
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ source: 'chrome_extension_engine', category, country, ...data }, null, 2),
              },
            ],
          }
        } else {
          const data = await fallback.scrapeBestsellers(category, country || 'US')
          return {
            content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
          }
        }
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Lỗi lấy Bestsellers [${category}]: ${err.message}` }],
        }
      }
    }
  )

  // 5. amazon_scrape_offers
  server.tool(
    'amazon_scrape_offers',
    'Bóc tách tất cả người bán cạnh tranh trên cùng một sản phẩm (All Offers Display - AOD).',
    {
      asin: z.string().describe('Mã ASIN của sản phẩm'),
      country: z.string().optional().default('US').describe('Mã quốc gia thị trường. Mặc định US.'),
    },
    async ({ asin, country }) => {
      try {
        if (bridge.isConnected()) {
          const data = await bridge.sendRequest('SCRAPE_OFFERS', {
            product: asin,
            country: country || 'US',
          })
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ source: 'chrome_extension_engine', asin, country, ...data }, null, 2),
              },
            ],
          }
        } else {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  status: 'requires_extension',
                  message:
                    'Cào danh sách người bán cạnh tranh (Offers) yêu cầu kết nối với Chrome Extension để dùng phiên duyệt và session.',
                }),
              },
            ],
          }
        }
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Lỗi cào Offers sản phẩm ${asin}: ${err.message}` }],
        }
      }
    }
  )

  // 6. amazon_scrape_seller
  server.tool(
    'amazon_scrape_seller',
    'Cào thông tin hồ sơ doanh nghiệp và phản hồi feedback của một người bán (Seller) trên Amazon.',
    {
      seller_id: z.string().describe('Mã Seller ID (vd: A1D09S7Q0OD6TH)'),
      country: z.string().optional().default('US').describe('Mã quốc gia thị trường. Mặc định US.'),
    },
    async ({ seller_id, country }) => {
      try {
        if (bridge.isConnected()) {
          const data = await bridge.sendRequest('SCRAPE_SELLER', {
            seller: seller_id,
            country: country || 'US',
          })
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ source: 'chrome_extension_engine', seller_id, country, ...data }, null, 2),
              },
            ],
          }
        } else {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  status: 'requires_extension',
                  message:
                    'Cào thông tin người bán (Seller) yêu cầu tiện ích Chrome Extension kết nối để đảm bảo tính xác thực.',
                }),
              },
            ],
          }
        }
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Lỗi cào Seller ${seller_id}: ${err.message}` }],
        }
      }
    }
  )

  // 7. amazon_scrape_influencer
  server.tool(
    'amazon_scrape_influencer',
    'Cào danh mục sản phẩm từ Amazon Storefront của KOL / Influencer.',
    {
      handle: z.string().describe('Tên handle storefront của Influencer (vd: tastemade)'),
      country: z.string().optional().default('US').describe('Mã quốc gia thị trường. Mặc định US.'),
    },
    async ({ handle, country }) => {
      try {
        if (bridge.isConnected()) {
          const data = await bridge.sendRequest('SCRAPE_INFLUENCER', {
            influencer: handle,
            country: country || 'US',
          })
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ source: 'chrome_extension_engine', handle, country, ...data }, null, 2),
              },
            ],
          }
        } else {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  status: 'requires_extension',
                  message: 'Cào Storefront Influencer yêu cầu kết nối Chrome Extension.',
                }),
              },
            ],
          }
        }
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Lỗi cào Influencer ${handle}: ${err.message}` }],
        }
      }
    }
  )

  // 8. amazon_universal_url
  server.tool(
    'amazon_universal_url',
    'Cào bất kỳ đường dẫn Amazon hợp lệ nào mà AI cần bóc tách dữ liệu.',
    {
      url: z.string().describe('Đường link Amazon đầy đủ (vd: https://www.amazon.com/dp/B00939I7EK)'),
    },
    async ({ url }) => {
      try {
        if (bridge.isConnected()) {
          const data = await bridge.sendRequest('SCRAPE_UNIVERSAL', { url })
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ source: 'chrome_extension_engine', url, ...data }, null, 2),
              },
            ],
          }
        } else {
          const data = await fallback.scrapeUniversal(url)
          return {
            content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
          }
        }
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Lỗi cào URL ${url}: ${err.message}` }],
        }
      }
    }
  )
}
