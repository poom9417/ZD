# ลูกหนี้ ZD (AR Dashboard)

เว็บแสดงลูกหนี้ค่ารักษาพยาบาลจากไฟล์ ZD ที่วิเคราะห์แล้ว มี 2 หน้า สลับด้วยแถบเมนูด้านบน (เก็บหน้าไว้ใน URL hash)

| หน้า | hash | ไฟล์ |
|---|---|---|
| ตารางหลัก (pivot: สิทธิ › กลุ่มลูกหนี้ › หน่วยงาน × ช่วงอายุ) | `#pivot` (หน้าแรก) | `src/pages/PivotPage.tsx` |
| Dashboard อายุลูกหนี้ ZD | `#dashboard` | `src/pages/DashboardPage.tsx` |

## โครงสร้าง

```
scripts/build_data.py     อ่าน .xlsx (ชีต data) → src/data/zd-records.json
src/
  main.tsx, App.tsx
  components/             AppLayout (สลับหน้า), Navbar, NavMenu, PivotTable, StatCards, AgingBar, ...
  pages/                  PivotPage, DashboardPage
  lib/                    buckets (ช่วงอายุ), pivot (สร้างตาราง), arSummary (คำนวณ Dashboard), format
  data/zd-records.json    ข้อมูลสรุป (สร้างด้วยสคริปต์ ไม่ต้องแก้มือ)
  styles/                 theme, base, components/*.css
```

ตัวเลขทุกจุดคำนวณจาก `zd-records.json` ผ่าน `lib/` ไม่มีตัวเลขฝังในหน้า

## รันในเครื่อง

ต้องใช้ Node.js 18 ขึ้นไป

```bash
npm install
npm run dev
npm run build     # tsc + vite build
```

## เปลี่ยนข้อมูลเป็นไฟล์ ZD ใหม่

ต้องมี Python 3 กับ `pandas`, `openpyxl`

```bash
npm run data -- path/to/ZDddmmyyyy_analyzed.xlsx
```

สคริปต์ใช้คอลัมน์ `ช่วงอายุลูกหนี้-` ซึ่งแยกค้างเกิน 90 วันเป็น (4) ปีงบ 2026, (5) ปีงบ 2025, (6) ปีงบ 2024 และก่อนหน้า ส่วนวันที่รายงานอ่านจากคอลัมน์ `Adateasat(วันที่รายงาน)`

## Deploy

เป็นเว็บ static: push ขึ้น `main` แล้วเชื่อม Vercel (Framework: Vite) หรือ Render Static Site (Build: `npm install && npm run build`, Publish: `dist`) `vercel.json` ตั้ง security headers ไว้
