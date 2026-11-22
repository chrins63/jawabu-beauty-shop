"""
ChrisTech JSON API + dashboard static server.
"""

import os
import uuid
from datetime import datetime

from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

from models import (
    AlertChannel,
    AlertDispatchLog,
    CheckLog,
    MaintenanceWindow,
    SupportTicket,
    TicketReply,
    Website,
    db,
)

load_dotenv()

app = Flask(__name__, static_folder='dist', static_url_path='/')
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'christech-dev-secret-key-replace-in-prod')

DB_USER = os.getenv('DB_USER', 'postgres')
DB_PASSWORD = os.getenv('DB_PASSWORD', 'postgres')
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_NAME = os.getenv('DB_NAME', 'christech_db')

custom_database_url = os.getenv('DATABASE_URL')
if custom_database_url:
    if custom_database_url.startswith('postgres://'):
        custom_database_url = custom_database_url.replace('postgres://', 'postgresql://', 1)
    app.config['SQLALCHEMY_DATABASE_URI'] = custom_database_url
elif os.getenv('USE_SQLITE', 'true').lower() in ('true', '1', 'yes'):
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'christech.db')
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
    print('[ChrisTech] Running with SQLite:', db_path)
else:
    app.config['SQLALCHEMY_DATABASE_URI'] = (
        f'postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}'
    )

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)
CORS(app, resources={r'/api/*': {'origins': '*'}})


def init_db():
    with app.app_context():
        try:
            db.create_all()
            print('[ChrisTech] Database tables verified / created successfully.')
        except Exception as e:
            print(f'[ChrisTech ERROR] Failed to initialize database: {e}')


def fmt_dt(value):
    if value is None:
        return None
    if isinstance(value, str):
        return value.replace('T', ' ')[:19]
    return value.strftime('%Y-%m-%d %H:%M:%S')


def serialize_log(log):
    return {
        'id': log.id,
        'website_id': log.website_id,
        'is_up': log.is_up,
        'status_code': log.status_code,
        'response_time_ms': log.response_time_ms,
        'error_message': log.error_message,
        'checked_at': fmt_dt(log.checked_at),
    }


def serialize_website(website, log_limit=50):
    logs = [serialize_log(log) for log in website.check_logs.limit(log_limit).all()]
    return {
        'id': website.id,
        'name': website.name,
        'url': website.url,
        'check_interval_minutes': website.check_interval_minutes,
        'keyword': website.keyword,
        'is_active': website.is_active,
        'created_at': fmt_dt(website.created_at),
        'ssl_issuer': website.ssl_issuer,
        'ssl_expiry_days': website.ssl_expiry_days,
        'ssl_expiry_date': website.ssl_expiry_date,
        'domain_expiry_days': website.domain_expiry_days,
        'domain_expiry_date': website.domain_expiry_date,
        'domain_registrar': website.domain_registrar,
        'status': website.status,
        'uptime_percentage': website.uptime_percentage,
        'logs': logs,
    }


def serialize_reply(reply):
    return {
        'id': reply.id,
        'ticket_id': reply.ticket_id,
        'author_name': reply.author_name,
        'author_email': reply.author_email,
        'is_staff': reply.is_staff,
        'is_internal_note': reply.is_internal_note,
        'message': reply.message,
        'created_at': fmt_dt(reply.created_at),
    }


def serialize_ticket(ticket, include_replies=True):
    payload = {
        'id': ticket.id,
        'ticket_number': ticket.ticket_number,
        'website_id': ticket.website_id,
        'subject': ticket.subject,
        'description': ticket.description,
        'requester_name': ticket.requester_name,
        'requester_email': ticket.requester_email,
        'category': ticket.category,
        'priority': ticket.priority,
        'status': ticket.status,
        'is_automated_incident': ticket.is_automated_incident,
        'created_at': fmt_dt(ticket.created_at),
        'updated_at': fmt_dt(ticket.updated_at),
        'replies': [],
    }
    if include_replies:
        payload['replies'] = [serialize_reply(r) for r in ticket.replies.all()]
    return payload


