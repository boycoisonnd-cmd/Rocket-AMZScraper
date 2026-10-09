# R-AMZscraper 🚀 (Chrome Extension Manifest V3)

> Tiện ích Chrome Manifest V3 hỗ trợ trích xuất dữ liệu từ **23 thị trường Amazon** qua **21 endpoint**. Khả năng truy xuất phụ thuộc vào nội dung trang, phiên trình duyệt và phản hồi hiện tại của Amazon.

---

## 🌟 Tính Năng Chính

1. **Trích xuất trong ngữ cảnh trình duyệt**:
   - Đọc nội dung đã tải trên trang Amazon đang mở hoặc gửi yêu cầu nền theo chức năng được chọn. Kết quả phụ thuộc vào trạng thái phiên và phản hồi của Amazon.
2. **Hybrid Extraction (Cào Kép)**:
   - **In-Page Live DOM**: Đọc dữ liệu đang có trong trang Amazon hiện tại mà không tải lại trang để lấy cùng nội dung.
   - **Background Service Worker**: Tự động gọi fetch nền có cơ chế retry thông minh, rate limit concurrency (tối đa 4 kết nối), cào danh sách sản phẩm, phân trang, và cào hàng loạt (bulk ASINs).
3. **Giao Diện Hiện Đại & Trực Quan**:
   - **Action Popup**: Bấm icon tiện ích để quét nhanh trang hiện tại chỉ với 1 click.
   - **Floating Action Widget (FAB)**: Nút bấm tiện lợi ngay góc phải màn hình Amazon cho phép Copy JSON hoặc tải CSV tức thì.
   - **Side Panel (Trạm điều khiển chuyên nghiệp)**: Tích hợp bảng dữ liệu (Data Grid) xem ảnh thumbnail, lọc/sắp xếp, trình xem cây JSON đổi màu cú pháp, và thanh công cụ xuất file CSV / JSON.

---

## 🌐 Hỗ trợ 23 Thị trường Amazon Quốc tế

| Mã | Quốc gia | Tên miền | Tiền tệ | Mã bưu chính mặc định |
| :---: | :--- | :--- | :---: | :--- |
| **US** | Hoa Kỳ | `amazon.com` | USD | `10001` (New York) |
| **CA** | Canada | `amazon.ca` | CAD | `M5V 3L9` (Toronto) |
| **MX** | Mexico | `amazon.com.mx` | MXN | `01000` (Mexico City) |
| **BR** | Brazil | `amazon.com.br` | BRL | `01310-100` (São Paulo) |
| **GB** | Vương quốc Anh | `amazon.co.uk` | GBP | `SW1A 1AA` (London) |
| **IE** | Ireland | `amazon.ie` | EUR | `D02 X285` (Dublin) |
| **DE** | Đức | `amazon.de` | EUR | `10115` (Berlin) |
| **FR** | Pháp | `amazon.fr` | EUR | `75001` (Paris) |
| **IT** | Ý | `amazon.it` | EUR | `00100` (Rome) |
| **ES** | Tây Ban Nha | `amazon.es` | EUR | `28001` (Madrid) |
| **NL** | Hà Lan | `amazon.nl` | EUR | `1012 AB` (Amsterdam) |
| **BE** | Bỉ | `amazon.com.be` | EUR | `1000` (Brussels) |
| **SE** | Thụy Điển | `amazon.se` | SEK | `111 20` (Stockholm) |
| **PL** | Ba Lan | `amazon.pl` | PLN | `00-001` (Warsaw) |
| **TR** | Thổ Nhĩ Kỳ | `amazon.com.tr` | TRY | `34000` (Istanbul) |
| **AE** | UAE | `amazon.ae` | AED | Local |
| **SA** | Saudi Arabia | `amazon.sa` | SAR | Local |
| **EG** | Ai Cập | `amazon.eg` | EGP | Local |
| **IN** | Ấn Độ | `amazon.in` | INR | `110001` (New Delhi) |
| **JP** | Nhật Bản | `amazon.co.jp` | JPY | `100-0001` (Tokyo) |
| **SG** | Singapore | `amazon.sg` | SGD | `018956` |
| **AU** | Úc | `amazon.com.au` | AUD | `2000` (Sydney) |
| **ZA** | Nam Phi | `amazon.co.za` | ZAR | `2000` (Johannesburg) |

---

## 📦 Danh mục 21 Endpoints Dữ Liệu Được Hỗ Trợ

