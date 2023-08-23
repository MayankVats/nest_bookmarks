import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthDto } from './dto';
import * as argon from 'argon2';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable({})
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async signup(dto: AuthDto) {
    try {
      // generate the password
      const hash = await argon.hash(dto.password);

      // save the new user in the db
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          hash: hash,
        },
      });

      delete user.hash;

      // return the saved user
      return user;
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ForbiddenException('Credentials Taken');
        }
      }
    }
  }

  async signin(dto: AuthDto) {
    // find the user by email
    // if user does not exist throw exception
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });

    if (!user) {
      throw new ForbiddenException('Invalid Credentials');
    }

    // compare password
    const isVerified = await argon.verify(user.hash, dto.password);

    // if hash does not match throw exception
    if (!isVerified) {
      throw new ForbiddenException('Invalid Credentials');
    }

    const token = await this.signToken(user.id, user.email);
    // send back the result
    return { access_token: token };
  }

  async signToken(userId: number, email: string): Promise<string> {
    const data = {
      userId,
      email,
    };

    return this.jwt.signAsync(data, {
      expiresIn: '15m',
      secret: this.config.get('JWT_SECRET'),
    });
  }

  async validateUser(userId: number, email: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        email,
      },
    });

    return user;
  }
}