def serialize_channel(channel):
    return {
        'id': channel.id,
        'type': channel.type,
        'name': channel.name,
        'enabled': channel.enabled,
        'webhook_url': channel.webhook_url,
        'telegram_bot_token': channel.telegram_bot_token,
        'telegram_chat_id': channel.telegram_chat_id,
        'custom_headers': channel.custom_headers,
        'events': channel.event_list(),
        'last_dispatched_at': fmt_dt(channel.last_dispatched_at),
    }


def serialize_maintenance(window):
    return {
        'id': window.id,
        'title': window.title,
        'description': window.description or '',
        'website_ids': window.website_id_list(),
        'start_time': window.start_time,
        'end_time': window.end_time,
        'suppress_alerts': window.suppress_alerts,
        'status': window.status,
        'created_at': fmt_dt(window.created_at),
    }


def serialize_dispatch(log):
    return {
        'id': log.id,
        'channel_type': log.channel_type,
        'channel_name': log.channel_name,
        'event': log.event,
        'website_name': log.website_name,
        'status': log.status,
        'timestamp': fmt_dt(log.timestamp),
        'payload_summary': log.payload_summary,
    }


def next_ticket_number(prefix='CT'):
    suffix = int(datetime.utcnow().timestamp()) % 100000
    return f'{prefix}-{suffix:05d}'


def ids_to_text(ids):
    if not ids:
        return ''
    return ','.join(str(i) for i in ids)


def events_to_text(events):
    if not events:
        return 'down,up'
    if isinstance(events, str):
        return events
    return ','.join(events)


def json_error(message, status=400):
    return jsonify({'error': message}), status


@app.route('/api/health')
def health():
    return jsonify({'ok': True, 'service': 'christech'})


@app.route('/api/bootstrap')
def bootstrap():
    websites = Website.query.order_by(Website.created_at.desc()).all()
    tickets = SupportTicket.query.order_by(SupportTicket.created_at.desc()).all()
    channels = AlertChannel.query.order_by(AlertChannel.name.asc()).all()
    windows = MaintenanceWindow.query.order_by(MaintenanceWindow.created_at.desc()).all()
    logs = AlertDispatchLog.query.order_by(AlertDispatchLog.timestamp.desc()).limit(100).all()
    return jsonify({
        'websites': [serialize_website(w) for w in websites],
        'tickets': [serialize_ticket(t) for t in tickets],
        'channels': [serialize_channel(c) for c in channels],
        'maintenance': [serialize_maintenance(w) for w in windows],
        'dispatch_logs': [serialize_dispatch(l) for l in logs],
    })


@app.route('/api/websites', methods=['GET'])
def list_websites():
    websites = Website.query.order_by(Website.created_at.desc()).all()
    return jsonify([serialize_website(w) for w in websites])


@app.route('/api/websites', methods=['POST'])
def create_website():
    data = request.get_json(silent=True) or {}
    name = (data.get('name') or '').strip()
    url = (data.get('url') or '').strip()
    keyword = (data.get('keyword') or '').strip() or None
    interval = data.get('check_interval_minutes', 5)

    if not name or not url:
        return json_error('Both site name and URL are required.')
    if not (url.startswith('http://') or url.startswith('https://')):
        url = 'https://' + url
    try:
        interval_int = int(interval)
        if interval_int < 1:
            interval_int = 1
    except (TypeError, ValueError):
        interval_int = 5

    website = Website(
        name=name,
        url=url,
        check_interval_minutes=interval_int,
        keyword=keyword,
        is_active=True if data.get('is_active', True) else False,
    )
    db.session.add(website)
    db.session.commit()

    try:
        from checker import check_website_and_log
        check_website_and_log(website.id, send_alert_if_changed=False)
    except Exception as check_err:
        print(f'[ChrisTech] First check skipped or error: {check_err}')

    db.session.expire_all()
    website = Website.query.get(website.id)
    return jsonify(serialize_website(website)), 201


