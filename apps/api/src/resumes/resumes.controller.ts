import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import type { Request, Response } from 'express';
import { memoryStorage } from 'multer';

import { AuthGuard } from '../auth/auth.guard';
import { ResumesService } from './resumes.service';

type AuthenticatedRequest = Request & { user: { id: string } };

class UpdateResumeDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

@ApiTags('resumes')
@Controller('users/me/resumes')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class ResumesController {
  constructor(private readonly resumesService: ResumesService) {}

  @Get()
  @ApiOperation({ summary: 'List resumes for the current user' })
  list(@Req() req: AuthenticatedRequest) {
    return this.resumesService.list(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a resume by id' })
  get(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.resumesService.get(req.user.id, id);
  }

  @Post()
  @ApiOperation({ summary: 'Upload a resume (PDF/DOCX)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        title: { type: 'string' },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  upload(
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('title') title?: string,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    return this.resumesService.upload(req.user.id, {
      buffer: file.buffer,
      originalFileName: file.originalname,
      mimeType: file.mimetype,
      title,
    });
  }

  @Post(':id/parse')
  @ApiOperation({ summary: 'Parse resume via AI service (extract + structure)' })
  parse(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.resumesService.parse(req.user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Rename resume or set as primary' })
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateResumeDto,
  ) {
    return this.resumesService.update(req.user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a resume and its file' })
  remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.resumesService.remove(req.user.id, id);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download the original resume file' })
  async download(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const { resume, buffer } = await this.resumesService.download(req.user.id, id);
    res.setHeader('Content-Type', resume.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(resume.originalFileName)}"`,
    );
    res.send(buffer);
  }
}
