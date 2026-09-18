import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

/**
 * Server-side Supabase client.
 * Uses the secret key — bypasses Row Level Security.
 * NEVER expose this client or its key to the browser.
 *
 * Use this client inside services when reading/writing database tables.
 */
export const supabase =
  env.supabaseUrl && env.supabaseSecretKey
    ? createClient(env.supabaseUrl, env.supabaseSecretKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;