@app.route('/api/websites/<int:website_id>', methods=['GET'])
def get_website(website_id):
    website = Website.query.get_or_404(website_id)
    return jsonify(serialize_website(website, log_limit=100))


@app.route('/api/websites/<int:website_id>/check', methods=['POST'])
def check_website_now(website_id):
    website = Website.query.get_or_404(website_id)
    from checker import check_website_and_log
    check_website_and_log(website.id, send_alert_if_changed=True)
    db.session.expire_all()
    website = db.session.get(Website, website_id)
    latest = website.latest_log if website else None
    return jsonify({
        'website': serialize_website(website),
        'log': serialize_log(latest) if latest else None,
    })


@app.route('/api/websites/<int:website_id>/toggle', methods=['POST'])
def toggle_website(website_id):
    website = Website.query.get_or_404(website_id)
    website.is_active = not website.is_active
    db.session.commit()
    return jsonify(serialize_website(website))


@app.route('/api/websites/<int:website_id>', methods=['DELETE'])
def delete_website(website_id):
    website = Website.query.get_or_404(website_id)
    db.session.delete(website)
    db.session.commit()
    return jsonify({'ok': True})


@app.route('/api/websites/<int:website_id>/ssl-alert', methods=['POST'])
def trigger_ssl_alert(website_id):
    website = Website.query.get_or_404(website_id)
    from notifier import dispatch_event
    days = website.ssl_expiry_days if website.ssl_expiry_days is not None else 5
    dispatch_event(
        event='ssl_expiring',
        site_name=website.name,
        site_url=website.url,
        summary=f'SSL certificate for {website.name} expires in {days} day(s).',
        extra={'ssl_expiry_days': days, 'ssl_expiry_date': website.ssl_expiry_date},
        website_id=website.id,
    )
    logs = AlertDispatchLog.query.order_by(AlertDispatchLog.timestamp.desc()).limit(100).all()
    return jsonify({'ok': True, 'dispatch_logs': [serialize_dispatch(l) for l in logs]})


@app.route('/api/tickets', methods=['GET'])
def list_tickets():
    query = SupportTicket.query
    site_id = request.args.get('site_id', type=int)
    status_filter = (request.args.get('status') or '').strip()
    priority_filter = (request.args.get('priority') or '').strip()
    category_filter = (request.args.get('category') or '').strip()
    search_q = (request.args.get('q') or '').strip()

    if site_id:
        query = query.filter(SupportTicket.website_id == site_id)
    if status_filter:
        query = query.filter(SupportTicket.status == status_filter)
    if priority_filter:
        query = query.filter(SupportTicket.priority == priority_filter)
    if category_filter:
        query = query.filter(SupportTicket.category == category_filter)
    if search_q:
        pattern = f'%{search_q}%'
        query = query.filter(
            db.or_(
                SupportTicket.subject.ilike(pattern),
                SupportTicket.ticket_number.ilike(pattern),
                SupportTicket.requester_name.ilike(pattern),
                SupportTicket.requester_email.ilike(pattern),
                SupportTicket.description.ilike(pattern),
            )
        )

    tickets = query.order_by(SupportTicket.created_at.desc()).all()
    return jsonify([serialize_ticket(t) for t in tickets])


@app.route('/api/tickets', methods=['POST'])
def create_ticket():
    data = request.get_json(silent=True) or {}
    website_id = data.get('website_id')
    requester_name = (data.get('requester_name') or data.get('name') or '').strip()
    requester_email = (data.get('requester_email') or data.get('email') or '').strip()
    subject = (data.get('subject') or '').strip()
    description = (data.get('description') or data.get('message') or '').strip()
    category = (data.get('category') or 'general').strip()
    priority = (data.get('priority') or 'medium').strip()

    if not website_id or not requester_name or not requester_email or not subject or not description:
        return json_error('Missing required fields.')

    website = Website.query.get(website_id)
    if not website:
        return json_error('Monitored website not found.', 404)

    ticket = SupportTicket(
        ticket_number=next_ticket_number('CT'),
        website_id=website.id,
        subject=subject,
        description=description,
        requester_name=requester_name,
        requester_email=requester_email,
        category=category,
        priority=priority,
        status='open',
        is_automated_incident=bool(data.get('is_automated_incident')),
    )
    db.session.add(ticket)
    db.session.commit()
    return jsonify(serialize_ticket(ticket)), 201


