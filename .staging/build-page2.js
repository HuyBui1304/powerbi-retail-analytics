// Restyles the "Performance Breakdown" page (in .staging) to match image.png.
// Chart bindings, measures and the Bottom-5 TopN filter are kept; only layout/formatting change,
// plus header slicers, panel chrome and a Profit Margin tooltip on the region/channel charts.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const REPORT = '/Users/huybui/Desktop/Project_DA/.staging/dash.Report';
const DEF = path.join(REPORT, 'definition');
const PAGE_ID = 'bf44c7f3392159c0eeb8';
const VIS_DIR = path.join(DEF, 'pages', PAGE_ID, 'visuals');
const RES_DIR = path.join(REPORT, 'StaticResources', 'RegisteredResources');
const SCHEMA = 'https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.7.0/schema.json';

const C = {
  page: '#EEF3FA',
  card: '#FFFFFF',
  cardBorder: '#E3EAF4',
  band: '#EAF2FD',
  ink: '#0F1F3D',
  muted: '#5B6B85',
  axis: '#7A869A',
  label: '#1F2A44',
  grid: '#E9EEF5',
  revenue: '#1A8CFF',
  profit: '#13267A',
  margin: '#F97316',
  headerSub: '#CFE0F7',
  icon: '#1E6FE0',
};

// ---------- expression helpers ----------
const lit = (v) => ({ expr: { Literal: { Value: v } } });
const s = (v) => lit(`'${v}'`);
const d = (n) => lit(`${n}D`);
const l = (n) => lit(`${n}L`);
const b = (v) => lit(v ? 'true' : 'false');
const col = (hex) => ({ solid: { color: lit(`'${hex}'`) } });
const measureRef = (m) => ({ Measure: { Expression: { SourceRef: { Entity: 'SalesTable' } }, Property: m } });
const obj = (properties, selector) => (selector ? { properties, selector } : { properties });
const idSel = (id = 'default') => ({ id });
const series = (m) => ({ metadata: `SalesTable.${m}` });
// Stable ids so re-running the script overwrites the same visuals.
const stableId = (key) => crypto.createHash('sha1').update(`perf-breakdown:${key}`).digest('hex').slice(0, 20);

const bareVCO = () => ({
  background: [obj({ show: b(false) })],
  border: [obj({ show: b(false) })],
  dropShadow: [obj({ show: b(false) })],
  title: [obj({ show: b(false) })],
  visualHeader: [obj({ show: b(false) })],
  padding: [obj({ top: d(0), bottom: d(0), left: d(0), right: d(0) })],
});

const writeVisual = (key, visual, position) => {
  const name = stableId(key);
  const dir = path.join(VIS_DIR, name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'visual.json'), JSON.stringify({ $schema: SCHEMA, name, position, visual }, null, 2) + '\n');
};
const updateVisual = (name, fn) => {
  const file = path.join(VIS_DIR, name, 'visual.json');
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  fn(json);
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n');
};

let z = 0;
let tab = 0;
const pos = (x, y, width, height) => ({ x, y, z: (z += 100), height, width, tabOrder: (tab += 100) });

// ---------- SVG assets ----------
const svg = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;

const W = 1920;
const HEADER_H = 150;
const FP = { x: 1150, y: 20, w: 560, h: 110 }; // filter panel inside the header

