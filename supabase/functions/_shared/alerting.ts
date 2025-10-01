/**
 * External Alerting Integration
 *
 * Sends alerts to PagerDuty (critical only) and Slack (all severities)
 * Integrates with structured logging for comprehensive observability.
 *
 * Features:
 * - PagerDuty integration for critical alerts (pages on-call engineer)
 * - Slack webhook integration for all severity levels
 * - Rich context in alert messages
 * - Automatic severity-based routing
 * - Master switch to enable/disable alerting
 */

import { logStructuredError } from './structured-logging.ts';

type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface AlertContext {
  function_name: string;
  endpoint?: string;
  statusCode?: number;
  errorType?: string;
  [key: string]: any;
}

/**
 * Sends critical alerts to PagerDuty and all alerts to Slack
 *
 * @param error - Error object
 * @param severity - Alert severity level
 * @param context - Additional context for debugging
 */
export async function notifyFailure(
  error: Error,
  severity: AlertSeverity,
  context: AlertContext
): Promise<void> {
  // Check if alerting is enabled
  const alertEnabled = Deno.env.get('ALERT_ENABLED') === 'true';

  if (!alertEnabled) {
    console.log('[Alerting] Alerts disabled via ALERT_ENABLED env var - skipping notification');
    return;
  }

  // Log to database first (always)
  await logStructuredError(error, context);

  // Send to PagerDuty for critical errors only
  if (severity === 'critical') {
    await sendPagerDutyAlert(error, context);
  }

  // Always send to Slack (if webhook configured)
  await sendSlackAlert(error, severity, context);
}

/**
 * Send alert to PagerDuty
 *
 * Creates a PagerDuty incident that pages the on-call engineer
 */
async function sendPagerDutyAlert(
  error: Error,
  context: AlertContext
): Promise<void> {
  const routingKey = Deno.env.get('PAGERDUTY_ROUTING_KEY');

  if (!routingKey) {
    console.warn('[PagerDuty] PAGERDUTY_ROUTING_KEY not set - skipping PagerDuty alert');
    return;
  }

  try {
    const response = await fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        routing_key: routingKey,
        event_action: 'trigger',
        payload: {
          summary: `RegIQ: ${error.message}`,
          severity: 'critical',
          source: 'RegIQ-Regulatory-Pipeline',
          component: context.function_name,
          custom_details: {
            error_type: error.name,
            endpoint: context.endpoint,
            status_code: context.statusCode,
            timestamp: new Date().toISOString(),
            full_context: context,
            stack_trace: error.stack
          }
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[PagerDuty] Failed to send alert:', errorText);
    } else {
      console.log('[PagerDuty] Alert sent successfully');
    }

  } catch (error) {
    console.error('[PagerDuty] Error sending alert:', error);
  }
}

/**
 * Send alert to Slack
 *
 * Posts message to Slack channel with color-coded severity
 */
async function sendSlackAlert(
  error: Error,
  severity: AlertSeverity,
  context: AlertContext
): Promise<void> {
  const webhookUrl = Deno.env.get('SLACK_WEBHOOK_URL');

  if (!webhookUrl) {
    console.warn('[Slack] SLACK_WEBHOOK_URL not set - skipping Slack alert');
    return;
  }

  // Emoji based on severity
  const severityEmoji: Record<AlertSeverity, string> = {
    info: 'ℹ️',
    warning: '⚠️',
    error: '❌',
    critical: '🚨'
  };

  // Color based on severity (Slack attachment colors)
  const severityColor: Record<AlertSeverity, string> = {
    info: '#36a64f',      // Green
    warning: '#ffcc00',   // Yellow
    error: '#ff9900',     // Orange
    critical: '#ff0000'   // Red
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: `${severityEmoji[severity]} *RegIQ Alert:* ${error.message}`,
        attachments: [
          {
            color: severityColor[severity],
            fields: [
              {
                title: 'Function',
                value: context.function_name,
                short: true
              },
              {
                title: 'Severity',
                value: severity.toUpperCase(),
                short: true
              },
              {
                title: 'Error Type',
                value: error.name,
                short: true
              },
              {
                title: 'Endpoint',
                value: context.endpoint || 'N/A',
                short: true
              },
              {
                title: 'Status Code',
                value: context.statusCode?.toString() || 'N/A',
                short: true
              },
              {
                title: 'Timestamp',
                value: new Date().toISOString(),
                short: true
              }
            ],
            footer: 'RegIQ Monitoring',
            footer_icon: 'https://platform.slack-edge.com/img/default_application_icon.png',
            ts: Math.floor(Date.now() / 1000).toString()
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Slack] Failed to send alert:', errorText);
    } else {
      console.log('[Slack] Alert sent successfully');
    }

  } catch (error) {
    console.error('[Slack] Error sending alert:', error);
  }
}

/**
 * Send success notification to Slack
 *
 * Use sparingly - mainly for major milestones or recovery events
 */
export async function notifySuccess(
  functionName: string,
  message: string,
  stats: Record<string, any>
): Promise<void> {
  const webhookUrl = Deno.env.get('SLACK_WEBHOOK_URL');

  if (!webhookUrl) {
    return;
  }

  const alertEnabled = Deno.env.get('ALERT_ENABLED') === 'true';
  if (!alertEnabled) {
    return;
  }

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: `✅ *${functionName}:* ${message}`,
        attachments: [
          {
            color: '#36a64f',
            fields: Object.entries(stats).map(([key, value]) => ({
              title: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
              value: value.toString(),
              short: true
            })),
            footer: 'RegIQ Monitoring',
            ts: Math.floor(Date.now() / 1000).toString()
          }
        ]
      })
    });

  } catch (error) {
    console.error('[Slack] Error sending success notification:', error);
  }
}

/**
 * Send circuit breaker state change notification
 *
 * Alerts when circuit opens or closes
 */
export async function notifyCircuitStateChange(
  circuitName: string,
  oldState: string,
  newState: string,
  context: Record<string, any>
): Promise<void> {
  const webhookUrl = Deno.env.get('SLACK_WEBHOOK_URL');

  if (!webhookUrl) {
    return;
  }

  const alertEnabled = Deno.env.get('ALERT_ENABLED') === 'true';
  if (!alertEnabled) {
    return;
  }

  // Determine severity based on state change
  let emoji = '🔄';
  let color = '#ffcc00';

  if (newState === 'OPEN') {
    emoji = '⛔';
    color = '#ff0000';
  } else if (newState === 'CLOSED') {
    emoji = '✅';
    color = '#36a64f';
  }

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: `${emoji} *Circuit Breaker State Change:* ${circuitName}`,
        attachments: [
          {
            color: color,
            fields: [
              {
                title: 'Circuit',
                value: circuitName,
                short: true
              },
              {
                title: 'State Change',
                value: `${oldState} → ${newState}`,
                short: true
              },
              {
                title: 'Failure Count',
                value: context.failureCount?.toString() || '0',
                short: true
              },
              {
                title: 'Timestamp',
                value: new Date().toISOString(),
                short: true
              }
            ],
            footer: 'RegIQ Circuit Breaker',
            ts: Math.floor(Date.now() / 1000).toString()
          }
        ]
      })
    });

  } catch (error) {
    console.error('[Slack] Error sending circuit breaker notification:', error);
  }
}
