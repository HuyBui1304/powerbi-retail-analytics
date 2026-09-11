# Adds the Profitability Analysis measures to .staging SalesTable.tmdl and formats Discount_Pct as a percentage.
import re

p = '/Users/huybui/Desktop/Project_DA/.staging/dash.SemanticModel/definition/tables/SalesTable.tmdl'
s = open(p, encoding='utf-8').read()
T = '\t'
FOLDER = 'Dashboard Design'
PCT = '0.0%;-0.0%;0.0%'
PP = r'\↑\ 0.00\ \p\p;\↓\ 0.00\ \p\p;0.00\ \p\p'
VND = '#,0\\ "₫";-#,0\\ "₫";#,0\\ "₫"'


def m(name, desc, lines, fmt=None):
    body = ''.join(f"{T * 3}{ln}\n" for ln in lines)
    fs = f"{T * 2}formatString: {fmt}\n" if fmt else ''
    return f"{T}/// {desc}\n{T}measure '{name}' =\n{body}{fs}{T * 2}displayFolder: {FOLDER}\n\n"


def prior(expr):
    return [
        "VAR _first = MIN ( 'DateTable'[Date] )",
        "VAR _last = MAX ( 'DateTable'[Date] )",
        "VAR _months = DATEDIFF ( _first, _last, MONTH ) + 1",
        "VAR _priorWindow = DATESBETWEEN ( 'DateTable'[Date], EDATE ( _first, - _months ), _first - 1 )",
        "VAR _priorRevenue = CALCULATE ( [Total Revenue], REMOVEFILTERS ( 'DateTable' ), _priorWindow )",
        f"VAR _prior = CALCULATE ( [{expr}], REMOVEFILTERS ( 'DateTable' ), _priorWindow )",
        "RETURN",
        f"    IF ( NOT ISBLANK ( _priorRevenue ), ( [{expr}] - _prior ) * 100 )",
    ]


def lower_is_better(measure):
    return [
        f"VAR _change = [{measure}]",
        "RETURN",
        '    SWITCH ( TRUE (), ISBLANK ( _change ), "#8A94A6", _change <= 0, "#16A34A", "#DC2626" )',
    ]