const headerSvg = svg(W, HEADER_H, [
  '<defs><linearGradient id="pg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0B2A66"/><stop offset="1" stop-color="#1F4E9C"/></linearGradient></defs>',
  `<rect width="${W}" height="${HEADER_H}" fill="url(#pg)"/>`,
  `<circle cx="1760" cy="-60" r="220" fill="#FFFFFF" fill-opacity="0.04"/>`,
  // bar-chart mark
  '<g fill="#FFFFFF">',
  '<rect x="46" y="72" width="14" height="30" rx="3"/><rect x="66" y="56" width="14" height="46" rx="3"/><rect x="86" y="40" width="14" height="62" rx="3"/>',
  '<rect x="42" y="106" width="68" height="4" rx="2" fill-opacity="0.85"/><circle cx="112" cy="100" r="4" fill="#7CC0FF"/>',
  '</g>',
  // filter panel
  `<rect x="${FP.x}" y="${FP.y}" width="${FP.w}" height="${FP.h}" rx="12" fill="#FFFFFF" fill-opacity="0.07" stroke="#FFFFFF" stroke-opacity="0.16"/>`,
  // calendar icon
  '<g fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">',
  '<rect x="1172" y="62" width="30" height="28" rx="4"/><line x1="1172" y1="71" x2="1202" y2="71"/>',
  '<line x1="1180" y1="57" x2="1180" y2="65"/><line x1="1194" y1="57" x2="1194" y2="65"/>',
  '</g>',
  '<g fill="#FFFFFF"><circle cx="1180" cy="78" r="1.7"/><circle cx="1187" cy="78" r="1.7"/><circle cx="1194" cy="78" r="1.7"/><circle cx="1180" cy="84" r="1.7"/><circle cx="1187" cy="84" r="1.7"/></g>',
  // divider between the two filters
  `<rect x="1431" y="38" width="1" height="74" fill="#FFFFFF" fill-opacity="0.25"/>`,
  // tag icon
  '<path d="M1452 62h13l15 15-13 13-15-15z" fill="#FFFFFF"/><circle cx="1459" cy="69" r="2.6" fill="#1F4E9C"/>',
  // divider before the tagline
  `<rect x="1738" y="44" width="1" height="62" fill="#FFFFFF" fill-opacity="0.25"/>`,
].join(''));

const bandSvg = (w, h, glyph) => svg(w, h,
  `<path d="M0 14 A14 14 0 0 1 14 0 H${w - 14} A14 14 0 0 1 ${w} 14 V${h} H0 Z" fill="${C.band}"/>` +
  `<rect x="0" y="${h - 1}" width="${w}" height="1" fill="#DCE7F7"/>` +
  `<g transform="translate(22 ${(h - 40) / 2})">${glyph}</g>`);

// 40x40 glyphs in the icon blue
const GLYPHS = {
  region:
    `<circle cx="20" cy="20" r="18" fill="${C.icon}"/>` +
    '<path d="M11 10c3 1 4 3 3 5s-4 2-3 5 4 2 4 5-2 4-3 5M24 5c-1 3 1 5 3 5s4 2 3 5-3 3-2 6 4 3 5 5" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round"/>' +
    '<path d="M22 24c2-1 5 0 5 3s-3 4-5 3-2-5 0-6z" fill="#FFFFFF"/>',
  channel:
    `<path d="M2 6h6l5 20h19l5-14H11" fill="none" stroke="${C.icon}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="M11 12h26l-5 14H13z" fill="${C.icon}"/>` +
    `<circle cx="15" cy="33" r="3.4" fill="${C.icon}"/><circle cx="30" cy="33" r="3.4" fill="${C.icon}"/>`,
  category:
    `<rect x="12" y="2" width="16" height="16" rx="2.5" fill="${C.icon}"/>` +
    `<rect x="2" y="21" width="16" height="16" rx="2.5" fill="${C.icon}"/>` +
    `<rect x="22" y="21" width="16" height="16" rx="2.5" fill="${C.icon}"/>`,
  product:
    `<path d="M20 2 36 10v20L20 38 4 30V10z" fill="${C.icon}"/>` +
    '<path d="M4 10l16 8 16-8M20 18v20" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linejoin="round"/>',
};

const circleIcon = (id, top, bottom, glyph) =>
  svg(48, 48, `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs><circle cx="24" cy="24" r="24" fill="url(#${id})"/>${glyph}`);
