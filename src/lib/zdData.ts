import raw from '../data/zd-records.json'
import type { ZdData } from './types'

/** สร้างใหม่ด้วย `npm run data` จากไฟล์ ZD..._analyzed.xlsx */
export const zdData = raw as unknown as ZdData
