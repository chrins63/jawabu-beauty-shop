"""
ChrisTech notifier: SMTP email plus Slack, Discord, Telegram, and generic webhooks.
Unconfigured channels are simulated (logged) instead of raising.
"""

import json
import os
import smtplib
import uuid
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import requests
from dotenv import load_dotenv

load_dotenv()


def get_smtp_config():
    return {
        'server': os.getenv('SMTP_SERVER', 'smtp.gmail.com'),
        'port': int(os.getenv('SMTP_PORT', 587)),
        'user': os.getenv('SMTP_EMAIL', ''),
        'password': os.getenv('SMTP_PASSWORD', ''),
        'recipient': os.getenv('ALERT_RECIPIENT_EMAIL', ''),
    }


def send_alert_email(site_name, site_url, is_up, status_code=None, response_time_ms=None, error_message=None):
    config = get_smtp_config()
    now_str = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')

    if is_up:
        status_text = "RECOVERED / UP"
        subject = f"[RESOLVED] ChrisTech Monitor: '{site_name}' is UP"
        accent_color = "#10b981"
        status_badge = "ONLINE"
    else:
        status_text = "OUTAGE / DOWN"
        subject = f"[ALERT] ChrisTech Monitor: '{site_name}' is DOWN"
        accent_color = "#ef4444"
        status_badge = "OFFLINE"

    plain_body = f"""
==================================================
ChrisTech Website Monitoring Alert
==================================================

Status: {status_text}
Website Name: {site_name}
URL: {site_url}
Timestamp: {now_str}
Status Code: {status_code if status_code is not None else 'N/A'}
Response Time: {f'{response_time_ms} ms' if response_time_ms is not None else 'N/A'}
Error Details: {error_message or 'None'}
"""

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: sans-serif; background:#0f172a; color:#f8fafc; padding:24px;">
      <div style="max-width:580px;margin:0 auto;background:#1e293b;border-radius:12px;border:1px solid #334155;">
        <div style="padding:20px 24px;border-bottom:2px solid {accent_color};">
          <strong>ChrisTech Monitor</strong>
          <span style="color:{accent_color};margin-left:12px;">{status_badge}</span>
        </div>
        <div style="padding:24px;">
          <p style="font-size:20px;font-weight:700;">Website {site_name} is {status_text}</p>
          <p><a href="{site_url}" style="color:#38bdf8;">{site_url}</a></p>
          <p>Status Code: {status_code if status_code is not None else 'N/A'}</p>
          <p>Response Time: {f'{response_time_ms} ms' if response_time_ms is not None else 'N/A'}</p>
          <p>Detected At: {now_str}</p>
          {f'<p style="color:#fca5a5;">Error: {error_message}</p>' if error_message else ''}
        </div>
      </div>
    </body>
    </html>
    """

    if not config['user'] or not config['password'] or not config['recipient']:
        print("\n" + "=" * 70)
        print(f"[NOTIFIER SIMULATION] Email alert for '{site_name}' ({status_text})")
        print(f"   Subject: {subject}")
        print("   Set SMTP_EMAIL, SMTP_PASSWORD, and ALERT_RECIPIENT_EMAIL in .env for real email.")
        print("=" * 70 + "\n")
        return False

    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"ChrisTech Monitor <{config['user']}>"
        msg['To'] = config['recipient']
        msg.attach(MIMEText(plain_body, 'plain'))
        msg.attach(MIMEText(html_body, 'html'))

        with smtplib.SMTP(config['server'], config['port'], timeout=15) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(config['user'], config['password'])
            server.sendmail(config['user'], [config['recipient']], msg.as_string())

        print(f"[NOTIFIER] Alert email delivered to {config['recipient']} for '{site_name}'.")
        return True
    except Exception as exc:
        print(f"[NOTIFIER ERROR] Failed to send email via SMTP: {exc}")
        return False


def _parse_headers(raw):
    if not raw:
        return {}
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, dict):
            return {str(k): str(v) for k, v in parsed.items()}
    except (TypeError, ValueError):
        pass
    return {}


def _payload(event, site_name, site_url, summary, extra=None):
    body = {
        'source': 'ChrisTech',
        'event': event,
        'website_name': site_name,
        'website_url': site_url,
        'summary': summary,
        'timestamp': datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC'),
    }
    if extra:
        body.update(extra)
    return body


def _record_dispatch(channel, event, site_name, status, summary):
    from models import db, AlertDispatchLog

    log = AlertDispatchLog(
        id=f"disp_{uuid.uuid4().hex[:12]}",
        channel_type=channel.type,
        channel_name=channel.name,
        event=event,
        website_name=site_name,
        status=status,
        timestamp=datetime.utcnow(),
        payload_summary=summary,
    )
    db.session.add(log)
    channel.last_dispatched_at = datetime.utcnow()
    try:
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        print(f"[NOTIFIER] Could not persist dispatch log: {exc}")
    return log


def dispatch_channel(channel, event, site_name, site_url, summary, extra=None, simulate_if_unconfigured=True):
    """Send one alert to a single channel. Returns (status, summary)."""
    payload = _payload(event, site_name, site_url, summary, extra)
    channel_type = (channel.type or '').lower()
    headers = _parse_headers(channel.custom_headers)
    delivered = False
    result_status = 'simulated'
    result_summary = summary

    try:
        if channel_type in ('slack', 'discord', 'webhook'):
            if not channel.webhook_url:
                result_summary = f"[SIMULATED {channel_type.upper()}] {summary} (no webhook URL configured)"
            else:
                if channel_type == 'slack':
                    body = {'text': f"ChrisTech [{event.upper()}]: {site_name}\n{summary}\n{site_url}"}
                elif channel_type == 'discord':
                    color = 0x10B981 if event == 'up' else 0xEF4444
                    body = {
                        'embeds': [{
                            'title': f"ChrisTech {event.upper()}: {site_name}",
                            'description': summary,
                            'url': site_url,
                            'color': color,
                        }]
                    }
                else:
                    body = payload
                    headers.setdefault('Content-Type', 'application/json')
                response = requests.post(channel.webhook_url, json=body, headers=headers, timeout=10)
                response.raise_for_status()
                delivered = True
                result_status = 'delivered'
                result_summary = f"{channel_type.upper()} notification sent: {summary}"

        elif channel_type == 'telegram':
            if not channel.telegram_bot_token or not channel.telegram_chat_id:
                result_summary = f"[SIMULATED TELEGRAM] {summary} (bot token or chat id missing)"
            else:
                text = f"ChrisTech [{event.upper()}] {site_name}\n{summary}\n{site_url}"
                response = requests.post(
                    f"https://api.telegram.org/bot{channel.telegram_bot_token}/sendMessage",
                    json={'chat_id': channel.telegram_chat_id, 'text': text},
                    timeout=10,
                )
                response.raise_for_status()
                delivered = True
                result_status = 'delivered'
                result_summary = f"TELEGRAM notification sent: {summary}"

        elif channel_type == 'email':
            is_up = event == 'up'
            sent = send_alert_email(
                site_name=site_name,
                site_url=site_url,
                is_up=is_up,
                status_code=(extra or {}).get('status_code'),
                response_time_ms=(extra or {}).get('response_time_ms'),
                error_message=(extra or {}).get('error_message'),
            )
            if sent:
                delivered = True
                result_status = 'delivered'
                result_summary = f"EMAIL notification sent: {summary}"
            else:
                result_summary = f"[SIMULATED EMAIL] {summary}"
        else:
            result_summary = f"[SIMULATED {channel_type or 'channel'}] {summary}"

        if not delivered and not simulate_if_unconfigured:
            result_status = 'failed'

    except Exception as exc:
        result_status = 'failed'
        result_summary = f"{channel_type.upper()} dispatch failed: {exc}"
        print(f"[NOTIFIER] Channel '{channel.name}' failed: {exc}")

    if result_status == 'simulated':
        print(f"[NOTIFIER SIMULATION] {channel.type} '{channel.name}': {result_summary}")

    _record_dispatch(channel, event, site_name, result_status, result_summary)
    return result_status, result_summary


def dispatch_event(event, site_name, site_url, summary, extra=None, website_id=None):
    """
    Dispatch to every enabled channel that listens for this event.
    Skips dispatch when a covering in-progress maintenance window suppresses alerts.
    """
    from models import AlertChannel, MaintenanceWindow

    if website_id is not None:
        windows = MaintenanceWindow.query.filter_by(status='in_progress', suppress_alerts=True).all()
        for window in windows:
            if window.covers_website(website_id):
                print(f"[NOTIFIER] Alerts suppressed by maintenance '{window.title}' for {site_name}.")
                return []

    channels = AlertChannel.query.filter_by(enabled=True).all()
    results = []
    for channel in channels:
        if event not in channel.event_list():
            continue
        status, payload_summary = dispatch_channel(
            channel, event, site_name, site_url, summary, extra=extra
        )
        results.append((channel, status, payload_summary))
    return results
