# Shopify theme wiring — Aarav Electronics (duplicate theme)

Reference copy of the Liquid+JS snippets provided to manually paste into
the live Shopify theme. **Not verified against the actual theme files** —
no Shopify admin access exists in this environment; the user pastes and
tests each one by hand in the theme preview. Update this doc's status line
once each is confirmed live.

Builds on the already-working `page_view` auto-tracking (`tracker.ts`'s own
`init()`). Does **not** modify `tracking-snippet/src/tracker.ts` or
`dist/leadpulse-tracker.min.js` — this is Liquid template wiring only.

Status: **snippets authored, pasting/verification pending** (as of
2026-07-20).

## Why every snippet waits for `DOMContentLoaded`

`defer`/`async` have no effect on inline `<script>` tags — only on scripts
with a `src`. If the tracker bundle loads via `<script src="..." defer>` in
`theme.liquid` (the pattern documented in `tracking-snippet/TESTING.md`),
an inline snippet placed later in a template can execute *before* the
deferred tracker script runs, meaning `window.leadpulse` doesn't exist yet.
Since `theme.liquid` here can't be inspected directly, every snippet below
guards with `document.readyState`/`DOMContentLoaded` (guaranteed to fire
after a `defer` script completes) and a `console.warn` fallback so a load-
order failure is visible in devtools rather than silently dropping the
event.

## 1. Product page — `productDetail`

**File:** `sections/main-product.liquid` (Dawn/OS2.0 convention; vintage
themes: `templates/product.liquid`). Confirm by searching for
`selected_or_first_available_variant`.

**Placement:** once, immediately before the file's `{% schema %}` tag.

```liquid
<script>
  (function () {
    function sendProductDetail() {
      if (window.leadpulse && typeof window.leadpulse.track === 'function') {
        window.leadpulse.track('productDetail', {
          view_data: { url: window.location.href },
          actionField: { list: 'product-page' },
          products: [{
            name: {{ product.title | json }},
            id: {{ product.id | json }},
            price: {{ product.price | money_without_currency | json }},
            brand: {{ product.vendor | json }},
            category: {{ product.type | json }},
            variant: {{ product.selected_or_first_available_variant.title | json }}
          }]
        });
      } else {
        console.warn('[leadpulse] track() not ready on product page — check theme.liquid script load order');
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', sendProductDetail);
    } else {
      sendProductDetail();
    }
  })();
</script>
```

Notes: `product.price` is in cents; `money_without_currency` is what makes
it a decimal string. A single-variant product's `variant` field will
legitimately read `"Default Title"`.

Verify: `event_type = 'productDetail'` rows show the real product title
and a decimal `price`.

## 2. Search page — `search`

**File:** `sections/main-search.liquid` (Dawn/OS2.0 — referenced by
`templates/search.json`) or `templates/search.liquid` (vintage themes).
Only one will exist in a given theme.

**Placement:** once, before `{% schema %}` if present, otherwise at the
end of the file.

```liquid
<script>
  (function () {
    function sendSearch() {
      if (window.leadpulse && typeof window.leadpulse.track === 'function') {
        window.leadpulse.track('search', {
          view_data: { url: window.location.href },
          actionField: {
            list: 'search-results',
            option: {{ search.terms | json }}
          }
        });
      } else {
        console.warn('[leadpulse] track() not ready on search page — check theme.liquid script load order');
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', sendSearch);
    } else {
      sendSearch();
    }
  })();
</script>
```

The search term goes in `actionField.option`, matching the exact shape
already used in `supabase/seed.sql`'s search event
(`{"list":"search-results","option":"running shoes"}`).

Verify: `event_type = 'search'` rows show the typed query in
`metadata.actionField.option`.

## 3. Collection page — `category_view`

**File:** `sections/main-collection-product-grid.liquid` (Dawn's actual
file name). If the theme combines grid + header, try
`sections/main-collection.liquid` instead.

**Placement:** once, before `{% schema %}`.

```liquid
<script>
  (function () {
    function sendCategoryView() {
      if (window.leadpulse && typeof window.leadpulse.track === 'function') {
        window.leadpulse.track('category_view', {
          view_data: { url: window.location.href },
          actionField: { list: {{ collection.title | json }} }
        });
      } else {
        console.warn('[leadpulse] track() not ready on collection page — check theme.liquid script load order');
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', sendCategoryView);
    } else {
      sendCategoryView();
    }
  })();
</script>
```

Verify: `event_type = 'category_view'` rows show the real collection name
in `metadata.actionField.list`.

## Verification query pattern

Every check below uses the org by name rather than a hardcoded UUID, since
the "Shopify Test" organization's id isn't known in this environment:

```sql
select id, event_type, url, metadata, created_at
from events
where organization_id = (select id from organizations where name = 'Shopify Test')
  and event_type = '<page_view|productDetail|search|category_view>'
order by created_at desc
limit 5;
```

## Explicitly out of scope for this pass

- **`addToCart`** — the request's title mentioned "cart" tracking, but the
  numbered task list only specified product/search/category. No cart-button
  snippet was written. Flag if this is wanted as a follow-up.
- Collection-page product snapshot (`products: [...]` array of the visible
  grid) — the brief's exact `category_view` payload didn't request one;
  building it would require a Liquid loop assembling a JSON array before
  the single `track()` call, which is a reasonable future enhancement but
  wasn't asked for here.
