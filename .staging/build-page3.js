// Builds the "Profitability Analysis" page (in .staging) from the user's draft page, following image.png.
// The user's six visuals (4 KPI cards, 2 combo charts) are restyled; filters, product scatter + table,
// section panels and insight lines are added.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const REPORT = '/Users/huybui/Desktop/Project_DA/.staging/dash.Report';
const DEF = path.join(REPORT, 'definition');
const PAGE_ID = 'e1c11a5647d07aa97b2a';
const VIS_DIR = path.join(DEF, 'pages', PAGE_ID, 'visuals');
const RES_DIR = path.join(REPORT, 'StaticResources', 'RegisteredResources');
const SCHEMA = 'https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.7.0/schema.json';

const C = {
  page: '#F3F6FB', card: '#FFFFFF', border: '#E3EAF4', ink: '#0F2A5F', text: '#1F2A44', muted: '#5B6B85',
  axis: '#7A869A', grid: '#E9EEF5', blue: '#1A8CFF', navy: '#13267A', icon: '#1E6FE0', headerFill: '#F1F5FB',
  red: '#DC2626', green: '#10B981', grey: '#94A3B8',
};

// ---------- helpers ----------
const lit = (v) => ({ expr: { Literal: { Value: v } } });
const s = (v) => lit(`'${v}'`);
const d = (n) => lit(`${n}D`);
const l = (n) => lit(`${n}L`);
const b = (v) => lit(v ? 'true' : 'false');
const col = (hex) => ({ solid: { color: lit(`'${hex}'`) } });
const measureRef = (m) => ({ Measure: { Expression: { SourceRef: { Entity: 'SalesTable' } }, Property: m } });
const columnRef = (t, c) => ({ Column: { Expression: { SourceRef: { Entity: t } }, Property: c } });
const mproj = (m, displayName) => ({ field: measureRef(m), queryRef: `SalesTable.${m}`, nativeQueryRef: m, ...(displayName ? { displayName } : {}) });
const cproj = (t, c, displayName) => ({ field: columnRef(t, c), queryRef: `${t}.${c}`, nativeQueryRef: c, ...(displayName ? { displayName } : {}) });
const obj = (properties, selector) => (selector ? { properties, selector } : { properties });
const idSel = (id = 'default') => ({ id });
const series = (m) => ({ metadata: `SalesTable.${m}` });
const stableId = (key) => crypto.createHash('sha1').update(`profitability:${key}`).digest('hex').slice(0, 20);

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
  fs.mkdirSync(path.join(VIS_DIR, name), { recursive: true });
  fs.writeFileSync(path.join(VIS_DIR, name, 'visual.json'), JSON.stringify({ $schema: SCHEMA, name, position, visual }, null, 2) + '\n');
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

// ---------- SVG icons ----------
const svg = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
const kpiIcon = (glyph) => svg(64, 64, `<circle cx="32" cy="32" r="32" fill="#E8F1FE"/><g fill="none" stroke="${C.icon}" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round">${glyph}</g>`);
const ICONS = {
  'pa_margin.svg': kpiIcon('<ellipse cx="32" cy="20" rx="12" ry="4.2"/><path d="M20 20v7c0 2.3 5.4 4.2 12 4.2s12-1.9 12-4.2v-7"/><path d="M20 27v7c0 2.3 5.4 4.2 12 4.2s12-1.9 12-4.2v-7"/><path d="M20 34v7c0 2.3 5.4 4.2 12 4.2s12-1.9 12-4.2v-7"/>'),
  'pa_discount.svg': kpiIcon('<path d="M18 18h15l14 14-15 15-14-14z"/><circle cx="25.5" cy="25.5" r="2.8"/>'),
  'pa_return.svg': kpiIcon('<path d="M32 16l15 7.5v17L32 48l-15-7.5v-17z"/><path d="M17 23.5l15 7.5 15-7.5M32 31v17"/>'),
  'pa_cost.svg': kpiIcon('<circle cx="32" cy="32" r="6.5"/><circle cx="32" cy="32" r="12.5"/><path d="M32 15v4.5M32 44.5V49M15 32h4.5M44.5 32H49M20 20l3.2 3.2M40.8 40.8l3.2 3.2M20 44l3.2-3.2M40.8 23.2l3.2-3.2"/>'),
  'pa_bars.svg': svg(28, 28, `<g fill="${C.icon}"><rect x="3" y="15" width="5" height="10" rx="1.2"/><rect x="11.5" y="9" width="5" height="16" rx="1.2"/><rect x="20" y="3" width="5" height="22" rx="1.2"/></g>`),
  'pa_calendar.svg': svg(36, 36, `<g fill="none" stroke="${C.icon}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="7" width="28" height="25" rx="4"/><path d="M4 15h28M11 3v7M25 3v7"/></g><g fill="${C.icon}"><circle cx="11" cy="21" r="1.8"/><circle cx="18" cy="21" r="1.8"/><circle cx="25" cy="21" r="1.8"/><circle cx="11" cy="27" r="1.8"/><circle cx="18" cy="27" r="1.8"/></g>`),
};
fs.mkdirSync(RES_DIR, { recursive: true });
for (const [file, content] of Object.entries(ICONS)) fs.writeFileSync(path.join(RES_DIR, file), content);
const reportFile = path.join(DEF, 'report.json');
const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
let reg = report.resourcePackages.find((p) => p.name === 'RegisteredResources');
if (!reg) { reg = { name: 'RegisteredResources', type: 'RegisteredResources', items: [] }; report.resourcePackages.push(reg); }
for (const file of Object.keys(ICONS)) if (!reg.items.some((i) => i.name === file)) reg.items.push({ name: file, path: file, type: 'Image' });
fs.writeFileSync(reportFile, JSON.stringify(report, null, 2) + '\n');

