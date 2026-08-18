'use strict';

/**
 * Standard country name / code mapping for M3U group-titles and tvg-country attributes.
 */
const COUNTRY_MAP = {
  // Common full names to ISO alpha-2
  'afghanistan': 'AF',
  'albania': 'AL',
  'algeria': 'DZ',
  'andorra': 'AD',
  'angola': 'AO',
  'argentina': 'AR',
  'armenia': 'AM',
  'australia': 'AU',
  'austria': 'AT',
  'azerbaijan': 'AZ',
  'bahamas': 'BS',
  'bahrain': 'BH',
  'bangladesh': 'BD',
  'barbados': 'BB',
  'belarus': 'BY',
  'belgium': 'BE',
  'belize': 'BZ',
  'benin': 'BJ',
  'bolivia': 'BO',
  'bosnia': 'BA',
  'bosnia and herzegovina': 'BA',
  'brazil': 'BR',
  'bulgaria': 'BG',
  'cambodia': 'KH',
  'cameroon': 'CM',
  'canada': 'CA',
  'chile': 'CL',
  'china': 'CN',
  'colombia': 'CO',
  'costa rica': 'CR',
  'croatia': 'HR',
  'cuba': 'CU',
  'cyprus': 'CY',
  'czech republic': 'CZ',
  'czechia': 'CZ',
  'denmark': 'DK',
  'dominican republic': 'DO',
  'ecuador': 'EC',
  'egypt': 'EG',
  'el salvador': 'SV',
  'estonia': 'EE',
  'ethiopia': 'ET',
  'finland': 'FI',
  'france': 'FR',
  'georgia': 'GE',
  'germany': 'DE',
  'ghana': 'GH',
  'greece': 'GR',
  'guatemala': 'GT',
  'haiti': 'HT',
  'honduras': 'HN',
  'hong kong': 'HK',
  'hungary': 'HU',
  'iceland': 'IS',
  'india': 'IN',
  'indonesia': 'ID',
  'iran': 'IR',
  'iraq': 'IQ',
  'ireland': 'IE',
  'israel': 'IL',
  'italy': 'IT',
  'jamaica': 'JM',
  'japan': 'JP',
  'jordan': 'JO',
  'kazakhstan': 'KZ',
  'kenya': 'KE',
  'kuwait': 'KW',
  'latvia': 'LV',
  'lebanon': 'LB',
  'libya': 'LY',
  'lithuania': 'LT',
  'luxembourg': 'LU',
  'malaysia': 'MY',
  'maldives': 'MV',
  'malta': 'MT',
  'mexico': 'MX',
  'moldova': 'MD',
  'monaco': 'MC',
  'mongolia': 'MN',
  'montenegro': 'ME',
  'morocco': 'MA',
  'myanmar': 'MM',
  'nepal': 'NP',
  'netherlands': 'NL',
  'new zealand': 'NZ',
  'nicaragua': 'NI',
  'nigeria': 'NG',
  'north macedonia': 'MK',
  'norway': 'NO',
  'oman': 'OM',
  'pakistan': 'PK',
  'palestine': 'PS',
  'panama': 'PA',
  'paraguay': 'PY',
  'peru': 'PE',
  'philippines': 'PH',
  'poland': 'PL',
  'portugal': 'PT',
  'puerto rico': 'PR',
  'qatar': 'QA',
  'romania': 'RO',
  'russia': 'RU',
  'saudi arabia': 'SA',
  'senegal': 'SN',
  'serbia': 'RS',
  'singapore': 'SG',
  'slovakia': 'SK',
  'slovenia': 'SI',
  'somalia': 'SO',
  'south africa': 'ZA',
  'south korea': 'KR',
  'korea': 'KR',
  'spain': 'ES',
  'sri lanka': 'LK',
  'sudan': 'SD',
  'sweden': 'SE',
  'switzerland': 'CH',
  'syria': 'SY',
  'taiwan': 'TW',
  'tanzania': 'TZ',
  'thailand': 'TH',
  'tunisia': 'TN',
  'turkey': 'TR',
  'turkiye': 'TR',
  'uganda': 'UG',
  'ukraine': 'UA',
  'united arab emirates': 'AE',
  'uae': 'AE',
  'united kingdom': 'GB',
  'uk': 'GB',
  'great britain': 'GB',
  'united states': 'US',
  'usa': 'US',
  'uruguay': 'UY',
  'uzbekistan': 'UZ',
  'venezuela': 'VE',
  'vietnam': 'VN',
  'yemen': 'YE',
  'zimbabwe': 'ZW',
  // Regional / State names common in M3Us like Romaxa55
  'aceh': 'ID',
  'aguascalientes': 'MX',
  'baja california': 'MX',
  'chiapas': 'MX',
  'jalisco': 'MX',
  'oaxaca': 'MX',
  'puebla': 'MX',
  'sonora': 'MX',
  'tabasco': 'MX',
  'veracruz': 'MX',
  'yucatan': 'MX',
};

