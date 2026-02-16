import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('gym_site_settings')
export class GymSiteSettings {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ type: 'varchar', default: '#1 EN FITNESS PREMIUM' })
  heroBadge!: string;

  @Column({ type: 'varchar', default: 'Transformá tu cuerpo. Superá tus límites.' })
  heroTitle!: string;

  @Column({ type: 'text', default: 'Unite al gimnasio más moderno de Argentina.' })
  heroSubtitle!: string;

  @Column({ type: 'varchar', default: '/hero-bg.png' })
  heroBackgroundImage!: string;

  @Column({ type: 'varchar', default: 'GYM MASTER' })
  gymName!: string;

  @Column({ type: 'varchar', default: 'Av. del Libertador 1234, CABA' })
  gymAddress!: string;

  @Column({ type: 'varchar', default: 'info@gymmaster.com.ar' })
  gymEmail!: string;

  @Column({ type: 'varchar', default: '+54 11 4567-8900' })
  gymPhone!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

