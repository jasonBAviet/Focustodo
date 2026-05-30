// ============================================================
// FOCUS TO-DO - WebhookContext
// Bọc useWebhook để mọi nơi (contexts/components) cùng dùng
// chung một event log và các hàm trigger webhook.
// ============================================================
import React, { createContext, useContext } from 'react';
import useWebhook from '../hooks/useWebhook';
import { useAppContext } from './AppContext';

type WebhookContextType = ReturnType<typeof useWebhook>;

const WebhookContext = createContext<WebhookContextType | null>(null);

export function WebhookProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useAppContext();
  const webhook = useWebhook(settings.webhookUrl, settings.webhookEnabled);

  return (
    <WebhookContext.Provider value={webhook}>{children}</WebhookContext.Provider>
  );
}

export function useWebhookContext(): WebhookContextType {
  const ctx = useContext(WebhookContext);
  if (!ctx) {
    throw new Error('useWebhookContext phải được dùng bên trong WebhookProvider');
  }
  return ctx;
}