const image = (file) => ({
  visualType: 'image',
  objects: {
    general: [obj({ imageUrl: { expr: { ResourcePackageItem: { PackageName: 'RegisteredResources', PackageType: 1, ItemName: file } } } })],
    image: [obj({ fit: s('Fit') })],
  },
  visualContainerObjects: bareVCO(),
  drillFilterOtherVisuals: true,
});
const run = (value, fontSize, color, fontFamily = 'Segoe UI', extra = {}) => ({ value, textStyle: { fontFamily, fontSize, color, ...extra } });
const textbox = (paragraphs) => ({ visualType: 'textbox', objects: { general: [obj({ paragraphs })] }, visualContainerObjects: bareVCO(), drillFilterOtherVisuals: true });
const panel = (fill = C.card, shadow = true) => ({
  visualType: 'shape',
  objects: {
    shape: [obj({ tileShape: s('rectangleRoundedByPixel'), rectangleRoundedCurve: l(12) }, idSel())],
    fill: [obj({ show: b(true) }), obj({ fillColor: col(fill), transparency: d(0) }, idSel())],
    outline: [obj({ show: b(true), lineColor: col(C.border), weight: d(1), transparency: d(0) }, idSel())],
    shadow: [obj({ show: b(shadow), color: col('#1E3A8A'), transparency: d(93), shadowBlur: d(16), shadowDistance: d(3), shadowPositionPreset: s('bottom') })],
    text: [obj({ show: b(false) })],
  },
  visualContainerObjects: bareVCO(),
  drillFilterOtherVisuals: true,
});
const cardBase = {
  image: [obj({ show: b(false), imageAreaSize: l(0), padding: l(0) }, idSel())],
  outline: [obj({ show: b(false) }, idSel())],
  fillCustom: [obj({ show: b(true), transparency: d(100) }, idSel())],
  layout: [obj({ paddingUniform: l(0), topOuterMargin: l(0), bottomOuterMargin: l(0), leftOuterMargin: l(0), rightOuterMargin: l(0), alignment: s('left') }, idSel())],
  padding: [obj({ topMargin: l(0), bottomMargin: l(0), leftMargin: l(0), rightMargin: l(0) }, idSel())],
  spacing: [obj({ verticalSpacing: d(2) }, idSel())],
};
// Card whose visual title is bound to a text measure (wraps, unlike the callout).
const measureTitleCard = (m, fontSize, color, family = 'Segoe UI', wrap = true) => ({
  visualType: 'cardVisual',
  query: { queryState: { Data: { projections: [mproj(m)] } } },
  objects: {
    ...cardBase,
    value: [obj({ show: b(false), fontSize: d(8), transparency: d(100) }, idSel())],
    label: [obj({ show: b(false), fontSize: d(8), transparency: d(100) }, idSel())],
  },
  visualContainerObjects: {
    ...bareVCO(),
    title: [obj({ show: b(true), text: { expr: measureRef(m) }, titleWrap: b(wrap), fontFamily: s(family), fontSize: d(fontSize), fontColor: col(color), bold: b(false), alignment: s('left') })],
  },
  drillFilterOtherVisuals: true,
});

