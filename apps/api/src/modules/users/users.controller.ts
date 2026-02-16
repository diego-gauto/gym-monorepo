import { BadRequestException, Body, Controller, Get, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AttendanceRangeDto } from './dto/attendance-range.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  private resolveUserId(req: any): number {
    const userId = Number(req.user?.id);
    if (!Number.isFinite(userId)) {
      throw new BadRequestException('No se pudo resolver el usuario autenticado.');
    }
    return userId;
  }

  @Get('me')
  getMe(@Req() req: any) {
    return this.usersService.getMyProfile(this.resolveUserId(req));
  }

  @Patch('me')
  updateMe(@Req() req: any, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateMyProfile(this.resolveUserId(req), dto);
  }

  @Post('me/password')
  changePassword(@Req() req: any, @Body() dto: ChangePasswordDto) {
    return this.usersService.changeMyPassword(this.resolveUserId(req), dto);
  }

  @Get('me/attendance')
  getAttendance(@Req() req: any, @Query() query: AttendanceRangeDto) {
    return this.usersService.getAttendanceHistory(this.resolveUserId(req), query.range);
  }

  @Get('me/payments')
  getPayments(@Req() req: any) {
    return this.usersService.getPaymentHistory(this.resolveUserId(req));
  }

  @Get('me/subscription')
  getSubscription(@Req() req: any) {
    return this.usersService.getSubscriptionOverview(this.resolveUserId(req));
  }
}

