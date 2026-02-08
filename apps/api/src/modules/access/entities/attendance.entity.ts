import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Generated, Index } from 'typeorm';
import { IAttendance } from '@gym-admin/shared';
import { User } from '../../users/entities/user.entity';

@Entity('attendance')
export class Attendance implements IAttendance {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column()
  @Generated('uuid')
  @Index({ unique: true })
  uuid!: string;

  @Column({ name: 'user_id', type: 'bigint' })
  userId!: number;

  @ManyToOne(() => User, (user: User) => user.attendances)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'check_in_at' })
  checkInAt!: Date;

  @Column({ name: 'check_out_at', nullable: true })
  checkOutAt?: Date;

  @Column({ name: 'device_id', nullable: true })
  deviceId?: string;
}
