import { Controller, Get, NotFoundException, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { StorageService } from './storage.service';

@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Get('*')
  async getObject(@Req() request: Request, @Res() response: Response) {
    const objectName = this.extractObjectName(request);

    if (!objectName) {
      throw new NotFoundException('File not found');
    }

    const object = await this.storageService.getObject(objectName);

    response.setHeader('Content-Type', object.contentType);
    response.setHeader(
      'Cache-Control',
      object.cacheControl ?? 'public, max-age=31536000, immutable',
    );

    object.body.pipe(response);
  }

  private extractObjectName(request: Request) {
    const marker = '/storage/';
    const markerIndex = request.path.indexOf(marker);
    if (markerIndex === -1) return '';

    return decodeURIComponent(request.path.slice(markerIndex + marker.length));
  }
}
