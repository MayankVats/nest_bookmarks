import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';

@Injectable()
export class UserService {
  constructor(private config: ConfigService, private jwt: JwtService) {}

  async getUser(user: User) {
    return { userId: user.id, email: user.email };
  }
}
