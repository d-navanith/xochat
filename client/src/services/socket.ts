import * as signalR from '@microsoft/signalr';

const isLocalDev = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && 
  window.location.port !== '' && 
  window.location.port !== '4000';

const BACKEND_BASE = (import.meta.env.VITE_BACKEND_URL as string | undefined) ?? (isLocalDev ? `http://${window.location.hostname}:4000` : '');
const HUB_URL = `${BACKEND_BASE}/chatHub`;

class SignalRSocketAdapter {
  private connection: signalR.HubConnection;
  private eventListeners: Map<string, Set<Function>> = new Map();
  private isConnected = false;
  private connectionQueue: (() => void)[] = [];

  constructor() {
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, {
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect([0, 1000, 2000, 5000, 10000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    this.setupListeners();
    this.start();
  }

  private async start() {
    try {
      await this.connection.start();
      this.isConnected = true;
      console.log('⚡ Connected to Xochat .NET SignalR Hub');
      this.trigger('connect');
      this.flushQueue();
    } catch (err) {
      console.warn('SignalR initial connection attempt failed, will retry in 2s...', err);
      setTimeout(() => this.start(), 2000);
    }
  }

  private setupListeners() {
    this.connection.onreconnected(() => {
      this.isConnected = true;
      this.trigger('connect');
    });

    this.connection.onclose(() => {
      this.isConnected = false;
      this.trigger('disconnect');
      setTimeout(() => this.start(), 2000);
    });

    // Register event hooks that map incoming SignalR messages to on() callbacks
    const serverEvents = [
      'locks:sync',
      'conversation:locked',
      'conversation:unlocked',
      'conversation:replied_and_closed',
      'conversation:new_pending',
      'conversation:updated',
      'conversation:auto_assigned',
      'stats:updated',
      'claim:success',
      'claim:failed',
      'customer:sync_status',
      'customer:message_sent',
      'customer:message_blocked',
      'customer:reply_received',
      'autoassign:completed',
      'message:sent_success',
      'message:error',
    ];

    serverEvents.forEach((eventName) => {
      this.connection.on(eventName, (...args: any[]) => {
        const payload = args.length === 1 ? args[0] : args;
        this.trigger(eventName, payload);
      });
    });
  }

  private trigger(event: string, ...args: any[]) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(...args);
        } catch (e) {
          console.error(`Error in event listener for ${event}:`, e);
        }
      });
    }
  }

  private flushQueue() {
    while (this.connectionQueue.length > 0) {
      const action = this.connectionQueue.shift();
      action?.();
    }
  }

  public on(event: string, callback: (...args: any[]) => void) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);

    // If 'connect' is registered and we're already connected, call immediately
    if (event === 'connect' && this.isConnected) {
      setTimeout(() => callback(), 0);
    }
  }

  public off(event: string, callback?: (...args: any[]) => void) {
    if (!callback) {
      this.eventListeners.delete(event);
      return;
    }
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  public emit(event: string, data?: any) {
    const execute = async () => {
      try {
        switch (event) {
          case 'agent:register':
            await this.connection.invoke(
              'AgentRegister',
              data?.agentId || '',
              data?.username || '',
              data?.name || '',
              data?.avatarUrl || ''
            );
            break;

          case 'customer:register':
            await this.connection.invoke(
              'CustomerRegister',
              data?.customerName || '',
              data?.customerId || null
            );
            break;

          case 'claim:lock':
            await this.connection.invoke('ClaimLock', data?.conversationId || '');
            break;

          case 'claim:release':
            await this.connection.invoke('ClaimRelease', data?.conversationId || '');
            break;

          case 'message:send':
            await this.connection.invoke(
              'SendMessage',
              data?.conversationId || '',
              data?.text || ''
            );
            break;

          case 'customer:send_message':
            await this.connection.invoke(
              'CustomerSendMessage',
              data?.customerName || '',
              data?.text || '',
              data?.email || null
            );
            break;

          case 'autoassign:trigger':
            await this.connection.invoke('TriggerAutoAssignment');
            break;

          default:
            console.warn(`Unmapped SignalR client event: ${event}`, data);
        }
      } catch (err) {
        console.error(`SignalR invoke failed for ${event}:`, err);
      }
    };

    if (this.isConnected) {
      execute();
    } else {
      this.connectionQueue.push(execute);
    }
  }
}

export const socket = new SignalRSocketAdapter() as any;
