import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RateLimit } from '../common/rate-limit.guard';
import { StorageService } from './storage.service';

@UseGuards(JwtAuthGuard)
@Controller('uploads')
export class UploadsController {
  constructor(private readonly storage: StorageService) {}

  /** Upload a file to object storage; returns a reference used by request bodies. */
  @RateLimit({ limit: 60, windowSec: 60 })
  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');
    const key = await this.storage.put(
      file.buffer,
      file.mimetype || 'application/octet-stream',
      file.originalname,
    );
    return { key, filename: file.originalname, size: file.size, contentType: file.mimetype };
  }
}
