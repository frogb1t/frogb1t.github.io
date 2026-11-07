# Jekyll Theme — 0xnull

Minimal dark theme for security writeups and technical articles.

## Setup

```bash
gem install bundler
bundle install
bundle exec jekyll serve
```

Open `http://localhost:4000`.

## Writing posts

Create a file in `_posts/` following the naming convention `YYYY-MM-DD-title.md`:

```markdown
---
layout: post
title: "Your Post Title"
description: "One-line summary shown under the title."
date: 2026-11-06
category: web security   # shown next to the date
tags: [xss, ctf]         # used for related posts
---

Your content here in Markdown.
```

## Customise

Edit `_config.yml` to set your site title, description, and social links.

## Code blocks with copy button

Wrap `{% highlight lang %}` blocks in a `highlight-wrap` div:

```liquid
<div class="highlight-wrap">
  <div class="highlight-header">
    <span class="lang">python</span>
    <button class="copy-btn">copy</button>
  </div>
  {% highlight python %}
  your code here
  {% endhighlight %}
</div>
```

Standard fenced code blocks (``` ``` ```) work too — they just won't have the header bar.
