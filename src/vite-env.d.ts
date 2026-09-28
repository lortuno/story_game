/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional endpoint that receives batched story events (JSON POST). */
  readonly VITE_EVENTS_ENDPOINT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
