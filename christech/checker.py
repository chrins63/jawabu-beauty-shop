"""
ChrisTech website checker: HTTP ping, keyword validation, logging, incidents, alerts.
"""

import time
from datetime import datetime

import requests

from models import CheckLog, SupportTicket, TicketReply, Website, db
from notifier import dispatch_event, send_alert_email
from ssl_probe import refresh_site_metadata

DEFAULT_HEADERS = {
    'User-Agent': 'ChrisTech-Monitor/1.0 (+https://github.com/chrins63/chrinstech)'
}
TIMEOUT_SECONDS = 10


def ping_website(url, keyword=None):
    start_time = time.time()

    try:
        response = requests.get(
            url,
            headers=DEFAULT_HEADERS,
            timeout=TIMEOUT_SECONDS,
            allow_redirects=True
        )
        response_time_ms = int(response.elapsed.total_seconds() * 1000)
        status_code = response.status_code

        if status_code >= 400:
            return {
                'is_up': False,
                'status_code': status_code,
                'response_time_ms': response_time_ms,
                'error_message': f"HTTP Error {status_code}: {response.reason or 'Unhealthy status'}"
            }

        if keyword and keyword.strip():
            target_keyword = keyword.strip()
            if target_keyword.lower() not in response.text.lower():
                return {
                    'is_up': False,
                    'status_code': status_code,
                    'response_time_ms': response_time_ms,
                    'error_message': f"Keyword '{target_keyword}' was not found in response HTML."
                }

        return {
            'is_up': True,
            'status_code': status_code,
            'response_time_ms': response_time_ms,
            'error_message': None
        }

    except requests.exceptions.Timeout:
        elapsed = int((time.time() - start_time) * 1000)
        return {
            'is_up': False,
            'status_code': None,
            'response_time_ms': elapsed,
            'error_message': f"Connection timed out after {TIMEOUT_SECONDS} seconds."
        }

    except requests.exceptions.SSLError as ssl_err:
        elapsed = int((time.time() - start_time) * 1000)
        return {
            'is_up': False,
            'status_code': None,
            'response_time_ms': elapsed,
            'error_message': f"SSL / HTTPS Certificate error: {ssl_err}"
        }

    except requests.exceptions.ConnectionError:
        elapsed = int((time.time() - start_time) * 1000)
        return {
            'is_up': False,
            'status_code': None,
            'response_time_ms': elapsed,
            'error_message': "Connection failed. Server may be unreachable or DNS lookup failed."
        }

    except requests.exceptions.RequestException as req_err:
        elapsed = int((time.time() - start_time) * 1000)
        return {
            'is_up': False,
            'status_code': None,
            'response_time_ms': elapsed,
            'error_message': f"Request error: {req_err}"
        }

    except Exception as unexpected:
        elapsed = int((time.time() - start_time) * 1000)
        return {
            'is_up': False,
            'status_code': None,
            'response_time_ms': elapsed,
            'error_message': f"Unexpected check error: {unexpected}"
        }


def _app_context():
    from app import app
    return app.app_context()


