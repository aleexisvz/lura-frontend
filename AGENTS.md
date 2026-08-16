# Lura Frontend — Agent Instructions

## Project
Lura is a fullstack digital library and reader for Manga (images) and Books (EPUB).
This repository is the **frontend SPA**.

## Tech Stack
- React 18+ with TypeScript
- Vite
- TanStack Query (React Query) for server state
- React Router for navigation
- Vanilla CSS (global stylesheet in `src/styles/global.css`)

## Architecture
- Feature-based folder structure under `src/features/`.
- Each feature contains: `pages/`, `components/`, `api.ts`, `hooks/`.
- Shared components live in `src/components/`.
- API calls go through `src/lib/apiClient.ts`. Never use raw `fetch` directly.

## Server State
- Use `useQuery` for all data fetching and `useMutation` for all mutations.
- For non-critical writes (progress saving, analytics), use fire-and-forget `mutate()` — never block UI with `await mutateAsync()`.

## Images and Performance
- All image URLs from the backend are **absolute public CDN URLs** (Cloudflare R2).
- Render images with native `<img src={cdnUrl} />`. Never use `fetchBlob` or `URL.createObjectURL` for CDN images.
- `ProtectedImage.tsx` auto-detects absolute URLs and renders them natively without API calls.
- In the manga reader (`MangaReaderPage`), silently **prefetch the next 3 pages and 1 previous page** using hidden `<img>` elements to ensure instant page transitions.

## CSS Rules
- Write clean vanilla CSS. No CSS-in-JS, no Tailwind (unless explicitly requested).
- **Never** use `::before` or `::after` pseudo-elements on `<input>` elements (void elements). For custom checkboxes, use `background-image` with inline SVG data URIs.
- Keep responsive design simple — components adapt fluidly without unnecessary content shifting.

## Code Style
- Prefer readability over cleverness.
- Prefer incremental changes over large refactors.
- Use TypeScript strictly — avoid `any` types.

## Git Workflow
- Write commit messages in **English** using Conventional Commits (`feat:`, `fix:`, `perf:`, `style:`).
- **Do NOT commit until the user explicitly confirms the change works.**
- If a fix requires multiple iterations, keep changes local and squash into a single atomic commit once approved.
- Work on descriptive branches (`feat/name`, `fix/name`). Merge to `main` with fast-forward when complete.