// ---------- page ----------
const pageFile = path.join(DEF, 'pages', PAGE_ID, 'page.json');
const page = JSON.parse(fs.readFileSync(pageFile, 'utf8'));
page.objects = { ...(page.objects || {}), background: [obj({ color: col(C.page), transparency: d(0) })], outspace: [obj({ color: col(C.page), transparency: d(0) })] };
fs.writeFileSync(pageFile, JSON.stringify(page, null, 2) + '\n');

// ---------- header ----------
writeVisual('title', textbox([
  { textRuns: [run('Profitability Analysis', '28pt', C.ink, 'Segoe UI Semibold')] },
  { textRuns: [run('Understand what drives profit margin and identify areas for improvement', '13pt', C.muted)] },
]), pos(32, 10, 1000, 86));
writeVisual('brand-icon', image('pa_bars.svg'), pos(1566, 30, 26, 26));
writeVisual('brand', textbox([{ textRuns: [run('Retail Sales Dashboard', '12pt', C.text), run('    |    Page 3 of 3', '12pt', C.muted)], horizontalTextAlignment: 'right' }]), pos(1596, 26, 300, 36));

// ---------- filter row ----------
const FY = 104;
const FH = 64;
const dropdown = (entity, column) => ({
  visualType: 'slicer',
  query: { queryState: { Values: { projections: [cproj(entity, column)] } } },
  objects: {
    data: [obj({ mode: s('Dropdown') })],
    selection: [obj({ selectAllCheckboxEnabled: b(true), singleSelect: b(false), strictSingleSelect: b(false) })],
    header: [obj({ show: b(false) })],
    items: [obj({ fontFamily: s('Segoe UI'), textSize: d(11), fontColor: col(C.text), background: col(C.card) })],
  },
  visualContainerObjects: {
    ...bareVCO(),
    border: [obj({ show: b(true), color: col('#D5DEEA'), radius: d(6), width: d(1) })],
    padding: [obj({ top: d(4), bottom: d(4), left: d(8), right: d(4) })],
  },
  drillFilterOtherVisuals: true,
});
const FILTERS = [
  { key: 'quarter', label: 'Quarter', entity: 'DateTable', column: 'Quarter', x: 24, w: 400, lw: 96 },
  { key: 'month', label: 'Month', entity: 'DateTable', column: 'Month', x: 440, w: 400, lw: 96 },
  { key: 'channel', label: 'Sales Channel', entity: 'SalesTable', column: 'Sales_Channel', x: 856, w: 440, lw: 126 },
];
for (const f of FILTERS) {
  writeVisual(`fbox-${f.key}`, panel(C.card, false), pos(f.x, FY, f.w, FH));
  writeVisual(`flabel-${f.key}`, textbox([{ textRuns: [run(f.label, '12pt', C.text, 'Segoe UI Semibold')] }]), pos(f.x + 20, FY + 18, f.lw, 28));
  writeVisual(`fslicer-${f.key}`, dropdown(f.entity, f.column), pos(f.x + 20 + f.lw, FY + 8, f.w - f.lw - 36, 48));
}
writeVisual('reset', {
  visualType: 'actionButton',
  objects: {
    icon: [obj({ show: b(true), shapeType: s('reset'), lineColor: col(C.icon), lineTransparency: d(0), lineWeight: l(2), placement: s('left'), iconSize: d(18), leftMargin: l(28), rightMargin: l(6), verticalAlignment: s('middle') }, idSel())],
    shape: [obj({ tileShape: s('rectangleRoundedByPixel'), rectangleRoundedCurve: l(10) })],
    text: [obj({ show: b(true), text: s('Reset Filters'), fontFamily: s('Segoe UI Semibold'), fontSize: d(12), fontColor: col(C.text), horizontalAlignment: s('center'), verticalAlignment: s('middle') }, idSel())],
    fill: [obj({ show: b(true), fillColor: col('#EAF2FD'), transparency: d(0) }, idSel()), obj({ fillColor: col('#DCE9FC') }, idSel('hover'))],
    outline: [obj({ show: b(true), lineColor: col('#CFE0F7'), weight: d(1), transparency: d(0) }, idSel())],
  },
  visualContainerObjects: {
    ...bareVCO(),
    border: [obj({ show: b(false), radius: d(12) })],
    visualLink: [obj({ show: b(true), type: s('ClearAllSlicers'), tooltip: s('Clear all slicers on this page') })],
  },
  drillFilterOtherVisuals: true,
}, pos(1312, FY, 252, FH));
writeVisual('period-box', panel(C.headerFill, false), pos(1580, FY, 316, FH));
writeVisual('period-icon', image('pa_calendar.svg'), pos(1600, FY + 14, 36, 36));
writeVisual('period', {
  visualType: 'cardVisual',
  query: { queryState: { Data: { projections: [mproj('Period Label')] } } },
  objects: {
    ...cardBase,
    value: [obj({ fontFamily: s('Segoe UI Semibold'), fontSize: d(13), bold: b(false), fontColor: col(C.text), horizontalAlignment: s('left') }, idSel())],
    label: [obj({ show: b(true), text: s('Data Period'), position: s('aboveValue'), fontFamily: s('Segoe UI'), fontSize: d(11), fontColor: col(C.muted), horizontalAlignment: s('left') }, idSel())],
  },
  visualContainerObjects: bareVCO(),
  drillFilterOtherVisuals: true,
}, pos(1648, FY + 8, 240, 50));

