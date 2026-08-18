'use strict';

/**
 * Standard country name / subdivision / code mapping for M3U group-titles and tvg-country attributes.
 */
const COUNTRY_MAP = {
  // Common full names to ISO alpha-2
  'afghanistan': 'AF', 'albania': 'AL', 'algeria': 'DZ', 'andorra': 'AD', 'angola': 'AO',
  'antigua and barbuda': 'AG', 'argentina': 'AR', 'armenia': 'AM', 'australia': 'AU', 'austria': 'AT',
  'azerbaijan': 'AZ', 'bahamas': 'BS', 'bahrain': 'BH', 'bangladesh': 'BD', 'barbados': 'BB',
  'belarus': 'BY', 'belgium': 'BE', 'belize': 'BZ', 'benin': 'BJ', 'bhutan': 'BT',
  'bolivia': 'BO', 'bosnia': 'BA', 'bosnia and herzegovina': 'BA', 'botswana': 'BW', 'brazil': 'BR',
  'brunei': 'BN', 'bulgaria': 'BG', 'burkina faso': 'BF', 'burundi': 'BI', 'cambodia': 'KH',
  'cameroon': 'CM', 'canada': 'CA', 'cape verde': 'CV', 'central african republic': 'CF', 'chad': 'TD',
  'chile': 'CL', 'china': 'CN', 'colombia': 'CO', 'comoros': 'KM', 'congo': 'CG',
  'republic of the congo': 'CG', 'brazzaville': 'CG',
  'democratic republic of the congo': 'CD', 'costa rica': 'CR', 'croatia': 'HR', 'cuba': 'CU', 'cyprus': 'CY',
  'czech republic': 'CZ', 'czechia': 'CZ', 'denmark': 'DK', 'djibouti': 'DJ', 'dominica': 'DM',
  'dominican republic': 'DO', 'east timor': 'TL', 'timor-leste': 'TL', 'ecuador': 'EC', 'egypt': 'EG',
  'el salvador': 'SV', 'equatorial guinea': 'GQ', 'eritrea': 'ER', 'estonia': 'EE', 'eswatini': 'SZ',
  'swaziland': 'SZ', 'ethiopia': 'ET', 'fiji': 'FJ', 'finland': 'FI', 'france': 'FR',
  'gabon': 'GA', 'gambia': 'GM', 'georgia': 'GE', 'germany': 'DE', 'ghana': 'GH',
  'greece': 'GR', 'grenada': 'GD', 'guatemala': 'GT', 'guinea': 'GN', 'guinea-bissau': 'GW',
  'guyana': 'GY', 'haiti': 'HT', 'honduras': 'HN', 'hong kong': 'HK', 'hungary': 'HU',
  'iceland': 'IS', 'india': 'IN', 'indonesia': 'ID', 'iran': 'IR', 'tehran': 'IR', 'iraq': 'IQ',
  'ireland': 'IE', 'israel': 'IL', 'italy': 'IT', 'ivory coast': 'CI', 'cote d\'ivoire': 'CI',
  'jamaica': 'JM', 'japan': 'JP', 'jordan': 'JO', 'kazakhstan': 'KZ', 'kenya': 'KE',
  'kiribati': 'KI', 'kosovo': 'XK', 'kuwait': 'KW', 'kyrgyzstan': 'KG', 'laos': 'LA',
  'latvia': 'LV', 'lebanon': 'LB', 'lesotho': 'LS', 'liberia': 'LR', 'libya': 'LY',
  'liechtenstein': 'LI', 'lithuania': 'LT', 'luxembourg': 'LU', 'macau': 'MO', 'macao': 'MO',
  'madagascar': 'MG', 'malawi': 'MW', 'malaysia': 'MY', 'maldives': 'MV', 'mali': 'ML', 'malta': 'MT',
  'marshall islands': 'MH', 'mauritania': 'MR', 'mauritius': 'MU', 'mexico': 'MX', 'micronesia': 'FM',
  'moldova': 'MD', 'monaco': 'MC', 'mongolia': 'MN', 'montenegro': 'ME', 'morocco': 'MA',
  'mozambique': 'MZ', 'myanmar': 'MM', 'myanmar (burma)': 'MM', 'burma': 'MM', 'namibia': 'NA', 'nauru': 'NR',
  'nepal': 'NP', 'netherlands': 'NL', 'new zealand': 'NZ', 'nicaragua': 'NI', 'niger': 'NE',
  'nigeria': 'NG', 'north macedonia': 'MK', 'macedonia': 'MK', 'north korea': 'KP', 'norway': 'NO',
  'oman': 'OM', 'pakistan': 'PK', 'islamabad': 'PK', 'palau': 'PW', 'palestine': 'PS', 'panama': 'PA',
  'papua new guinea': 'PG', 'paraguay': 'PY', 'peru': 'PE', 'philippines': 'PH', 'poland': 'PL',
  'portugal': 'PT', 'puerto rico': 'PR', 'qatar': 'QA', 'romania': 'RO', 'russia': 'RU',
  'rwanda': 'RW', 'saint kitts and nevis': 'KN', 'saint lucia': 'LC', 'saint vincent and the grenadines': 'VC',
  'samoa': 'WS', 'san marino': 'SM', 'sao tome and principe': 'ST', 'são tomé and príncipe': 'ST',
  'saudi arabia': 'SA', 'senegal': 'SN', 'serbia': 'RS', 'seychelles': 'SC', 'sierra leone': 'SL',
  'singapore': 'SG', 'slovakia': 'SK', 'slovenia': 'SI', 'solomon islands': 'SB', 'somalia': 'SO',
  'south africa': 'ZA', 'south korea': 'KR', 'korea': 'KR', 'south sudan': 'SS', 'spain': 'ES',
  'sri lanka': 'LK', 'sudan': 'SD', 'suriname': 'SR', 'sweden': 'SE', 'switzerland': 'CH',
  'syria': 'SY', 'taiwan': 'TW', 'tajikistan': 'TJ', 'tanzania': 'TZ', 'thailand': 'TH',
  'togo': 'TG', 'tonga': 'TO', 'trinidad and tobago': 'TT', 'tunisia': 'TN', 'turkey': 'TR',
  'turkiye': 'TR', 'turkmenistan': 'TM', 'tuvalu': 'TV', 'uganda': 'UG', 'ukraine': 'UA',
  'united arab emirates': 'AE', 'uae': 'AE', 'united kingdom': 'GB', 'uk': 'GB', 'great britain': 'GB',
  'england': 'GB', 'scotland': 'GB', 'wales': 'GB', 'united states': 'US', 'usa': 'US',
  'uruguay': 'UY', 'uzbekistan': 'UZ', 'vanuatu': 'VU', 'vatican city': 'VA', 'venezuela': 'VE',
  'vietnam': 'VN', 'yemen': 'YE', 'zambia': 'ZM', 'zimbabwe': 'ZW',

  // Territories & Dependencies
  'american samoa': 'AS', 'anguilla': 'AI', 'aruba': 'AW', 'bermuda': 'BM', 'bonaire': 'BQ',
  'british virgin islands': 'VG', 'cayman islands': 'KY', 'cook islands': 'CK', 'curacao': 'CW',
  'falkland islands': 'FK', 'faroe islands': 'FO', 'french guiana': 'GF', 'french polynesia': 'PF',
  'french southern territories': 'TF', 'gibraltar': 'GI', 'greenland': 'GL', 'guadeloupe': 'GP',
  'guam': 'GU', 'isle of man': 'IM', 'jersey': 'JE', 'guernsey': 'GG', 'martinique': 'MQ',
  'mayotte': 'YT', 'montserrat': 'MS', 'new caledonia': 'NC', 'niue': 'NU', 'norfolk island': 'NF',
  'northern mariana islands': 'MP', 'pitcairn islands': 'PN', 'reunion': 'RE', 'réunion': 'RE',
  'saint barthélemy': 'BL', 'saint helena': 'SH', 'saint martin': 'MF', 'saint pierre and miquelon': 'PM',
  'sint maarten': 'SX', 'south georgia and the south sandwich islands': 'GS', 'tokelau': 'TK',
  'turks and caicos islands': 'TC', 'u.s. virgin islands': 'VI', 'virgin islands': 'VI',
  'wallis and futuna': 'WF', 'western sahara': 'EH',

  // US States
  'alabama': 'US', 'alaska': 'US', 'arizona': 'US', 'arkansas': 'US', 'california': 'US',
  'colorado': 'US', 'connecticut': 'US', 'delaware': 'US', 'florida': 'US', 'georgia': 'US',
  'hawaii': 'US', 'idaho': 'US', 'illinois': 'US', 'indiana': 'US', 'iowa': 'US',
  'kansas': 'US', 'kentucky': 'US', 'louisiana': 'US', 'maine': 'US', 'maryland': 'US',
  'massachusetts': 'US', 'michigan': 'US', 'minnesota': 'US', 'mississippi': 'US', 'missouri': 'US',
  'montana': 'US', 'nebraska': 'US', 'nevada': 'US', 'new hampshire': 'US', 'new jersey': 'US',
  'new mexico': 'US', 'new york': 'US', 'north carolina': 'US', 'north dakota': 'US', 'ohio': 'US',
  'oklahoma': 'US', 'oregon': 'US', 'pennsylvania': 'US', 'rhode island': 'US', 'south carolina': 'US',
  'south dakota': 'US', 'tennessee': 'US', 'texas': 'US', 'utah': 'US', 'vermont': 'US',
  'virginia': 'US', 'washington': 'US', 'west virginia': 'US', 'wisconsin': 'US', 'wyoming': 'US',
  'district of columbia': 'US',

  // Canadian Provinces
  'alberta': 'CA', 'british columbia': 'CA', 'manitoba': 'CA', 'new brunswick': 'CA',
  'newfoundland and labrador': 'CA', 'nova scotia': 'CA', 'ontario': 'CA', 'prince edward island': 'CA',
  'quebec': 'CA', 'saskatchewan': 'CA', 'northwest territories': 'CA', 'nunavut': 'CA', 'yukon': 'CA',

  // Mexican States
  'aguascalientes': 'MX', 'baja california': 'MX', 'baja california sur': 'MX', 'campeche': 'MX',
  'chiapas': 'MX', 'chihuahua': 'MX', 'coahuila de zaragoza': 'MX', 'coahuila': 'MX', 'colima': 'MX',
  'durango': 'MX', 'guanajuato': 'MX', 'guerrero': 'MX', 'hidalgo': 'MX', 'jalisco': 'MX',
  'mexico': 'MX', 'ciudad de mexico': 'MX', 'michoacan': 'MX', 'morelos': 'MX', 'nayarit': 'MX',
  'nuevo leon': 'MX', 'oaxaca': 'MX', 'puebla': 'MX', 'queretaro': 'MX', 'quintana roo': 'MX',
  'san luis potosi': 'MX', 'sinaloa': 'MX', 'sonora': 'MX', 'tabasco': 'MX', 'tamaulipas': 'MX',
  'tlaxcala': 'MX', 'veracruz': 'MX', 'veracruz de ignacio de la llave': 'MX', 'yucatan': 'MX', 'zacatecas': 'MX',

  // Spanish Autonomous Communities
  'andalucia': 'ES', 'aragon': 'ES', 'asturias': 'ES', 'asturias, principado de': 'ES',
  'baleares': 'ES', 'illes balears': 'ES', 'canarias': 'ES', 'cantabria': 'ES', 'castilla y leon': 'ES',
  'castilla-la mancha': 'ES', 'catalunya': 'ES', 'catalonia': 'ES', 'valencia': 'ES',
  'comunitat valenciana': 'ES', 'valenciana, comunidad': 'ES', 'extremadura': 'ES', 'galicia': 'ES',
  'madrid': 'ES', 'madrid, comunidad de': 'ES', 'murcia': 'ES', 'murcia, region de': 'ES',
  'navarra': 'ES', 'navarra, comunidad foral de': 'ES', 'pais vasco': 'ES', 'la rioja': 'ES',
  'ceuta': 'ES', 'melilla': 'ES',

  // Brazilian States
  'acre': 'BR', 'alagoas': 'BR', 'amapa': 'BR', 'amazonas': 'BR', 'bahia': 'BR', 'ceara': 'BR',
  'distrito federal': 'BR', 'espirito santo': 'BR', 'goias': 'BR', 'maranhao': 'BR', 'mato grosso': 'BR',
  'mato grosso do sul': 'BR', 'minas gerais': 'BR', 'para': 'BR', 'paraiba': 'BR', 'parana': 'BR',
  'pernambuco': 'BR', 'piaui': 'BR', 'rio de janeiro': 'BR', 'rio grande do norte': 'BR',
  'rio grande do sul': 'BR', 'rondonia': 'BR', 'roraima': 'BR', 'santa catarina': 'BR',
  'sao paulo': 'BR', 'sergipe': 'BR', 'tocantins': 'BR',

  // Argentinian Provinces
  'buenos aires': 'AR', 'ciudad autonoma de buenos aires': 'AR', 'catamarca': 'AR', 'chaco': 'AR',
  'chubut': 'AR', 'cordoba': 'AR', 'corrientes': 'AR', 'entre rios': 'AR', 'formosa': 'AR',
  'jujuy': 'AR', 'la pampa': 'AR', 'la rioja': 'AR', 'mendoza': 'AR', 'misiones': 'AR',
  'neuquen': 'AR', 'rio negro': 'AR', 'salta': 'AR', 'san juan': 'AR', 'san luis': 'AR',
  'santa cruz': 'AR', 'santa fe': 'AR', 'santiago del estero': 'AR', 'tierra del fuego': 'AR', 'tucuman': 'AR',

  // Indonesian Provinces
  'aceh': 'ID', 'bali': 'ID', 'banten': 'ID', 'bengkulu': 'ID', 'gorontalo': 'ID', 'jakarta': 'ID',
  'jakarta raya': 'ID', 'jambi': 'ID', 'jawa barat': 'ID', 'jawa tengah': 'ID', 'jawa timur': 'ID',
  'kalimantan barat': 'ID', 'kalimantan selatan': 'ID', 'kalimantan tengah': 'ID', 'kalimantan timur': 'ID',
  'kalimantan utara': 'ID', 'kepulauan bangka belitung': 'ID', 'kepulauan riau': 'ID', 'lampung': 'ID',
  'maluku': 'ID', 'maluku utara': 'ID', 'nusa tenggara barat': 'ID', 'nusa tenggara timur': 'ID',
  'papua': 'ID', 'riau': 'ID', 'sulawesi barat': 'ID', 'sulawesi selatan': 'ID', 'sulawesi tengah': 'ID',
  'sulawesi tenggara': 'ID', 'sulawesi utara': 'ID', 'sumatera barat': 'ID', 'sumatera selatan': 'ID',
  'sumatera utara': 'ID', 'yogyakarta': 'ID',

  // Other Regional Names
  'attiki': 'GR', 'trentino-alto adige': 'IT', 'pohjanmaa': 'FI', 'keski-suomi': 'FI',
  'chiba': 'JP', 'gunma': 'JP', 'ibaraki': 'JP', 'osaka': 'JP', 'tokyo': 'JP', 'tochigi': 'JP',
  'seoul': 'KR', 'seoul-teukbyeolsi': 'KR', 'busan-gwangyeoksi': 'KR', 'daegu-gwangyeoksi': 'KR',
  'daejeon-gwangyeoksi': 'KR', 'jeju-teukbyeoljachido': 'KR', 'chungcheongbuk-do': 'KR',
  'la paz': 'BO', 'cochabamba': 'BO', 'oruro': 'BO',
  'san jose': 'CR', 'puntarenas': 'CR',
  'distrito nacional (santo domingo)': 'DO', 'la altagracia': 'DO', 'la vega': 'DO', 'puerto plata': 'DO', 'valverde': 'DO', 'monsenor nouel': 'DO',
  'escuintla': 'GT', 'huehuetenango': 'GT', 'izabal': 'GT', 'quiche': 'GT', 'sacatepequez': 'GT', 'san marcos': 'GT', 'santa rosa': 'GT', 'solola': 'GT', 'totonicapan': 'GT',
};

