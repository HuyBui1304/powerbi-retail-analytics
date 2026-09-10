// Restyles dash.Report (in .staging) to match image.png. Measures and chart bindings are kept.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const REPORT = '/Users/huybui/Desktop/Project_DA/.staging/dash.Report';
const DEF = path.join(REPORT, 'definition');
const PAGE_ID = '39c7253e5e8e20469ad0';
const PAGE_DIR = path.join(DEF, 'pages', PAGE_ID);
const VIS_DIR = path.join(PAGE_DIR, 'visuals');
const RES_DIR = path.join(REPORT, 'StaticResources', 'RegisteredResources');
const SCHEMA = 'https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.7.0/schema.json';

// ---------- palette ----------
const C = {
  page: '#EEF3FA',
  card: '#FFFFFF',
  cardBorder: '#E3EAF4',
  ink: '#0F1F3D',
  inkSoft: '#1F2A44',
  muted: '#6B7A90',
  axis: '#7A869A',
  grid: '#E9EEF5',
  revenue: '#1E3A8A',
  profit: '#4DA3F7',
  margin: '#2563EB',
  growthRev: '#60A5FA',
  growthProfit: '#1E40AF',
  headerSub: '#D3E2F7',
  body: '#334155',
};

// ---------- expression helpers ----------
const lit = (v) => ({ expr: { Literal: { Value: v } } });
const s = (v) => lit(`'${v}'`);
const d = (n) => lit(`${n}D`);
const l = (n) => lit(`${n}L`);
const b = (v) => lit(v ? 'true' : 'false');
const col = (hex) => ({ solid: { color: lit(`'${hex}'`) } });
const measureRef = (m) => ({ Measure: { Expression: { SourceRef: { Entity: 'SalesTable' } }, Property: m } });
const measureColor = (m) => ({ solid: { color: { expr: measureRef(m) } } });
const obj = (properties, selector) => (selector ? { properties, selector } : { properties });
const idSel = (id = 'default') => ({ id });
const proj = (m) => ({ field: measureRef(m), queryRef: `SalesTable.${m}`, nativeQueryRef: m });

const newId = () => crypto.randomBytes(10).toString('hex');

const ZERO_MARGIN = { topMargin: l(0), bottomMargin: l(0), leftMargin: l(0), rightMargin: l(0) };
const ZERO_LAYOUT = { paddingUniform: l(0), topOuterMargin: l(0), bottomOuterMargin: l(0), leftOuterMargin: l(0), rightOuterMargin: l(0), alignment: s('left') };

// Transparent container: no background, border, padding, title, header, shadow.
const bareVCO = () => ({
  background: [obj({ show: b(false) })],
  border: [obj({ show: b(false) })],
  dropShadow: [obj({ show: b(false) })],
  title: [obj({ show: b(false) })],
  visualHeader: [obj({ show: b(false) })],
  padding: [obj({ top: d(0), bottom: d(0), left: d(0), right: d(0) })],
});

// White rounded panel with soft shadow, used by the charts.
const panelVCO = (title, subtitle) => ({
  background: [obj({ show: b(true), color: col(C.card), transparency: d(0) })],
  border: [obj({ show: b(true), color: col(C.cardBorder), radius: d(14), width: d(1) })],
  dropShadow: [obj({
    show: b(true), color: col('#1E3A8A'), transparency: d(92), position: s('Outer'),
    preset: s('Custom'), shadowBlur: d(18), shadowDistance: d(4), shadowSpread: d(0), angle: d(90),
  })],
  padding: [obj({ top: d(12), bottom: d(8), left: d(16), right: d(16) })],
  title: [obj({
    show: b(true), text: s(title), fontFamily: s('Segoe UI Semibold'), fontSize: d(14),
    bold: b(false), fontColor: col(C.ink), alignment: s('left'),
  })],
  subTitle: [obj({
    show: b(true), text: s(subtitle), fontFamily: s('Segoe UI'), fontSize: d(10.5),
    fontColor: col(C.muted), alignment: s('left'),
  })],
  spacing: [obj({ customizeSpacing: b(true), spaceBelowSubTitle: d(4) })],
  visualHeader: [obj({ show: b(true), transparency: d(0), background: col(C.card), foreground: col(C.muted), border: col(C.card) })],
});