// ---------- section helpers ----------
const sectionTitle = (key, num, title, sub, x, y, w) => writeVisual(`stitle-${key}`, textbox([{
  textRuns: [run(`${num}. ${title}`, '16pt', C.ink, 'Segoe UI Semibold'), ...(sub ? [run(`    ${sub}`, '12pt', C.muted)] : [])],
}]), pos(x, y, w, 34));

// ---------- 1. Profitability Health ----------
const S1 = { x: 24, y: 184, w: 1872, h: 190 };
writeVisual('s1-panel', panel(), pos(S1.x, S1.y, S1.w, S1.h));
sectionTitle('s1', 1, 'Profitability Health', 'Key indicators of overall profitability', S1.x + 20, S1.y + 10, 1000);

const KPIS = [
  { key: 'margin', id: 'a69e9d107be6c846d606', label: 'Profit Margin', icon: 'pa_margin.svg', delta: 'Margin vs PP (pp)', color: 'Margin Delta Color' },
  { key: 'discount', id: 'efa89926b40896ee3a0a', label: 'Weighted Avg Discount', icon: 'pa_discount.svg', delta: 'Discount vs PP (pp)', color: 'Discount Delta Color' },
  { key: 'return', id: 'cfdbd9e00741165a7655', label: 'Return Rate', icon: 'pa_return.svg', delta: 'Return Rate vs PP (pp)', color: 'Return Rate Delta Color' },
  { key: 'cost', id: 'ca9fee3c70c731903dc8', label: 'Cost Ratio', icon: 'pa_cost.svg', delta: 'Cost Ratio vs PP (pp)', color: 'Cost Ratio Delta Color' },
];
const KT = { x: S1.x + 20, y: S1.y + 48, h: 134, gap: 16 };
KT.w = (S1.w - 40 - KT.gap * 3) / 4;
KPIS.forEach((k, i) => {
  const x = Math.round(KT.x + i * (KT.w + KT.gap));
  const w = Math.round(KT.w);
  writeVisual(`kpi-tile-${k.key}`, panel(C.card, false), pos(x, KT.y, w, KT.h));
  writeVisual(`kpi-icon-${k.key}`, image(k.icon), pos(x + 26, KT.y + 35, 64, 64));
  updateVisual(k.id, (v) => {
    v.position = pos(x + 110, KT.y + 10, w - 124, 72);
    delete v.visual.query.sortDefinition;
    v.visual.objects = {
      ...cardBase,
      value: [obj({ fontFamily: s('Segoe UI Semibold'), fontSize: d(28), bold: b(true), fontColor: col(C.ink), horizontalAlignment: s('left') }, idSel())],
      label: [obj({ show: b(true), text: s(k.label), position: s('aboveValue'), fontFamily: s('Segoe UI Semibold'), fontSize: d(13), fontColor: col(C.text), horizontalAlignment: s('left') }, idSel())],
    };
    v.visual.visualContainerObjects = bareVCO();
  });
  writeVisual(`kpi-delta-${k.key}`, {
    visualType: 'cardVisual',
    query: { queryState: { Data: { projections: [mproj(k.delta)] } } },
    objects: {
      ...cardBase,
      value: [obj({ fontFamily: s('Segoe UI Semibold'), fontSize: d(12), bold: b(true), fontColor: { solid: { color: { expr: measureRef(k.color) } } }, horizontalAlignment: s('left'), showBlankAs: s('N/A') }, idSel())],
      label: [obj({ show: b(true), text: s('vs. previous period'), position: s('belowValue'), fontFamily: s('Segoe UI'), fontSize: d(10), fontColor: col(C.axis), horizontalAlignment: s('left') }, idSel())],
    },
    visualContainerObjects: bareVCO(),
    drillFilterOtherVisuals: true,
  }, pos(x + 110, KT.y + 84, w - 124, 46));
});