@app.route('/api/tickets/<int:ticket_id>', methods=['GET'])
def get_ticket(ticket_id):
    ticket = SupportTicket.query.get_or_404(ticket_id)
    return jsonify(serialize_ticket(ticket))


@app.route('/api/tickets/<int:ticket_id>', methods=['PATCH'])
def update_ticket(ticket_id):
    ticket = SupportTicket.query.get_or_404(ticket_id)
    data = request.get_json(silent=True) or {}
    status = data.get('status')
    priority = data.get('priority')
    if status and status in ['open', 'in_progress', 'waiting', 'resolved', 'closed']:
        ticket.status = status
    if priority and priority in ['low', 'medium', 'high', 'urgent']:
        ticket.priority = priority
    ticket.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify(serialize_ticket(ticket))


@app.route('/api/tickets/<int:ticket_id>/replies', methods=['POST'])
def add_ticket_reply(ticket_id):
    ticket = SupportTicket.query.get_or_404(ticket_id)
    data = request.get_json(silent=True) or {}
    message = (data.get('message') or '').strip()
    if not message:
        return json_error('Reply message cannot be empty.')

    reply = TicketReply(
        ticket_id=ticket.id,
        author_name=(data.get('author_name') or 'Support Team').strip() or 'Support Team',
        author_email=(data.get('author_email') or '').strip() or None,
        is_staff=bool(data.get('is_staff', True)),
        is_internal_note=bool(data.get('is_internal_note')),
        message=message,
        created_at=datetime.utcnow(),
    )
    new_status = (data.get('update_status') or data.get('status') or '').strip()
    ticket.updated_at = datetime.utcnow()
    if new_status and new_status in ['open', 'in_progress', 'waiting', 'resolved', 'closed']:
        ticket.status = new_status

    db.session.add(reply)
    db.session.commit()
    return jsonify(serialize_ticket(ticket)), 201


@app.route('/api/support/submit', methods=['POST', 'OPTIONS'])
def api_submit_ticket():
    if request.method == 'OPTIONS':
        response = jsonify({'ok': True})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        return response

    data = request.get_json(silent=True) or request.form.to_dict()
    website_id = data.get('website_id')
    name = (data.get('name') or data.get('requester_name') or '').strip()
    email = (data.get('email') or data.get('requester_email') or '').strip()
    subject = (data.get('subject') or '').strip()
    message = (data.get('message') or data.get('description') or '').strip()
    category = (data.get('category') or 'general').strip()
    priority = (data.get('priority') or 'medium').strip()

    if not website_id or not name or not email or not subject or not message:
        return json_error('Missing required fields (website_id, name, email, subject, message)')

    website = Website.query.get(website_id)
    if not website:
        return json_error(f'Monitored website with ID {website_id} not found', 404)

    ticket = SupportTicket(
        ticket_number=next_ticket_number('CT'),
        website_id=website.id,
        subject=subject,
        description=message,
        requester_name=name,
        requester_email=email,
        category=category,
        priority=priority,
        status='open',
        is_automated_incident=False,
    )
    db.session.add(ticket)
    db.session.commit()
    response = jsonify({
        'success': True,
        'ticket_number': ticket.ticket_number,
        'ticket': serialize_ticket(ticket),
        'message': 'Support ticket received successfully. Our team will review it shortly.',
    })
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response, 201


