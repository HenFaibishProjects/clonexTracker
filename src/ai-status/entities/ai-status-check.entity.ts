import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity({ name: 'ai_status_checks', schema: 'public' })
@Index(['provider', 'checked_at'])
export class AiStatusCheck {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({ length: 50 })
  provider?: string;

  @Column({ length: 30 })
  status?: string;

  @Column({ type: 'int', nullable: true })
  latency_ms?: number | null;

  @Column({ length: 300, nullable: true })
  description!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  checked_at?: Date;
}