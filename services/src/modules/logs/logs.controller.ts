import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard, type AuthenticatedRequest } from 'src/guards/auth.guard';
import { LogsService } from './logs.service';
import type { SendLogsBody } from './logs.service';
import { UsageGuard, type QuotaRequest } from 'src/guards/usage.guard';
import { PlanTier } from 'src/configs';

@Controller('logs')
@UseGuards(AuthGuard)
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Get()
  async getLogs(@Req() req: AuthenticatedRequest) {
    return this.logsService.getLogs(req);
  }

  @Post()
  @UseGuards(UsageGuard)
  async sendLogs(@Req() req: QuotaRequest, @Body() body: SendLogsBody) {
    if (!req.user.keyId) {
      throw new UnauthorizedException(
        'Logs must be submitted using an API key',
      );
    }
    return this.logsService.sendLogs(
      body,
      req.user.keyId,
      req.user.id,
      req.plan ?? PlanTier.FREE,
      Number(req.headers['content-length']) || 0,
    );
  }

  @Get('stream')
  async startSSE(@Req() req: AuthenticatedRequest, @Res() res: Response) {
    return this.logsService.startSSE(req, res);
  }
}
