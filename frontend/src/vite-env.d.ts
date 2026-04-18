/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Dev-server proxy target; optional override in .env */
  readonly VITE_API_PROXY_TARGET?: string
  readonly VITE_API_BASE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
