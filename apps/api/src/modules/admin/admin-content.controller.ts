import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@gym-admin/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateActivityDto, UpdateActivityDto } from './dto/activity.dto';
import { CreateBenefitDto, UpdateBenefitDto } from './dto/benefit.dto';
import { UpsertPlanContentDto } from './dto/plan-content.dto';
import { UpdateSiteSettingsDto } from './dto/site-settings.dto';
import { StatsRangeQueryDto } from './dto/stats-range.dto';
import { CreateTrainerDto, UpdateTrainerDto } from './dto/trainer.dto';
import { AdminContentService } from './admin-content.service';

@Controller()
export class AdminContentController {
  constructor(private readonly adminContentService: AdminContentService) {}

  @Get('content/home')
  getPublicHome() {
    return this.adminContentService.getPublicHomeContent();
  }

  @Get('content/activities')
  getPublicActivities() {
    return this.adminContentService.getPublicActivities();
  }

  @Get('content/activities/:slug')
  getPublicActivity(@Param('slug') slug: string) {
    return this.adminContentService.getPublicActivityBySlug(slug);
  }

  @Get('admin/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getStats(@Query() query: StatsRangeQueryDto) {
    return this.adminContentService.getStats(query.range);
  }

  @Get('admin/content/site')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getSite() {
    return this.adminContentService.getSiteSettings();
  }

  @Patch('admin/content/site')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  updateSite(@Body() payload: UpdateSiteSettingsDto) {
    return this.adminContentService.updateSiteSettings(payload);
  }

  @Get('admin/content/trainers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getTrainers() {
    return this.adminContentService.getTrainers();
  }

  @Post('admin/content/trainers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  createTrainer(@Body() payload: CreateTrainerDto) {
    return this.adminContentService.createTrainer(payload);
  }

  @Patch('admin/content/trainers/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  updateTrainer(@Param('id') id: string, @Body() payload: UpdateTrainerDto) {
    return this.adminContentService.updateTrainer(id, payload);
  }

  @Delete('admin/content/trainers/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  deleteTrainer(@Param('id') id: string) {
    return this.adminContentService.deleteTrainer(id);
  }

  @Get('admin/content/activities')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getActivities() {
    return this.adminContentService.getActivities();
  }

  @Post('admin/content/activities')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  createActivity(@Body() payload: CreateActivityDto) {
    return this.adminContentService.createActivity(payload);
  }

  @Patch('admin/content/activities/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  updateActivity(@Param('id') id: string, @Body() payload: UpdateActivityDto) {
    return this.adminContentService.updateActivity(id, payload);
  }

  @Delete('admin/content/activities/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  deleteActivity(@Param('id') id: string) {
    return this.adminContentService.deleteActivity(id);
  }

  @Get('admin/content/benefits')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getBenefits() {
    return this.adminContentService.getBenefits();
  }

  @Post('admin/content/benefits')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  createBenefit(@Body() payload: CreateBenefitDto) {
    return this.adminContentService.createBenefit(payload);
  }

  @Patch('admin/content/benefits/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  updateBenefit(@Param('id') id: string, @Body() payload: UpdateBenefitDto) {
    return this.adminContentService.updateBenefit(id, payload);
  }

  @Delete('admin/content/benefits/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  deleteBenefit(@Param('id') id: string) {
    return this.adminContentService.deleteBenefit(id);
  }

  @Get('admin/content/plans')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getPlans() {
    return this.adminContentService.getPlanContent();
  }

  @Post('admin/content/plans')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  upsertPlan(@Body() payload: UpsertPlanContentDto) {
    return this.adminContentService.upsertPlanContent(payload);
  }

  @Delete('admin/content/plans/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  deletePlan(@Param('id') id: string) {
    return this.adminContentService.deletePlanContent(id);
  }
}