const writeVisual = (name, visual, position) => {
  const dir = path.join(VIS_DIR, name);
  fs.mkdirSync(dir, { recursive: true });
  const json = { $schema: SCHEMA, name, position, visual };
  fs.writeFileSync(path.join(dir, 'visual.json'), JSON.stringify(json, null, 2) + '\n');
};
const readVisual = (name) => JSON.parse(fs.readFileSync(path.join(VIS_DIR, name, 'visual.json'), 'utf8'));
const updateVisual = (name, fn) => {
  const file = path.join(VIS_DIR, name, 'visual.json');
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  fn(json);
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n');
};

let z = 0;
let tab = 0;
const pos = (x, y, width, height) => ({ x, y, z: (z += 100), height, width, tabOrder: (tab += 100) });

// ---------- SVG icons ----------
const svg = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
const circleIcon = (id, top, bottom, glyph) =>
  svg(48, 48, `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs><circle cx="24" cy="24" r="24" fill="url(#${id})"/>${glyph}`);

const coinLayers = [23, 17, 11]
  .map((y) => `<path d="M15 ${y} v5 a9 3.2 0 0 0 18 0 v-5 z" fill="#fff" stroke="#3DB887" stroke-width="1"/>`)
  .join('');

const ICONS = {
  'icon_header.svg': svg(1248, 84, [
    '<defs>',
    '<linearGradient id="hg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1B3A73"/><stop offset="1" stop-color="#2D5FA6"/></linearGradient>',
    '<linearGradient id="hi" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#55A8FF"/><stop offset="1" stop-color="#2F7BEA"/></linearGradient>',
    '<clipPath id="hc"><rect width="1248" height="84" rx="14"/></clipPath>',
    '</defs>',
    '<g clip-path="url(#hc)">',
    '<rect width="1248" height="84" fill="url(#hg)"/>',
    '<rect x="668" width="580" height="84" fill="#FFFFFF" fill-opacity="0.06"/>',
    '<circle cx="1190" cy="-40" r="130" fill="#FFFFFF" fill-opacity="0.04"/>',
    '</g>',
    '<rect x="20" y="16" width="52" height="52" rx="12" fill="url(#hi)"/>',
    '<rect x="32" y="41" width="7" height="15" rx="2" fill="#fff"/>',
    '<rect x="43" y="34" width="7" height="22" rx="2" fill="#fff"/>',
    '<rect x="54" y="27" width="7" height="29" rx="2" fill="#fff"/>',
    '<rect x="1024" y="18" width="1" height="48" fill="#FFFFFF" fill-opacity="0.28"/>',
    '<g fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
    '<rect x="1042" y="29" width="28" height="26" rx="4"/><line x1="1042" y1="37" x2="1070" y2="37"/>',
    '<line x1="1049" y1="25" x2="1049" y2="32"/><line x1="1063" y1="25" x2="1063" y2="32"/>',
    '</g>',
    '<g fill="#fff">',
    [1049, 1056, 1063].map((cx) => [43, 49].map((cy) => `<circle cx="${cx}" cy="${cy}" r="1.6"/>`).join('')).join(''),
    '</g>',
  ].join('')),
  'icon_revenue.svg': circleIcon('g1', '#6CBBFF', '#3A8EF0',
    '<path d="M20 12.5h8l-2.2 4.2h-3.6z" fill="#fff"/>' +
    '<path d="M24 17.5c-6.2 0-10 6.4-10 11.2 0 4 2.9 6.3 10 6.3s10-2.3 10-6.3c0-4.8-3.8-11.2-10-11.2z" fill="#fff"/>' +
    '<text x="24" y="32.6" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="11" font-weight="700" fill="#3A8EF0">$</text>'),
  'icon_profit.svg': circleIcon('g2', '#74D8AE', '#3DB887',
    coinLayers + '<ellipse cx="24" cy="11" rx="9" ry="3.2" fill="#fff" stroke="#3DB887" stroke-width="1"/>'),
  'icon_quantity.svg': circleIcon('g3', '#8F88F7', '#5B50E0',
    '<path d="M17.2 18.5H35.5l-3 9H19.6z" fill="#fff"/>' +
    '<path d="M11.5 14h4l3.4 13.5h13.6" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<circle cx="21" cy="32.5" r="2.3" fill="#fff"/><circle cx="31" cy="32.5" r="2.3" fill="#fff"/>'),
  'icon_margin.svg': circleIcon('g4', '#FFC857', '#F59E0B',
    '<g fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round">' +
    '<circle cx="18" cy="18" r="3.6"/><circle cx="30" cy="30" r="3.6"/><line x1="31.5" y1="15" x2="16.5" y2="33"/></g>'),
  'icon_bulb.svg': svg(44, 44,
    '<circle cx="22" cy="22" r="22" fill="#E6F0FE"/>' +
    '<g fill="none" stroke="#2F6FDE" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M22 11.5a7.2 7.2 0 0 0-4.2 13.1c.8.6 1.3 1.5 1.3 2.5v.9h5.8v-.9c0-1 .5-1.9 1.3-2.5A7.2 7.2 0 0 0 22 11.5z"/>' +
    '<path d="M19.4 31.5h5.2"/></g>'),
};
for (const n of [1, 2, 3]) {
  ICONS[`icon_num${n}.svg`] = svg(30, 30,
    `<circle cx="15" cy="15" r="15" fill="#E3EEFD"/><text x="15" y="20" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="14" font-weight="700" fill="#2F6FDE">${n}</text>`);
}

