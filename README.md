# seclog — Jekyll blog para GitHub Pages

## Setup (5 minutos)

**1. Edita `_config.yml`**
Cambia `author.name`, `author.bio`, links sociales y `url`.

**2. Sube a GitHub**
```bash
git init && git add . && git commit -m "init"
git remote add origin https://github.com/USUARIO/USUARIO.github.io
git push -u origin main
```

**3. Activa GitHub Pages**
Settings → Pages → Source → **GitHub Actions**

**4. Escribe un artículo**
Crea `_posts/YYYY-MM-DD-titulo.md`:
```yaml
---
layout: post
title: "Título"
date: 2024-11-12
tags: [web, nodejs]
reading_time: 8
excerpt: "Descripción corta."
---
Contenido en Markdown...
```

**5. Bloques de código** — lenguaje detectado automáticamente:
````markdown
```python
print("hola")
```
````

## Desarrollo local
```bash
bundle install
bundle exec jekyll serve
```

## Estructura
```
_config.yml              ← configuración
_layouts/default.html    ← layout base
_layouts/post.html       ← layout artículo
_includes/sidebar.html   ← sidebar con << >>
_posts/                  ← tus artículos
assets/css/main.scss     ← estilos
assets/js/main.js        ← sidebar, búsqueda, copy
index.html               ← portada
search.html              ← búsqueda
tags.html                ← índice de tags
about.md                 ← acerca
.github/workflows/       ← deploy automático
```
