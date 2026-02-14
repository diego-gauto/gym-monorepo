import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('user_billing_profiles')
@Unique('UQ_user_billing_profiles_user_id', ['userId'])
export class UserBillingProfile {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ name: 'user_id', type: 'bigint' })
  userId!: number;

  @OneToOne(() => User, (user: User) => user.billingProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'mp_customer_id', type: 'varchar', nullable: true })
  mercadopagoCustomerId?: string | null;

  @Column({ name: 'mp_card_id', type: 'varchar', nullable: true })
  mercadopagoCardId?: string | null;

  @Column({ name: 'card_brand', type: 'varchar', nullable: true })
  cardBrand?: string | null;

  @Column({ name: 'card_last_four', type: 'varchar', nullable: true })
  cardLastFour?: string | null;

  @Column({ name: 'card_issuer', type: 'varchar', nullable: true })
  cardIssuer?: string | null;

  @Column({ name: 'cardholder_name', type: 'varchar', nullable: true })
  cardholderName?: string | null;

  @Column({ name: 'card_expiration_month', type: 'int', nullable: true })
  cardExpirationMonth?: number | null;

  @Column({ name: 'card_expiration_year', type: 'int', nullable: true })
  cardExpirationYear?: number | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