1. **Product Details (`/products/details`)**: Title, Brand, Tác giả, Giá, BuyBox, Thông tin giao hàng, Tồn kho, BSR, Bullets, Thông số kỹ thuật, Mã định danh (UPC, EAN, ISBN, GTIN, Model), Media (Ảnh độ phân giải cao, Videos), AI "Customers say" summary, Top reviews inline.
2. **Search Autocomplete (`/search/autocomplete`)**: Gợi ý từ khóa trực tiếp từ Amazon Suggestions API.
3. **Product Search (`/search`)**: Tìm kiếm theo từ khóa kèm bộ lọc phân trang, thương hiệu, giá, sao, Prime, Deals.
4. **Product Reviews (`/products/reviews`)**: Đánh giá khách hàng, bảng phân bổ sao (histogram), tóm tắt AI.
5. **Product Offers (`/products/offers`)**: Toàn bộ ưu đãi từ modal `aodAjaxMain` (giá, điều kiện hàng, thông tin seller, đánh giá seller).
6. **Variations Matrix (`/products/variations`)**: Toàn bộ ma trận biến thể kích thước, màu sắc, kiểu dáng, parent/child ASIN.
7. **Bulk Scraping (`/products/bulk`)**: Cào song song tối đa 10 ASIN cùng lúc với hàng đợi concurrency.
8. **Barcode Lookup (`/products/lookup`)**: Tra cứu sản phẩm theo mã vạch quốc tế (UPC, EAN, ISBN, GTIN).
9. **Best Sellers (`/best-sellers`)**: Top 100 sản phẩm bán chạy nhất, xử lý phân trang ACP hydration để lấy đủ 50-100 sản phẩm.
10. **Best Sellers Categories (`/best-sellers/categories`)**: Cây danh mục bảng xếp hạng Best Sellers.
11. **Today's Deals (`/deals`)**: Danh sách khuyến mãi, tự động hydrat giá từ Amazon Data AAPI.
12. **Departments (`/categories`)**: Danh sách các phòng ban/ngành hàng từ dropdown tìm kiếm.
13. **Browse Tree (`/categories/tree`)**: Cây phân cấp danh mục theo Browse Node ID.
14. **Browse Products (`/categories/products`)**: Danh sách sản phẩm thuộc mã Browse Node.
15. **Seller Details (`/sellers/details`)**: Hồ sơ người bán, thông tin đăng ký kinh doanh, thống kê đánh giá lifetime/12 tháng/3 tháng/1 tháng.
16. **Seller Feedback (`/sellers/feedback`)**: Đánh giá phản hồi của khách hàng về người bán (`/sp/ajax/feedback`).
17. **Seller Products (`/sellers/products`)**: Toàn bộ sản phẩm trong gian hàng người bán (`/s?me=...`).
18. **Influencer Profile (`/influencers/details`)**: Cửa hàng Influencer Storefront (`/shop/...`), tiểu sử, huy hiệu Top Creator, liên kết mạng xã hội.
19. **Influencer Posts (`/influencers/posts`)**: Danh sách bài viết, video, ý tưởng kèm ASIN liên kết và lượt thích.
20. **Influencer Post Products (`/influencers/posts/products`)**: Toàn bộ sản phẩm trong danh sách ý tưởng (`/shop/.../list/...`).
21. **Universal URL Scraper (`/scrape`)**: Tự động nhận diện loại trang và điều hướng bóc tách theo link Amazon bất kỳ.

---

## 🚀 Hướng Dẫn Cài Đặt Vào Google Chrome

### Cách 1: Cài đặt từ thư mục `dist/` (Khuyên dùng cho lập trình viên)
1. Mở trình duyệt Google Chrome, truy cập: `chrome://extensions/`
2. Bật công tắc **Developer mode** (Chế độ dành cho nhà phát triển) ở góc trên bên phải.
3. Nhấp vào nút **Load unpacked** (Tải tiện ích đã giải nén).
4. Chọn thư mục `c:\Users\ASUS\Desktop\amazon-scraper\dist`.
5. Tiện ích **R-AMZscraper** sẽ xuất hiện trên thanh công cụ của Chrome!

### Cách 2: Cài đặt từ tệp đóng gói `r-amzscraper.zip`
1. Tệp `r-amzscraper.zip` đã được đóng gói sẵn trong thư mục gốc dự án.
2. Giải nén tệp zip này ra một thư mục.
3. Truy cập `chrome://extensions/`, chọn **Load unpacked** và trỏ tới thư mục vừa giải nén.

---

