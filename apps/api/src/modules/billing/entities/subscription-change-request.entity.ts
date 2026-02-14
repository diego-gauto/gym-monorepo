import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Generated, Index } from 'typeorm';
import { ISubscriptionChangeRequest, PlanType, SubscriptionChangeRequestStatus } from '@gym-admin/shared';
import { Subscription } from './subscription.entity';
import { User } from '../../users/entities/user.entity';

@Entity('subscription_change_requests')
export class SubscriptionChangeRequest implements ISubscriptionChangeRequest {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column()
  @Generated('uuid')
  @Index({ unique: true })
  uuid!: string;

  @Column({ name: 'user_id', type: 'bigint' })
  userId!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'subscription_id', type: 'bigint', nullable: true })
  subscriptionId?: number | null;

  @ManyToOne(() => Subscription)
  @JoinColumn({ name: 'subscription_id' })
  subscription?: Subscription;

  @Column({ name: 'new_plan_id', nullable: true })
  newPlanId?: PlanType;

  @Column({ name: 'new_auto_renew', type: 'boolean', nullable: true })
  newAutoRenew?: boolean;

  @Column({
    type: 'simple-enum',
    enum: SubscriptionChangeRequestStatus,
    default: SubscriptionChangeRequestStatus.PENDING,
  })
  status!: SubscriptionChangeRequestStatus;

  @Column({ name: 'effective_at' })
  effectiveAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
