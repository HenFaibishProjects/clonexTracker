import {Entity, PrimaryGeneratedColumn, Column, ManyToOne} from 'typeorm';
import {User} from "./auth/user.entity";

@Entity('benzos_entry')
export class BenzosEntry {
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
