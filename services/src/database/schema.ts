import { integer, jsonb } from 'drizzle-orm/pg-core';
import {
  pgTable,
  uuid,
  text,
  timestamp,
  bigint,
  uniqueIndex,
  boolean,
} from 'drizzle-orm/pg-core';
import { PlanTier } from 'src/configs';

export const api_key = pgTable('api_key', {
  id: uuid('id').defaultRandom().primaryKey(),
  user_id: text('user_id').notNull(),
  prefix: text('prefix').notNull(),
  value: text('value').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  last_used_at: timestamp('last_used_at', { withTimezone: true }),
  revoked_at: timestamp('revoked_at', { withTimezone: true }),
});

export const plan = pgTable('plan', {
  id: uuid('id').defaultRandom().primaryKey(),
  user_id: text('user_id').notNull().unique(),
  tier: text('tier').$type<PlanTier>().notNull().default(PlanTier.FREE),
  status: text('status').notNull().default('active'),
  provider: text('provider').notNull().default('mock'),
  provider_customer_id: text('provider_customer_id'),
  provider_subscription_id: text('provider_subscription_id'),
  provider_price_id: text('provider_price_id'),
  current_period_end: timestamp('current_period_end', { withTimezone: true }),
  cancel_at_period_end: boolean('cancel_at_period_end')
    .notNull()
    .default(false),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const usage = pgTable(
  'usage',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    user_id: text('user_id').notNull(),
    period: text('period').notNull(), // 'YYYY-MM' (UTC)
    events_used: bigint('events_used', { mode: 'number' }).default(0),
    events_limit: bigint('events_limit', { mode: 'number' }),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    userPeriodUq: uniqueIndex('usage_user_period_uq').on(t.user_id, t.period),
  }),
);

export const alerts = pgTable('alerts', {
  id: uuid().defaultRandom().primaryKey(),
  user_id: text('user_id').notNull(),
  name: text('name').notNull(),
  conditions: jsonb('conditions')
    .$type<{ field: string; operatorstring; value: string }[]>()
    .notNull(),
  threshold_count: integer('threshold_count').notNull(),
  threshold_window_minutes: integer('threshold_window_minutes').notNull(),
  webhook_url: text('webhook_url').notNull(),
  cooldown_period: text('cooldown_period').notNull(),
  summary: text('summary').notNull(),
  appName: text('appName').notNull(),
  status: text('status').default('active'),
  last_triggered: timestamp('last_triggered', { withTimezone: true }),
  created_at: timestamp('created_at', {
    withTimezone: true,
  }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
