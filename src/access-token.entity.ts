import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('access_tokens')
export class AccessToken {
    @PrimaryGeneratedColumn()
    id?: number;

    @Column()
    token?: string;

    @CreateDateColumn()
    created_at?: Date;
}
