import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Generated, Index } from 'typeorm';
import { IInvoice, PaymentMethod, InvoiceStatus } from '@gym-admin/shared';
import { User } from '../../users/entities/user.entity';
import { Subscription } from './subscription.entity';

@Entity('invoices')
export class Invoice implements IInvoice {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column()
  @Generated('uuid')
  @Index({ unique: true })
  uuid!: string;

  @Column({ name: 'user_id', type: 'bigint' })
  userId!: number;

  @ManyToOne(() => User, (user: User) => user.invoices)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'subscription_id', type: 'bigint', nullable: true })
  subscriptionId?: number;

  @ManyToOne(() => Subscription)
  @JoinColumn({ name: 'subscription_id' })
  subscription!: Subscription;

  @Column('decimal', { precision: 10, scale: 2 })
  amount!: number;

  @Column()
  currency!: string;

  @Column({
    type: 'simple-enum',
    enum: InvoiceStatus,
    default: InvoiceStatus.PENDING
  })
  status!: InvoiceStatus;

  @Column({ type: 'simple-enum', enum: PaymentMethod })
  paymentMethod!: PaymentMethod;

  @Column({ unique: true })
  idempotencyKey!: string;

  @Column({ nullable: true })
  paidAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
