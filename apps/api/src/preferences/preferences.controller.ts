import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import type { Request } from 'express';

import { AuthGuard } from '../auth/auth.guard';
import { PreferencesService } from './preferences.service';

type AuthenticatedRequest = Request & { user: { id: string } };

class UpdatePreferencesDto {
  @IsOptional()
  @IsIn(['system', 'light', 'dark'])
  theme?: string;

  @IsOptional()
  @IsIn(['en', 'es', 'fr', 'de'])
  locale?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsBoolean()
  emailJobAlerts?: boolean;

  @IsOptional()
  @IsBoolean()
  emailApplicationUpdates?: boolean;

  @IsOptional()
  @IsBoolean()
  emailWeeklyDigest?: boolean;

  @IsOptional()
  @IsBoolean()
  emailMarketing?: boolean;

  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;
}

@ApiTags('preferences')
@Controller('users/me/preferences')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class PreferencesController {
  constructor(private readonly preferencesService: PreferencesService) {}

  @Get()
  @ApiOperation({ summary: 'Get user preferences' })
  getPreferences(@Req() req: AuthenticatedRequest) {
    return this.preferencesService.getOrCreate(req.user.id);
  }

  @Patch()
  @ApiOperation({ summary: 'Update user preferences' })
  updatePreferences(@Req() req: AuthenticatedRequest, @Body() dto: UpdatePreferencesDto) {
    return this.preferencesService.update(req.user.id, dto);
  }

  @Post('onboarding/complete')
  @ApiOperation({ summary: 'Mark onboarding as complete' })
  completeOnboarding(@Req() req: AuthenticatedRequest) {
    return this.preferencesService.completeOnboarding(req.user.id);
  }
}
