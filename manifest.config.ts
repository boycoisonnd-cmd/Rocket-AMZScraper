import { defineManifest } from '@crxjs/vite-plugin'

export const AMAZON_HOST_PATTERNS = [
  '*://*.amazon.com/*',
  '*://*.amazon.ca/*',
  '*://*.amazon.com.mx/*',
  '*://*.amazon.com.br/*',
  '*://*.amazon.co.uk/*',
  '*://*.amazon.ie/*',
  '*://*.amazon.de/*',
  '*://*.amazon.fr/*',
  '*://*.amazon.it/*',
  '*://*.amazon.es/*',
  '*://*.amazon.nl/*',
  '*://*.amazon.com.be/*',
  '*://*.amazon.se/*',
  '*://*.amazon.pl/*',
  '*://*.amazon.com.tr/*',
  '*://*.amazon.ae/*',
  '*://*.amazon.sa/*',
  '*://*.amazon.eg/*',
  '*://*.amazon.in/*',
  '*://*.amazon.co.jp/*',
  '*://*.amazon.sg/*',
  '*://*.amazon.com.au/*',
  '*://*.amazon.co.za/*',
]

export default defineManifest({
  manifest_version: 3,
  name: 'R-AMZscraper',
  version: '1.0.0',
  description: 'R-AMZscraper - Advanced Data Extraction Engine for Chrome Manifest V3 across 23 Global Marketplaces.',
  icons: {
    '16': 'icon16.png',
    '32': 'icon32.png',
    '48': 'icon48.png',
    '128': 'icon128.png',
  },
  permissions: [
    'sidePanel',
    'activeTab',
    'storage',
    'declarativeNetRequest',
    'cookies',
    'downloads',
  ],
  host_permissions: [
    ...AMAZON_HOST_PATTERNS,
    'http://127.0.0.1/*',
    'http://localhost/*',
  ],
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  action: {
    default_title: 'R-AMZscraper - Click to Open Side Panel',
    default_icon: {
      '16': 'icon16.png',
      '32': 'icon32.png',
      '48': 'icon48.png',
      '128': 'icon128.png',
    },
  },
  side_panel: {
    default_path: 'src/sidepanel/index.html',
  },
  content_scripts: [
    {
      matches: [...AMAZON_HOST_PATTERNS],
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
    },
  ],
})
