import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://tdlucmmrrffnisypgmki.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkbHVjbW1ycmZmbmlzeXBnbWtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2Nzg2MzcsImV4cCI6MjA3MDI1NDYzN30.N7uhwugHg-hsg0tcBklwB9LQm9VsNMAsm5oFiPkhyL4'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
