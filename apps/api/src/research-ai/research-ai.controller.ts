import { Controller, HttpCode, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { researchAiLocaleSchema } from '@thesispartner/validation';
import type { Request } from 'express';
import { AppException } from '../common/errors/app.exception';
import { ResearchAiService } from './research-ai.service';

@ApiTags('research-ai')
@Controller({ path: 'theses/:thesisId/research-ai', version: '1' })
export class ResearchAiController {
  constructor(private readonly researchAi: ResearchAiService) {}

  @Post('generate')
  @HttpCode(200)
  @ApiOperation({ summary: 'Generate an AI research synthesis for a thesis dossier' })
  generate(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Query('locale') localeRaw: string | undefined,
    @Req() request: Request,
  ) {
    if (!request.auth) throw new AppException(401, 'UNAUTHORIZED', 'Authentication required');
    const locale = researchAiLocaleSchema.safeParse(localeRaw ?? 'fr');
    return this.researchAi.generate(
      request.auth.userId,
      thesisId,
      locale.success ? locale.data : 'fr',
    );
  }
}
