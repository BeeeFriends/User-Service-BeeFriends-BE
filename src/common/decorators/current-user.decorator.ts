import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export type CurrentUserPayload = {
  userId: number;
  username?: string;
  email?: string;
};

type AuthenticatedRequest = Request & {
  user?: CurrentUserPayload;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user;
  },
);
