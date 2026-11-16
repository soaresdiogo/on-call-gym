import type { ShipmentRepository, WebhookInbox } from '../application/ports.js';
import type { SqlClient } from './database.js';

export class PgWebhookInbox implements WebhookInbox {
  constructor(private readonly sql: SqlClient) {}

  async claim(eventId: string): Promise<boolean> {
    const rows = await this.sql.query<{ event_id: string }>(
      'INSERT INTO webhook_events (event_id) VALUES ($1) ON CONFLICT (event_id) DO NOTHING RETURNING event_id',
      [eventId],
    );
    return rows.length === 1;
  }

  async forget(eventId: string): Promise<void> {
    await this.sql.query('DELETE FROM webhook_events WHERE event_id = $1', [eventId]);
  }
}

export class PgShipmentRepository implements ShipmentRepository {
  constructor(private readonly sql: SqlClient) {}

  async create(orderId: string): Promise<void> {
    await this.sql.query('INSERT INTO shipments (order_id) VALUES ($1)', [orderId]);
  }
}
