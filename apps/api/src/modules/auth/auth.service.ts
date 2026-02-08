import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { User } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const normalizedEmail = email.toLowerCase();
    const user = await this.userRepository.findOne({ 
      where: { email: normalizedEmail },
      select: ['id', 'uuid', 'email', 'password', 'role', 'status']
    });

    if (user && await bcrypt.compare(pass, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { 
      sub: user.uuid, 
      email: user.email,
      role: user.role,
      status: user.status 
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async register(registerDto: RegisterDto): Promise<Partial<User>> {
    const { email, dni, password, name } = registerDto;
    const normalizedEmail = email.toLowerCase();

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: [{ email: normalizedEmail }, { dni }],
    });

    if (existingUser) {
      throw new ConflictException('User with this email or DNI already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = this.userRepository.create({
      name,
      email: normalizedEmail,
      dni,
      password: hashedPassword,
    });

    const savedUser = await this.userRepository.save(user);

    // Return user without password
    const { password: _, ...result } = savedUser;
    return result;
  }
}
