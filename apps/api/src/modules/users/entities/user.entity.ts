import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Generated, Index, OneToOne } from 'typeorm';
import { IUser, MembershipStatus, UserRole } from '@gym-admin/shared';
import { Subscription } from '../../billing/entities/subscription.entity';
import { Invoice } from '../../billing/entities/invoice.entity';
import { Attendance } from '../../access/entities/attendance.entity';
import { UserAuth } from './user-auth.entity';
import { UserBillingProfile } from './user-billing-profile.entity';

@Entity('users')
export class User implements IUser {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column()
  @Generated('uuid')
  @Index({ unique: true })
  uuid!: string;

  @Column({ name: 'first_name', type: 'varchar' })
  firstName!: string;

  @Column({ name: 'last_name', type: 'varchar' })
  lastName!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ type: 'varchar', nullable: true })
  phone?: string | null;

  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl?: string | null;

  @OneToOne(() => UserAuth, (auth: UserAuth) => auth.user, { cascade: true, eager: true })
  auth?: UserAuth;

  @Column({ type: 'simple-enum', enum: MembershipStatus, default: MembershipStatus.ACTIVE })
  status!: MembershipStatus;

  @Column({
    type: 'enum',
    enum: UserRole,
    enumName: 'users_role_enum',
    default: UserRole.USER,
  })
  role!: UserRole;

  @OneToOne(() => UserBillingProfile, (billingProfile: UserBillingProfile) => billingProfile.user, { cascade: true, eager: true })
  billingProfile?: UserBillingProfile;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => Subscription, (subscription: Subscription) => subscription.user)
  subscriptions!: Subscription[];

  @OneToMany(() => Invoice, (invoice: Invoice) => invoice.user)
  invoices!: Invoice[];

  @OneToMany(() => Attendance, (attendance: Attendance) => attendance.user)
  attendances!: Attendance[];
}