def check_website_and_log(website_id, send_alert_if_changed=True, refresh_ssl=True):
    with _app_context():
        website = Website.query.get(website_id)
        if not website:
            print(f"[ChrisTech Checker] Website with ID {website_id} not found.")
            return None

        last_log = website.latest_log
        previous_status_is_up = last_log.is_up if last_log is not None else None

        result = ping_website(website.url, website.keyword)

        new_log = CheckLog(
            website_id=website.id,
            is_up=result['is_up'],
            status_code=result['status_code'],
            response_time_ms=result['response_time_ms'],
            error_message=result['error_message'],
            checked_at=datetime.utcnow()
        )
        db.session.add(new_log)

        if refresh_ssl:
            try:
                refresh_site_metadata(website)
            except Exception as probe_err:
                print(f"[ChrisTech Checker] Metadata probe skipped: {probe_err}")

        db.session.commit()

        new_status_is_up = result['is_up']
        status_label = "UP  " if new_status_is_up else "DOWN"
        time_display = f"{result['response_time_ms']}ms" if result['response_time_ms'] is not None else "N/A"
        code_display = f"HTTP {result['status_code']}" if result['status_code'] is not None else "NO-RESP"
        print(f"[{datetime.utcnow().strftime('%H:%M:%S')}] [{status_label}] {website.name} ({website.url}) - {code_display}, {time_display}")

        extra = {
            'status_code': result['status_code'],
            'response_time_ms': result['response_time_ms'],
            'error_message': result['error_message'],
        }

        status_changed = previous_status_is_up is not None and previous_status_is_up != new_status_is_up

        if send_alert_if_changed and status_changed:
            print(f"[STATUS CHANGE] '{website.name}': "
                  f"{'UP' if previous_status_is_up else 'DOWN'} -> {'UP' if new_status_is_up else 'DOWN'}")

            send_alert_email(
                site_name=website.name,
                site_url=website.url,
                is_up=new_status_is_up,
                status_code=result['status_code'],
                response_time_ms=result['response_time_ms'],
                error_message=result['error_message']
            )

            event = 'up' if new_status_is_up else 'down'
            summary = (
                f"RECOVERED: {website.name} returned HTTP {result['status_code']} in {result['response_time_ms']}ms"
                if new_status_is_up
                else f"OUTAGE: {website.name} is DOWN ({result['error_message'] or 'unreachable'})"
            )
            dispatch_event(
                event=event,
                site_name=website.name,
                site_url=website.url,
                summary=summary,
                extra=extra,
                website_id=website.id,
            )

        if not new_status_is_up:
            try:
                existing_incident = SupportTicket.query.filter(
                    SupportTicket.website_id == website.id,
                    SupportTicket.is_automated_incident.is_(True),
                    SupportTicket.status.notin_(['resolved', 'closed'])
                ).first()

                if not existing_incident:
                    timestamp_suffix = int(datetime.utcnow().timestamp()) % 100000
                    incident_ticket = SupportTicket(
                        ticket_number=f"INC-{timestamp_suffix:05d}",
                        website_id=website.id,
                        subject=f"[OUTAGE INCIDENT] {website.name} is DOWN",
                        description=(
                            f"Automated monitoring detected an outage at {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}.\n\n"
                            f"Target URL: {website.url}\n"
                            f"HTTP Status: {result['status_code'] if result['status_code'] else 'Connection Failed'}\n"
                            f"Latency: {result['response_time_ms']}ms\n"
                            f"Diagnostic Error: {result['error_message'] or 'Unreachable endpoint'}"
                        ),
                        requester_name="ChrisTech Monitor",
                        requester_email="alerts@christech.local",
                        category="outage",
                        priority="urgent",
                        status="open",
                        is_automated_incident=True
                    )
                    db.session.add(incident_ticket)
                    db.session.commit()
                    print(f"[SUPPORT] Opened incident #{incident_ticket.ticket_number} for {website.name}.")
            except Exception as inc_err:
                db.session.rollback()
                print(f"[SUPPORT] Could not auto-create incident ticket: {inc_err}")
        else:
            try:
                open_incidents = SupportTicket.query.filter(
                    SupportTicket.website_id == website.id,
                    SupportTicket.is_automated_incident.is_(True),
                    SupportTicket.status.notin_(['resolved', 'closed'])
                ).all()

                for inc in open_incidents:
                    inc.status = 'resolved'
                    inc.updated_at = datetime.utcnow()
                    recovery_reply = TicketReply(
                        ticket_id=inc.id,
                        author_name="ChrisTech Monitor",
                        author_email="alerts@christech.local",
                        is_staff=True,
                        is_internal_note=False,
                        message=(
                            f"Service recovery confirmed at {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}. "
                            f"Endpoint returned HTTP {result['status_code']} with latency of {result['response_time_ms']}ms. "
                            f"Incident automatically marked as RESOLVED."
                        ),
                        created_at=datetime.utcnow()
                    )
                    db.session.add(recovery_reply)
                if open_incidents:
                    db.session.commit()
                    print(f"[SUPPORT] Auto-resolved {len(open_incidents)} incident(s) for {website.name}.")
            except Exception as res_err:
                db.session.rollback()
                print(f"[SUPPORT] Could not auto-resolve incident tickets: {res_err}")

        return new_log


def check_all_active_websites():
    with _app_context():
        active_sites = Website.query.filter_by(is_active=True).all()
        if not active_sites:
            print(f"[{datetime.utcnow().strftime('%H:%M:%S')}] No active websites to check.")
            return

        print(f"[{datetime.utcnow().strftime('%H:%M:%S')}] Running scheduled checks for {len(active_sites)} website(s)...")
        for site in active_sites:
            try:
                check_website_and_log(site.id, send_alert_if_changed=True)
            except Exception as e:
                print(f"Error checking website '{site.name}': {e}")


if __name__ == '__main__':
    print("Testing ping_website on https://example.com ...")
    print(ping_website("https://example.com"))
