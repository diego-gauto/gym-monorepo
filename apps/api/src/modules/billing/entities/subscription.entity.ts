import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Generated, Index } from 'typeorm';
import { ISubscription, MembershipStatus } from '@gym-admin/shared';
import { User } from '../../users/entities/user.entity';

@Entity('subscriptions')
export class Subscription implements ISubscription {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column()
  @Generated('uuid')
  @Index({ unique: true })
  uuid!: string;

  @Column({ name: 'user_id', type: 'bigint' })
  userId!: number;

  @ManyToOne(() => User, (user: User) => user.subscriptions)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'billing_cycle_anchor_day', type: 'int' })
  billingCycleAnchorDay!: number;

  @Column({ name: 'auto_renew', type: 'boolean', default: true })
  autoRenew!: boolean;

  @Column({ type: 'simple-enum', enum: MembershipStatus, default: MembershipStatus.ACTIVE })
  status!: MembershipStatus;

  @Column()
  startDate!: Date;

  @Column()
  endDate!: Date;

  @Column()
  planId!: string; // Mapping to PlanType (MONTHLY, etc)

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
