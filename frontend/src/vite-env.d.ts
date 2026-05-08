/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_UPLOADS_BASE_URL?: string;
  readonly VITE_API_TIMEOUT_MS?: string;
  /** Supabase proje kökü (Dashboard API URL); göreli /uploads/ yollarını public Storage'a çözmek için */
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_VAPID_PUBLIC_KEY?: string;
}

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt: () => Promise<void>;
}
