# ChrisTech

Self-hosted website monitoring and support desk. The React dashboard talks to a real Flask JSON API. A separate scheduler pings sites, stores check history, opens outage tickets, and dispatches alerts only when status changes.

## Stack

- React + Vite + Tailwind dashboard (`http://localhost:3000`)
- Flask JSON API (`http://localhost:5000`)
- SQLite by default (PostgreSQL optional)
- APScheduler worker (`python scheduler.py`)

## Quick start

```bash
cp .env.example .env
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

In a second terminal:

```bash
source venv/bin/activate
python scheduler.py
```

In a third terminal:

```bash
npm install
npm run dev
```

Open **http://localhost:3000**. Vite proxies `/api` to Flask.

## What it does

- HTTP uptime checks with optional keyword matching
- SSL certificate issuer/expiry from the live handshake
- Best-effort domain expiry via RDAP
- Support tickets (manual + automated incidents on DOWN/UP)
- Slack, Discord, Telegram, webhook, and email alerts
- Maintenance windows that suppress alerts
- Public status page, SLA report, embeddable support widget

Unconfigured SMTP or webhook URLs are simulated in the terminal instead of crashing.

See [SETUP.md](SETUP.md) for PostgreSQL, production notes, and a verification checklist.
