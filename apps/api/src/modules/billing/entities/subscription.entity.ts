import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Generated, Index } from 'typeorm';
import { ISubscription, MembershipStatus, PlanType } from '@gym-admin/shared';
import { User } from '../../users/entities/user.entity';
import { Plan } from './plan.entity';

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

  @Column({ name: 'plan_id', type: 'varchar' })
  planId!: PlanType;

  @ManyToOne(() => Plan, (plan: Plan) => plan.subscriptions)
  @JoinColumn({ name: 'plan_id', referencedColumnName: 'id' })
  plan!: Plan;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
