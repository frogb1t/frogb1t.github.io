---
layout: post
title: "Análisis estático de un dropper en Rust"
date: 2024-11-03
tags: [reversing, malware]
reading_time: 12
excerpt: "Reversing de un sample que usa goblin para parsear su propio ELF en memoria y descargar payload de segunda fase. Trucos de anti-análisis y cómo saltárselos."
---

Sample obtenido de MalwareBazaar. SHA256: `a3f1...` (truncado). ELF x86-64, stripped, compilado con Rust 1.78.

## Identificación inicial

```bash
file sample
# ELF 64-bit LSB pie executable, x86-64, stripped

strings sample | grep -i "rust"
# _ZN4core...  (mangled Rust symbols)

# Ver secciones
readelf -S sample | grep -E "Name|\.rodata|\.data"
```

La sección `.rodata` contiene strings cifrados con XOR de un solo byte — visible porque la entropía es alta pero no máxima (~6.8 bits/byte).

## Anti-análisis: detección de debugger

El binario llama a `ptrace(PTRACE_TRACEME, 0, 0, 0)` al inicio. Si devuelve `-1`, el proceso está siendo trackeado y el binario termina limpiamente.

Bypass con `LD_PRELOAD`:

```c
// ptrace_bypass.c
#include <sys/ptrace.h>
long ptrace(enum __ptrace_request req, ...) {
    return 0;
}
```

```bash
gcc -shared -fPIC -o ptrace_bypass.so ptrace_bypass.c
LD_PRELOAD=./ptrace_bypass.so ./sample
```

## Descifrado de strings

El XOR key se encuentra en `.data` como un byte literal. Con Python:

```python
key = 0x4B
with open('strings_enc.bin', 'rb') as f:
    data = f.read()
print(bytes(b ^ key for b in data).decode('utf-8', errors='ignore'))
```

Los strings descifrados revelan una URL de C2: `hxxps://cdn-static[.]net/update`.

## Segunda fase

El dropper descarga un PE desde el C2, lo mapea en memoria con `mmap(PROT_EXEC)` y salta al entrypoint sin escribirlo a disco. Clásico fileless execution en Linux.

## Indicadores de compromiso

| Tipo | Valor |
|------|-------|
| SHA256 | `a3f1...` |
| C2 | `cdn-static[.]net` |
| Mutex | `/tmp/.lk_a3f1` |
| Puerto | 4444/TCP |
