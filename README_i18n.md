# Bilingual support (ES / EN)

## How to switch the UI language

In `_config.yml`, change one line:

```yaml
lang: "es"   # or "en"
```

Rebuild the site. All navigation, labels, TOC, search, copy buttons — everything — will render in the chosen language.

Visitors can also toggle the language themselves with the small **`es`/`en`** button in the top-left of the sidebar. Their preference is saved to localStorage and applied instantly without reloading.

---

## Writing posts

Write in whichever language you prefer — it doesn't matter. Posts are displayed as-is; only the **UI chrome** is translated.

If you want to show a translated subtitle under your post title, add `title_en` or `title_es` to the front matter:

```yaml
---
layout: post
title: "Validation - HTB"
title_en: "Validation - HTB"   # optional alt title shown when UI is in EN
date: 2026-04-25
tags: [linux, easy, sqli]
---
```

---

## Adding new translated strings

1. Add the key + value to both `en:` and `es:` blocks in `_data/i18n.yml`.
2. Use `{% include t.html k="your_key" %}` in any Liquid template.
3. Add `data-i18n="your_key"` to the HTML element if you want JS to swap it on the client side when the user toggles lang without reloading.
4. Add the key to the `I18N` object in `assets/js/main.js` for the client-side toggle.
