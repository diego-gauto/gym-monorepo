import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { BillingModule } from './modules/billing/billing.module';
import { AccessModule } from './modules/access/access.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { purgeInvalidUsersBeforeSync } from './database-preflight';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'development' ? '.env.development' : '.env',
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const isProduction = configService.get('NODE_ENV') === 'production';
        const databaseUrl = configService.get('DATABASE_URL');

        const typeOrmConfig: TypeOrmModuleOptions = {
          type: 'postgres',
          url: databaseUrl, // Use URL if available (Production/Neon)
          host: configService.get('DB_HOST'),
          port: configService.get('DB_PORT'),
          username: configService.get('DB_USERNAME'),
          password: configService.get('DB_PASSWORD'),
          database: configService.get('DB_NAME'),
          autoLoadEntities: true,
          synchronize: !isProduction, // True ONLY in development
          ssl: isProduction ? { rejectUnauthorized: false } : false,
        };

        if (!isProduction) {
          await purgeInvalidUsersBeforeSync(typeOrmConfig as DataSourceOptions);
        }

        return typeOrmConfig;
      },
    }),
    BillingModule,
    AccessModule,
    UsersModule,
    AuthModule,
    AdminModule,
  ],
})
export class AppModule {}
