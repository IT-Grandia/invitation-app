import { config } from 'dotenv'

config({ path: '.env.local' })

process.env.STAFF_KEY ??= 'test-staff-key'
process.env.ADMIN_KEY ??= 'test-admin-key'
