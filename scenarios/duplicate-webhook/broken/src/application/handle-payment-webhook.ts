import { NotFoundError } from '../domain/errors.js';
import type { OrderRepository, ShipmentRepository, WebhookInbox } from './ports.js';

export interface PaymentSucceededEvent {
  readonly eventId: string;
  readonly orderId: string;
}

export type WebhookOutcome = 'shipment_created' | 'duplicate_ignored';

/** Creates the shipment once the provider confirms the payment. */
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
    await this.shipments.create(event.orderId);
    return 'shipment_created';
  }
}
