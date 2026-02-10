import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Generated, Index } from 'typeorm';
import { IUser, MembershipStatus } from '@gym-admin/shared';
import { Subscription } from '../../billing/entities/subscription.entity';
import { Invoice } from '../../billing/entities/invoice.entity';
import { Attendance } from '../../access/entities/attendance.entity';

@Entity('users')
export class User implements IUser {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column()
  @Generated('uuid')
  @Index({ unique: true })
  uuid!: string;

  @Column()
  name!: string;

  @Column({ name: 'first_name', type: 'varchar', nullable: true })
  firstName?: string | null;

  @Column({ name: 'last_name', type: 'varchar', nullable: true })
  lastName?: string | null;

  @Column({ unique: true })
  email!: string;

  @Column({ unique: true, nullable: true })
  dni?: string | null;

  @Column({ type: 'varchar', nullable: true })
  phone?: string | null;

  @Column({ select: false, nullable: true }) // Don't return password by default
  password?: string;

  @Column({ name: 'email_verified_at', type: 'timestamp', nullable: true })
  emailVerifiedAt?: Date | null;

  @Column({ name: 'email_verification_token_hash', type: 'varchar', nullable: true })
  emailVerificationTokenHash?: string | null;

  @Column({ name: 'email_verification_token_expires_at', type: 'timestamp', nullable: true })
  emailVerificationTokenExpiresAt?: Date | null;

  @Column({ name: 'auth_provider', type: 'varchar', default: 'LOCAL' })
  authProvider!: 'LOCAL' | 'GOOGLE';

  @Column({ name: 'google_sub', type: 'varchar', nullable: true })
  googleSub?: string | null;

  @Column({ type: 'simple-enum', enum: MembershipStatus, default: MembershipStatus.ACTIVE })
  status!: MembershipStatus;

  @Column({ type: 'varchar', default: 'USER' })
  role!: 'ADMIN' | 'USER';

  @Column({ name: 'mp_customer_id', nullable: true })
  mercadopagoCustomerId?: string;

  @Column({ name: 'mp_card_id', nullable: true })
  mercadopagoCardId?: string;

  @Column({ name: 'card_brand', nullable: true })
  cardBrand?: string;

  @Column({ name: 'card_last_four', nullable: true })
  cardLastFour?: string;

  @Column({ name: 'card_issuer', nullable: true })
  cardIssuer?: string;

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