const HL_ICONS = {
  region: circleIcon('h1', '#5DB0FF', '#1E7BEA',
    '<circle cx="24" cy="24" r="11" fill="none" stroke="#fff" stroke-width="2.2"/>' +
    '<path d="M13 24h22M24 13c-4 4-4 18 0 22M24 13c4 4 4 18 0 22" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/>'),
  channel: circleIcon('h2', '#7C8CF8', '#4353D9',
    '<path d="M17.2 19H35l-2.8 8.5H19.4z" fill="#fff"/>' +
    '<path d="M12 15h4l3.2 12.5h12.8" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<circle cx="21" cy="32" r="2.2" fill="#fff"/><circle cx="30.5" cy="32" r="2.2" fill="#fff"/>'),
  category: circleIcon('h3', '#A78BFA', '#7C3AED',
    '<rect x="19" y="12" width="10" height="10" rx="2" fill="#fff"/><rect x="13" y="25" width="10" height="10" rx="2" fill="#fff"/><rect x="25" y="25" width="10" height="10" rx="2" fill="#fff"/>'),
  best: circleIcon('h4', '#6EE7B7', '#10B981',
    '<path d="M14 31l7-7 5 5 8-9" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M28 18h7v7" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>'),
  lowest: circleIcon('h5', '#FDBA74', '#F97316',
    '<path d="M14 17l7 7 5-5 8 9" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M28 30h7v-7" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>'),
};

const RES = { 'pb_header.svg': headerSvg };
for (const [k, g] of Object.entries(HL_ICONS)) RES[`pb_hl_${k}.svg`] = g;
const PANEL = { w: 924, h: 361, band: 78 };
for (const [k, g] of Object.entries(GLYPHS)) RES[`pb_band_${k}.svg`] = bandSvg(PANEL.w, PANEL.band, g);

fs.mkdirSync(RES_DIR, { recursive: true });
for (const [file, content] of Object.entries(RES)) fs.writeFileSync(path.join(RES_DIR, file), content);

const reportFile = path.join(DEF, 'report.json');
const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
let reg = report.resourcePackages.find((p) => p.name === 'RegisteredResources');
if (!reg) {
  reg = { name: 'RegisteredResources', type: 'RegisteredResources', items: [] };
  report.resourcePackages.push(reg);
}
for (const file of Object.keys(RES)) {
  if (!reg.items.some((i) => i.name === file)) reg.items.push({ name: file, path: file, type: 'Image' });
}
fs.writeFileSync(reportFile, JSON.stringify(report, null, 2) + '\n');

const imageVisual = (file) => ({
  visualType: 'image',
  objects: {
    general: [obj({ imageUrl: { expr: { ResourcePackageItem: { PackageName: 'RegisteredResources', PackageType: 1, ItemName: file } } } })],
    image: [obj({ fit: s('Fill') })],
  },
  visualContainerObjects: bareVCO(),
  drillFilterOtherVisuals: true,
});

const textbox = (paragraphs) => ({
  visualType: 'textbox',
  objects: { general: [obj({ paragraphs })] },
  visualContainerObjects: bareVCO(),
  drillFilterOtherVisuals: true,
});
const run = (value, fontSize, color, fontFamily = 'Segoe UI') => ({ value, textStyle: { fontFamily, fontSize, color } });

// ---------- page ----------
const pageFile = path.join(DEF, 'pages', PAGE_ID, 'page.json');
const page = JSON.parse(fs.readFileSync(pageFile, 'utf8'));
page.objects = {
  ...(page.objects || {}),
  background: [obj({ color: col(C.page), transparency: d(0) })],
  outspace: [obj({ color: col(C.page), transparency: d(0) })],
};
fs.writeFileSync(pageFile, JSON.stringify(page, null, 2) + '\n');

// ---------- header ----------
writeVisual('header', imageVisual('pb_header.svg'), pos(0, 0, W, HEADER_H));
writeVisual('title', textbox([
  { textRuns: [run('Performance Breakdown', '30pt', '#FFFFFF', 'Segoe UI Semibold')] },
  { textRuns: [run('Analyze revenue, profit, and profitability by region, channel, category, and product', '14pt', C.headerSub)] },
]), pos(140, 30, 940, 96));

