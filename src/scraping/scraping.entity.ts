import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('repse')
export class ScrapingEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  razonSocial: string;

  @Column({ type: 'int'})
  numRegistro: number;
}