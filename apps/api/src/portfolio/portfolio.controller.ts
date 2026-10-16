import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  portfolioProjectInputSchema,
  portfolioSkillInputSchema,
  publicationInputSchema,
} from '@thesispartner/validation';
import type { Request } from 'express';
import { AppException } from '../common/errors/app.exception';
import { ValidateBody } from '../common/validation/zod-body.interceptor';
import { PortfolioService } from './portfolio.service';

@ApiTags('portfolio')
@Controller({ path: 'portfolio', version: '1' })
export class PortfolioController {
  constructor(private readonly portfolio: PortfolioService) {}

  @Get()
  @ApiOperation({ summary: 'Scientific portfolio of the signed-in account' })
  get(@Req() request: Request) {
    return this.portfolio.get(actorId(request));
  }

  @Post('publications')
  @HttpCode(200)
  @ValidateBody(publicationInputSchema)
  @ApiOperation({ summary: 'Add a publication or a conference paper' })
  addPublication(@Body() body: unknown, @Req() request: Request) {
    return this.portfolio.addPublication(
      actorId(request),
      publicationInputSchema.parse(body),
      request.requestId,
    );
  }

  @Post('publications/:publicationId/remove')
  @HttpCode(200)
  @ApiOperation({ summary: 'Remove one of your publications' })
  removePublication(
    @Param('publicationId', ParseUUIDPipe) publicationId: string,
    @Req() request: Request,
  ) {
    return this.portfolio.removePublication(actorId(request), publicationId, request.requestId);
  }

  @Post('projects')
  @HttpCode(200)
  @ValidateBody(portfolioProjectInputSchema)
  @ApiOperation({ summary: 'Add a project to the portfolio' })
  addProject(@Body() body: unknown, @Req() request: Request) {
    return this.portfolio.addProject(
      actorId(request),
      portfolioProjectInputSchema.parse(body),
      request.requestId,
    );
  }

  @Post('projects/:projectId/remove')
  @HttpCode(200)
  @ApiOperation({ summary: 'Remove one of your projects' })
  removeProject(@Param('projectId', ParseUUIDPipe) projectId: string, @Req() request: Request) {
    return this.portfolio.removeProject(actorId(request), projectId, request.requestId);
  }

  @Post('skills')
  @HttpCode(200)
  @ValidateBody(portfolioSkillInputSchema)
  @ApiOperation({ summary: 'Add a skill to the portfolio' })
  addSkill(@Body() body: unknown, @Req() request: Request) {
    return this.portfolio.addSkill(
      actorId(request),
      portfolioSkillInputSchema.parse(body),
      request.requestId,
    );
  }

  @Post('skills/:skillId/remove')
  @HttpCode(200)
  @ApiOperation({ summary: 'Remove one of your skills' })
  removeSkill(@Param('skillId', ParseUUIDPipe) skillId: string, @Req() request: Request) {
    return this.portfolio.removeSkill(actorId(request), skillId, request.requestId);
  }
}

function actorId(request: Request): string {
  if (!request.auth) throw new AppException(401, 'UNAUTHORIZED', 'Authentication required');
  return request.auth.userId;
}
