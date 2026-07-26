import { Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { AuthGuard } from '../auth/auth.guard';
import { JobsService } from './jobs.service';

type AuthenticatedRequest = Request & { user: { id: string } };

function splitCsv(value?: string): string[] | undefined {
  if (!value?.trim()) return undefined;
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

@ApiTags('jobs')
@Controller('jobs')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  @ApiOperation({ summary: 'Search active jobs (keyword + optional semantic)' })
  search(
    @Req() req: AuthenticatedRequest,
    @Query('q') q?: string,
    @Query('workMode') workMode?: string,
    @Query('employmentType') employmentType?: string,
    @Query('seniority') seniority?: string,
    @Query('country') country?: string,
    @Query('salaryMin') salaryMin?: string,
    @Query('sort') sort?: 'relevance' | 'recent' | 'salary',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.jobsService.search(req.user.id, {
      q,
      workMode: splitCsv(workMode),
      employmentType: splitCsv(employmentType),
      seniority: splitCsv(seniority),
      country,
      salaryMin: salaryMin ? Number(salaryMin) : undefined,
      sort,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('saved')
  @ApiOperation({ summary: 'List jobs the current user has saved' })
  listSaved(@Req() req: AuthenticatedRequest) {
    return this.jobsService.listSaved(req.user.id);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get a job by slug' })
  get(@Req() req: AuthenticatedRequest, @Param('slug') slug: string) {
    return this.jobsService.getBySlug(req.user.id, slug);
  }

  @Post(':id/save')
  @ApiOperation({ summary: 'Save a job' })
  save(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.jobsService.save(req.user.id, id);
  }

  @Delete(':id/save')
  @ApiOperation({ summary: 'Remove a saved job' })
  unsave(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.jobsService.unsave(req.user.id, id);
  }

  @Post(':id/view')
  @ApiOperation({ summary: 'Record that the user viewed a job' })
  view(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.jobsService.recordView(req.user.id, id);
  }
}