const dropdown = (entity, column, header) => ({
  visualType: 'slicer',
  query: {
    queryState: {
      Values: {
        projections: [{
          field: { Column: { Expression: { SourceRef: { Entity: entity } }, Property: column } },
          queryRef: `${entity}.${column}`,
          nativeQueryRef: column,
        }],
      },
    },
  },
  objects: {
    data: [obj({ mode: s('Dropdown') })],
    selection: [obj({ selectAllCheckboxEnabled: b(true), singleSelect: b(false), strictSingleSelect: b(false) })],
    header: [obj({
      show: b(true), text: s(header), fontFamily: s('Segoe UI Semibold'), textSize: d(12),
      fontColor: col('#FFFFFF'), bold: b(false),
    })],
    items: [obj({
      fontFamily: s('Segoe UI'), textSize: d(12), fontColor: col('#FFFFFF'), background: col('#163A7A'),
    })],
  },
  visualContainerObjects: {
    ...bareVCO(),
    padding: [obj({ top: d(0), bottom: d(0), left: d(0), right: d(0) })],
  },
  drillFilterOtherVisuals: true,
});
writeVisual('slicer-quarter', dropdown('DateTable', 'Quarter', 'Quarter'), pos(1214, 32, 204, 80));
writeVisual('slicer-channel', dropdown('SalesTable', 'Sales_Channel', 'Sales Channel'), pos(1494, 32, 204, 80));
writeVisual('tagline', textbox([
  { textRuns: [run('Turning Data into', '11pt', C.headerSub)] },
  { textRuns: [run('Business Value', '11pt', C.headerSub)] },
]), pos(1752, 50, 160, 56));

// ---------- panels ----------
const V = {
  region: '8d1d28e9388d801abe74',
  channel: 'b1f7e12cdb01429984d0',
  category: 'b9e111b099da1b21c007',
  product: 'b1a58d5ec0d00837b902',
};
const M = 24;
const STRIP = { y: HEADER_H + M, h: 112 };
const TOP = STRIP.y + STRIP.h + M;
const P = [
  { key: 'region', x: M, y: TOP, title: 'Total Revenue and Total Profit', sub: 'by Region' },
  { key: 'channel', x: M * 2 + PANEL.w, y: TOP, title: 'Total Revenue and Total Profit', sub: 'by Sales Channel' },
  { key: 'category', x: M, y: TOP + PANEL.h + M, title: 'Category Performance', sub: 'Total Revenue, Total Profit and Profit Margin by Category' },
  { key: 'product', x: M * 2 + PANEL.w, y: TOP + PANEL.h + M, title: 'Bottom 5 Products by Profit Margin', sub: 'Total Revenue, Total Profit and Profit Margin' },
];

const panelShape = () => ({
  visualType: 'shape',
  objects: {
    shape: [obj({ tileShape: s('rectangleRoundedByPixel'), rectangleRoundedCurve: l(14) }, idSel())],
    fill: [obj({ show: b(true) }), obj({ fillColor: col(C.card), transparency: d(0) }, idSel())],
    outline: [obj({ show: b(true), lineColor: col(C.cardBorder), weight: d(1), transparency: d(0) }, idSel())],
    shadow: [obj({ show: b(true), color: col('#1E3A8A'), transparency: d(92), shadowBlur: d(18), shadowDistance: d(4), shadowPositionPreset: s('bottom') })],
    text: [obj({ show: b(false) })],
  },
  visualContainerObjects: bareVCO(),
  drillFilterOtherVisuals: true,
});

