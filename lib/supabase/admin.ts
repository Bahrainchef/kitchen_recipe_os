import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'

// Returns a Supabase client that uses the service role key.
// This bypasses Row Level Security — only call from server-side code
// (Server Components, API routes, Server Actions). Never import in client components.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey || serviceKey === 'your-service-role-key-here') {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not configured. ' +
      'Add it to .env.local from Supabase dashboard → Project Settings → API.'
    )
  }

  return createClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
