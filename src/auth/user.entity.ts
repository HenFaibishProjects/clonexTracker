import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import {BenzosEntry} from "../benzos.entity";

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number | undefined;

    @Column({ nullable: true, type: 'varchar' })
    userName: string | undefined;

    @Column({ type: 'varchar', unique: true })
    email: string | undefined;

    @Column({ type: 'varchar' })
    password: string | undefined;

    @Column({ type: 'varchar' })
    benzosType: string | undefined;

    @Column({ type: 'varchar', nullable: true })
    activationCode?: string | null;

    @CreateDateColumn()
    createdAt: Date | undefined;

    @OneToMany(() => BenzosEntry, (entry: BenzosEntry) => entry.user)
    entries: BenzosEntry[] | undefined;

    @Column({ type: 'boolean', default: false })
    isActive!: boolean;

    @Column({ type: 'varchar', nullable: true })
    activationToken: string | undefined | null;

    @Column({ type: 'varchar', nullable: true })
    resetPasswordToken: string | undefined | null;

    @Column({  nullable: true, type: 'timestamp' })
    resetTokenExpiry: Date | undefined | null;

}
