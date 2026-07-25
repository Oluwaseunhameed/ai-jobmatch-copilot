import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { Request } from 'express';

import { AuthGuard } from '../auth/auth.guard';
import { ProfilesService } from './profiles.service';

type AuthenticatedRequest = Request & { user: { id: string } };

class SkillDto {
  @IsString()
  @MaxLength(80)
  name!: string;

  @IsString()
  @IsIn(['technical', 'soft', 'language', 'tool', 'domain', 'other'])
  category!: string;

  @IsOptional()
  @IsString()
  @IsIn(['beginner', 'intermediate', 'advanced', 'expert'])
  level?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  years?: number | null;
}

class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  headline?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  summary?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  timeZone?: string | null;

  @IsOptional()
  @IsString()
  portfolioUrl?: string | null;

  @IsOptional()
  @IsString()
  githubUrl?: string | null;

  @IsOptional()
  @IsString()
  linkedinUrl?: string | null;

  @IsOptional()
  @IsString()
  websiteUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  currentJobTitle?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60)
  yearsOfExperience?: number | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  desiredRoles?: string[];

  @IsOptional()
  @IsString()
  @IsIn(['full-time', 'part-time', 'contract', 'freelance', 'internship'])
  employmentType?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  salaryExpectation?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  salaryCurrency?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  noticePeriodDays?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  workAuthorization?: string | null;

  @IsOptional()
  @IsBoolean()
  visaSponsorshipNeeded?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(['remote', 'hybrid', 'on-site'])
  workLocationPreference?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SkillDto)
  skills?: SkillDto[];
}

class ReplaceSkillsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SkillDto)
  skills!: SkillDto[];
}

@ApiTags('profiles')
@Controller('users/me/profile')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get()
  @ApiOperation({ summary: 'Get or create the current user career profile' })
  getProfile(@Req() req: AuthenticatedRequest) {
    return this.profilesService.getOrCreate(req.user.id);
  }

  @Put()
  @ApiOperation({ summary: 'Update career profile (optionally including skills)' })
  updateProfile(@Req() req: AuthenticatedRequest, @Body() dto: UpdateProfileDto) {
    return this.profilesService.update(req.user.id, dto);
  }

  @Put('skills')
  @ApiOperation({ summary: 'Replace all skills on the career profile' })
  replaceSkills(@Req() req: AuthenticatedRequest, @Body() dto: ReplaceSkillsDto) {
    return this.profilesService.replaceSkills(req.user.id, dto.skills);
  }
}
