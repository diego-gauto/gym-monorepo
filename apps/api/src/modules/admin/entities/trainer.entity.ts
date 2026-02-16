import { Column, CreateDateColumn, Entity, ManyToMany, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { Activity } from './activity.entity';

@Entity('trainers')
export class Trainer {
  @PrimaryColumn({ type: 'varchar' })
  id!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'text', default: '' })
  bio!: string;

  @Column({ type: 'varchar', default: '' })
  avatarUrl!: string;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @ManyToMany(() => Activity, (activity: Activity) => activity.trainers)
  activities!: Activity[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

