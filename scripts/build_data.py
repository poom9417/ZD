"""อ่านไฟล์ ZD..._analyzed.xlsx (ชีต data) → สรุปเป็น src/data/zd-records.json
ใช้: python3 scripts/build_data.py path/to/ZD20112026_analyzed.xlsx
ต้องมี pandas + openpyxl"""
import json, sys, pathlib
import pandas as pd

src = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else 'ZD_analyzed.xlsx')
out = pathlib.Path(__file__).resolve().parent.parent / 'src' / 'data' / 'zd-records.json'
A, AGE = 'Amt in loc.cur.', 'ช่วงอายุลูกหนี้-'  # คอลัมน์ช่วงอายุที่แยกค้างเกิน 90 วันเป็น (4)(5)(6)

d = pd.read_excel(src, sheet_name='data')
d['s'] = d['สิทธิ'].fillna('(ไม่ระบุสิทธิ)')
d['g'] = d['กลุ่มลูกหนี้'].fillna('(ไม่ระบุกลุ่ม)')
d['n'] = d['Name'].fillna('(ไม่ระบุ)').str.replace(r'\s+', ' ', regex=True).str.strip()
d['k'] = d[AGE].str.extract(r'^\((\d)\)')[0].fillna('na')
d['fy'] = d['FiscalYear'].astype(int)
d['t'] = d['Ref.key 1'].fillna('OPD')
d['neg'] = d[A].where(d[A] < 0, 0.0)
d['negCnt'] = (d[A] < 0).astype(int)

g = d.groupby(['s', 'g', 'n', 'k', 'fy', 't'], as_index=False).agg(
    amt=(A, 'sum'), cnt=(A, 'size'), neg=('neg', 'sum'), negCnt=('negCnt', 'sum'))
for c in ('amt', 'neg'):
    g[c] = g[c].round(2)

asof = pd.to_datetime(d['Adateasat(วันที่รายงาน)']).max()
data = {
    'meta': {'asOf': asof.strftime('%d/%m/%Y'), 'source': src.name, 'rows': int(len(d)), 'total': round(float(d[A].sum()), 2)},
    'records': g.to_dict('records'),
}
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print(f'{len(g)} records, {len(d)} rows, total {data["meta"]["total"]:,.2f} -> {out}')
