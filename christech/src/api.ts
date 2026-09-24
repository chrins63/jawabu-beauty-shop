import {
  AlertChannelConfig,
  DispatchedAlertLog,
  MaintenanceWindow,
  SupportTicket,
  TicketPriority,
  TicketStatus,
  Website,
} from './types';

export interface BootstrapPayload {
  websites: Website[];
  tickets: SupportTicket[];
  channels: AlertChannelConfig[];
  maintenance: MaintenanceWindow[];
  dispatch_logs: DispatchedAlertLog[];
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((data as { error?: string }).error || response.statusText);
  }
  return data as T;
}

export function fetchBootstrap() {
  return request<BootstrapPayload>('/api/bootstrap');
}

export function createWebsite(payload: {
  name: string;
  url: string;
  check_interval_minutes: number;
  keyword: string | null;
  is_active: boolean;
}) {
  return request<Website>('/api/websites', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function checkWebsite(id: number) {
  return request<{ website: Website }>('/api/websites/' + id + '/check', { method: 'POST' });
}

export function toggleWebsite(id: number) {
  return request<Website>('/api/websites/' + id + '/toggle', { method: 'POST' });
}

export function deleteWebsite(id: number) {
  return request<{ ok: boolean }>('/api/websites/' + id, { method: 'DELETE' });
}

export function triggerSslAlert(id: number) {
  return request<{ dispatch_logs: DispatchedAlertLog[] }>('/api/websites/' + id + '/ssl-alert', {
    method: 'POST',
  });
}

export function createTicket(payload: {
  website_id: number;
  subject: string;
  description: string;
  requester_name: string;
  requester_email: string;
  category: string;
  priority: string;
}) {
  return request<SupportTicket>('/api/tickets', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateTicket(id: number, payload: { status?: TicketStatus; priority?: TicketPriority }) {
  return request<SupportTicket>('/api/tickets/' + id, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function addTicketReply(
  id: number,
  payload: {
    message: string;
    is_internal_note: boolean;
    author_name: string;
    update_status?: TicketStatus;
  }
) {
  return request<SupportTicket>('/api/tickets/' + id + '/replies', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function saveChannel(channel: AlertChannelConfig) {
  return request<AlertChannelConfig>('/api/channels', {
    method: 'POST',
    body: JSON.stringify(channel),
  });
}

export function deleteChannel(id: string) {
  return request<{ ok: boolean }>('/api/channels/' + encodeURIComponent(id), { method: 'DELETE' });
}

export function toggleChannel(id: string) {
  return request<AlertChannelConfig>('/api/channels/' + encodeURIComponent(id) + '/toggle', {
    method: 'POST',
  });
}

export function testChannel(id: string, websiteId?: number) {
  return request<{ dispatch_logs: DispatchedAlertLog[]; channel: AlertChannelConfig }>(
    '/api/channels/' + encodeURIComponent(id) + '/test',
    {
      method: 'POST',
      body: JSON.stringify({ website_id: websiteId }),
    }
  );
}

export function saveMaintenance(window: MaintenanceWindow) {
  return request<MaintenanceWindow>('/api/maintenance', {
    method: 'POST',
    body: JSON.stringify(window),
  });
}

export function deleteMaintenance(id: string) {
  return request<{ ok: boolean }>('/api/maintenance/' + encodeURIComponent(id), { method: 'DELETE' });
}

export function updateMaintenanceStatus(id: string, status: MaintenanceWindow['status']) {
  return request<MaintenanceWindow>('/api/maintenance/' + encodeURIComponent(id) + '/status', {
    method: 'POST',
    body: JSON.stringify({ status }),
  });
}
