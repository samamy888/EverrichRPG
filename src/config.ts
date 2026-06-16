export const CONFIG = {
  width: 480,
  height: 320,
  tileSize: 16,
  characterDisplaySize: 40,
  portalCooldownMs: 450,
  saveKey: "everrich-rpg-phase1-prototype-v1",
  apiBaseUrl:
    import.meta.env.VITE_API_BASE_URL ??
    (import.meta.env.DEV ? "http://127.0.0.1:5080/api/v1" : "/api/v1")
} as const;