// Shared chart formatting
const axisFont = { fontFamily: s('Segoe UI'), showAxisTitle: b(false) };
const chartObjects = (isCombo, axisMaxMeasure) => {
  const valueAxis = {
    ...axisFont, fontSize: d(10), labelColor: col(C.axis), labelDisplayUnits: d(1000000),
    gridlineShow: b(true), gridlineColor: col(C.grid), gridlineThickness: d(1), gridlineStyle: s('solid'),
  };
  if (isCombo) {
    // Headroom above the columns + margin line pushed into the upper band, so labels do not collide.
    Object.assign(valueAxis, { end: { expr: measureRef(axisMaxMeasure) }, secShow: b(false), secStart: d(-1) });
  }
  const o = {
    legend: [obj({ show: b(true), position: s('TopCenter'), fontFamily: s('Segoe UI'), fontSize: d(11), labelColor: col('#334155'), showTitle: b(false) })],
    categoryAxis: [obj({ ...axisFont, fontSize: d(11), labelColor: col('#334155'), gridlineShow: b(false), innerPadding: l(22) })],
    valueAxis: [obj(valueAxis)],
    dataPoint: [
      obj({ fill: col(C.revenue) }, series('Total Revenue')),
      obj({ fill: col(C.profit) }, series('Total Profit')),
    ],
    labels: [
      obj({
        show: b(true), fontFamily: s('Segoe UI'), fontSize: d(10), color: col(C.label),
        labelPosition: s('OutsideEnd'), enableBackground: b(false), optimizeLabelDisplay: b(true),
        labelPrecision: l(1), labelContainerMaxWidth: d(160),
        ...(isCombo
          ? { labelDisplayUnits: d(1000000), showSeries: b(true) }
          : { labelDisplayUnits: d(1000000), labelOverflow: b(true) }),
      }),
    ],
  };
  if (isCombo) {
    o.dataPoint.push(obj({ fill: col(C.margin) }, series('Profit Margin')));
    o.labels.push(obj({
      color: col(C.margin), bold: b(true), labelPosition: s('Above'), labelDisplayUnits: d(0), labelPrecision: l(2),
      enableBackground: b(true), backgroundTransparency: d(0),
    }, series('Profit Margin')));
    o.lineStyles = [obj({ strokeWidth: d(3), lineChartType: s('smooth'), showMarker: b(true), markerShape: s('circle'), markerSize: d(7) })];
    o.seriesLabels = [obj({ show: b(false) })];
  }
  return o;
};
const chartVCO = () => ({
  ...bareVCO(),
  padding: [obj({ top: d(6), bottom: d(4), left: d(8), right: d(8) })],
  visualHeader: [obj({ show: b(true), transparency: d(100) })],
});
const tooltipMargin = {
  projections: [{ field: measureRef('Profit Margin'), queryRef: 'SalesTable.Profit Margin', nativeQueryRef: 'Profit Margin' }],
};

