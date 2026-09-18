import dotenv from 'dotenv';

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',

  // Supabase
  supabaseUrl: process.env.SUPABASE_URL || '',
  // Use in React / public SDK calls (safe to expose to browser)
  supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || '',
  // Use only on the server — never send this to the browser
  supabaseSecretKey: process.env.SUPABASE_SECRET_KEY || '',
  // Used to verify Supabase JWTs (for auth middleware later)
  supabaseJwksUrl: process.env.SUPABASE_JWKS_URL || '',
};
