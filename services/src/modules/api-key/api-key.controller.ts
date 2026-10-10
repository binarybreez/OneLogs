import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { APIKeyService } from './api-key.service';
import { AuthGuard } from 'src/guards/auth.guard';

interface AuthenticatedRequest extends Request {
  user: { id: string };
}

@Controller('api-keys')
@UseGuards(AuthGuard)
export class ApiKeyController {
  constructor(private readonly apiKeyService: APIKeyService) {}

  @Post()
  async createApiKey(@Req() req: AuthenticatedRequest) {
    return this.apiKeyService.createApiKey(req.user.id);
  }

  @Get()
  async listApiKeys(@Req() req: AuthenticatedRequest) {
    return this.apiKeyService.listApiKeys(req.user.id);
  }

  @Get(':id')
  async ApiKeyLastUsed(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.apiKeyService.getApiKeyLastUsed(req.user.id, id);
  }

  @Delete(':id')
  async deleteApiKey(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.apiKeyService.deleteApiKey(req.user.id, id);
  }

  @Post(':id/regenerate')
  async regenerateApiKey(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.apiKeyService.regenerateApiKey(req.user.id, id);
  }
}
