import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { AuthGuard, type AuthUser } from '../auth/auth.guard';

type AuthenticatedRequest = Request & { user: AuthUser };

@ApiTags('users')
@Controller('users')
export class UsersController {
  @Get('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the currently authenticated user' })
  getMe(@Req() req: AuthenticatedRequest) {
    return { data: req.user };
  }
}
