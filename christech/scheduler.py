"""
ChrisTech background checker scheduler.
"""

from datetime import datetime, timedelta

from dotenv import load_dotenv
from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.interval import IntervalTrigger

load_dotenv()

from app import app
from checker import check_website_and_log
from models import Website


def check_due_websites():
    with app.app_context():
        try:
            active_sites = Website.query.filter_by(is_active=True).all()
            if not active_sites:
                print(f"[{datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}] [Scheduler] No active websites configured.")
                return

            now = datetime.utcnow()
            checked_count = 0

            for site in active_sites:
                latest = site.latest_log
                if latest is None:
                    is_due = True
                else:
                    elapsed = now - latest.checked_at
                    interval_delta = timedelta(minutes=site.check_interval_minutes)
                    is_due = elapsed >= interval_delta

                if is_due:
                    checked_count += 1
                    try:
                        check_website_and_log(site.id, send_alert_if_changed=True)
                    except Exception as e:
                        print(f"[Scheduler Error] Failed checking '{site.name}': {e}")

            if checked_count > 0:
                print(f"[{now.strftime('%Y-%m-%d %H:%M:%S UTC')}] [Scheduler] Completed cycle. Evaluated {checked_count} due site(s).")

        except Exception as db_err:
            print(f"[Scheduler Database Error]: {db_err}")


def main():
    print("=" * 65)
    print("ChrisTech Background Checker Scheduler")
    print("=" * 65)
    print("Monitoring engine starting up...")
    print("Checking frequency: Evaluates websites every 30 seconds.")
    print("Alerting rule: Alerts dispatch ONLY upon status change (anti-spam).")
    print("Press Ctrl+C to stop the scheduler.")
    print("=" * 65)

    print("\n[Scheduler] Running initial check cycle on startup...")
    check_due_websites()

    scheduler = BlockingScheduler()
    scheduler.add_job(
        func=check_due_websites,
        trigger=IntervalTrigger(seconds=30),
        id='christech_master_check_job',
        name='Check Due Websites',
        replace_existing=True
    )

    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        print("\n[ChrisTech] Background scheduler stopped gracefully.")


if __name__ == '__main__':
    main()
