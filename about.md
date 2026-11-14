---
layout: default
title_es: "acerca"
title_en: "about"
permalink: /about/
---

{% assign _lang = site.lang | default: "es" %}

<div class="page-header">
  <div class="page-title" data-i18n="page_about">{% include t.html k="page_about" %}</div>
  <div class="page-rule"></div>
</div>

<div class="prose">

{% if _lang == "en" %}

Security researcher and CTF player. I write about what I learn: web vulnerabilities, reversing, malware analysis, and competition writeups.

This blog is an open technical notebook — no imposed format, no calendar. Just notes when there's something worth documenting.

## contact

{% else %}

Security researcher y CTF player. Escribo sobre lo que aprendo: vulnerabilidades web, reversing, análisis de malware y writeups de competiciones.

Este blog es un cuaderno técnico abierto — sin formato impuesto, sin calendario. Solo notas cuando hay algo que vale la pena documentar.

## contacto

{% endif %}

- **GitHub:** [github.com/frogb1t](https://github.com/frogb1t)
- **Twitter / X:** [@frogb1t](https://twitter.com/frogb1t)
- **HackTheBox:** [perfil HTB](https://app.hackthebox.com/users/frogb1t)

</div>