fs.mkdirSync(RES_DIR, { recursive: true });
for (const [file, content] of Object.entries(ICONS)) fs.writeFileSync(path.join(RES_DIR, file), content);

// Register icons in report.json
const reportFile = path.join(DEF, 'report.json');
const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
let reg = report.resourcePackages.find((p) => p.name === 'RegisteredResources');
if (!reg) {
  reg = { name: 'RegisteredResources', type: 'RegisteredResources', items: [] };
  report.resourcePackages.push(reg);
}
for (const file of Object.keys(ICONS)) {
  if (!reg.items.some((i) => i.name === file)) reg.items.push({ name: file, path: file, type: 'Image' });
}
fs.writeFileSync(reportFile, JSON.stringify(report, null, 2) + '\n');

const imageVisual = (file, alt) => ({
  visualType: 'image',
  objects: {
    general: [obj({
      imageUrl: { expr: { ResourcePackageItem: { PackageName: 'RegisteredResources', PackageType: 1, ItemName: file } } },
    })],
    image: [obj({ fit: s('Fit') })],
  },
  visualContainerObjects: bareVCO(),
  drillFilterOtherVisuals: true,
});

// ---------- page ----------
const pageFile = path.join(PAGE_DIR, 'page.json');
const page = JSON.parse(fs.readFileSync(pageFile, 'utf8'));
page.objects.background = [obj({ color: col(C.page), transparency: d(0) })];
page.objects.outspace = [obj({ color: col(C.page), transparency: d(0) })];
fs.writeFileSync(pageFile, JSON.stringify(page, null, 2) + '\n');

// ---------- existing visual ids ----------
const V = {
  header: 'baba455f23a4b90b09de',
  title: '5e14102f8400bac0ba63',
  slicer: 'b728dc0ea339203795ad',
  cardRevenue: 'c7fbf2af18b369345241',
  cardProfit: '1e90f7b11d47b99a9341',
  cardQuantity: '20cd4400b9cd2708864e',
  cardMargin: '147e6c2488351a567575',
  trend: '673149e69065ee7de8e3',
  growth: 'e3427013e0d30de7a55a',
  margin: 'f366723d323e30e7a84d',
};

