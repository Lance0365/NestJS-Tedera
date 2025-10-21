// Modified: Added/updated fullname and age fields in user logic

import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { RowDataPacket, OkPacket } from 'mysql2';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private db: DatabaseService) {}
  async createUser(username: string, fullname: string, age: number, password: string, role = 'user') {
  // Convert undefined to null for SQL compatibility
  if (username === undefined) username = '';
  if (fullname === undefined) fullname = '';
  if (age === undefined) age = 0;
  if (password === undefined) password = '';
  if (role === undefined) role = 'user';
    const hashed = await bcrypt.hash(password, 10);
  const [result] = await this.db.execute<[OkPacket, any]>('INSERT INTO users (username, fullname, age, password, role) VALUES (?, ?, ?, ?, ?)', [username, fullname, age, hashed, role]);
  return { id: result.insertId, username, fullname, age, role };
  }

  async findByUsername(username: string) {
    // Guard against undefined bind parameters which mysql2 rejects.
    if (username === undefined || username === null) return null;
    const [rows] = await this.db.execute<[RowDataPacket[], any]>('SELECT id, username, fullname, age, password, role, refresh_token FROM users WHERE username = ?', [username]);
    return rows[0] ?? null;
  }

  // Find by fullname
  async findByFullName(fullname: string) {
    // Ensure fullname is not undefined for SQL bind
    if (fullname === undefined) fullname = '';
  const [rows] = await this.db.execute<[RowDataPacket[], any]>('SELECT id, username, fullname, age, password, role, refresh_token FROM users WHERE fullname = ?', [fullname]);
  return rows[0];
  }

  async findById(id: number) {
  const [rows] = await this.db.execute<[RowDataPacket[], any]>('SELECT id, username, fullname, age, role, created_at FROM users WHERE id = ?', [id]);
  return rows[0];
  }

  async getAll() {
  const [rows] = await this.db.execute<[RowDataPacket[], any]>('SELECT id, username, fullname, age, role, created_at FROM users');
  return rows;
  }

  public async updateUser(id: number, partial: { username?: string;  password?: string; role?: string }) {
    const fields: string[] = [];
    const values: any[] = [];

    if (partial.username) {
      fields.push('username = ?');
      values.push(partial.username);
    }

    if (partial.password) {
      const hashed = await bcrypt.hash(partial.password, 10);
      fields.push('password = ?');
      values.push(hashed);
    }

    if (partial.role) {
      fields.push('role = ?');
      values.push(partial.role);
    }

    if (fields.length === 0) return await this.findById(id);
    values.push(id);
    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    await this.db.execute(sql, values);
    return this.findById(id);
  }

  public async deleteUser(id: number) {
    const [res] = await this.db.execute<[OkPacket, any]>('DELETE FROM users WHERE id = ?', [id]);
    return res.affectedRows > 0;
  }

  async setRefreshToken(id: number, refreshToken: string | null) {
    await this.db.execute('UPDATE users SET refresh_token = ? WHERE id = ?', [refreshToken, id]);
  }

  async findByRefreshToken(refreshToken: string) {
    const [rows] = await this.db.execute<[RowDataPacket[], any]>('SELECT id, username, role FROM users WHERE refresh_token = ?', [refreshToken]);
    return rows[0];
  }
}