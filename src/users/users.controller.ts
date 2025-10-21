// Modified: Added/updated fullname and age fields in user logic
// The API now supports 'fullname' and 'age' fields for user creation and management.
// 'fullname' is used for user identification and authentication, while 'age' is stored as part of the user profile.
// All relevant endpoints and logic have been updated to handle these fields.

import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  // Get all users (protected)
  @UseGuards(JwtAuthGuard)
  @Get()
  async getAll() {
    return this.usersService.getAll();
  }

  // Get single user by id (protected)
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.usersService.findById(+id);
  }

  // Create user (open – for demo)
  @Post()
  async create(@Body() body: { username: string; password: string; fullname: string; age: number }) {
    // Validate required fields
    if (!body || !body.username || !body.fullname || !body.password || typeof body.age !== 'number') {
      throw new Error('Missing required user fields: username, fullname, password, age');
    }
    // The correct order is username, fullname, age, password, role (role optional)
    return this.usersService.createUser(body.username, body.fullname, body.age, body.password);
  }

  // Update user (protected)
  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.usersService.updateUser(+id, body);
  }

  // Delete user (protected)
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.usersService.deleteUser(+id);
  }
}