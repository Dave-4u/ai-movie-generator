
## 2026-10-07 — dependency patch refresh (scan of Dave's repos)
- next 15.5.26 -> 15.5.27, eslint-config-next 15.5.26 -> 15.5.27, react / react-dom 19.1.0 -> 19.1.9 (same minor line: patch/security fixes only).
- Not done: Next 16 (major upgrade, would need a migration pass) and the `OLLAMA_MODEL=llama3.2` default (still available; set OLLAMA_MODEL to e.g. qwen3 if you prefer).
- Checked: `npm test` 3/3 pass, `npm run build` compiles and prerenders all 5 pages, `npm run lint` clean.
