---
layout: post
title: "Path Traversal en Node.js: explotación y mitigación"
date: 2024-11-12
tags: [web, nodejs, owasp]
reading_time: 8
excerpt: "Cuando req.params.file no se sanitiza, un atacante puede salir del directorio raíz con secuencias como ../../etc/passwd. Análisis del vector y mitigación práctica."
---

El path traversal sigue siendo una de las vulnerabilidades más persistentes en aplicaciones web. Aparece cuando la app acepta una ruta proporcionada por el usuario y la usa para acceder al sistema de ficheros sin validarla.

El patrón vulnerable más habitual en Node.js:

```javascript
// ⚠️ Vulnerable
app.get('/files/:name', (req, res) => {
  const file = path.join(__dirname, req.params.name);
  res.sendFile(file);
});
```

Un atacante puede enviar `../../etc/passwd` como valor del parámetro. La función `path.join` resuelve la secuencia `../` y el resultado sale del directorio previsto.

## Explotación práctica

Con `curl`, el ataque es trivial:

```bash
# Leer /etc/passwd directamente
curl "https://target.com/files/../../etc/passwd"

# Encoded para evadir filtros naïve
curl "https://target.com/files/%2e%2e%2f%2e%2e%2fetc%2fpasswd"
```

Los filtros que solo buscan la cadena literal `../` se saltan fácilmente con encodings como `%2e%2e%2f` o doble encoding `%252e%252e%252f`.

## Mitigación correcta

La solución es resolver la ruta final y verificar que comienza exactamente por el directorio permitido:

```javascript
const BASE = path.resolve(__dirname, 'public/files');

app.get('/files/:name', (req, res) => {
  const resolved = path.resolve(BASE, req.params.name);

  if (!resolved.startsWith(BASE + path.sep)) {
    return res.status(403).end();
  }

  res.sendFile(resolved);
});
```

### Por qué `path.resolve` y no `path.join`

`path.join` concatena segmentos pero no colapsa `../` de forma segura contra rutas absolutas embebidas. `path.resolve` construye una ruta absoluta canónica desde el sistema de ficheros, lo que hace la comparación posterior fiable.

## Referencias

- [OWASP Path Traversal — CWE-22](https://owasp.org/www-community/attacks/Path_Traversal)
- [Node.js docs — path.resolve](https://nodejs.org/api/path.html#pathresolvepaths)
- [RFC 3986 — Percent-encoding](https://datatracker.ietf.org/doc/html/rfc3986)