// Old header rectangle is replaced by the gradient header image.
fs.rmSync(path.join(VIS_DIR, V.header), { recursive: true, force: true });

// ---------- header ----------
const HX = 16, HY = 12;
writeVisual(newId(), imageVisual('icon_header.svg', 'Header background'), pos(HX, HY, 1248, 84));

updateVisual(V.title, (v) => {
  v.position = pos(100, 20, 560, 68);
  v.visual.objects.general = [obj({
    paragraphs: [
      { textRuns: [{ value: 'Revenue & Profit Overview', textStyle: { fontFamily: 'Segoe UI Semibold', fontSize: '20pt', color: '#FFFFFF' } }] },
      { textRuns: [{ value: 'Track business performance and profitability over time', textStyle: { fontFamily: 'Segoe UI', fontSize: '11pt', color: C.headerSub } }] },
    ],
  })];
  v.visual.visualContainerObjects = bareVCO();
});

const textbox = (text, size, color, family = 'Segoe UI') => ({
  visualType: 'textbox',
  objects: {
    general: [obj({ paragraphs: [{ textRuns: [{ value: text, textStyle: { fontFamily: family, fontSize: size, color } }] }] })],
  },
  visualContainerObjects: bareVCO(),
  drillFilterOtherVisuals: true,
});
writeVisual(newId(), textbox('Quarter', '10.5pt', '#FFFFFF', 'Segoe UI Semibold'), pos(662, 14, 120, 24));

// Quarter button slicer: DateTable[Quarter] gives Q1..Q4 labels; no saved selection (= All).
updateVisual(V.slicer, (v) => {
  v.position = pos(660, 38, 362, 56);
  v.visual.query = {
    queryState: {
      Values: {
        projections: [{
          field: { Column: { Expression: { SourceRef: { Entity: 'DateTable' } }, Property: 'Quarter' } },
          queryRef: 'DateTable.Quarter',
          nativeQueryRef: 'Quarter',
        }],
      },
    },
  };
  const state = (id, props) => obj(props, idSel(id));
  v.visual.objects = {
    selection: [obj({ selectAllCheckboxEnabled: b(true), strictSingleSelect: b(false), singleSelect: b(false) })],
    layout: [obj({ rowCount: l(1), columnCount: l(5), maxTiles: l(5), autoGrid: b(false), cellPadding: l(6) })],
    shapeCustomRectangle: [state('default', { tileShape: s('rectangleRoundedByPixel'), rectangleRoundedCurve: l(8) })],
    value: [
      state('default', { fontFamily: s('Segoe UI Semibold'), fontSize: d(10), fontColor: col('#FFFFFF'), horizontalAlignment: s('center') }),
      state('selection:selected', { fontColor: col(C.revenue) }),
    ],
    label: [state('default', { show: b(false) })],
    fillCustom: [
      state('default', { show: b(true), fillColor: col('#FFFFFF'), transparency: d(90) }),
      state('interaction:hover', { fillColor: col('#FFFFFF'), transparency: d(78) }),
      state('interaction:press', { fillColor: col('#FFFFFF'), transparency: d(70) }),
      state('selection:selected', { fillColor: col('#FFFFFF'), transparency: d(0) }),
    ],
    outline: [
      state('default', { show: b(true), lineColor: col('#FFFFFF'), transparency: d(55), weight: d(1) }),
      state('interaction:hover', { lineColor: col('#FFFFFF'), transparency: d(30) }),
      state('selection:selected', { show: b(false) }),
    ],
    padding: [state('default', { topMargin: l(4), bottomMargin: l(4), leftMargin: l(2), rightMargin: l(2) })],
  };
  if (process.env.TEST_Q) {
    v.visual.objects.general = [obj({ filter: { filter: {
      Version: 2,
      From: [{ Name: 'd', Entity: 'DateTable', Type: 0 }],
      Where: [{ Condition: { In: {
        Expressions: [{ Column: { Expression: { SourceRef: { Source: 'd' } }, Property: 'Quarter' } }],
        Values: [[{ Literal: { Value: `'${process.env.TEST_Q}'` } }]],
      } } }],
    } } })];
  }
  v.visual.visualContainerObjects = bareVCO();
});

