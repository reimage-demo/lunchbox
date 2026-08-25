# Performance budget

## Baseline captured July 15, 2026

- Homepage media directory: approximately 10 MB.
- Hero JPEG: 6.5 MB at 5712×4284.
- Founder portrait PNG: 3.2 MB.
- Shared logo PNG: 552 KB.
- Admin JavaScript: approximately 71 KB gzip.
- Live menu JSON: 4.8 KB raw and approximately 1.3 KB gzip for 12 items.
- Menu page refresh behavior: about 15 full queries per visitor per minute.
- Events page refresh behavior: 6 full queries per visitor per minute.

## Enforced budgets

- Responsive hero images: 180 KB, 450 KB, and 750 KB maximum.
- Founder portrait: 250 KB maximum.
- Shared logo: 80 KB maximum.
- Locally bundled public Convex client: 30 KB gzip maximum.
- Admin JavaScript: 90 KB gzip maximum.

Run `npm run perf:check` after changes to rebuild the browser assets and enforce these limits.
