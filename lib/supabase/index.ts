// lib/supabase/index.ts
// Re-export everything with proper names
export { createClient as createBrowserClient } from './client'
export { createClient } from './server' // Default export for server
export { supabase } from './client'