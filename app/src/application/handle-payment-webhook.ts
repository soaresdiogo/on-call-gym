import { NotFoundError } from '../domain/errors.js';
import type { OrderRepository, ShipmentRepository, WebhookInbox } from './ports.js';

export interface PaymentSucceededEvent {
  readonly eventId: string;
  readonly orderId: string;
}

export type WebhookOutcome = 'shipment_created' | 'duplicate_ignored';

/** Payment providers deliver webhooks at least once, so the handler must be idempotent. */
export class HandlePaymentWebhook {
  constructor(
    private readonly inbox: WebhookInbox,
    private readonly orders: OrderRepository,
    private readonly shipments: ShipmentRepository,
  ) {}

  async execute(event: PaymentSucceededEvent): Promise<WebhookOutcome> {
    const order = await this.orders.findById(event.orderId);
    if (!order) {
      throw new NotFoundError(`Order ${event.orderId} not found`);
    }
    const firstDelivery = await this.inbox.claim(event.eventId);
    if (!firstDelivery) {
      return 'duplicate_ignored';
    }
    await this.createShipment(event);
    return 'shipment_created';
  }

  private async createShipment(event: PaymentSucceededEvent): Promise<void> {
    try {
      await this.shipments.create(event.orderId);
    } catch (error) {
      // Let the provider redeliver the event instead of losing the shipment.
      await this.inbox.forget(event.eventId);
      throw error;
    }
  }
}
