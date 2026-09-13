"""
ChrisTech database models.
"""

from datetime import datetime

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


def utcnow():
    return datetime.utcnow()


class Website(db.Model):
    __tablename__ = 'website'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    url = db.Column(db.String(500), nullable=False)
    check_interval_minutes = db.Column(db.Integer, default=5, nullable=False)
    keyword = db.Column(db.String(200), nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)

    ssl_issuer = db.Column(db.String(200), nullable=True)
    ssl_expiry_days = db.Column(db.Integer, nullable=True)
    ssl_expiry_date = db.Column(db.String(50), nullable=True)
    domain_expiry_days = db.Column(db.Integer, nullable=True)
    domain_expiry_date = db.Column(db.String(50), nullable=True)
    domain_registrar = db.Column(db.String(200), nullable=True)

    check_logs = db.relationship(
        'CheckLog',
        backref='website',
        lazy='dynamic',
        cascade='all, delete-orphan',
        order_by='desc(CheckLog.checked_at)'
    )

    support_tickets = db.relationship(
        'SupportTicket',
        backref='website',
        lazy='dynamic',
        cascade='all, delete-orphan',
        order_by='desc(SupportTicket.created_at)'
    )

    @property
    def latest_log(self):
        return self.check_logs.first()

    @property
    def open_tickets_count(self):
        return self.support_tickets.filter(SupportTicket.status.notin_(['resolved', 'closed'])).count()

    @property
    def urgent_tickets_count(self):
        return self.support_tickets.filter(
            SupportTicket.priority == 'urgent',
            SupportTicket.status.notin_(['resolved', 'closed'])
        ).count()

    @property
    def status(self):
        if not self.is_active:
            return 'PAUSED'
        last = self.latest_log
        if not last:
            return 'PENDING'
        return 'UP' if last.is_up else 'DOWN'

    @property
    def uptime_percentage(self):
        logs = self.check_logs.limit(100).all()
        if not logs:
            return 100.0
        up_count = sum(1 for log in logs if log.is_up)
        return round((up_count / len(logs)) * 100.0, 1)

    def __repr__(self):
        return f"<Website {self.name} ({self.url})>"


class CheckLog(db.Model):
    __tablename__ = 'check_log'

    id = db.Column(db.Integer, primary_key=True)
    website_id = db.Column(db.Integer, db.ForeignKey('website.id'), nullable=False, index=True)
    is_up = db.Column(db.Boolean, nullable=False)
    status_code = db.Column(db.Integer, nullable=True)
    response_time_ms = db.Column(db.Integer, nullable=True)
    error_message = db.Column(db.Text, nullable=True)
    checked_at = db.Column(db.DateTime, default=utcnow, nullable=False, index=True)

    def __repr__(self):
        status = "UP" if self.is_up else "DOWN"
        return f"<CheckLog site_id={self.website_id} status={status} code={self.status_code}>"


class SupportTicket(db.Model):
    __tablename__ = 'support_ticket'

    id = db.Column(db.Integer, primary_key=True)
    ticket_number = db.Column(db.String(30), unique=True, nullable=False, index=True)
    website_id = db.Column(db.Integer, db.ForeignKey('website.id', ondelete='CASCADE'), nullable=False, index=True)
    subject = db.Column(db.String(250), nullable=False)
    description = db.Column(db.Text, nullable=False)
    requester_name = db.Column(db.String(120), nullable=False)
    requester_email = db.Column(db.String(150), nullable=False)
    category = db.Column(db.String(50), default='general', nullable=False)
    priority = db.Column(db.String(20), default='medium', nullable=False)
    status = db.Column(db.String(30), default='open', nullable=False)
    is_automated_incident = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False, index=True)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    replies = db.relationship(
        'TicketReply',
        backref='ticket',
        lazy='dynamic',
        cascade='all, delete-orphan',
        order_by='TicketReply.created_at.asc()'
    )

    @property
    def replies_count(self):
        return self.replies.count()

    def __repr__(self):
        return f"<SupportTicket {self.ticket_number} - {self.subject} ({self.status})>"


class TicketReply(db.Model):
    __tablename__ = 'ticket_reply'

    id = db.Column(db.Integer, primary_key=True)
    ticket_id = db.Column(db.Integer, db.ForeignKey('support_ticket.id', ondelete='CASCADE'), nullable=False, index=True)
    author_name = db.Column(db.String(120), nullable=False)
    author_email = db.Column(db.String(150), nullable=True)
    is_staff = db.Column(db.Boolean, default=False, nullable=False)
    is_internal_note = db.Column(db.Boolean, default=False, nullable=False)
    message = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)

    def __repr__(self):
        return f"<TicketReply id={self.id} ticket_id={self.ticket_id} by={self.author_name}>"


class AlertChannel(db.Model):
    __tablename__ = 'alert_channel'

    id = db.Column(db.String(50), primary_key=True)
    type = db.Column(db.String(30), nullable=False)
    name = db.Column(db.String(150), nullable=False)
    enabled = db.Column(db.Boolean, default=True, nullable=False)
    webhook_url = db.Column(db.String(500), nullable=True)
    telegram_bot_token = db.Column(db.String(200), nullable=True)
    telegram_chat_id = db.Column(db.String(100), nullable=True)
    custom_headers = db.Column(db.Text, nullable=True)
    events = db.Column(db.String(250), default='down,up', nullable=False)
    last_dispatched_at = db.Column(db.DateTime, nullable=True)

    def event_list(self):
        return [e.strip() for e in (self.events or '').split(',') if e.strip()]

    def __repr__(self):
        return f"<AlertChannel {self.name} ({self.type})>"


class MaintenanceWindow(db.Model):
    __tablename__ = 'maintenance_window'

    id = db.Column(db.String(50), primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    website_ids = db.Column(db.Text, nullable=True)
    start_time = db.Column(db.String(50), nullable=False)
    end_time = db.Column(db.String(50), nullable=False)
    suppress_alerts = db.Column(db.Boolean, default=True, nullable=False)
    status = db.Column(db.String(30), default='upcoming', nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)

    def website_id_list(self):
        if not self.website_ids or not str(self.website_ids).strip():
            return []
        ids = []
        for part in str(self.website_ids).split(','):
            part = part.strip()
            if part.isdigit():
                ids.append(int(part))
        return ids

    def covers_website(self, website_id):
        ids = self.website_id_list()
        return len(ids) == 0 or website_id in ids

    def __repr__(self):
        return f"<MaintenanceWindow {self.title} [{self.status}]>"


class AlertDispatchLog(db.Model):
    __tablename__ = 'alert_dispatch_log'

    id = db.Column(db.String(50), primary_key=True)
    channel_type = db.Column(db.String(30), nullable=False)
    channel_name = db.Column(db.String(150), nullable=False)
    event = db.Column(db.String(50), nullable=False)
    website_name = db.Column(db.String(150), nullable=False)
    status = db.Column(db.String(30), nullable=False)
    timestamp = db.Column(db.DateTime, default=utcnow, nullable=False, index=True)
    payload_summary = db.Column(db.Text, nullable=True)

    def __repr__(self):
        return f"<AlertDispatchLog {self.channel_type} {self.event} {self.status}>"