// Period (dynamic label) on the right of the header.
writeVisual(newId(), {
  visualType: 'cardVisual',
  query: { queryState: { Data: { projections: [proj('Period Label')] } } },
  objects: {
    value: [obj({ fontFamily: s('Segoe UI Semibold'), fontSize: d(11), fontColor: col('#FFFFFF'), horizontalAlignment: s('left'), bold: b(false) }, idSel())],
    image: [obj({ show: b(false), imageAreaSize: l(0), padding: l(0) }, idSel())],
    label: [obj({ show: b(true), text: s('Period'), position: s('aboveValue'), fontFamily: s('Segoe UI'), fontSize: d(10), fontColor: col(C.headerSub), horizontalAlignment: s('left') }, idSel())],
    outline: [obj({ show: b(false) }, idSel())],
    fillCustom: [obj({ show: b(true), transparency: d(100) }, idSel())],
    layout: [obj(ZERO_LAYOUT, idSel())],
    padding: [obj(ZERO_MARGIN, idSel())],
    spacing: [obj({ verticalSpacing: d(2) }, idSel())],
  },
  visualContainerObjects: bareVCO(),
  drillFilterOtherVisuals: true,
}, pos(1094, 22, 168, 64));

// ---------- KPI tiles ----------
const tileShape = (fill = C.card) => ({
  visualType: 'shape',
  objects: {
    shape: [obj({ tileShape: s('rectangleRoundedByPixel'), rectangleRoundedCurve: l(14) }, idSel())],
    fill: [obj({ show: b(true) }), obj({ fillColor: col(fill), transparency: d(0) }, idSel())],
    outline: [obj({ show: b(true), lineColor: col(C.cardBorder), weight: d(1), transparency: d(0) }, idSel())],
    shadow: [obj({ show: b(true), color: col('#1E3A8A'), transparency: d(92), shadowBlur: d(18), shadowDistance: d(4), shadowPositionPreset: s('bottom') })],
    text: [obj({ show: b(false) })],
  },
  visualContainerObjects: bareVCO(),
  drillFilterOtherVisuals: true,
});

const cardObjects = (extra) => ({
  image: [obj({ show: b(false), imageAreaSize: l(0), padding: l(0) }, idSel())],
  outline: [obj({ show: b(false) }, idSel())],
  fillCustom: [obj({ show: b(true), transparency: d(100) }, idSel())],
  layout: [obj(ZERO_LAYOUT, idSel())],
  padding: [obj(ZERO_MARGIN, idSel())],
  spacing: [obj({ verticalSpacing: d(2) }, idSel())],
  ...extra,
});

const KPIS = [
  { id: V.cardRevenue, title: 'Total Revenue', icon: 'icon_revenue.svg', delta: 'Revenue vs PP %', color: 'Revenue Delta Color' },
  { id: V.cardProfit, title: 'Total Profit', icon: 'icon_profit.svg', delta: 'Profit vs PP %', color: 'Profit Delta Color' },
  { id: V.cardQuantity, title: 'Total Quantity', icon: 'icon_quantity.svg', delta: 'Quantity vs PP %', color: 'Quantity Delta Color' },
  { id: V.cardMargin, title: 'Profit Margin', icon: 'icon_margin.svg', delta: 'Margin vs PP (pp)', color: 'Margin Delta Color' },
];
const TILE = { x: 16, y: 108, w: 232, h: 141, gap: 12 };

