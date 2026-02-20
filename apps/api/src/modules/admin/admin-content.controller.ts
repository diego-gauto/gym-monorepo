import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@gym-admin/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateActivityDto, UpdateActivityDto } from './dto/activity.dto';
import { CreateBenefitDto, UpdateBenefitDto } from './dto/benefit.dto';
import { CreateBranchDto, UpdateBranchDto } from './dto/branch.dto';
import { RegisterCounterPaymentDto } from './dto/register-counter-payment.dto';
import { UpsertPlanContentDto } from './dto/plan-content.dto';
import { SearchStudentsDto } from './dto/search-students.dto';
import { UpdateSiteSettingsDto } from './dto/site-settings.dto';
import { StatsRangeQueryDto } from './dto/stats-range.dto';
import { CreateTrainerDto, UpdateTrainerDto } from './dto/trainer.dto';
import { AdminContentService } from './admin-content.service';

@Controller()
@ApiTags('Content', 'Admin')
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
  @ApiBearerAuth('bearer')
  getStats(@Query() query: StatsRangeQueryDto) {
    return this.adminContentService.getStats(query.range);
  }

  @Get('admin/payments/students')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('bearer')
  searchStudents(@Query() query: SearchStudentsDto) {
    return this.adminContentService.searchStudentsForCounterPayment(query.q);
  }

  @Post('admin/payments/one-time')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('bearer')
  registerOneTimePayment(@Body() payload: RegisterCounterPaymentDto) {
    return this.adminContentService.registerCounterOneTimePayment(payload);
  }

  @Get('admin/content/site')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('bearer')
  getSite() {
    return this.adminContentService.getSiteSettings();
  }

  @Patch('admin/content/site')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('bearer')
  updateSite(@Body() payload: UpdateSiteSettingsDto) {
    return this.adminContentService.updateSiteSettings(payload);
  }

  @Get('admin/content/trainers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('bearer')
  getTrainers() {
    return this.adminContentService.getTrainers();
  }

  @Post('admin/content/trainers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('bearer')
  createTrainer(@Body() payload: CreateTrainerDto) {
    return this.adminContentService.createTrainer(payload);
  }

  @Patch('admin/content/trainers/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('bearer')
  updateTrainer(@Param('id') id: string, @Body() payload: UpdateTrainerDto) {
    return this.adminContentService.updateTrainer(id, payload);
  }

  @Delete('admin/content/trainers/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('bearer')
  deleteTrainer(@Param('id') id: string) {
    return this.adminContentService.deleteTrainer(id);
  }

  @Get('admin/content/activities')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('bearer')
  getActivities() {
    return this.adminContentService.getActivities();
  }

  @Post('admin/content/activities')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('bearer')
  createActivity(@Body() payload: CreateActivityDto) {
    return this.adminContentService.createActivity(payload);
  }

  @Patch('admin/content/activities/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('bearer')
  updateActivity(@Param('id') id: string, @Body() payload: UpdateActivityDto) {
    return this.adminContentService.updateActivity(id, payload);
  }

  @Delete('admin/content/activities/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('bearer')
  deleteActivity(@Param('id') id: string) {
    return this.adminContentService.deleteActivity(id);
  }

  @Get('admin/content/benefits')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('bearer')
  getBenefits() {
    return this.adminContentService.getBenefits();
  }

  @Get('admin/content/branches')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('bearer')
  getBranches() {
    return this.adminContentService.getBranches();
  }

  @Post('admin/content/branches')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('bearer')
  createBranch(@Body() payload: CreateBranchDto) {
    return this.adminContentService.createBranch(payload);
  }

  @Patch('admin/content/branches/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('bearer')
  updateBranch(@Param('id') id: string, @Body() payload: UpdateBranchDto) {
    return this.adminContentService.updateBranch(id, payload);
  }

  @Delete('admin/content/branches/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('bearer')
  deleteBranch(@Param('id') id: string) {
    return this.adminContentService.deleteBranch(id);
  }

  @Post('admin/content/benefits')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('bearer')
  createBenefit(@Body() payload: CreateBenefitDto) {
    return this.adminContentService.createBenefit(payload);
  }

  @Patch('admin/content/benefits/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('bearer')
  updateBenefit(@Param('id') id: string, @Body() payload: UpdateBenefitDto) {
    return this.adminContentService.updateBenefit(id, payload);
  }

  @Delete('admin/content/benefits/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('bearer')
  deleteBenefit(@Param('id') id: string) {
    return this.adminContentService.deleteBenefit(id);
  }

  @Get('admin/content/plans')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('bearer')
  getPlans() {
    return this.adminContentService.getPlanContent();
  }

  @Post('admin/content/plans')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('bearer')
  upsertPlan(@Body() payload: UpsertPlanContentDto) {
    return this.adminContentService.upsertPlanContent(payload);
  }

  @Delete('admin/content/plans/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('bearer')
  deletePlan(@Param('id') id: string) {
    return this.adminContentService.deletePlanContent(id);
  }
}
