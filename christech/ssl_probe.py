"""
ChrisTech SSL certificate and domain expiry probes.
"""

import socket
import ssl
from datetime import datetime, timezone
from urllib.parse import urlparse

import requests


def _host_from_url(url):
    parsed = urlparse(url)
    host = parsed.hostname or ''
    port = parsed.port or (443 if parsed.scheme == 'https' else 80)
    return host, port, parsed.scheme


def probe_ssl(url):
    """Read issuer and expiry from the live TLS handshake."""
    host, port, scheme = _host_from_url(url)
    if not host or scheme != 'https':
        return {}

    try:
        ctx = ssl.create_default_context()
        with socket.create_connection((host, port), timeout=10) as sock:
            with ctx.wrap_socket(sock, server_hostname=host) as ssock:
                cert = ssock.getpeercert()
    except Exception as exc:
        print(f"[SSL Probe] Could not read certificate for {host}: {exc}")
        return {}

    issuer_parts = {}
    for rdn in cert.get('issuer') or []:
        for key, value in rdn:
            issuer_parts[key] = value

    issuer = issuer_parts.get('organizationName') or issuer_parts.get('commonName')
    not_after = cert.get('notAfter')
    expiry_date = None
    expiry_days = None
    if not_after:
        try:
            expiry = datetime.strptime(not_after, '%b %d %H:%M:%S %Y %Z')
            expiry = expiry.replace(tzinfo=timezone.utc)
            expiry_date = expiry.strftime('%Y-%m-%d')
            expiry_days = (expiry - datetime.now(timezone.utc)).days
        except ValueError:
            expiry_date = not_after

    return {
        'ssl_issuer': issuer,
        'ssl_expiry_date': expiry_date,
        'ssl_expiry_days': expiry_days,
    }


def probe_domain(url):
    """Best-effort RDAP lookup for registrar and domain expiry."""
    host, _, _ = _host_from_url(url)
    if not host or all(part.isdigit() for part in host.replace('.', '').replace(':', '')):
        return {}
    if host.startswith('www.'):
        host = host[4:]

    try:
        response = requests.get(
            f'https://rdap.org/domain/{host}',
            timeout=8,
            headers={'Accept': 'application/rdap+json'}
        )
        if response.status_code >= 400:
            return {}
        data = response.json()
    except Exception as exc:
        print(f"[Domain Probe] RDAP lookup skipped for {host}: {exc}")
        return {}

    registrar = None
    for entity in data.get('entities') or []:
        roles = entity.get('roles') or []
        if 'registrar' not in roles:
            continue
        vcard = entity.get('vcardArray')
        if isinstance(vcard, list) and len(vcard) > 1:
            for item in vcard[1]:
                if isinstance(item, list) and item and item[0] == 'fn' and len(item) >= 4:
                    registrar = item[3]
                    break
        if not registrar:
            registrar = entity.get('handle')
        if registrar:
            break

    expiry_date = None
    expiry_days = None
    for event in data.get('events') or []:
        action = (event.get('eventAction') or '').lower()
        if action in ('expiration', 'expire', 'expires'):
            raw = event.get('eventDate')
            if not raw:
                continue
            try:
                parsed = datetime.fromisoformat(raw.replace('Z', '+00:00'))
                expiry_date = parsed.strftime('%Y-%m-%d')
                expiry_days = (parsed - datetime.now(timezone.utc)).days
            except ValueError:
                expiry_date = raw[:10]
            break

    result = {}
    if registrar:
        result['domain_registrar'] = registrar
    if expiry_date:
        result['domain_expiry_date'] = expiry_date
    if expiry_days is not None:
        result['domain_expiry_days'] = expiry_days
    return result


def refresh_site_metadata(website):
    """Update SSL and domain fields on a Website model in-place (no commit)."""
    ssl_meta = probe_ssl(website.url)
    for key, value in ssl_meta.items():
        setattr(website, key, value)

    domain_meta = probe_domain(website.url)
    for key, value in domain_meta.items():
        setattr(website, key, value)

    return ssl_meta, domain_meta
