import type {
    CreateWebhookOptions,
    DiscordMessage,
    EditWebhookMessageOptions,
    EditWebhookOptions,
    SendWebhookMessageOptions,
    Webhook,
} from '../../types/discord.js';

export interface WebhookCapability {
    createWebhook(options: CreateWebhookOptions): Promise<Webhook>;
    listWebhooks(scope: 'channel' | 'guild', id: string): Promise<Webhook[]>;
    editWebhook(options: EditWebhookOptions): Promise<Webhook>;
    deleteWebhook(webhookId: string, reason?: string): Promise<void>;

    sendWebhookMessage(options: SendWebhookMessageOptions): Promise<DiscordMessage>;
    editWebhookMessage(options: EditWebhookMessageOptions): Promise<DiscordMessage>;
    deleteWebhookMessage(webhookId: string, webhookToken: string, messageId: string): Promise<void>;
    fetchWebhookMessage(webhookId: string, webhookToken: string, messageId: string): Promise<DiscordMessage>;
}