@app.route('/api/support/widget.js')
def support_widget_js():
    origin = os.getenv('APP_URL') or request.host_url.rstrip('/')
    script = f"""
(function() {{
  var script = document.currentScript;
  var websiteId = script.getAttribute('data-website-id');
  var position = script.getAttribute('data-position') || 'bottom-right';
  var accent = script.getAttribute('data-accent') || '#2563eb';
  var label = script.getAttribute('data-label') || 'Support';
  var api = '{origin}/api/support/submit';

  var btn = document.createElement('button');
  btn.textContent = label;
  btn.style.cssText = 'position:fixed;z-index:99999;' + (position === 'bottom-left' ? 'left:24px;' : 'right:24px;') +
    'bottom:24px;background:' + accent + ';color:#fff;border:0;border-radius:999px;padding:12px 18px;font:600 14px/1 system-ui,sans-serif;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.25);';
  document.body.appendChild(btn);

  var panel = document.createElement('div');
  panel.style.cssText = 'display:none;position:fixed;z-index:100000;' + (position === 'bottom-left' ? 'left:24px;' : 'right:24px;') +
    'bottom:76px;width:320px;background:#0f172a;color:#e2e8f0;border:1px solid #1e293b;border-radius:16px;padding:16px;font:14px/1.4 system-ui,sans-serif;box-shadow:0 20px 50px rgba(0,0,0,.4);';
  panel.innerHTML = '<form id="ct-widget-form">' +
    '<div style="font-weight:700;margin-bottom:10px;">ChrisTech Support</div>' +
    '<input name="name" placeholder="Your name" required style="width:100%;margin:0 0 8px;padding:8px;border-radius:8px;border:1px solid #334155;background:#1e293b;color:#fff;">' +
    '<input name="email" type="email" placeholder="Email" required style="width:100%;margin:0 0 8px;padding:8px;border-radius:8px;border:1px solid #334155;background:#1e293b;color:#fff;">' +
    '<input name="subject" placeholder="Subject" required style="width:100%;margin:0 0 8px;padding:8px;border-radius:8px;border:1px solid #334155;background:#1e293b;color:#fff;">' +
    '<textarea name="message" placeholder="How can we help?" required style="width:100%;margin:0 0 8px;padding:8px;border-radius:8px;border:1px solid #334155;background:#1e293b;color:#fff;min-height:80px;"></textarea>' +
    '<button type="submit" style="width:100%;background:' + accent + ';color:#fff;border:0;border-radius:8px;padding:10px;font-weight:700;cursor:pointer;">Send</button>' +
    '<div id="ct-widget-status" style="margin-top:8px;font-size:12px;color:#94a3b8;"></div></form>';
  document.body.appendChild(panel);

  btn.addEventListener('click', function() {{
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  }});
  panel.querySelector('form').addEventListener('submit', function(e) {{
    e.preventDefault();
    var fd = new FormData(e.target);
    var status = document.getElementById('ct-widget-status');
    status.textContent = 'Sending...';
    fetch(api, {{
      method: 'POST',
      headers: {{ 'Content-Type': 'application/json' }},
      body: JSON.stringify({{
        website_id: Number(websiteId),
        name: fd.get('name'),
        email: fd.get('email'),
        subject: fd.get('subject'),
        message: fd.get('message')
      }})
    }}).then(function(r) {{ return r.json(); }}).then(function(data) {{
      status.textContent = data.ticket_number ? ('Ticket ' + data.ticket_number + ' created.') : (data.error || 'Sent.');
    }}).catch(function() {{
      status.textContent = 'Could not send ticket.';
    }});
  }});
}})();
"""
    return script, 200, {'Content-Type': 'application/javascript'}


@app.route('/api/channels', methods=['GET'])
def list_channels():
    channels = AlertChannel.query.order_by(AlertChannel.name.asc()).all()
    return jsonify([serialize_channel(c) for c in channels])


