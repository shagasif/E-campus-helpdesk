/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project URL. Leave empty to run without a database (data stays in the browser). */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase anon (public) key. Safe in the browser only because Row Level Security is on. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