KPIS.forEach((k, i) => {
  const ty = TILE.y + i * (TILE.h + TILE.gap);
  writeVisual(newId(), tileShape(), pos(TILE.x, ty, TILE.w, TILE.h));
  writeVisual(newId(), imageVisual(k.icon, `${k.title} icon`), pos(TILE.x + 14, ty + 20, 42, 42));

  updateVisual(k.id, (v) => {
    v.position = pos(TILE.x + 66, ty + 14, TILE.w - 74, 70);
    delete v.visual.query.sortDefinition;
    const valueProps = {
      fontFamily: s('Segoe UI Semibold'), fontSize: d(19), bold: b(true), fontColor: col(C.ink),
      horizontalAlignment: s('left'),
    };
    v.visual.objects = cardObjects({
      value: [obj(valueProps, idSel())],
      label: [obj({
        show: b(true), text: s(k.title), position: s('aboveValue'), fontFamily: s('Segoe UI Semibold'),
        fontSize: d(11), fontColor: col(C.inkSoft), horizontalAlignment: s('left'),
      }, idSel())],
    });
    v.visual.visualContainerObjects = bareVCO();
  });

  writeVisual(newId(), {
    visualType: 'cardVisual',
    query: { queryState: { Data: { projections: [proj(k.delta)] } } },
    objects: cardObjects({
      value: [obj({
        fontFamily: s('Segoe UI Semibold'), fontSize: d(11), bold: b(true), fontColor: measureColor(k.color),
        horizontalAlignment: s('left'), showBlankAs: s('N/A'),
      }, idSel())],
      label: [obj({
        show: b(true), text: s('vs. previous period'), position: s('belowValue'), fontFamily: s('Segoe UI'),
        fontSize: d(9), fontColor: col(C.axis), horizontalAlignment: s('left'),
      }, idSel())],
    }),
    visualContainerObjects: bareVCO(),
    drillFilterOtherVisuals: true,
  }, pos(TILE.x + 66, ty + 84, TILE.w - 74, 46));
});

// ---------- charts ----------
const axisProps = { fontFamily: s('Segoe UI'), fontSize: d(9), labelColor: col(C.axis), showAxisTitle: b(false) };
const legend = (extra = {}) => [obj({
  show: b(true), position: s('TopRight'), fontFamily: s('Segoe UI'), fontSize: d(9),
  labelColor: col('#4A5568'), showTitle: b(false), ...extra,
})];
const lineLegend = () => legend({ legendMarkerRendering: s('markerOnly') });
const valueAxis = (extra = {}) => [obj({
  ...axisProps, gridlineShow: b(true), gridlineColor: col(C.grid), gridlineThickness: d(1), gridlineStyle: s('solid'), ...extra,
})];
const categoryAxis = (extra = {}) => [obj({ ...axisProps, gridlineShow: b(false), ...extra })];
const dateCol = (c, active) => ({
  field: { Column: { Expression: { SourceRef: { Entity: 'DateTable' } }, Property: c } },
  queryRef: `DateTable.${c}`, nativeQueryRef: c, active,
});
const seriesFill = (m, hex) => obj({ fill: col(hex) }, { metadata: `SalesTable.${m}` });

updateVisual(V.trend, (v) => {
  v.position = pos(260, 108, 1004, 222);
  // Legend order matches the reference: revenue first.
  const y = v.visual.query.queryState.Y.projections;
  y.sort((a, c) => (a.nativeQueryRef === 'Total Revenue' ? -1 : c.nativeQueryRef === 'Total Revenue' ? 1 : 0));
  v.visual.objects = {
    legend: lineLegend(),
    categoryAxis: categoryAxis(),
    valueAxis: valueAxis({ labelDisplayUnits: s('1000000') }),
    lineStyles: [
      obj({ strokeWidth: d(2.5), lineChartType: s('smooth'), showMarker: b(true), markerShape: s('circle'), markerSize: d(4), areaShow: b(true), areaMatchStrokeColor: b(false), areaColor: col('#DCE7F8') }),
    ],
    dataPoint: [seriesFill('Total Revenue', C.revenue), seriesFill('Total Profit', C.profit)],
  };
  v.visual.visualContainerObjects = panelVCO('Revenue & Profit Trend', 'by Month');
});

