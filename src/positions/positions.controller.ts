import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { PositionsService } from './positions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('positions')
export class PositionsController {
  constructor(private positionsService: PositionsService) {}

  // Get all positions (scoped to authenticated user unless admin)
  @UseGuards(JwtAuthGuard)
  @Get()
  async getAll(@Request() req: any) {
    const user = req.user;
    const role = user && user.role ? user.role : null;
    const userId = user && (user.userId || user.sub || user.id) ? (user.userId || user.sub || user.id) : undefined;
    if (role === 'admin') {
      return this.positionsService.getAll();
    }
    if (!userId) return [];
    return this.positionsService.getAllByUser(Number(userId));
  }

  // Get positions for the currently authenticated user
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMine(@Request() req: any) {
    const user = req.user;
    const userId = user && (user.userId || user.sub || user.id) ? (user.userId || user.sub || user.id) : undefined;
    if (!userId) return [];
    return this.positionsService.getAllByUser(Number(userId));
  }

  // Get single position by id (scoped to authenticated user unless admin)
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getOne(@Request() req: any, @Param('id') id: string) {
    const user = req.user;
    const role = user && user.role ? user.role : null;
    const userId = user && (user.userId || user.sub || user.id) ? (user.userId || user.sub || user.id) : undefined;
    const pid = Number(id);
    if (role === 'admin') {
      return this.positionsService.findById(pid);
    }
    if (!userId) return { error: 'Not authenticated' };
    return this.positionsService.findByIdForUser(pid, Number(userId));
  }

  // Create position (requires auth) — owner is taken from the authenticated user
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Request() req: any, @Body() body: { position_code: string; position_name: string; id?: number }) {
    const user = req.user;
    const userId = user && (user.userId || user.sub || user.id) ? (user.userId || user.sub || user.id) : undefined;
    // Ignore any client-provided id and use authenticated user's id
    return this.positionsService.createPositions(body.position_code, body.position_name, userId);
  }

  // Update position (protected) — do not allow changing owner via body
  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async update(@Request() req: any, @Param('id') id: number, @Body() body: any) {
    // Prevent clients from changing the owner id
    if (body && 'id' in body) delete body.id;
    return this.positionsService.updatePositions(+id, body);
  }

  // Update position via body (protected) — accepts { id, position_code?, position_name? }
  @UseGuards(JwtAuthGuard)
  @Put()
  async updateByBody(@Request() req: any, @Body() body: { id?: number | string; position_code?: string; position_name?: string }) {
    if (!body || body.id === undefined || body.id === null) {
      throw new BadRequestException('Missing id in body');
    }
    // accept numeric strings as well as numbers
    const idNum = Number(body.id);
    if (!Number.isFinite(idNum) || idNum <= 0) {
      throw new BadRequestException('Invalid id in body');
    }
    const id = Math.trunc(idNum);
    // prevent changing owner via body
    const { position_code, position_name } = body;
    const partial: any = {};
    if (position_code !== undefined) partial.position_code = position_code;
    if (position_name !== undefined) partial.position_name = position_name;
    return this.positionsService.updatePositions(+id, partial);
  }

  // Delete position (protected)
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: number) {
    return this.positionsService.deletePositions(+id);
  }
}