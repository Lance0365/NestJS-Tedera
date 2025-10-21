// Modified: Added/updated fullname and age fields in user logic
// The authentication endpoints now use 'fullname' for login and registration, and 'age' is required during registration.
// These fields are passed to the user service for storage and validation.

import { Controller, Post, Body, UseGuards, Request, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService} from '../users/users.service';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService, private usersService: UsersService) {}

    @Post('register')
    async register(@Body() body: { username: string; fullname: string; age: number; gender: string; password: string }) {
    // Only pass username, fullname, age, password (role is optional and defaults to 'user')
    return this.usersService.createUser(body.username, body.fullname, body.age, body.password);
    }

    @Post('login')
    async login(@Body() body: { username?: string; password?: string }) {
        // Accept only username and password for login. Use loginWithCredentials which validates and issues tokens.
        const username = body.username ?? '';
        const password = body.password ?? '';
        return this.authService.loginWithCredentials(username, password);
    }

    @Post('logout')
    async logout(@Body() body: { userId: number }) {
        return this.authService.logout(body.userId);
    }

    @Post('refresh')
    async refresh(@Body() body: {refreshToken: string}) {
        return this.authService.refreshTokens(body.refreshToken);
    }
}