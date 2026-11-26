---
layout: post
title: "Company Switch - Secur0"
date: 2026-11-26
tags: [bola, api]
excerpt: "Secur0"
---

Vamos a ver la aplicación:

![](/assets/images/writeups/securo/company-switch/1.png)

Navegando por la aplicación podemos encontrar un panel de inicio de sesión:

![](/assets/images/writeups/securo/company-switch/2.png)

No disponemos de credenciales válidas, vamos a registrarnos:

![](/assets/images/writeups/securo/company-switch/3.png)

![](/assets/images/writeups/securo/company-switch/4.png)

Si vemos nuestro `Http History` de BurpSuite podremos encontrar 2 solicitudes interesantes:

![](/assets/images/writeups/securo/company-switch/5.png)

![](/assets/images/writeups/securo/company-switch/6.png)

Vemos dos endpoints interesantes. Vamos a analizar las posibilidades:

1. `/api/users/me` --> Al actualizar el perfil podríamos intentar explotar un Mass Assignment para intentar editar el valor `isAdmin` a `true` para ver si logramos algún acceso no autorizado a algún panel administrativo de la aplicación.

2. `/api/companies/7e9fcd622f8cc7b8c5021b0c` --> Posible BOLA, si es vulnerable podríamos obtener los datos del campo `notasInternas` obteniendo datos confidenciales.

Vamos a probar a explotar el BOLA, pero vemos que el ID de la compania es un valor al azar no descifrable. Navegando por la aplicación podemos fijarnos que accediendo a `Empresas Asociadas` se realiza la siguiente solicitud:

![](/assets/images/writeups/securo/company-switch/7.png)

Obtuvimos los IDs de varias empresas, vamos a probar a explotar el BOLA para ver si podemos obtener el campo `notasInternas`:

![](/assets/images/writeups/securo/company-switch/8.png)

Vemos que podemos obtener el campo `notasInternas` confirmando BOLA. Vamos a obtener todos los IDs y guardarlos en un archivo:

```bash
┌──(kali㉿kali)-[~/Desktop/securo]
└─$ jq -r '.[].id' data.json > ids
```

Ahora vamos a emplear el Intruder:
![](/assets/images/writeups/securo/company-switch/9.png)

Vamos a lanzar todas las solicitudes y filtraremos por tamaño de respuesta:

![](/assets/images/writeups/securo/company-switch/10.png)

---