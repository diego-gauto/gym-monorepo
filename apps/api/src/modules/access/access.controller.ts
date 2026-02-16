import { Body, Controller, Get, Headers, Post, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { UserRole } from '@gym-admin/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AccessService } from './access.service';
import { RegisterCheckInDto } from './dto/register-check-in.dto';

@Controller('access')
@UseGuards(JwtAuthGuard)
export class AccessController {
  constructor(private readonly accessService: AccessService) {}

  @Get('check-in/activities')
  getCheckInActivities(@Query('gym') gym?: string, @Query('token') token?: string) {
    const qrValidation = this.accessService.validateQrAccess(gym, token);
    if (!qrValidation.ok) {
      throw new UnauthorizedException(qrValidation.reason ?? 'QR inválido');
    }
    return {
      activities: this.accessService.getAvailableActivities(),
    };
  }

  @Get('check-in/eligibility')
  async getCheckInEligibility(@Req() req: any, @Query('gym') gym?: string, @Query('token') token?: string) {
    return this.accessService.getCheckInEligibility(req.user.uuid, gym, token);
  }

  @Get('check-in/admin/qr')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getAdminCheckInQr(@Query('gym') gym?: string, @Query('baseUrl') baseUrl?: string) {
    return this.accessService.generateCheckInQr(gym, baseUrl);
  }

  @Post('check-in')
  async registerCheckIn(
    @Req() req: any,
    @Body() dto: RegisterCheckInDto,
    @Headers('x-device-id') headerDeviceId?: string,
  ) {
    const attendance = await this.accessService.registerCheckIn(req.user.uuid, {
      activitySlug: dto.activitySlug,
      gymLocation: dto.gymLocation,
      deviceId: dto.deviceId ?? headerDeviceId,
      qrToken: dto.qrToken,
      latitude: dto.latitude,
      longitude: dto.longitude,
    });

    return {
      message: 'Ingreso registrado correctamente.',
      checkIn: {
        uuid: attendance.uuid,
        checkInAt: attendance.checkInAt.toISOString(),
        activitySlug: attendance.activitySlug,
        gymLocation: attendance.gymLocation,
      },
    };
  }
}
