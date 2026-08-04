import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Unique,
} from 'typeorm';
import { InterviewPrepSectionStatus } from './interview-prep-status.enum';

@Entity('interview_prep_section_state')
@Unique('uq_interview_prep_topic_section', ['topicId', 'sectionId'])
export class InterviewPrepSectionState {
    @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
    id?: string;

    @Column({ name: 'topic_id', type: 'varchar', length: 100 })
    topicId!: string;

    @Column({ name: 'section_id', type: 'varchar', length: 150 })
    sectionId!: string;

    @Column({
        name: 'status',
        type: 'varchar',
        length: 20,
        default: InterviewPrepSectionStatus.IN_PROGRESS,
    })
    status!: InterviewPrepSectionStatus;

    @Column({ name: 'note', type: 'text', default: '' })
    note!: string;

    @Column({ name: 'last_visited_at', type: 'timestamptz', nullable: true })
    lastVisitedAt!: Date | null;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt!: Date;
}