/**
 * Normalizes text to a URL/ID safe slug.
 * @param {string} text
 * @returns {string}
 */
function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'channel';
}

/**
 * Normalizes a country identifier (code or name) to a 2-letter uppercase ISO code.
 * @param {string} countryInput
 * @returns {string|null}
 */
function resolveCountry(countryInput) {
  if (!countryInput) return null;
  const clean = countryInput.trim().toLowerCase();
  if (COUNTRY_MAP[clean]) {
    return COUNTRY_MAP[clean];
  }
  if (/^[a-z]{2}$/i.test(clean)) {
    return clean.toUpperCase();
  }
  return null;
}

/**
 * Cleans channel name and extracts resolution tag if present.
 * @param {string} rawName
 * @returns {{ cleanName: string, resolution: string|null, isNot247: boolean }}
 */
function cleanChannelName(rawName) {
  let name = (rawName || '').trim();
  let resolution = null;
  let isNot247 = false;

  if (/\[Not 24\/7\]/i.test(name)) {
    isNot247 = true;
    name = name.replace(/\[Not 24\/7\]/gi, '').trim();
  }

  const resMatch = name.match(/\((1080p|1080i|720p|720i|576p|576i|540p|480p|480i|360p|240p|4K|8K|2K|FHD|UHD|QHD|HD|SD)\)/i) ||
                   name.match(/\[(1080p|1080i|720p|720i|576p|576i|540p|480p|480i|360p|240p|4K|8K|2K|FHD|UHD|QHD|HD|SD)\]/i);
  if (resMatch) {
    resolution = resMatch[1].toUpperCase();
    name = name.replace(resMatch[0], '').trim();
  }

  return { cleanName: name || rawName, resolution, isNot247 };
}

/**
 * Extracts key-value attributes from #EXTINF line.
 * Handles single quotes, double quotes, and unquoted values.
 * @param {string} extinfHeader
 * @returns {Record<string, string>}
 */
function parseExtinfAttributes(extinfHeader) {
  const attrs = {};
  const attrRegex = /([a-zA-Z0-9_-]+)=(?:"([^"]*)"|'([^']*)'|([^,\s]+))/g;
  let match;

  while ((match = attrRegex.exec(extinfHeader)) !== null) {
    const key = match[1].toLowerCase();
    const value = match[2] ?? match[3] ?? match[4] ?? '';
    attrs[key] = value.trim();
  }

  return attrs;
}

/**
 * Parses raw M3U text into structured channel & stream entries.
 *
 * @param {string} m3uContent - Raw M3U file content
 * @param {string} [sourceId='custom'] - Source identifier
 * @returns {Array<{ channel: object, stream: object }>}
 */
