// ============================================================
// FOCUS TO-DO - WebhookContext
// Wrap useWebhook so everywhere (contexts/components) use the same
// event log and webhook trigger functions.
// ============================================================
import React, { createContext, useContext } from 'react';
import useWebhook from '@/shared/hooks/useWebhook';
import { useAppContext } from '@/core/contexts/AppContext';

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
    throw new Error('useWebhookContext must be used within WebhookProvider');
  }
  return ctx;
}
