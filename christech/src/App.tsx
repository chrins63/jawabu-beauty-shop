/**
 * ChrisTech - Self-Hosted Website Monitoring & Unified Support Desk
 * React dashboard backed by the Flask JSON API.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Zap } from 'lucide-react';
import {
  Website,
  TabType,
  SupportTicket,
  TicketStatus,
  TicketPriority,
  TicketCategory,
  AlertChannelConfig,
  DispatchedAlertLog,
  MaintenanceWindow,
} from './types';
import { DashboardView } from './components/DashboardView';
import { AddWebsiteModal } from './components/AddWebsiteModal';
import { SiteDetailModal } from './components/SiteDetailModal';
import { AlertPreviewModal } from './components/AlertPreviewModal';
import { ErrorDiagnosticsModal } from './components/ErrorDiagnosticsModal';
import { SetupGuideView } from './components/SetupGuideView';
import { SupportDeskView } from './components/SupportDeskView';
import { TicketDetailModal } from './components/TicketDetailModal';
import { CreateTicketModal } from './components/CreateTicketModal';
import { PublicPortalView } from './components/PublicPortalView';
import { WidgetStudioView } from './components/WidgetStudioView';
import { StatusPageView } from './components/StatusPageView';
import { AlertChannelsView } from './components/AlertChannelsView';
import { SslDomainRadarView } from './components/SslDomainRadarView';
import { MaintenanceView } from './components/MaintenanceView';
import { SlaReportsView } from './components/SlaReportsView';
import { SystemNavbar } from './components/SystemNavbar';
import * as api from './api';

export default function App() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [channels, setChannels] = useState<AlertChannelConfig[]>([]);
  const [dispatchLogs, setDispatchLogs] = useState<DispatchedAlertLog[]>([]);
  const [maintenanceWindows, setMaintenanceWindows] = useState<MaintenanceWindow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const [activeTab, setActiveTab] = useState<TabType>('monitoring');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [detailWebsite, setDetailWebsite] = useState<Website | null>(null);
  const [alertWebsite, setAlertWebsite] = useState<Website | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isCreateTicketOpen, setIsCreateTicketOpen] = useState(false);
  const [preselectedSiteIdForTicket, setPreselectedSiteIdForTicket] = useState<number | undefined>(undefined);
  const [diagnosticsWebsite, setDiagnosticsWebsite] = useState<Website | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const applyBootstrap = useCallback((payload: api.BootstrapPayload) => {
    setWebsites(payload.websites);
    setTickets(payload.tickets);
    setChannels(payload.channels);
    setMaintenanceWindows(payload.maintenance);
    setDispatchLogs(payload.dispatch_logs);
    setDetailWebsite((current) => current ? payload.websites.find((w) => w.id === current.id) || current : current);
    setDiagnosticsWebsite((current) => current ? payload.websites.find((w) => w.id === current.id) || current : current);
    setSelectedTicket((current) => current ? payload.tickets.find((t) => t.id === current.id) || current : current);
  }, []);

  const refresh = useCallback(async (quiet = false) => {
    try {
      const payload = await api.fetchBootstrap();
      applyBootstrap(payload);
      setLoadError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not reach the ChrisTech API';
      setLoadError(message);
      if (!quiet) {
        showToast(message);
      }
    } finally {
      setIsBootstrapping(false);
    }
  }, [applyBootstrap]);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(() => refresh(true), 15000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const handleAddWebsite = async (newSiteData: Omit<Website, 'id' | 'created_at' | 'logs'>) => {
    try {
      await api.createWebsite({
        name: newSiteData.name,
        url: newSiteData.url,
        check_interval_minutes: newSiteData.check_interval_minutes,
        keyword: newSiteData.keyword,
        is_active: newSiteData.is_active,
      });
      await refresh();
      showToast(`Website '${newSiteData.name}' registered and checked.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to add website');
    }
  };

  const handleCheckNow = async (websiteId: number) => {
    const site = websites.find((w) => w.id === websiteId);
    if (!site) return;
    showToast(`Running check for '${site.name}'...`);
    try {
      const result = await api.checkWebsite(websiteId);
      await refresh(true);
      const latest = result.website.logs[0];
      if (latest?.is_up) {
        showToast(`Check finished: '${site.name}' is UP (${latest.response_time_ms ?? 0}ms)`);
      } else {
        showToast(`Check finished: '${site.name}' is DOWN (${latest?.error_message || 'error'})`);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Check failed');
    }
  };

  const handleToggleActive = async (websiteId: number) => {
    try {
      const updated = await api.toggleWebsite(websiteId);
      await refresh(true);
      showToast(`Website '${updated.name}' monitoring is now ${updated.is_active ? 'active' : 'paused'}.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not toggle site');
    }
  };

  const handleDeleteWebsite = async (websiteId: number) => {
    try {
      await api.deleteWebsite(websiteId);
      if (detailWebsite?.id === websiteId) setDetailWebsite(null);
      await refresh();
      showToast('Website, logs, and associated support tickets deleted.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not delete website');
    }
  };

  const handleCreateTicket = async (ticketData: {
    website_id: number;
    subject: string;
    description: string;
    requester_name: string;
    requester_email: string;
    category: TicketCategory;
    priority: TicketPriority;
  }) => {
    try {
      const ticket = await api.createTicket(ticketData);
      await refresh();
      showToast(`Support Ticket #${ticket.ticket_number} created successfully!`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not create ticket');
    }
  };

  const handleAddReply = async (
    ticketId: number,
    message: string,
    isInternalNote: boolean,
    authorName: string,
    updateStatus?: TicketStatus
  ) => {
    try {
      const ticket = await api.addTicketReply(ticketId, {
        message,
        is_internal_note: isInternalNote,
        author_name: authorName,
        update_status: updateStatus,
      });
      setSelectedTicket(ticket);
      await refresh(true);
      showToast(isInternalNote ? 'Internal staff note saved.' : 'Reply sent to customer!');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not add reply');
    }
  };

  const handleUpdateTicketStatus = async (ticketId: number, status: TicketStatus, priority?: TicketPriority) => {
    try {
      const ticket = await api.updateTicket(ticketId, { status, priority });
      setSelectedTicket(ticket);
      await refresh(true);
      showToast(`Ticket #${ticket.ticket_number} status changed to ${status}.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not update ticket');
    }
  };

  const handleSaveChannel = async (channel: AlertChannelConfig) => {
    try {
      await api.saveChannel(channel);
      await refresh();
      showToast(`Alert Channel '${channel.name}' saved.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not save channel');
    }
  };

  const handleDeleteChannel = async (channelId: string) => {
    try {
      await api.deleteChannel(channelId);
      await refresh();
      showToast('Alert integration deleted.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not delete channel');
    }
  };

  const handleToggleChannel = async (channelId: string) => {
    try {
      await api.toggleChannel(channelId);
      await refresh(true);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not toggle channel');
    }
  };

  const handleTestDispatch = async (channelId: string, websiteId?: number) => {
    try {
      const result = await api.testChannel(channelId, websiteId);
      setDispatchLogs(result.dispatch_logs);
      await refresh(true);
      showToast(`Test payload dispatched to ${result.channel.name}!`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Test dispatch failed');
    }
  };

  const handleSaveMaintenance = async (window: MaintenanceWindow) => {
    try {
      await api.saveMaintenance(window);
      await refresh();
      showToast(`Maintenance Window '${window.title}' scheduled.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not save maintenance');
    }
  };

  const handleDeleteMaintenance = async (id: string) => {
    try {
      await api.deleteMaintenance(id);
      await refresh();
      showToast('Maintenance window cancelled.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not delete maintenance');
    }
  };

  const handleUpdateMaintenanceStatus = async (id: string, status: 'upcoming' | 'in_progress' | 'completed') => {
    try {
      await api.updateMaintenanceStatus(id, status);
      await refresh();
      showToast(`Maintenance status updated to '${status}'.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not update maintenance');
    }
  };

  const handleTriggerSslAlert = async (site: Website) => {
    try {
      const result = await api.triggerSslAlert(site.id);
      setDispatchLogs(result.dispatch_logs);
      showToast(`Dispatched SSL expiration warning for '${site.name}'.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not dispatch SSL alert');
    }
  };

  if (activeTab === 'status-page') {
    return (
      <StatusPageView
        websites={websites}
        tickets={tickets}
        maintenanceWindows={maintenanceWindows}
        onBackToAdmin={() => setActiveTab('monitoring')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-blue-600 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-xl border border-blue-400/30 flex items-center gap-2">
          <Zap className="w-3.5 h-3.5" />
          <span>{toastMessage}</span>
        </div>
      )}

      <SystemNavbar
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        websites={websites}
        tickets={tickets}
        maintenanceWindows={maintenanceWindows}
        onOpenAddSite={() => setIsAddModalOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {isBootstrapping && (
          <div className="mb-4 text-xs text-slate-400">Connecting to ChrisTech API...</div>
        )}
        {loadError && (
          <div className="mb-4 rounded-xl border border-rose-800 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
            Cannot reach the Flask API at <code>/api</code>. Start it with <code>python app.py</code> on port 5000, then refresh.
            <div className="mt-1 text-xs text-rose-300/80">{loadError}</div>
          </div>
        )}

        {activeTab === 'monitoring' && (
          <DashboardView
            websites={websites}
            tickets={tickets}
            onOpenAddModal={() => setIsAddModalOpen(true)}
            onOpenDetailModal={(site) => setDetailWebsite(site)}
            onOpenAlertModal={(site) => setAlertWebsite(site)}
            onOpenDiagnosticsModal={(site) => setDiagnosticsWebsite(site)}
            onCheckNow={handleCheckNow}
            onDelete={handleDeleteWebsite}
            onGoToSupport={() => setActiveTab('support-desk')}
            onOpenCreateTicketForSite={(siteId) => {
              setPreselectedSiteIdForTicket(siteId);
              setIsCreateTicketOpen(true);
            }}
          />
        )}

        {activeTab === 'ssl-radar' && (
          <SslDomainRadarView
            websites={websites}
            onRefreshCert={handleCheckNow}
            onTriggerSslAlert={handleTriggerSslAlert}
          />
        )}

        {activeTab === 'maintenance' && (
          <MaintenanceView
            maintenanceWindows={maintenanceWindows}
            websites={websites}
            onSaveMaintenance={handleSaveMaintenance}
            onDeleteMaintenance={handleDeleteMaintenance}
            onUpdateStatus={handleUpdateMaintenanceStatus}
          />
        )}

        {activeTab === 'alert-channels' && (
          <AlertChannelsView
            channels={channels}
            dispatchLogs={dispatchLogs}
            websites={websites}
            onSaveChannel={handleSaveChannel}
            onDeleteChannel={handleDeleteChannel}
            onToggleChannel={handleToggleChannel}
            onTestDispatch={handleTestDispatch}
          />
        )}

        {activeTab === 'sla-reports' && <SlaReportsView websites={websites} />}

        {activeTab === 'support-desk' && (
          <SupportDeskView
            websites={websites}
            tickets={tickets}
            onOpenCreateTicket={() => {
              setPreselectedSiteIdForTicket(undefined);
              setIsCreateTicketOpen(true);
            }}
            onSelectTicket={(ticket) => setSelectedTicket(ticket)}
            onQuickUpdateStatus={(ticketId, status) => handleUpdateTicketStatus(ticketId, status)}
          />
        )}

        {activeTab === 'public-portal' && (
          <PublicPortalView
            websites={websites}
            onSubmitTicket={handleCreateTicket}
            onGoToSupportDesk={() => setActiveTab('support-desk')}
          />
        )}

        {activeTab === 'widget-studio' && <WidgetStudioView websites={websites} />}

        {activeTab === 'setup-guide' && <SetupGuideView />}
      </main>

      <AddWebsiteModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddWebsite}
      />

      <SiteDetailModal
        website={detailWebsite}
        isOpen={detailWebsite !== null}
        onClose={() => setDetailWebsite(null)}
        onCheckNow={handleCheckNow}
        onToggleActive={handleToggleActive}
        onOpenDiagnosticsModal={(site) => setDiagnosticsWebsite(site)}
      />

      <AlertPreviewModal
        website={alertWebsite}
        isOpen={alertWebsite !== null}
        onClose={() => setAlertWebsite(null)}
      />

      <ErrorDiagnosticsModal
        website={diagnosticsWebsite}
        isOpen={diagnosticsWebsite !== null}
        onClose={() => setDiagnosticsWebsite(null)}
        onCheckNow={handleCheckNow}
        onCreateTicketFromDiagnosis={(siteId, subject, description) => {
          handleCreateTicket({
            website_id: siteId,
            subject,
            description,
            requester_name: 'ChrisTech Diagnostic Sentinel',
            requester_email: 'diagnostics@christech.local',
            category: 'outage',
            priority: 'urgent',
          });
          setDiagnosticsWebsite(null);
          setActiveTab('support-desk');
        }}
      />

      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          website={websites.find((w) => w.id === selectedTicket.website_id)}
          onClose={() => setSelectedTicket(null)}
          onAddReply={handleAddReply}
          onUpdateStatus={handleUpdateTicketStatus}
          onOpenDiagnosticsModal={(site) => setDiagnosticsWebsite(site)}
        />
      )}

      {isCreateTicketOpen && (
        <CreateTicketModal
          websites={websites}
          preselectedSiteId={preselectedSiteIdForTicket}
          onClose={() => {
            setIsCreateTicketOpen(false);
            setPreselectedSiteIdForTicket(undefined);
          }}
          onSubmit={handleCreateTicket}
        />
      )}

      <footer className="border-t border-slate-800 bg-slate-950 py-4 px-6 text-center text-xs text-slate-500">
        <div className="flex flex-col sm:flex-row items-center justify-between max-w-7xl mx-auto gap-2">
          <div>ChrisTech &bull; Self-Hosted Website Monitoring & Support Desk</div>
          <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px]">
            <span>React dashboard + Flask API + APScheduler</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
