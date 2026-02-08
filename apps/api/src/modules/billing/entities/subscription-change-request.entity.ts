import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Generated, Index } from 'typeorm';
import { ISubscriptionChangeRequest } from '@gym-admin/shared';
import { Subscription } from './subscription.entity';

@Entity('subscription_change_requests')
export class SubscriptionChangeRequest implements ISubscriptionChangeRequest {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column()
  @Generated('uuid')
  @Index({ unique: true })
  uuid!: string;

  @Column({ name: 'subscription_id', type: 'bigint' })
  subscriptionId!: number;

  @ManyToOne(() => Subscription)
  @JoinColumn({ name: 'subscription_id' })
  subscription!: Subscription;

  @Column({ name: 'new_plan_id', nullable: true })
  newPlanId?: string;

  @Column({ name: 'new_auto_renew', type: 'boolean', nullable: true })
  newAutoRenew?: boolean;

  @Column({
    type: 'simple-enum',
    enum: ['PENDING', 'APPLIED', 'CANCELLED'],
    default: 'PENDING'
  })
  status!: 'PENDING' | 'APPLIED' | 'CANCELLED';

  @Column({ name: 'effective_at' })
  effectiveAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