// ---------- chart formatting ----------
const axisFont = { fontFamily: s('Segoe UI'), fontSize: d(10), labelColor: col(C.axis) };
const chartVCO = () => ({ ...bareVCO(), padding: [obj({ top: d(4), bottom: d(4), left: d(6), right: d(6) })], visualHeader: [obj({ show: b(true), transparency: d(100) })] });
const legend = () => [obj({ show: b(true), position: s('Top'), fontFamily: s('Segoe UI'), fontSize: d(11), labelColor: col(C.text), showTitle: b(false) })];
const lineSeries = [obj({ strokeWidth: d(2.5), lineChartType: s('linear'), showMarker: b(true), markerShape: s('circle'), markerSize: d(6) })];
const lineLabel = (m) => obj({ color: col(C.navy), bold: b(true), labelPosition: s('Above'), labelDisplayUnits: d(0), labelPrecision: l(1), enableBackground: b(true), backgroundTransparency: d(0) }, series(m));

// ---------- 2. Discount impact ----------
const S2 = { x: 24, y: 390, w: 924, h: 318 };
const S3 = { x: 972, y: 390, w: 924, h: 318 };
writeVisual('s2-panel', panel(), pos(S2.x, S2.y, S2.w, S2.h));
sectionTitle('s2', 2, 'Impact of Discount on Sales Volume and Profit Margin', null, S2.x + 18, S2.y + 10, 880);
writeVisual('s2-insight', measureTitleCard('Discount Insight', 11, C.muted), pos(S2.x + 18, S2.y + 44, S2.w - 36, 26));
updateVisual('74fae39d905b017e6801', (v) => {
  v.position = pos(S2.x + 12, S2.y + 74, S2.w - 24, S2.h - 84);
  const q = v.visual.query.queryState;
  q.Y = { projections: [mproj('Avg Units per Order Line')] };
  q.Tooltips = { projections: [mproj('Total Quantity')] };
  v.visual.query.sortDefinition = { sort: [{ field: columnRef('SalesTable', 'Discount_Pct'), direction: 'Ascending' }], isDefaultSort: false };
  v.visual.objects = {
    legend: legend(),
    categoryAxis: [obj({ ...axisFont, fontSize: d(11), labelColor: col(C.text), axisType: s('Categorical'), showAxisTitle: b(true), titleText: s('Discount level'), titleFontSize: d(10), titleColor: col(C.muted), gridlineShow: b(false) })],
    valueAxis: [obj({
      ...axisFont, showAxisTitle: b(true), titleText: s('Avg units per order line'), titleFontSize: d(10), titleColor: col(C.muted),
      gridlineShow: b(true), gridlineColor: col(C.grid), gridlineThickness: d(1), gridlineStyle: s('solid'),
      start: lit('0D'), end: { expr: measureRef('Discount Chart Axis Max') }, secShow: b(false), secStart: d(-1),
    })],
    dataPoint: [obj({ fill: col(C.blue) }, series('Avg Units per Order Line')), obj({ fill: col(C.navy) }, series('Profit Margin'))],
    labels: [
      obj({ show: b(true), fontFamily: s('Segoe UI'), fontSize: d(10), color: col(C.text), labelPosition: s('OutsideEnd'), labelPrecision: l(2), showSeries: b(true), enableBackground: b(false) }),
      lineLabel('Profit Margin'),
    ],
    lineStyles: lineSeries,
    seriesLabels: [obj({ show: b(false) })],
  };
  v.visual.visualContainerObjects = chartVCO();
});