/**
 * Recognized standard IPTV genres & categories.
 */
const GENRE_MAP = {
  'news': 'news',
  'information': 'news',
  'sports': 'sports',
  'sport': 'sports',
  'football': 'sports',
  'soccer': 'sports',
  'movies': 'movies',
  'movie': 'movies',
  'cinema': 'movies',
  'films': 'movies',
  'film': 'movies',
  'music': 'music',
  'kids': 'kids',
  'children': 'kids',
  'animation': 'animation',
  'cartoon': 'animation',
  'anime': 'animation',
  'documentary': 'documentary',
  'documentaries': 'documentary',
  'entertainment': 'entertainment',
  'general': 'general',
  'comedy': 'comedy',
  'education': 'education',
  'educational': 'education',
  'lifestyle': 'lifestyle',
  'family': 'family',
  'series': 'series',
  'science': 'science',
  'culture': 'culture',
  'business': 'business',
  'finance': 'business',
  'travel': 'travel',
  'weather': 'weather',
  'religious': 'religious',
  'religion': 'religious',
  'christian': 'religious',
  'islamic': 'religious',
  'auto': 'auto',
  'automotive': 'auto',
  'cooking': 'cooking',
  'food': 'cooking',
  'shop': 'shop',
  'shopping': 'shop',
  'outdoor': 'outdoor',
  'classic': 'classic',
  'relax': 'relax',
  'legislative': 'legislative',
  'xxx': 'xxx',
  'adult': 'xxx',
  'radio': 'radio',
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
 * Determines Country and Categories strictly separating geographic locations from genres.
 * @param {string} groupTitle
 * @param {string} tvgCountry
 * @param {string} channelName
 * @returns {{ country: string|null, categories: string[] }}
 */
function extractCountryAndCategories(groupTitle = '', tvgCountry = '', channelName = '') {
  let country = resolveCountry(tvgCountry);
  const categories = [];

  const rawGroup = (groupTitle || '').trim();

  // If group-title has parts separated by dash/pipe/slash/colon (e.g. "USA - News" or "Sports | Spain")
  const parts = rawGroup.split(/[-|/:]+/).map(p => p.trim()).filter(Boolean);

  let groupIsCountry = false;

  for (const part of (parts.length > 0 ? parts : [rawGroup])) {
    const partLower = part.toLowerCase();
    const resolved = resolveCountry(part);
    if (resolved) {
      if (!country) country = resolved;
      groupIsCountry = true;
      continue;
    }

    // Check if part is a genre
    if (GENRE_MAP[partLower]) {
      const g = GENRE_MAP[partLower];
      if (!categories.includes(g)) categories.push(g);
    }
  }

  // Check direct full group-title if not split
  if (!country && rawGroup) {
    const directCountry = resolveCountry(rawGroup);
    if (directCountry) {
      country = directCountry;
      groupIsCountry = true;
    }
  }

  // Check if raw group-title matches genre directly
  const groupLower = rawGroup.toLowerCase();
  if (!groupIsCountry && GENRE_MAP[groupLower]) {
    const g = GENRE_MAP[groupLower];
    if (!categories.includes(g)) categories.push(g);
  }

  return { country, categories };
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

      // Determine Country and Categories distinctly
      const { country, categories } = extractCountryAndCategories(groupTitle, tvgCountry, cleanName);

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
  extractCountryAndCategories,
  slugify,
  COUNTRY_MAP,
  GENRE_MAP,
};