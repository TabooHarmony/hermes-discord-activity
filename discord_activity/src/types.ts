/**
 * Activity Payload Types
 *
 * Mirrors the backend payload schema from activity_state.py
 */

export type ActivityMode = 'dashboard' | 'embed' | 'live-view' | 'assistant' | 'artifacts';
export type ActivityStatus = 'idle' | 'active' | 'closed';

export interface ActivityMeta {
  session_id: string;
  source: string;
  updated_at?: number;
  last_event?: {
    type: string;
    data: Record<string, unknown> | null;
    timestamp: number;
  };
}

export interface ActivityAction {
  id: string;
  label: string;
  type: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}

export interface ActivityPayload {
  mode: ActivityMode;
  title: string;
  status: ActivityStatus;
  content?: string;
  actions?: ActivityAction[];
  meta: ActivityMeta;
  // Mode-specific fields
  dashboard?: DashboardContent;
  embed?: EmbedContent;
  live_view?: LiveViewContent;
}

export interface DashboardContent {
  sections?: DashboardSection[];
  cards?: DashboardCard[];
}

export interface DashboardSection {
  id: string;
  title: string;
  content?: string;
  status?: ActivityStatus;
  collapsible?: boolean;
}

export interface DashboardCard {
  id: string;
  title: string;
  value?: string | number;
  icon?: string;
  status?: ActivityStatus;
}

export interface EmbedContent {
  url?: string;
  proxy_url?: string;
  label?: string;
}

export interface LiveViewContent {
  frame_url?: string;
  last_action?: string;
  objective?: string;
  state?: Record<string, unknown>;
  recent_actions?: string[];
}

export interface ActivitySession {
  session_id: string;
  mode: ActivityMode;
  status: ActivityStatus;
  payload: ActivityPayload;
  created_at: number;
  updated_at: number;
}

export interface ActivityState {
  active: boolean;
  session?: ActivitySession;
  message?: string;
  warning?: string;
}

export interface ActivityCapabilities {
  available: boolean;
  platform: string;
  modes: ActivityMode[];
  single_user: boolean;
  max_sessions: number;
}

// API response types
export interface ApiResponse<T> {
  success?: boolean;
  error?: string;
  data?: T;
}

export interface LaunchResponse {
  success: boolean;
  session_id?: string;
  mode?: ActivityMode;
  status?: ActivityStatus;
  message?: string;
  error?: string;
  available?: boolean;
}

export interface EventResponse {
  success: boolean;
  session_id: string;
  event_type: string;
  error?: string;
}