// ---------- 3. Cost ratio vs margin by category ----------
writeVisual('s3-panel', panel(), pos(S3.x, S3.y, S3.w, S3.h));
sectionTitle('s3', 3, 'Cost Ratio vs Profit Margin by Category', null, S3.x + 18, S3.y + 10, 880);
writeVisual('s3-insight', measureTitleCard('Category Insight', 11, C.muted), pos(S3.x + 18, S3.y + 44, S3.w - 36, 26));
updateVisual('14c7406e09c87e227a90', (v) => {
  v.position = pos(S3.x + 12, S3.y + 74, S3.w - 24, S3.h - 84);
  v.visual.objects = {
    legend: legend(),
    categoryAxis: [obj({ ...axisFont, fontSize: d(11), labelColor: col(C.text), showAxisTitle: b(false), gridlineShow: b(false) })],
    // Both measures are percentages: one shared 0-80% scale.
    valueAxis: [obj({
      ...axisFont, showAxisTitle: b(false), gridlineShow: b(true), gridlineColor: col(C.grid), gridlineThickness: d(1), gridlineStyle: s('solid'),
      start: lit('0D'), end: lit('0.8D'), secShow: b(false), secStart: d(0), secEnd: d(0.8),
    })],
    dataPoint: [obj({ fill: col(C.blue) }, series('Cost Ratio')), obj({ fill: col(C.navy) }, series('Profit Margin'))],
    labels: [
      obj({ show: b(true), fontFamily: s('Segoe UI'), fontSize: d(10), color: col(C.text), labelPosition: s('OutsideEnd'), labelPrecision: l(1), showSeries: b(true), enableBackground: b(false) }),
      lineLabel('Profit Margin'),
    ],
    lineStyles: lineSeries,
    seriesLabels: [obj({ show: b(false) })],
  };
  v.visual.visualContainerObjects = chartVCO();
});

// ---------- 4. Product-level diagnosis ----------
const S4 = { x: 24, y: 724, w: 1872, h: 316 };
writeVisual('s4-panel', panel(), pos(S4.x, S4.y, S4.w, S4.h));
sectionTitle('s4', 4, 'Product-level Diagnosis', null, S4.x + 18, S4.y + 10, 900);
writeVisual('s4-insight', measureTitleCard('Product Diagnosis Insight', 11, C.muted), pos(S4.x + 18, S4.y + 44, S4.w - 36, 26));
writeVisual('scatter-legend', textbox([{ textRuns: [
  run('●', '11pt', C.red), run(' Above-avg revenue, below-avg margin     ', '10pt', C.text),
  run('●', '11pt', C.green), run(' Margin at or above average     ', '10pt', C.text),
  run('●', '11pt', C.grey), run(' Other', '10pt', C.text),
] }]), pos(S4.x + 18, S4.y + 74, 660, 26));
writeVisual('scatter', {
  visualType: 'scatterChart',
  query: {
    queryState: {
      Category: { projections: [cproj('ProductsTable', 'Product_Name', 'Product')] },
      X: { projections: [mproj('Total Revenue', 'Revenue')] },
      Y: { projections: [mproj('Profit Margin')] },
      Tooltips: { projections: [mproj('Cost Ratio'), mproj('Weighted Avg Discount', 'Avg Discount'), mproj('Return Rate')] },
    },
  },
  objects: {
    dataPoint: [obj({ fill: { solid: { color: { expr: measureRef('Product Diagnosis Color') } } } }, { data: [{ dataViewWildcard: { matchingOption: 1 } }] })],
    categoryAxis: [obj({ ...axisFont, showAxisTitle: b(true), titleText: s('Revenue'), titleFontSize: d(10), titleColor: col(C.muted), labelDisplayUnits: d(1000000), gridlineShow: b(false) })],
    valueAxis: [obj({ ...axisFont, showAxisTitle: b(true), titleText: s('Profit margin'), titleFontSize: d(10), titleColor: col(C.muted), gridlineShow: b(true), gridlineColor: col(C.grid), gridlineStyle: s('solid') })],
    xAxisReferenceLine: [obj({ show: b(true), displayName: s('Avg revenue per product'), value: { expr: measureRef('Avg Product Revenue') }, lineColor: col(C.grey), style: s('dashed'), width: d(1.5), transparency: d(0), dataLabelShow: b(false) }, idSel('0'))],
    y1AxisReferenceLine: [obj({ show: b(true), displayName: s('Overall profit margin'), value: { expr: measureRef('Profit Margin') }, lineColor: col(C.grey), style: s('dashed'), width: d(1.5), transparency: d(0), dataLabelShow: b(false) }, idSel('0'))],
    categoryLabels: [obj({ show: b(false) })],
    legend: [obj({ show: b(false) })],
    markers: [obj({ borderShow: b(true), borderColor: col('#FFFFFF'), borderWidth: d(1), transparency: d(10) })],
  },
  visualContainerObjects: chartVCO(),
  drillFilterOtherVisuals: true,
}, pos(S4.x + 12, S4.y + 100, 668, S4.h - 110));

