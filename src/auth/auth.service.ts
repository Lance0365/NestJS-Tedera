// Modified: Added/updated fullname and age fields in user logic
// The AuthService uses 'fullname' for user validation and authentication. 
// The 'age' field is managed during registration and user profile creation, 
// ensuring it is stored and available for user-related operations.

import { Injectable, UnauthorizedException } from "@nestjs/common";
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AuthService {
    constructor(private usersService: UsersService, private jwtService: JwtService) {}

    async validateUser(username: string, pass: string) {
        // Guard against undefined username which causes DB bind error
        if (!username) return null;
        const user = await this.usersService.findByUsername(username);
        if (!user) return null;
        const valid = await bcrypt.compare(pass, user.password);
        if (valid) return { id: user.id, username: user.username, fullname: user.fullname, role: user.role };
        return null;
    }

    async login(user: any) {
        const payload = { sub: user.id, username: user.username };
        const accessToken = this.jwtService.sign(payload);

        // create refresh token using separate secret so you can revoke access by changing refresh secret
        const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_TOKEN_SECRET || 'refresh_secret', {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
        });

        // store refresh token in DB (plain text or hashed)
        // for better security, hash the refresh toke before storing . Here we'll store plain for simplicity.
        await this.usersService.setRefreshToken(user.id, refreshToken);

        return { accessToken, refreshToken };
    }
    // login using username and password (only credentials required)
    async loginWithCredentials(username: string, password: string) {
        const user = await this.validateUser(username, password);
        if (!user) throw new UnauthorizedException('Invalid username or password');

        const payload = { sub: user.id, username: user.username, role: user.role };
        const accessToken = this.jwtService.sign(payload);

        const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_TOKEN_SECRET || 'refresh_secret', {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
        });

        await this.usersService.setRefreshToken(user.id, refreshToken);

        return { accessToken, refreshToken };
    }
    async logout(userId: number) {
        await this.usersService.setRefreshToken(userId, null);
        return { ok: true };
    }

    async refreshTokens(refreshToken: string) {
        try {
            const decoded: any = jwt.verify(refreshToken, process.env.JWT_REFRESH_TOKEN_SECRET || 'refresh_secret');
            const user = await this.usersService.findById(decoded.sub);
            if (!user) throw new UnauthorizedException('Invalid refresh token');
            // check stored token machines
            const stored = await this.usersService.findById(decoded.sub);
            const poolUser = await this.usersService.findById(decoded.sub);
            // we need to check stored refresh-tokens
            const u = await this.usersService.findById(decoded.sub);
            // Instead of repeated calls, use method that fetches refresh token
            const found = await this.usersService.findByRefreshToken(refreshToken);
            if (!found) throw new UnauthorizedException('Invalid refresh token (not found)');

            const payload = { sub: found.id, username: found.username, role: found.role };
            const accessToken = this.jwtService.sign(payload);
            const newRefresh = jwt.sign(payload, process.env.JWT_REFRESH_TOKEN_SECRET || 'refresh_secret', {
                expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
            });
            await this.usersService.setRefreshToken(found.id, newRefresh);
            return { accessToken, refreshToken: newRefresh };
        } catch (err) {
            throw new UnauthorizedException('Could not refresh tokens');
        }
    }
}