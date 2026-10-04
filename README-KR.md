# 23시 Clinic Flow - Cloudflare Workers 배포본

기존 23시 Clinic Flow 빌드 결과를 Cloudflare Workers + Hyperdrive + Neon 환경에서 실행하기 위한 배포본입니다.

필요한 Cloudflare 설정:
- Hyperdrive binding: `HYPERDRIVE` → 기존 `23si-clinic-db`
- Worker Secret: `COUNTER_PIN`
- Hyperdrive 캐싱: 비활성화

포함:
- `src/index.mjs` : Worker 진입점
- `server.mjs` : 기존 Express API의 Workers 변환본
- `public/` : 기존 React/Vite 화면
- `wrangler.jsonc` : Static Assets 설정
Cloudflare deployment test