// Product detail table with conditional colouring (red = worse, green = better).
const RED = '#F8C4C4';
const WHITE = '#FFFFFF';
const GREEN = '#C9EDD8';
const gradient = (m, lo, mid, hi, higherIsBetter) => obj({
  backColor: { solid: { color: { expr: { FillRule: {
    Input: { SelectRef: { ExpressionName: `SalesTable.${m}` } },
    FillRule: { linearGradient3: {
      min: { color: lit(`'${higherIsBetter ? RED : GREEN}'`), value: lit(`${lo}D`) },
      mid: { color: lit(`'${WHITE}'`), value: lit(`${mid}D`) },
      max: { color: lit(`'${higherIsBetter ? GREEN : RED}'`), value: lit(`${hi}D`) },
      nullColoringStrategy: { strategy: lit("'noColor'") },
    } },
  } } } } },
}, { data: [{ dataViewWildcard: { matchingOption: 1 } }], metadata: `SalesTable.${m}` });
const colFmt = (m, props) => obj(props, { metadata: `SalesTable.${m}` });
writeVisual('table', {
  visualType: 'pivotTable',
  query: {
    queryState: {
      Rows: { projections: [cproj('ProductsTable', 'Product_Name', 'Product')] },
      Values: {
        projections: [
          mproj('Product Category Label', 'Category'),
          mproj('Total Revenue', 'Revenue'),
          mproj('Profit Margin'),
          mproj('Cost Ratio'),
          mproj('Weighted Avg Discount', 'Avg Discount'),
          mproj('Return Rate'),
        ],
      },
    },
    sortDefinition: { sort: [{ field: measureRef('Total Revenue'), direction: 'Descending' }], isDefaultSort: false },
  },
  objects: {
    columnHeaders: [obj({
      fontFamily: s('Segoe UI Semibold'), fontSize: d(10.5), fontColor: col(C.text), backColor: col(C.headerFill), bold: b(false),
      columnAdjustment: s('growToFit'), autoSizeColumnWidth: b(true), alignment: s('Center'),
    })],
    rowHeaders: [obj({
      fontFamily: s('Segoe UI'), fontSize: d(10.5), fontColor: col(C.text), backColor: col(WHITE), stepped: b(false),
    })],
    subTotals: [obj({ rowSubtotals: b(false) }, idSel('Row')), obj({ columnSubtotals: b(false) }, idSel('Column'))],
    values: [
      obj({ fontFamily: s('Segoe UI'), fontSize: d(10.5), fontColorPrimary: col(C.text), fontColorSecondary: col(C.text), backColorPrimary: col(WHITE), backColorSecondary: col(WHITE) }),
      gradient('Profit Margin', 0.35, 0.49, 0.62, true),
      gradient('Cost Ratio', 0.30, 0.47, 0.60, false),
      gradient('Weighted Avg Discount', 0.05, 0.08, 0.12, false),
      gradient('Return Rate', 0, 0.035, 0.08, false),
    ],
    grid: [obj({ gridHorizontal: b(true), gridHorizontalColor: col('#EEF2F7'), gridHorizontalWeight: d(1), gridVertical: b(false), rowPadding: d(4) })],
    columnFormatting: [
      colFmt('Total Revenue', { labelDisplayUnits: d(1000000), labelPrecision: l(1), alignment: s('Right') }),
      colFmt('Profit Margin', { alignment: s('Center') }),
      colFmt('Cost Ratio', { alignment: s('Center') }),
      colFmt('Weighted Avg Discount', { alignment: s('Center') }),
      colFmt('Return Rate', { alignment: s('Center') }),
    ],
  },
  visualContainerObjects: {
    ...bareVCO(),
    stylePreset: [obj({ name: s('None') })],
    visualHeader: [obj({ show: b(true), transparency: d(100) })],
  },
  drillFilterOtherVisuals: true,
}, pos(S4.x + 696, S4.y + 70, S4.w - 712, 120));

