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
- PWA via `vite-plugin-pwa` (configured in `vite.config.ts`, icons in `public/`). Never add API routes to the service worker runtime cache: API responses are authenticated and per-user.

## Architecture
- Feature-based folder structure under `src/features/`.
- Each feature contains: `pages/`, `components/`, `api.ts`, `hooks/`.
- Shared components live in `src/components/`.
- API calls go through `src/lib/apiClient.ts`. Never use raw `fetch` directly.
- `apiClient` gives up on a request after 15 seconds (uploads are exempt) and throws an `ApiError` with code `TIMEOUT`; a lost connection becomes `NETWORK_ERROR`. TanStack Query does not retry a timeout. Show load errors with `<ErrorBox error={...} onRetry={...} />` so the user can try again.

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
- Work in three levels:
  - **Level 3 — branch / PR:** one descriptive branch (`feat/name`, `fix/name`) per PR. It is merged into `main` when complete.
  - **Level 2 — solution:** a group of commits that solves part or all of the branch goal.
  - **Level 1 — commit:** one small, logical change. Several level 1 commits form a level 2 solution, and several level 2 solutions form a level 3 branch.
- Split work into logical commits. Do not squash them and do not commit every line.
- Commits may be made locally as the work advances. Ask the user for approval before `git push`, opening a PR and merging.
- Merge PRs with a rebase merge (`gh pr merge --rebase`), not squash or merge commits, so every level 1 commit reaches `main`.
