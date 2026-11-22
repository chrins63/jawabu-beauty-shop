import React, { useState } from 'react';
import { Database, Terminal, Check, Copy, Server, ShieldCheck, Mail, Cpu, Play } from 'lucide-react';

function BookIcon({ className }: { className?: string }) {
  return <Terminal className={className} />;
}

export const SetupGuideView: React.FC = () => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const envExample = `USE_SQLITE=true
SECRET_KEY=christech-secret-key-change-in-production
PORT=5000
SMTP_EMAIL=
SMTP_PASSWORD=
ALERT_RECIPIENT_EMAIL=`;

  const runApi = `python -m venv venv
# Windows: venv\\Scripts\\activate
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python app.py`;

  const runFront = `npm install
npm run dev`;

  const runSched = `source venv/bin/activate
python scheduler.py`;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
        <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">
          <BookIcon className="w-4 h-4" />
          <span>Unified Setup Guide</span>
        </div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">
          Run ChrisTech: React dashboard + Flask API
        </h1>
        <p className="text-sm text-slate-400 mt-2 leading-relaxed">
          The dashboard on port 3000 talks to a real Flask JSON API on port 5000. The scheduler pings
          sites, writes check logs, opens outage tickets, and dispatches email or webhook alerts only
          when status changes.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-400 flex items-center justify-center mb-3">
            <Server className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">1. Flask API (`app.py`)</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            JSON endpoints for websites, tickets, channels, maintenance, status, and the embeddable widget.
            SQLite is on by default; PostgreSQL is optional.
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-purple-600/10 text-purple-400 flex items-center justify-center mb-3">
            <Cpu className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">2. Scheduler (`scheduler.py`)</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            APScheduler worker. Checks due sites every 30 seconds, logs latency, and alerts only on UP/DOWN transitions.
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-emerald-600/10 text-emerald-400 flex items-center justify-center mb-3">
            <Database className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">3. React dashboard</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Vite app at <code className="text-emerald-300">http://localhost:3000</code> with a proxy to
            <code className="text-emerald-300"> /api</code>. Polls every 15 seconds for live checks.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">1</span>
              <h2 className="text-base font-bold text-white">Configure environment</h2>
            </div>
            <button
              onClick={() => copyToClipboard(envExample, 'env')}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded-md"
            >
              {copiedId === 'env' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedId === 'env' ? 'Copied' : 'Copy .env'}</span>
            </button>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            Copy <code className="text-blue-300">.env.example</code> to <code className="text-blue-300">.env</code>. Leave SMTP blank to simulate alerts in the terminal. Set <code className="text-blue-300">USE_SQLITE=false</code> plus DB credentials to use PostgreSQL.
          </p>
          <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 text-xs text-slate-300 overflow-x-auto">{envExample}</pre>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">2</span>
              <h2 className="text-base font-bold text-white">Start the Flask API</h2>
            </div>
            <button
              onClick={() => copyToClipboard(runApi, 'api')}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded-md"
            >
              {copiedId === 'api' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedId === 'api' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 text-xs text-slate-300 overflow-x-auto">{runApi}</pre>
          <p className="text-xs text-slate-500 mt-3 flex items-center gap-1"><Play className="w-3 h-3" /> API listens on http://localhost:5000 — health check: /api/health</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">3</span>
              <h2 className="text-base font-bold text-white">Start the React dashboard</h2>
            </div>
            <button
              onClick={() => copyToClipboard(runFront, 'front')}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded-md"
            >
              {copiedId === 'front' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedId === 'front' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 text-xs text-slate-300 overflow-x-auto">{runFront}</pre>
          <p className="text-xs text-slate-500 mt-3">Open http://localhost:3000 — Vite proxies /api to Flask.</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">4</span>
              <h2 className="text-base font-bold text-white">Start the scheduler (second terminal)</h2>
            </div>
            <button
              onClick={() => copyToClipboard(runSched, 'sched')}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded-md"
            >
              {copiedId === 'sched' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedId === 'sched' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 text-xs text-slate-300 overflow-x-auto">{runSched}</pre>
          <p className="text-xs text-slate-500 mt-3 flex items-center gap-1">
            <Mail className="w-3 h-3" /> Unconfigured SMTP/webhooks print simulated alerts instead of failing.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">5</span>
            <h2 className="text-base font-bold text-white">Verify the live path</h2>
          </div>
          <ol className="text-sm text-slate-300 space-y-2 list-decimal pl-5">
            <li>Add a website (try https://example.com).</li>
            <li>Click Check Now and confirm UP/DOWN plus response time.</li>
            <li>Open SSL Radar — issuer and expiry come from the live TLS handshake.</li>
            <li>File a support ticket or wait for an automated incident on a DOWN transition.</li>
            <li>Add an alert channel and use Test Dispatch (simulated if URL/token is a placeholder).</li>
          </ol>
          <p className="text-xs text-slate-500 mt-4 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            Maintenance windows with status in_progress suppress alerts for covered sites.
          </p>
        </div>
      </div>
    </div>
  );
};