new = ''.join([
    m('Avg Units per Order Line', 'Average units per order line: shows whether discounts make customers buy more per purchase.',
      ["DIVIDE ( [Total Quantity], COUNTROWS ( 'SalesTable' ) )"], '0.00'),
    m('Discount vs PP (pp)', 'Change in Weighted Avg Discount versus the preceding period of the same length, in percentage points.',
      prior('Weighted Avg Discount'), PP),
    m('Return Rate vs PP (pp)', 'Change in Return Rate versus the preceding period of the same length, in percentage points.',
      prior('Return Rate'), PP),
    m('Cost Ratio vs PP (pp)', 'Change in Cost Ratio versus the preceding period of the same length, in percentage points.',
      prior('Cost Ratio'), PP),
    m('Discount Delta Color', 'Green when the discount rate went down, red when it went up, grey without a prior period.',
      lower_is_better('Discount vs PP (pp)')),
    m('Return Rate Delta Color', 'Green when the return rate went down, red when it went up, grey without a prior period.',
      lower_is_better('Return Rate vs PP (pp)')),
    m('Cost Ratio Delta Color', 'Green when the cost ratio went down, red when it went up, grey without a prior period.',
      lower_is_better('Cost Ratio vs PP (pp)')),
    m('Avg Product Revenue', 'Average Total Revenue per product with sales; reference line on the product diagnosis scatter.',
      ["AVERAGEX ( VALUES ( 'ProductsTable'[Product_Name] ), [Total Revenue] )"], VND),
    m('Product Diagnosis Color', 'Scatter colour: red = revenue at or above average but margin below average, green = margin at or above average, grey = the rest.',
      ["VAR _revenue = [Total Revenue]",
       "VAR _margin = [Profit Margin]",
       "VAR _avgRevenue = CALCULATE ( [Avg Product Revenue], ALLSELECTED ( 'ProductsTable' ) )",
       "VAR _avgMargin = CALCULATE ( [Profit Margin], ALLSELECTED ( 'ProductsTable' ) )",
       "RETURN",
       '    SWITCH ( TRUE (), _revenue >= _avgRevenue && _margin < _avgMargin, "#DC2626", _margin >= _avgMargin, "#10B981", "#94A3B8" )']),
    m('Product Diagnosis Insight', 'Sentence for the product diagnosis section: how many products have above-average revenue but below-average margin.',
      ["VAR _avgRevenue = [Avg Product Revenue]",
       "VAR _avgMargin = [Profit Margin]",
       "VAR _flagged =",
       "    FILTER (",
       "        ADDCOLUMNS ( VALUES ( 'ProductsTable'[Product_Name] ), \"@Revenue\", [Total Revenue], \"@Margin\", [Profit Margin] ),",
       "        NOT ISBLANK ( [@Revenue] ) && [@Revenue] >= _avgRevenue && [@Margin] < _avgMargin",
       "    )",
       "VAR _count = COUNTROWS ( _flagged ) + 0",
       "RETURN",
       '    _count & IF ( _count = 1, " product earns", " products earn" ) & " above-average revenue but below-average profit margin (red points) - check their cost ratio and discounts in the table."']),
    m('Discount Insight', 'Sentence for the discount chart: margin at the lowest vs highest discount level and the range of units per order line.',
      ["VAR _levels =",
       "    FILTER (",
       "        ADDCOLUMNS ( VALUES ( 'SalesTable'[Discount_Pct] ), \"@Margin\", [Profit Margin], \"@Units\", [Avg Units per Order Line], \"@Revenue\", [Total Revenue] ),",
       "        [@Revenue] > 0",
       "    )",
       "VAR _low = MINX ( _levels, 'SalesTable'[Discount_Pct] )",
       "VAR _high = MAXX ( _levels, 'SalesTable'[Discount_Pct] )",
       "VAR _marginLow = MAXX ( FILTER ( _levels, 'SalesTable'[Discount_Pct] = _low ), [@Margin] )",
       "VAR _marginHigh = MAXX ( FILTER ( _levels, 'SalesTable'[Discount_Pct] = _high ), [@Margin] )",
       "RETURN",
       "    IF (",
       "        COUNTROWS ( _levels ) > 1,",
       '        "Profit margin " & IF ( _marginHigh < _marginLow, "falls", "rises" ) & " from " & FORMAT ( _marginLow, "0.0%" ) & " at " & FORMAT ( _low, "0%" )',
       '            & " discount to " & FORMAT ( _marginHigh, "0.0%" ) & " at " & FORMAT ( _high, "0%" )',
       '            & ", while units per order line stay between " & FORMAT ( MINX ( _levels, [@Units] ), "0.00" ) & " and " & FORMAT ( MAXX ( _levels, [@Units] ), "0.00" ) & "."',
       "    )"]),
    m('Category Insight', 'Sentence for the cost-ratio chart: category with the highest cost ratio and the one with the lowest margin.',
      ["VAR _categories =",
       "    FILTER (",
       "        ADDCOLUMNS ( VALUES ( 'ProductsTable'[Category] ), \"@Cost\", [Cost Ratio], \"@Margin\", [Profit Margin], \"@Revenue\", [Total Revenue] ),",
       "        [@Revenue] > 0",
       "    )",
       "VAR _topCost = TOPN ( 1, _categories, [@Cost], DESC )",
       "VAR _lowMargin = TOPN ( 1, _categories, [@Margin], ASC )",
       "VAR _costName = MAXX ( _topCost, 'ProductsTable'[Category] )",
       "VAR _marginName = MAXX ( _lowMargin, 'ProductsTable'[Category] )",
       "RETURN",
       "    IF (",
       "        NOT ISBLANK ( _costName ),",
       '        _costName & " has the highest cost ratio (" & FORMAT ( MAXX ( _topCost, [@Cost] ), "0.0%" ) & ")"',
       "            & IF (",
       "                _costName = _marginName,",
       '                " and the lowest profit margin (" & FORMAT ( MAXX ( _lowMargin, [@Margin] ), "0.0%" ) & ").",',
       '                "; the lowest profit margin is " & _marginName & " (" & FORMAT ( MAXX ( _lowMargin, [@Margin] ), "0.0%" ) & ")."',
       "            )",
       "    )"]),
    m('Discount Chart Axis Max', 'Upper bound for the column axis of the discount chart, leaving room for the margin line above the columns.',
      ["MAXX ( VALUES ( 'SalesTable'[Discount_Pct] ), [Avg Units per Order Line] ) * 1.8"], '0.00'),
])

anchor = '\tcolumn Transaction_ID\n'
assert s.count(anchor) == 1 and "'Avg Units per Order Line'" not in s
s = s.replace(anchor, new + anchor, 1)

def set_format(name, fmt):
    global s
    mm = re.search(r"\tmeasure '" + re.escape(name) + r"' =\n(?:\t\t.*\n|\n)*?(?=\t(?:///|measure |column ))", s)
    assert mm, name
    blk = mm.group(0)
    b2 = re.sub(r"\t\tformatString: .*\n", "", blk)
    b2 = b2.replace('\t\tannotation PBI_FormatHint = {"isGeneralNumber":true}\n', '')
    b2 = re.sub(r"(\t\tdisplayFolder: .*\n|\t\tlineageTag: .*\n)", lambda x: ("\t\tformatString: " + fmt + "\n" + x.group(1)), b2, count=1)
    s = s.replace(blk, b2, 1)
    print('FORMAT', name, '->', fmt)

set_format('Weighted Avg Discount', PCT)
set_format('Return Rate', '0.00%;-0.00%;0.00%')
set_format('Cost Ratio', PCT)
set_format('Total Cost', VND)

# Discount_Pct: display as a percentage (metadata only)
blk = re.search(r"\tcolumn Discount_Pct\n(?:\t\t.*\n|\n)*?(?=\tcolumn |\tpartition |\Z)", s)
assert blk, 'Discount_Pct block not found'
b0 = blk.group(0)
b1 = b0.replace('\t\tannotation PBI_FormatHint = {"isGeneralNumber":true}\n', '')
if 'formatString:' not in b1:
    b1 = b1.replace('\t\tdataType: double\n', '\t\tdataType: double\n\t\tformatString: 0%\n', 1)
s = s.replace(b0, b1, 1)
open(p, 'w', encoding='utf-8').write(s)
print('ADDED', new.count("measure '"), 'measures; Discount_Pct block:\n' + b1)
