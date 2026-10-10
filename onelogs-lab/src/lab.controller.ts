import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { issueToken, requireUser } from './auth';
import { config } from './config';
import { dataset, publicUser } from './data';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
/** Fake processing time, so latency in the logs is not a flat ~0.3 ms. */
const work = (min: number, max: number) =>
  config.simulateLatency
    ? sleep(min + Math.random() * (max - min))
    : Promise.resolve();

@Controller()
export class LabController {
  // ── documented ─────────────────────────────────────────────────────────────

  @Post('login')
  @HttpCode(200)
  async login(
    @Req() req: Request,
    @Body() body: { username?: unknown; password?: unknown },
  ) {
    await work(25, 60); // pretend password hashing
    const user =
      typeof body?.username === 'string'
        ? dataset.usersByName.get(body.username)
        : undefined;
    // for /login the "requested object" is the account being tried: this is what makes stuffing visible
    if (user) req.lab.owner_id = user.id;
    if (!user || user.password !== body?.password)
      throw new UnauthorizedException('Invalid credentials');
    req.lab.user_id = user.id;
    return { token: issueToken(user.id), user_id: user.id };
  }

  @Get('orders/:id')
  async order(@Req() req: Request, @Param('id') rawId: string) {
    const caller = requireUser(req);
    await work(4, 18);
    const id = Number(rawId);
    const order = Number.isInteger(id) ? dataset.orders.get(id) : undefined;
    if (!order) throw new NotFoundException('Order not found');
    req.lab.owner_id = order.owner_id;
    // THE BOLA HOLE: with LAB_ENFORCE_OWNERSHIP=false there is no ownership check at all.
    if (
      config.enforceOwnership &&
      order.owner_id !== caller.id &&
      caller.role !== 'support'
    ) {
      throw new ForbiddenException('Not your order');
    }
    return order;
  }

  @Get('products') // public: anonymous browsing and scraping both land here
  async products(
    @Query('page') pageRaw?: string,
    @Query('limit') limitRaw?: string,
    @Query('q') q?: string,
  ) {
    await work(6, 28);
    const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1);
    const limit = Math.min(
      1000,
      Math.max(1, parseInt(limitRaw ?? '20', 10) || 20),
    );
    const term = typeof q === 'string' ? q.toLowerCase() : '';
    const all = term
      ? dataset.products.filter(
          (p) =>
            p.name.toLowerCase().includes(term) || p.category.includes(term),
        )
      : dataset.products;
    return {
      page,
      limit,
      total: all.length,
      items: all.slice((page - 1) * limit, page * limit),
    };
  }

  @Get('profile')
  async profile(@Req() req: Request) {
    const user = requireUser(req);
    await work(4, 12);
    req.lab.owner_id = user.id;
    return publicUser(user);
  }

  @Put('profile') // the endpoint that takes a JSON body
  async updateProfile(
    @Req() req: Request,
    @Body() body: Record<string, unknown>,
  ) {
    const user = requireUser(req);
    await work(6, 18);
    for (const field of ['displayName', 'email', 'phone', 'address'] as const) {
      const v = body?.[field];
      if (typeof v === 'string' && v.length <= 200) user[field] = v;
    }
    req.lab.owner_id = user.id;
    return publicUser(user);
  }

  // ── NOT in openapi.json: a forgotten debug route ───────────────────────────

  @Get('internal/debug/dump')
  async dump(@Req() req: Request) {
    requireUser(req); // any valid token will do, which is the mistake
    await work(15, 40);
    return {
      generated_at: new Date().toISOString(),
      users: dataset.users.map(publicUser),
      orders: [...dataset.orders.values()],
    };
  }
}
