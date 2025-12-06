export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'user' | 'model' | 'tool-call' | 'tool-result' | 'system';
  text: string;
  details?: any;
}

export interface ToolCallParams {
  name: string;
  args: Record<string, any>;
  id: string;
}

export interface ConfluenceResponse {
  success: boolean;
  data?: any;
  error?: string;
}
