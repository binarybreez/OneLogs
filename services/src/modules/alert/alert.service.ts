// import {
//   BadRequestException,
//   Inject,
//   Injectable,
//   UnauthorizedException,
// } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';
// import { count, desc, eq } from 'drizzle-orm';
// import Redis from 'ioredis';
// import { DRIZZLE_DB } from 'src/database/database.module';
// import { REDIS_CLIENT } from 'src/infra/redis.module';
// import crypto from 'crypto';
// import { alerts } from 'src/database/schema';

// type AlertCondition = {
//   field: string;
//   operator: string;
//   value: string;
// };

// type CreateAlertPayload = {
//   name: string;
//   appName: string;
//   conditions: AlertCondition[];
//   threshold: {
//     count: number;
//     windowMinutes: number;
//   };
//   webhook: {
//     url: string;
//   };
//   cooldownperiod: string;
//   summary: string;
// };

// const ALLOWED_FIELDS = new Set([
//   'Type',
//   'Message',
//   'Importance',
//   'Environment',
//   'Service',
//   'Subsystem',
//   'Operation',
// ]);

// const ALLOWED_OPERATORS = new Set(['equals', 'does not equal']);

// const ALLOWED_IMPORTANCE_VALUES = new Set([
//   'critical',
//   'high',
//   'medium',
//   'low',
// ]);

// const WEBHOOK_VERIFICATION_TTL_SEC = 15 * 60;

// @Injectable()
// export class AlertService {
//   constructor(
//     @Inject(DRIZZLE_DB) private readonly db: any,
//     @Inject(REDIS_CLIENT) private readonly redis: Redis,
//     private readonly configService: ConfigService,
//   ) {}

//   private getWebhookVerificationKey(userId: string, webhookUrl: string) {
//     const webhookdigest = crypto
//       .createHash('sha256')
//       .update(webhookUrl.trim(), 'utf8')
//       .digest('hex');
//     return `ol:webhook:verified:${userId}:${webhookdigest}`;
//   }

//   async createAlert(userPlan, userId: string, payload: CreateAlertPayload) {
//     const [result] = await this.db
//       .select({ value: count() })
//       .from(alert)
//       .where(eq(alert.user_id, userId));
//     const alertsCount = result.value;

//     if (userPlan === 'starter') {
//       if (alertsCount >= 5) {
//         throw new UnauthorizedException(
//           'you have reached 5 alerts for the starter plan',
//         );
//       }
//     }
//     if (userPlan == 'pro') {
//       if (alertsCount > 12) {
//         throw new UnauthorizedException(
//           `you have reached the plan limits for the pro limits`,
//         );
//       }
//       if (userPlan == 'business') {
//         throw new UnauthorizedException(
//           `you have reached the 20 alerts limit for the business plan`,
//         );
//       }
//     }
//     this.validateCreateAlertPayload(payload);
//     const webhookUrl = payload.webhook.url.trim();
//     const [createdAlert] = await this.db
//       .insert(alert)
//       .values({
//         user_id: userId,
//         name: payload.name.trim(),
//         appName: payload.appName.trim(),
//         conditions: payload.conditions.map((condition) => ({
//           field: condition.field,
//           operator: condition.operator,
//           value: condition.value.trim(),
//         })),
//         threshold_count: payload.threshold.count,
//         threshold_window_minutes: payload.threshold.windowMinutes,
//         webhook_url: webhookUrl,
//         cooldown_period: payload.cooldownperiod,
//         summary: payload.summary,
//       })
//       .returing();
//     await this.redis.del(`ol:alerts:${userId}`);
//     return createdAlert;
//   }
//   private validateCreateAlertPayload(payload: CreateAlertPayload) {
//     if (!payload || typeof payload !== 'object') {
//       throw new BadRequestException('Alert is payload');
//     }
//     if (!payload.name) {
//       throw new BadRequestException(`alert name required`);
//     }

//     for (const condition of payload.conditions) {
//       if (!ALLOWED_FIELDS.has(condition.field)) {
//         throw new BadRequestException(`Unsupported alert field`);
//       }
//       if (!condition.value?.trim()) {
//         throw new BadRequestException(`condition is required`);
//       }
//       if (
//         condition.field === 'Importance' &&
//         !ALLOWED_IMPORTANCE_VALUES.has(condition.value)
//       ) {
//         throw new BadRequestException(`Critical Importance Required`);
//       }
//     }
//     if (
//       !Number.isInteger(payload.threshold?.count) ||
//       payload.threshold.count < 1
//     ) {
//       throw new BadRequestException(`threshold must be atleast 1`);
//     }
//     if (!payload.webhook?.url?.trim()) {
//       throw new BadRequestException(`webhook URL is required`);
//     }
//     try {
//       new URL(payload.webhook.url);
//     } catch (error) {
//       console.log(error);
//       throw new BadRequestException(`webhook url must be a valid url`);
//     }
//     if (!payload.cooldownperiod?.trim()) {
//       throw new BadRequestException(`cooldown period is required`);
//     }
//   }

//   async listAlerts(userId: string) {
//     const cachedKey = `ol:alerts:${userId}`;
//     const cachedAlerts = await this.redis.get(cachedKey);

//     if (cachedAlerts) {
//       return JSON.parse(cachedAlerts);
//     }

//     const userAlerts = await this.db
//       .select()
//       .from(alerts)
//       .where(eq(alerts.user_id, userId))
//       .orderBy(desc(alerts.created_at));
//     await this.redis.set(cachedKey, JSON.stringify(userAlerts));
//     return userAlerts;
//   }
//   async verifyWebhook({
//     plan,
//     signature,
//     timestamp,
//     body,
//   }: {
//     plan: string;
//     signature: string;
//     timestamp: string;
//     body: unknown;
//   }) {
//     if (!signature || !timestamp) {
//       throw new BadRequestException('Missing webhook signature and timestamp');
//     }

//   }
// }
