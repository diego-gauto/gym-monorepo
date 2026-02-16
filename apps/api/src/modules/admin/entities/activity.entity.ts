import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Trainer } from './trainer.entity';

@Entity('activities')
@Unique('UQ_activities_slug', ['slug'])
export class Activity {
  @PrimaryColumn({ type: 'varchar' })
  id!: string;

  @Column({ type: 'varchar' })
  slug!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar' })
  shortDescription!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'varchar' })
  cardImage!: string;

  @Column({ type: 'varchar' })
  level!: string;

  @Column({ type: 'varchar' })
  duration!: string;

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  benefits!: string[];

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  schedule!: string[];

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  successCriteria!: string[];

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @ManyToMany(() => Trainer, (trainer: Trainer) => trainer.activities, { eager: true })
  @JoinTable({
    name: 'activity_trainers',
    joinColumn: { name: 'activity_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'trainer_id', referencedColumnName: 'id' },
  })
  trainers!: Trainer[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