@app.route('/api/channels', methods=['POST'])
def upsert_channel():
    data = request.get_json(silent=True) or {}
    channel_id = (data.get('id') or f"chan_{uuid.uuid4().hex[:10]}").strip()
    channel = AlertChannel.query.get(channel_id)
    created = False
    if not channel:
        channel = AlertChannel(id=channel_id)
        db.session.add(channel)
        created = True

    if not (data.get('name') or '').strip() or not (data.get('type') or '').strip():
        return json_error('Channel name and type are required.')

    channel.type = data.get('type')
    channel.name = data.get('name').strip()
    channel.enabled = bool(data.get('enabled', True))
    channel.webhook_url = data.get('webhook_url') or None
    channel.telegram_bot_token = data.get('telegram_bot_token') or None
    channel.telegram_chat_id = data.get('telegram_chat_id') or None
    channel.custom_headers = data.get('custom_headers') or None
    channel.events = events_to_text(data.get('events'))
    db.session.commit()
    return jsonify(serialize_channel(channel)), 201 if created else 200


@app.route('/api/channels/<channel_id>', methods=['DELETE'])
def delete_channel(channel_id):
    channel = AlertChannel.query.get_or_404(channel_id)
    db.session.delete(channel)
    db.session.commit()
    return jsonify({'ok': True})


@app.route('/api/channels/<channel_id>/toggle', methods=['POST'])
def toggle_channel(channel_id):
    channel = AlertChannel.query.get_or_404(channel_id)
    channel.enabled = not channel.enabled
    db.session.commit()
    return jsonify(serialize_channel(channel))


@app.route('/api/channels/<channel_id>/test', methods=['POST'])
def test_channel(channel_id):
    channel = AlertChannel.query.get_or_404(channel_id)
    data = request.get_json(silent=True) or {}
    website = None
    website_id = data.get('website_id')
    if website_id:
        website = Website.query.get(website_id)
    if not website:
        website = Website.query.first()
    site_name = website.name if website else 'Test Site'
    site_url = website.url if website else 'https://example.com'

    from notifier import dispatch_channel
    status, summary = dispatch_channel(
        channel,
        'down',
        site_name,
        site_url,
        f'[Test Dispatch] Simulated HTTP 502 alert for {site_name}',
        extra={'status_code': 502, 'response_time_ms': 840},
        simulate_if_unconfigured=True,
    )
    logs = AlertDispatchLog.query.order_by(AlertDispatchLog.timestamp.desc()).limit(100).all()
    return jsonify({
        'ok': True,
        'status': status,
        'payload_summary': summary,
        'channel': serialize_channel(channel),
        'dispatch_logs': [serialize_dispatch(l) for l in logs],
    })


@app.route('/api/maintenance', methods=['GET'])
def list_maintenance():
    windows = MaintenanceWindow.query.order_by(MaintenanceWindow.created_at.desc()).all()
    return jsonify([serialize_maintenance(w) for w in windows])


@app.route('/api/maintenance', methods=['POST'])
def upsert_maintenance():
    data = request.get_json(silent=True) or {}
    window_id = (data.get('id') or f"maint_{uuid.uuid4().hex[:10]}").strip()
    window = MaintenanceWindow.query.get(window_id)
    created = False
    if not window:
        window = MaintenanceWindow(id=window_id, created_at=datetime.utcnow())
        db.session.add(window)
        created = True

    title = (data.get('title') or '').strip()
    if not title:
        return json_error('Maintenance title is required.')

    window.title = title
    window.description = data.get('description') or ''
    window.website_ids = ids_to_text(data.get('website_ids') or [])
    window.start_time = data.get('start_time') or ''
    window.end_time = data.get('end_time') or ''
    window.suppress_alerts = bool(data.get('suppress_alerts', True))
    window.status = data.get('status') or window.status or 'upcoming'
    db.session.commit()
    return jsonify(serialize_maintenance(window)), 201 if created else 200


