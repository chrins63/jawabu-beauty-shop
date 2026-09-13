# ChrisTech setup

ChrisTech is one product: a React dashboard, a Flask JSON API, and a background scheduler.

## 1. Python environment

```bash
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

`.env` defaults to SQLite (`USE_SQLITE=true`) so you can run without PostgreSQL.

## 2. Optional PostgreSQL

Set `USE_SQLITE=false` and either `DATABASE_URL` or `DB_USER` / `DB_PASSWORD` / `DB_HOST` / `DB_PORT` / `DB_NAME`. Then:

```bash
psql -U christech_user -d christech_db -f schema.sql
python seed_db.py
```

## 3. Run the three processes

Terminal 1 — API:

```bash
python app.py
```

API: `http://localhost:5000`  
Health: `http://localhost:5000/api/health`

Terminal 2 — scheduler:

```bash
python scheduler.py
```

Checks due sites every 30 seconds. Alerts fire only on UP ↔ DOWN transitions. In-progress maintenance windows suppress alerts.

Terminal 3 — dashboard:

```bash
npm install
npm run dev
```

Dashboard: `http://localhost:3000`

## 4. Verify

1. Add `https://example.com` and click **Check Now**. You should see HTTP 200 and latency.
2. Add a keyword that does not exist on the page — the site should go DOWN and an incident ticket should open.
3. Open **SSL & Domain Radar**. Issuer and expiry come from the TLS certificate.
4. Create an alert channel and use **Test Dispatch**. Placeholder URLs are simulated and appear in Dispatched Logs.
5. Start a maintenance window, then Check Now on a failing site — alerts stay silent.

## 5. Email alerts

For real Gmail delivery, set `SMTP_EMAIL`, `SMTP_PASSWORD` (app password), and `ALERT_RECIPIENT_EMAIL`. Leave them blank to print simulated alerts.

## Production notes

Build the dashboard and let Flask serve `dist/`:

```bash
npm run build
USE_SQLITE=false gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

Run `scheduler.py` as a second process (systemd, supervisor, or a container).
