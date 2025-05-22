import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import {ClonexEntry} from "../clonex.entity";

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number | undefined;

    @Column({ type: 'varchar', unique: true })
    email: string | undefined;

    @Column({ type: 'varchar' })
    password: string | undefined;

    @CreateDateColumn()
    createdAt: Date | undefined;

    @OneToMany(() => ClonexEntry, (entry: ClonexEntry) => entry.user)
    entries: ClonexEntry[] | undefined;

    @Column({ type: 'boolean', default: false })
    isActive!: boolean;

    @Column({ type: 'varchar', nullable: true })
    activationToken: string | undefined | null;
}