## 🛠️ Hướng Dẫn Sử Dụng

### 1. Quét tức thì bằng Action Popup
- Mở bất kỳ trang sản phẩm, tìm kiếm, hoặc bảng xếp hạng trên Amazon.
- Nhấp vào biểu tượng tiện ích **🚀 R-AMZscraper** trên thanh công cụ.
- Nhấp nút **🚀 1-Click Scrape Active Tab** để bóc tách ngay lập tức.
- Nhấp **Copy JSON** hoặc **Export CSV** để lấy dữ liệu.

### 2. Sử dụng Side Panel (Trạm điều khiển chuyên nghiệp)
- Nhấp nút **Side Panel** trên Popup hoặc mở menu Side Panel của Chrome.
- Chọn thị trường trong số 23 quốc gia tại thanh điều khiển trên cùng.
- Chọn 1 trong 6 nhóm endpoint (Products, Search, Rankings & Deals, Sellers, Influencers, Universal).
- Nhập mã ASIN, từ khóa, hoặc dán link trực tiếp.
- Nhấp **Execute Extraction Request**.
- Dữ liệu hiển thị trực quan ở 2 chế độ:
  - **Data Grid (Bảng)**: Hình ảnh thumbnail, lọc nhanh từ khóa, sắp xếp cột theo giá/sao/thứ hạng.
  - **JSON Tree**: Trình xem cây JSON màu sắc, tìm kiếm key/value, thu phóng từng nút.
- Xuất dữ liệu bằng các nút **CSV**, **JSON**, **Copy**.

### 3. Nút bấm nổi trong trang (In-Page Floating Widget)
- Khi bạn lướt web trên Amazon, một nút nổi nhỏ `🚀 Scrape Page` sẽ xuất hiện ở góc dưới bên phải màn hình.
- Nhấp vào nút này để mở menu cào nhanh, sao chép JSON hoặc tải CSV mà không cần rời khỏi trang hiện tại.

---

## 🤖 Kết Nối AI Trực Tiếp Qua Chuẩn MCP (Model Context Protocol)

R-AMZscraper tích hợp sẵn **MCP Server Daemon** cho phép các AI Assistant (Claude Desktop, Google Antigravity, Cursor, Windsurf, LangChain Agents...) gọi lệnh cào dữ liệu Amazon theo thời gian thực.

### Các công cụ MCP được cung cấp (8 Tools):
1. `amazon_get_active_tab`: Trích xuất dữ liệu Live DOM từ tab Amazon đang mở trên trình duyệt.
2. `amazon_scrape_product`: Cào chi tiết sản phẩm theo ASIN trên 23 quốc gia.
3. `amazon_scrape_search`: Tìm kiếm sản phẩm theo từ khóa.
4. `amazon_scrape_bestsellers`: Bóc tách Top 50 sản phẩm bán chạy nhất theo ngành hàng.
5. `amazon_scrape_offers`: Soi danh sách tất cả người bán cạnh tranh (Buybox & AOD).
6. `amazon_scrape_seller`: Bóc tách thông tin và feedback của một Seller.
7. `amazon_scrape_influencer`: Cào danh sách sản phẩm đề xuất từ KOL Storefront.
8. `amazon_universal_url`: Cào bất kỳ đường link Amazon nào.

### Cấu hình cho Claude Desktop (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "amazon-scraper-pro": {
      "command": "node",
      "args": ["C:/Users/ASUS/Desktop/amazon-scraper/mcp-server/dist/index.js"]
    }
  }
}
```

### Cấu hình cho Google Antigravity / Cursor / Windsurf (`mcp_config.json`):
```json
{
  "amazon-scraper-pro": {
    "command": "node",
    "args": ["C:/Users/ASUS/Desktop/amazon-scraper/mcp-server/dist/index.js"]
  }
}
```

---

## 🧑‍💻 Lệnh Dành Cho Nhà Phát Triển

```powershell
# Chạy môi trường kiểm thử Vitest
npm test

# Chạy build kiểm tra TypeScript và đóng gói extension vào dist/
npm run build

# Biên dịch MCP Server Daemon
npm run build:mcp

# Kiểm thử độc lập MCP Server & WebSocket Bridge
npm --prefix mcp-server test

# Đóng gói tiện ích thành file zip sẵn sàng phân phối
npm run package
```

---

## 👤 Tác Giả & Bản Quyền
- **Tác giả / Phát triển**: Trần Linh
- **Dự án**: R-AMZscraper (Chrome Extension Manifest V3)