const HIGHLIGHTS = [
  { key: 'region', label: 'Top Region', value: 'Top Region', caption: 'Top Region Caption', color: '#1E6FE0' },
  { key: 'channel', label: 'Top Sales Channel', value: 'Top Sales Channel', caption: 'Top Sales Channel Caption', color: '#4353D9' },
  { key: 'category', label: 'Top Category by Revenue', value: 'Top Category', caption: 'Top Category Caption', color: '#7C3AED' },
  { key: 'best', label: 'Highest-Margin Category', value: 'Best Margin Category', caption: 'Best Margin Category Caption', color: '#059669' },
  { key: 'lowest', label: 'Lowest-Margin Product', value: 'Lowest Margin Product', caption: 'Lowest Margin Product Caption', color: '#EA580C' },
];
const HL_W = (W - M * 2 - M * (HIGHLIGHTS.length - 1)) / HIGHLIGHTS.length;
const cardBase = {
  image: [obj({ show: b(false), imageAreaSize: l(0), padding: l(0) }, idSel())],
  outline: [obj({ show: b(false) }, idSel())],
  fillCustom: [obj({ show: b(true), transparency: d(100) }, idSel())],
  layout: [obj({ paddingUniform: l(0), topOuterMargin: l(0), bottomOuterMargin: l(0), leftOuterMargin: l(0), rightOuterMargin: l(0), alignment: s('left') }, idSel())],
  padding: [obj({ topMargin: l(0), bottomMargin: l(0), leftMargin: l(0), rightMargin: l(0) }, idSel())],
  spacing: [obj({ verticalSpacing: d(2) }, idSel())],
};
const measureProj = (m) => ({ projections: [{ field: measureRef(m), queryRef: `SalesTable.${m}`, nativeQueryRef: m }] });
HIGHLIGHTS.forEach((h, i) => {
  const x = Math.round(M + i * (HL_W + M));
  const w = Math.round(HL_W);
  writeVisual(`hl-tile-${h.key}`, panelShape(), pos(x, STRIP.y, w, STRIP.h));
  writeVisual(`hl-icon-${h.key}`, { ...imageVisual(`pb_hl_${h.key}.svg`), objects: { ...imageVisual(`pb_hl_${h.key}.svg`).objects, image: [obj({ fit: s('Fit') })] } },
    pos(x + 20, STRIP.y + 32, 48, 48));
  writeVisual(`hl-value-${h.key}`, {
    visualType: 'cardVisual',
    query: { queryState: { Data: measureProj(h.value) } },
    objects: {
      ...cardBase,
      value: [obj({ fontFamily: s('Segoe UI Semibold'), fontSize: d(16), bold: b(true), fontColor: col(C.ink), horizontalAlignment: s('left'), textWrap: b(true), showBlankAs: s('–') }, idSel())],
      label: [obj({ show: b(true), text: s(h.label), position: s('aboveValue'), fontFamily: s('Segoe UI'), fontSize: d(10.5), fontColor: col(C.muted), horizontalAlignment: s('left') }, idSel())],
    },
    visualContainerObjects: bareVCO(),
    drillFilterOtherVisuals: true,
  }, pos(x + 84, STRIP.y + 12, w - 96, 64));
  writeVisual(`hl-caption-${h.key}`, {
    visualType: 'cardVisual',
    query: { queryState: { Data: measureProj(h.caption) } },
    objects: {
      ...cardBase,
      value: [obj({ show: b(false), fontSize: d(8), transparency: d(100) }, idSel())],
      label: [obj({ show: b(false), fontSize: d(8), transparency: d(100) }, idSel())],
    },
    visualContainerObjects: {
      ...bareVCO(),
      title: [obj({ show: b(true), text: { expr: measureRef(h.caption) }, titleWrap: b(false), fontFamily: s('Segoe UI Semibold'), fontSize: d(10.5), fontColor: col(h.color), bold: b(false), alignment: s('left') })],
    },
    drillFilterOtherVisuals: true,
  }, pos(x + 84, STRIP.y + 76, w - 96, 28));
});

for (const p of P) {
  writeVisual(`panel-${p.key}`, panelShape(), pos(p.x, p.y, PANEL.w, PANEL.h));
  writeVisual(`band-${p.key}`, imageVisual(`pb_band_${p.key}.svg`), pos(p.x, p.y, PANEL.w, PANEL.band));
  writeVisual(`heading-${p.key}`, textbox([
    { textRuns: [run(p.title, '16pt', C.ink, 'Segoe UI Semibold')] },
    { textRuns: [run(p.sub, '12pt', C.muted)] },
  ]), pos(p.x + 80, p.y + 8, 820, 64));

  updateVisual(V[p.key], (v) => {
    v.position = pos(p.x + 16, p.y + PANEL.band + 8, PANEL.w - 32, PANEL.h - PANEL.band - 18);
    const isCombo = v.visual.visualType === 'lineClusteredColumnComboChart';
    const axisMax = p.key === 'category' ? 'Category Axis Max' : 'Product Axis Max';
    v.visual.objects = chartObjects(isCombo, axisMax);
    v.visual.visualContainerObjects = chartVCO();
    if (!isCombo) v.visual.query.queryState.Tooltips = tooltipMargin;
    if (p.key === 'product') {
      // Bottom 5 by margin reads best from lowest to highest margin.
      v.visual.query.sortDefinition = {
        sort: [{ field: measureRef('Profit Margin'), direction: 'Ascending' }],
        isDefaultSort: false,
      };
    }
  });
}

console.log('BUILD_OK visuals:', fs.readdirSync(VIS_DIR).length);