function parseM3U(m3uContent, sourceId = 'custom') {
  if (!m3uContent || typeof m3uContent !== 'string') {
    return [];
  }

  const lines = m3uContent.split(/\r?\n/);
  const entries = [];

  let currentExtinf = null;
  let currentReferrer = null;
  let currentUserAgent = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF:')) {
      const commaIdx = line.indexOf(',');
      let attrPart = '';
      let rawName = '';

      if (commaIdx !== -1) {
        attrPart = line.substring(0, commaIdx);
        rawName = line.substring(commaIdx + 1).trim();
      } else {
        attrPart = line;
        rawName = 'Unknown Channel';
      }

      const attrs = parseExtinfAttributes(attrPart);
      currentExtinf = { attrs, rawName };
      currentReferrer = null;
      currentUserAgent = null;
      continue;
    }

    // Directives
    if (line.startsWith('#EXTVLCOPT:')) {
      const opt = line.substring(11).trim();
      if (opt.toLowerCase().startsWith('http-user-agent=')) {
        currentUserAgent = opt.substring(16).trim();
      } else if (opt.toLowerCase().startsWith('http-referrer=')) {
        currentReferrer = opt.substring(14).trim();
      }
      continue;
    }

    if (line.startsWith('#EXTHTTP:')) {
      try {
        const json = JSON.parse(line.substring(9).trim());
        if (json['User-Agent']) currentUserAgent = json['User-Agent'];
        if (json['Referer'] || json['referrer']) currentReferrer = json['Referer'] || json['referrer'];
      } catch (_e) {}
      continue;
    }

    // Ignore other comment lines
    if (line.startsWith('#')) {
      continue;
    }

    // Non-comment line is stream URL
    if (line.startsWith('http://') || line.startsWith('https://') || line.startsWith('rtmp://') || line.startsWith('rtsp://')) {
      let streamUrl = line;
      let httpReferrer = currentReferrer;
      let userAgent = currentUserAgent;

      if (streamUrl.includes('|')) {
        const [urlPart, headerPart] = streamUrl.split('|');
        streamUrl = urlPart.trim();
        const headerParams = new URLSearchParams(headerPart);
        if (headerParams.get('User-Agent')) userAgent = headerParams.get('User-Agent');
        if (headerParams.get('Referer') || headerParams.get('referrer')) {
          httpReferrer = headerParams.get('Referer') || headerParams.get('referrer');
        }
      }

      const attrs = currentExtinf?.attrs || {};
      const rawName = currentExtinf?.rawName || 'Live Stream';
      const { cleanName, resolution } = cleanChannelName(rawName);

      const tvgId = attrs['tvg-id'] || attrs['id'] || '';
      const tvgName = attrs['tvg-name'] || cleanName;
      const tvgLogo = attrs['tvg-logo'] || attrs['logo'] || '';
      const groupTitle = attrs['group-title'] || attrs['group'] || '';
      const tvgCountry = attrs['tvg-country'] || attrs['country'] || '';
      const tvgLanguage = attrs['tvg-language'] || attrs['language'] || '';

      // Determine Country
      let country = resolveCountry(tvgCountry);
      if (!country && groupTitle) {
        country = resolveCountry(groupTitle);
      }

      // Determine Categories
      const categories = [];
      if (groupTitle) {
        const isCountryOnly = resolveCountry(groupTitle) !== null;
        if (!isCountryOnly || categories.length === 0) {
          const catSlug = slugify(groupTitle);
          if (catSlug && catSlug !== 'general' && catSlug !== 'undefined') {
            categories.push(catSlug);
          }
        }
      }

      // Determine Languages
      const languages = [];
      if (tvgLanguage) {
        languages.push(tvgLanguage.toLowerCase().trim());
      }

      // Construct unique Channel ID
      let channelId = '';
      if (tvgId) {
        channelId = slugify(tvgId);
      } else {
        const baseSlug = slugify(tvgName || cleanName);
        channelId = country ? `${baseSlug}.${country.toLowerCase()}` : `${baseSlug}.${sourceId}`;
      }

      entries.push({
        channel: {
          id: channelId,
          name: cleanName || tvgName,
          alt_names: rawName !== cleanName ? [rawName] : [],
          country: country || null,
          categories,
          languages,
          logo: tvgLogo || null,
          website: null,
          is_nsfw: /xxx|adult|18\+|nsfw/i.test(rawName + ' ' + groupTitle) ? 1 : 0,
          network: resolution ? `${resolution}` : null,
          launched: null,
          closed: null,
        },
        stream: {
          channel_id: channelId,
          url: streamUrl,
          http_referrer: httpReferrer || attrs['http-referrer'] || null,
          user_agent: userAgent || attrs['http-user-agent'] || attrs['user-agent'] || null,
          source: sourceId,
        }
      });

      currentExtinf = null;
      currentReferrer = null;
      currentUserAgent = null;
    }
  }

  return entries;
}

module.exports = {
  parseM3U,
  cleanChannelName,
  resolveCountry,
  slugify,
  COUNTRY_MAP,
};