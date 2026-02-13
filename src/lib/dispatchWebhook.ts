import { supabase } from "@/integrations/supabase/client";

/**
 * Fire-and-forget dispatch of outbound webhook events.
 * Non-blocking — errors are silently caught.
 */
export function dispatchWebhookEvent(eventType: string, payload: Record<string, any>) {
  supabase.functions
    .invoke("dispatch-outbound-webhook", {
      body: { event_type: eventType, payload },
    })
    .catch((err) => {
      console.error("Webhook dispatch error:", err);
    });
}
