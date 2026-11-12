# Achint Soni — personal website

A static research portfolio served directly by GitHub Pages. No build step or runtime dependencies.

## Preview locally

From the repository root:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Open `http://127.0.0.1:4173` in a browser.

## Edit the site

- `index.html`: biography, publications, updates, links, and metadata.
- `assets/css/site.css`: layout, typography, responsive styles, and motion.
- `assets/js/site.js`: interactive artwork, navigation, filters, and video demo.
- `assets/js/analytics.js`: production visitor and interaction tracking.
- `assets/media/`: optimized portrait and research images; original media remains in the repository.
- `assets/favicon.svg`: site icon.

Content is present in HTML so it remains available without JavaScript. Animations respect reduced-motion preferences; the hero animation can also be paused. Large video media loads when its demo is opened. Google Fonts uses system-font fallbacks.

## Analytics

The site uses its existing Google Analytics 4 measurement ID, `G-GHV25TEYFL`. There is one Google tag configuration, which automatically records the initial page view. Standard GA4 reports cover visitors, sessions, traffic sources, devices, and approximate locations.

Custom events describe the actions that matter on a research portfolio:

| Event | What it records | Parameters |
| --- | --- | --- |
| `research_open` | A paper, thesis, or article link opened | `content_id`, `content_type` |
| `cv_open` | A CV link opened | `content_id`, `content_type` |
| `contact_click` | An email link clicked | `contact_method` |
| `email_copy` | The email address successfully copied | `contact_method` |
| `social_click` | A GitHub, LinkedIn, Scholar, or X link opened | `platform` |
| `research_filter` | A visitor chooses a research topic | `filter_topic`, `results_count` |
| `demo_start` / `demo_complete` | The demo actually plays / reaches its end | `content_id`, `content_type` |
| `section_view` | A section heading becomes visible, once per page visit | `section_id` |

Tracking runs only on `https://trickyjustice.github.io`; local previews send no analytics. Do Not Track and Global Privacy Control disable the tag entirely. Advertising consent is denied, and Google signals and ad personalization are disabled. Page and referrer configuration omit query strings and fragments; custom events send fixed identifiers rather than email addresses, full link URLs, or visitor-entered text. Navigation and all site interactions work when analytics is blocked.

To view reports, sign in at `https://analytics.google.com` with an account that has access to the existing property. Use **Reports → Realtime** to check fresh visits and events; regular reports take longer to process. Access to the property's dashboard is separate from access to this GitHub repository.

For per-paper or per-topic breakdowns, register event-scoped custom dimensions in **Admin → Data display → Custom definitions** for `content_id`, `content_type`, `contact_method`, `platform`, `filter_topic`, and `section_id`. Register `results_count` as a custom metric if needed. Enhanced measurement settings in the GA4 web stream control Google's additional outbound-click, download, and scroll events; these are separate from the custom events above.

## Publishing

GitHub Pages serves the repository's configured publishing source. The site is compatible with publishing from the root of `master`. Review changes locally before pushing to the publishing branch.
