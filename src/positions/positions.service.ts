import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { RowDataPacket, OkPacket } from 'mysql2';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class PositionsService {
  constructor(private db: DatabaseService) {}
  async createPositions(position_code: string, position_name: string, users_id: number) {
    // Normalize undefined to null for SQL foreign key
    if (position_code === undefined) position_code = '';
    if (position_name === undefined) position_name = '';
    const ownerId = users_id === undefined ? null : users_id;
    // Use 'id' as the foreign key column name, and 'position_id' as the primary key
    const [result] = await this.db.execute<[OkPacket, any]>('INSERT INTO positions (position_code, position_name, id) VALUES (?, ?, ?)', [position_code, position_name, ownerId]);
    return { position_id: result.insertId, position_code, position_name, id: ownerId };
  }

  async findByPositions(position_code: string) {
    const [rows] = await this.db.execute<[RowDataPacket[], any]>('SELECT position_id, position_code, position_name, id, created_at, updated_at FROM positions WHERE position_code = ?', [position_code]);
    return rows[0];
  }

  // Find by position_code
  async findByPositionCode(position_code: string) {
    // Ensure position_code is not undefined for SQL bind
    if (position_code === undefined) position_code = '';
    const [rows] = await this.db.execute<[RowDataPacket[], any]>('SELECT position_id, position_code, position_name, id, created_at, updated_at FROM positions WHERE position_code = ?', [position_code]);
    return rows[0];
  }

  async findById(id: number) {
    const [rows] = await this.db.execute<[RowDataPacket[], any]>('SELECT position_id, position_code, position_name, id, created_at, updated_at FROM positions WHERE position_id = ?', [id]);
    if (rows && rows.length > 0) return rows[0];
    return { row: null, diagnostic: null };
  }

  /**
   * Find a position by id but ensure it belongs to the provided users_id.
   * Returns the row or null if not found / not owned by user.
   */
  async findByIdForUser(positionId: number, users_id: number) {
    if (positionId === undefined || users_id === undefined || users_id === null) return null;
    const [rows] = await this.db.execute<[RowDataPacket[], any]>('SELECT position_id, position_code, position_name, id, created_at, updated_at FROM positions WHERE position_id = ? AND id = ?', [positionId, users_id]);
    return (rows && rows.length > 0) ? rows[0] : null;
  }

  async getAll() {
    const [rows] = await this.db.execute<[RowDataPacket[], any]>('SELECT position_id, position_code, position_name, id, created_at, updated_at FROM positions');
    return rows;
  }

  /**
   * Return all positions belonging to a specific user (by users.id).
   */
  async getAllByUser(users_id: number) {
    if (users_id === undefined || users_id === null) {
      return [];
    }
    const [rows] = await this.db.execute<[RowDataPacket[], any]>('SELECT position_id, position_code, position_name, id, created_at, updated_at FROM positions WHERE id = ?', [users_id]);
    if (rows && rows.length > 0) return rows;
    return [];
  }

  public async updatePositions(
    id: number,
    partial: { position_code?: string; position_name?: string; id?: number }
  ) {
    const fields: string[] = [];
    const values: any[] = [];

    if (partial.position_code !== undefined) {
      fields.push('position_code = ?');
      values.push(partial.position_code);
    }
    if (partial.position_name !== undefined) {
      fields.push('position_name = ?');
      values.push(partial.position_name);
    }
    // Do not allow changing owner via this method unless explicitly intended.
    if (partial.id !== undefined) {
      fields.push('id = ?');
      values.push(partial.id);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);

  const [result] = await this.db.execute<[OkPacket, any]>(`UPDATE positions SET ${fields.join(', ')} WHERE position_id = ?`, values);

    if (result.affectedRows === 0) {
      throw new NotFoundException('Position not found');
    }

    return { message: 'Position updated successfully' };
  }

  public async deletePositions(id: number) {
  const [res] = await this.db.execute<[OkPacket, any]>('DELETE FROM positions WHERE position_id = ?', [id]);
    if (res.affectedRows > 0) {
      return { message: 'Position deleted successfully' };
    }
  }

  async setRefreshToken(id: number, refreshToken: string | null) {
    return;
  }
}