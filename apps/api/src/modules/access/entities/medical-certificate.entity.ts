import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Generated, Index } from 'typeorm';
import { IMedicalCertificate } from '@gym-admin/shared';
import { User } from '../../users/entities/user.entity';

@Entity('medical_certificates')
export class MedicalCertificate implements IMedicalCertificate {
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

  @Column()
  doctorName!: string;

  @Column()
  issuedAt!: Date;

  @Column()
  validUntil!: Date;

  @Column({ nullable: true })
  fileUrl?: string;

  @CreateDateColumn()
  createdAt!: Date;
}
