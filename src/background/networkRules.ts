/**
 * DeclarativeNetRequest rules to ensure headers (Referer, X-Requested-With)
 * match Amazon's expected internal request signatures across all 23 marketplaces.
 */

import { SITES } from '../shared/sites'

const RULE_ID_REFERER = 1001
const RULE_ID_AJAX = 1002

export async function setupNetworkRules(): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.declarativeNetRequest) {
    return
  }

  const amazonDomains = Object.values(SITES).map((s) => s.domain)
  const domainUrlFilters = amazonDomains.map((d) => `*://*.${d}/*`)

  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [RULE_ID_REFERER, RULE_ID_AJAX],
      addRules: [
        {
          id: RULE_ID_REFERER,
          priority: 1,
          action: {
            type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
            requestHeaders: [
              {
                header: 'Referer',
                operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                value: 'https://www.amazon.com/s?k=amazon',
              },
            ],
          },
          condition: {
            urlFilter: '*://*.amazon.*/*',
            resourceTypes: [
              chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
              chrome.declarativeNetRequest.ResourceType.SUB_FRAME,
            ],
          },
        },
        {
          id: RULE_ID_AJAX,
          priority: 2,
          action: {
            type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
            requestHeaders: [
              {
                header: 'X-Requested-With',
                operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                value: 'XMLHttpRequest',
              },
            ],
          },
          condition: {
            urlFilter: '*://*.amazon.*/gp/product/ajax/*',
            resourceTypes: [chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST],
          },
        },
      ],
    })
    console.log('[NetworkRules] Dynamic declarativeNetRequest rules registered successfully.')
  } catch (err) {
    console.warn('[NetworkRules] Could not register dynamic rules:', err)
  }
}
