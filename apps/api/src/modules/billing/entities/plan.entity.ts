import { CurrencyCode, IPlan, PlanType } from '@gym-admin/shared';
import { Column, CreateDateColumn, Entity, OneToMany, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { Subscription } from './subscription.entity';

@Entity('plans')
export class Plan implements IPlan {
  @PrimaryColumn({ type: 'varchar' })
  id!: PlanType;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'text', default: '' })
  description!: string;

  @Column('decimal', {
    precision: 10,
    scale: 2,
    transformer: {
      to: (value?: number) => value,
      from: (value: string | number) => Number(value),
    },
  })
  price!: number;

  @Column({ type: 'simple-enum', enum: CurrencyCode, default: CurrencyCode.ARS })
  currency!: CurrencyCode;

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  features!: string[];

  @Column({ type: 'boolean', default: false })
  highlight!: boolean;

  @Column({ type: 'varchar', nullable: true })
  badge?: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => Subscription, (subscription: Subscription) => subscription.plan)
  subscriptions!: Subscription[];
}