// Product detail table. Power BI blanks the matrix when cell gradients (FillRule) are used here,
// so cell colours come from colour measures instead.
const cellColor = (m, colorMeasure) => obj({
  backColor: { solid: { color: { expr: measureRef(colorMeasure) } } },
}, { data: [{ dataViewWildcard: { matchingOption: 1 } }], metadata: `SalesTable.${m}` });
writeVisual('table', {
  visualType: 'pivotTable',
  query: {
    queryState: {
      Rows: { projections: [cproj('ProductsTable', 'Product_Name', 'Product')] },
      Values: {
        projections: [
          mproj('Product Category Label', 'Category'), mproj('Total Revenue', 'Revenue'), mproj('Profit Margin'),
          mproj('Cost Ratio'), mproj('Weighted Avg Discount', 'Avg Discount'), mproj('Return Rate'),
        ],
      },
    },
    sortDefinition: { sort: [{ field: measureRef('Total Revenue'), direction: 'Descending' }], isDefaultSort: false },
  },
  objects: {
    columnHeaders: [obj({ fontFamily: s('Segoe UI Semibold'), fontSize: d(10.5), fontColor: col(C.text), backColor: col(C.headerFill), bold: b(false), columnAdjustment: s('growToFit'), autoSizeColumnWidth: b(true), alignment: s('Center') })],
    rowHeaders: [obj({ fontFamily: s('Segoe UI'), fontSize: d(10.5), fontColor: col(C.text), backColor: col(WHITE), stepped: b(false) })],
    subTotals: [obj({ rowSubtotals: b(false) }, idSel('Row')), obj({ columnSubtotals: b(false) }, idSel('Column'))],
    values: [
      obj({ fontFamily: s('Segoe UI'), fontSize: d(10.5), fontColorPrimary: col(C.text), fontColorSecondary: col(C.text), backColorPrimary: col(WHITE), backColorSecondary: col(WHITE) }),
      cellColor('Profit Margin', 'Margin Cell Color'),
      cellColor('Cost Ratio', 'Cost Ratio Cell Color'),
      cellColor('Weighted Avg Discount', 'Discount Cell Color'),
      cellColor('Return Rate', 'Return Rate Cell Color'),
    ],
    grid: [obj({ gridHorizontal: b(true), gridHorizontalColor: col('#EEF2F7'), gridHorizontalWeight: d(1), gridVertical: b(false), rowPadding: d(4) })],
    columnFormatting: [
      colFmt('Total Revenue', { labelDisplayUnits: d(1000000), labelPrecision: l(1), alignment: s('Right') }),
      colFmt('Profit Margin', { alignment: s('Center') }),
      colFmt('Cost Ratio', { alignment: s('Center') }),
      colFmt('Weighted Avg Discount', { alignment: s('Center') }),
      colFmt('Return Rate', { alignment: s('Center') }),
    ],
  },
  visualContainerObjects: { ...bareVCO(), stylePreset: [obj({ name: s('None') })], visualHeader: [obj({ show: b(true), transparency: d(100) })] },
  drillFilterOtherVisuals: true,
}, pos(S4.x + 696, S4.y + 70, S4.w - 712, S4.h - 82));

// ---------- footer ----------
writeVisual('footer-defs', textbox([{ textRuns: [run(
  'ⓘ  Profit Margin = Total Profit / Total Revenue    |    Cost Ratio = Total Cost / Gross Sales    |    Weighted Avg Discount = Σ(Gross Sales × Discount) / Gross Sales    |    Return Rate = Returned units / Total units',
  '9.5pt', C.muted)] }]), pos(32, 1046, 1420, 26));
writeVisual('footer-source', textbox([{ textRuns: [run('Data source: Retail Dataset.xlsx', '9.5pt', C.muted)], horizontalTextAlignment: 'right' }]), pos(1496, 1046, 400, 26));

console.log('BUILD_OK visuals:', fs.readdirSync(VIS_DIR).length);
