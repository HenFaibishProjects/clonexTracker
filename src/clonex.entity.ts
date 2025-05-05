import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('clonex_entry')
export class ClonexEntry {
    @PrimaryGeneratedColumn()
    id?: number;

    @Column('float')
    dosageMg: number | undefined;

    @Column({ type: 'timestamp' })
    takenAt?: Date;

    @Column({ nullable: true })
    reason?: string;

    @Column({ nullable: true })
    comments?: string;
}
