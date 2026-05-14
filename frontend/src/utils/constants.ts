export const APP_NAME = 'FLARQ'

export const API_BASE_URL =
  import.meta.env.VITE_API_URL?.toString() ?? 'http://localhost:8000'

export const ACCESS_TOKEN_KEY = 'flarq_access_token'
export const REFRESH_TOKEN_KEY = 'flarq_refresh_token'
