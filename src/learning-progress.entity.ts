import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('learning_progress')
export class LearningProgress {
    @PrimaryGeneratedColumn()
    id?: number;

    @Column()
    task_id?: string;

    @Column({ default: false })
    completed?: boolean;

    @UpdateDateColumn()
    updated_at?: Date;
}

