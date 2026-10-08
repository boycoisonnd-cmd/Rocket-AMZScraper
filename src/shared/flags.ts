export const COUNTRY_FLAGS: Record<string, string> = {
  US: '🇺🇸',
  CA: '🇨🇦',
  MX: '🇲🇽',
  BR: '🇧🇷',
  GB: '🇬🇧',
  IE: '🇮🇪',
  DE: '🇩🇪',
  FR: '🇫🇷',
  IT: '🇮🇹',
  ES: '🇪🇸',
  NL: '🇳🇱',
  BE: '🇧🇪',
  SE: '🇸🇪',
  PL: '🇵🇱',
  TR: '🇹🇷',
  AE: '🇦🇪',
  SA: '🇸🇦',
  EG: '🇪🇬',
  IN: '🇮🇳',
  JP: '🇯🇵',
  SG: '🇸🇬',
  AU: '🇦🇺',
  ZA: '🇿🇦',
}

export function getCountryFlag(countryCode: string): string {
  const code = (countryCode || 'US').toUpperCase()
  return COUNTRY_FLAGS[code] || '🌐'
}