updateVisual(V.margin, (v) => {
  v.position = pos(260, 342, 492, 246);
  v.visual.query.queryState.Category.projections = [dateCol('Quarter', true), dateCol('Month', true)];
  v.visual.objects = {
    legend: lineLegend(),
    categoryAxis: categoryAxis({ concatenateLabels: b(false) }),
    valueAxis: valueAxis(),
    lineStyles: [obj({ strokeWidth: d(2.5), lineChartType: s('smooth'), showMarker: b(true), markerShape: s('circle'), markerSize: d(4) })],
    dataPoint: [obj({ defaultColor: col(C.margin) })],
  };
  v.visual.visualContainerObjects = panelVCO('Profit Margin Trend', 'by Quarter and Month');
});

updateVisual(V.growth, (v) => {
  v.position = pos(764, 342, 500, 246);
  v.visual.query.queryState.Category.projections = [dateCol('Quarter', false), dateCol('Month', true)];
  v.visual.objects = {
    legend: legend(),
    categoryAxis: categoryAxis(),
    valueAxis: valueAxis(),
    labels: [obj({ show: b(false) })],
    layout: [obj({ clusteredGapSize: d(25) })],
    dataPoint: [
      obj({ borderShow: b(false), fillTransparency: d(0) }),
      seriesFill('MoM Revenue Growth', C.growthRev),
      seriesFill('MoM Profit Growth', C.growthProfit),
    ],
  };
  v.visual.visualContainerObjects = panelVCO('Monthly Revenue & Profit Growth', 'by Month');
});

// ---------- key takeaways ----------
const KT = { x: 260, y: 600, w: 1004, h: 108 };
writeVisual(newId(), tileShape(), pos(KT.x, KT.y, KT.w, KT.h));
writeVisual(newId(), imageVisual('icon_bulb.svg', 'Key takeaways icon'), pos(KT.x + 18, KT.y + 32, 44, 44));
writeVisual(newId(), textbox('Key Takeaways', '13pt', C.ink, 'Segoe UI Semibold'), pos(KT.x + 70, KT.y + 40, 130, 30));
writeVisual(newId(), {
  visualType: 'shape',
  objects: {
    shape: [obj({ tileShape: s('rectangle') }, idSel())],
    fill: [obj({ show: b(true) }), obj({ fillColor: col('#E2E8F0'), transparency: d(0) }, idSel())],
    outline: [obj({ show: b(false) }, idSel())],
    text: [obj({ show: b(false) })],
  },
  visualContainerObjects: bareVCO(),
  drillFilterOtherVisuals: true,
}, pos(KT.x + 206, KT.y + 22, 1, 64));

const TAKEAWAYS = ['Takeaway Revenue', 'Takeaway Margin', 'Takeaway Growth'];
const colW = (KT.x + KT.w - 16 - (KT.x + 222)) / 3;
TAKEAWAYS.forEach((m, i) => {
  const x0 = KT.x + 222 + i * colW;
  writeVisual(newId(), imageVisual(`icon_num${i + 1}.svg`, `Takeaway ${i + 1}`), pos(Math.round(x0), KT.y + 20, 30, 30));
  writeVisual(newId(), {
    visualType: 'cardVisual',
    query: { queryState: { Data: { projections: [proj(m)] } } },
    objects: cardObjects({
      value: [obj({ show: b(false), fontSize: d(8), transparency: d(100) }, idSel())],
      label: [obj({ show: b(false), fontSize: d(8), transparency: d(100) }, idSel())],
    }),
    visualContainerObjects: {
      ...bareVCO(),
      title: [obj({
        show: b(true), text: { expr: measureRef(m) }, titleWrap: b(true), fontFamily: s('Segoe UI'),
        fontSize: d(9.5), fontColor: col(C.body), bold: b(false), alignment: s('left'),
      })],
    },
    drillFilterOtherVisuals: true,
  }, pos(Math.round(x0 + 40), KT.y + 12, Math.round(colW - 46), 90));
});

console.log('BUILD_OK visuals:', fs.readdirSync(VIS_DIR).length);
