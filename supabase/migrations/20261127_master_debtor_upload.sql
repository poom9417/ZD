-- เตรียม public.master_debtor สำหรับอัปโหลดชีต master จากหน้าเว็บ
-- (ยังไม่ได้รันกับฐานข้อมูลจริง — ตรวจก่อนรัน; ตารางนี้ยังว่าง 0 แถว ณ 27/11/2026)

-- 1) GL&Cus.&sp.gl ซ้ำกันได้เมื่อเป็นคนละ OPD/IPD (ไฟล์ 13/11/2026 ซ้ำ 204 คู่)
--    จึงต้องใช้ (gl_key, visit_type) เป็น key
alter table public.master_debtor drop constraint master_debtor_pkey;
alter table public.master_debtor add primary key (gl_key, visit_type);
alter table public.master_debtor alter column visit_type set not null;

-- 2) ตอนนี้ role anon/authenticated ไม่มีสิทธิ์ SELECT/INSERT/UPDATE บนตาราง
--    (มีแค่ TRUNCATE/REFERENCES/TRIGGER) ต้องให้ authenticated ก่อน — RLS ยังจำกัดให้ dev/admin เขียนได้เท่านั้น
--    ไม่ให้สิทธิ์ anon และไม่ให้ DELETE
grant select, insert, update on public.master_debtor to authenticated;
-- upsert อ่าน profiles เพื่อตรวจบทบาท (policy profiles_self_read ครอบคลุมอยู่แล้ว)
grant select on public.profiles to authenticated;