@app.route('/api/maintenance/<window_id>', methods=['DELETE'])
def delete_maintenance(window_id):
    window = MaintenanceWindow.query.get_or_404(window_id)
    db.session.delete(window)
    db.session.commit()
    return jsonify({'ok': True})


@app.route('/api/maintenance/<window_id>/status', methods=['POST'])
def update_maintenance_status(window_id):
    window = MaintenanceWindow.query.get_or_404(window_id)
    data = request.get_json(silent=True) or {}
    status = data.get('status')
    if status not in ['upcoming', 'in_progress', 'completed']:
        return json_error('Invalid maintenance status.')
    previous = window.status
    window.status = status
    db.session.commit()

    if status == 'in_progress' and previous != 'in_progress':
        from notifier import dispatch_event
        sites = Website.query.all()
        covered = [s for s in sites if window.covers_website(s.id)]
        for site in covered:
            dispatch_event(
                event='maintenance',
                site_name=site.name,
                site_url=site.url,
                summary=f"Maintenance started: {window.title}",
                website_id=site.id,
            )
    return jsonify(serialize_maintenance(window))


@app.route('/api/status-page')
def status_page():
    websites = Website.query.order_by(Website.name.asc()).all()
    tickets = SupportTicket.query.filter(
        SupportTicket.is_automated_incident.is_(True),
        SupportTicket.status.notin_(['resolved', 'closed'])
    ).all()
    windows = MaintenanceWindow.query.filter(
        MaintenanceWindow.status.in_(['upcoming', 'in_progress'])
    ).all()
    return jsonify({
        'websites': [serialize_website(w) for w in websites],
        'tickets': [serialize_ticket(t) for t in tickets],
        'maintenance': [serialize_maintenance(w) for w in windows],
    })


@app.route('/api/sla')
def sla_reports():
    websites = Website.query.order_by(Website.name.asc()).all()
    reports = []
    for website in websites:
        logs = website.check_logs.limit(500).all()
        total = len(logs)
        failed = sum(1 for log in logs if not log.is_up)
        up = total - failed
        actual = round((up / total) * 100.0, 2) if total else 100.0
        interval = website.check_interval_minutes or 1
        latencies = sorted([log.response_time_ms for log in logs if log.response_time_ms is not None])
        p95 = latencies[int(len(latencies) * 0.95)] if latencies else 0
        reports.append({
            'website_id': website.id,
            'period': datetime.utcnow().strftime('%B %Y'),
            'target_sla_percentage': 99.9,
            'actual_uptime_percentage': actual,
            'sla_breached': actual < 99.9,
            'total_checks': total,
            'failed_checks': failed,
            'total_downtime_minutes': failed * interval,
            'allowed_downtime_minutes': round(43200 * (1 - 99.9 / 100)),
            'mttr_minutes': interval,
            'avg_latency_ms': round(sum(latencies) / len(latencies)) if latencies else 0,
            'min_latency_ms': latencies[0] if latencies else 0,
            'max_latency_ms': latencies[-1] if latencies else 0,
            'p95_latency_ms': p95,
            'generated_at': fmt_dt(datetime.utcnow()),
        })
    return jsonify(reports)


@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    dist_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dist')
    if path.startswith('api/'):
        return json_error('Not found', 404)
    if path and os.path.exists(os.path.join(dist_dir, path)):
        return send_from_directory(dist_dir, path)
    index_path = os.path.join(dist_dir, 'index.html')
    if os.path.exists(index_path):
        return send_from_directory(dist_dir, 'index.html')
    return jsonify({
        'service': 'ChrisTech API',
        'dashboard': 'Run npm run dev for the React dashboard on port 3000',
        'health': '/api/health',
    })


if __name__ == '__main__':
    init_db()
    port = int(os.getenv('PORT', 5000))
    debug_mode = os.getenv('FLASK_DEBUG', 'true').lower() in ('true', '1')
    print(f'[ChrisTech] API starting at http://localhost:{port}')
    app.run(host='0.0.0.0', port=port, debug=debug_mode)
