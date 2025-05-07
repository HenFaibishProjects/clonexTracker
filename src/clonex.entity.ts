import {Entity, PrimaryGeneratedColumn, Column, ManyToOne} from 'typeorm';
import {User} from "./auth/user.entity";

@Entity('clonex_entry')
export class ClonexEntry {
    @PrimaryGeneratedColumn()
    id?: number;

    @Column('float')
    dosageMg: number | undefined;

    @Column({ type: 'timestamp' })
    takenAt: Date | undefined;

    @Column({ type: 'text', nullable: true })
    reason?: string;

    @Column({ type: 'text', nullable: true })
    comments?: string;

    @ManyToOne(() => User, (user) => user.entries)
    user: User | undefined;
}
