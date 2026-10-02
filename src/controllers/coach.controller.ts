import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Permission, Role } from '@prisma/client';
import prisma from '../prisma';

export const getCoaches = async (req: Request, res: Response): Promise<void> => {
  try {
    const academyId = req.user!.academyId;

    const coaches = await prisma.user.findMany({
      where: { academyId, role: Role.COACH },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        email: true,
        contactNo: true,
        permissions: true,
        status: true,
        createdAt: true,
        coachedBatches: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ status: 'success', data: coaches });
  } catch (error) {
    console.error('Error fetching coaches:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch coaches' });
  }
};

export const createCoach = async (req: Request, res: Response): Promise<void> => {
  try {
    const academyId = req.user!.academyId;
    const { username, firstName, lastName, email, password, contactNo, permissions } = req.body;

    if (!username || !firstName || !password) {
      res.status(400).json({ status: 'error', message: 'Username, First Name, and Password are required' });
      return;
    }

    const existing = await prisma.user.findFirst({
      where: { academyId, username },
    });

    if (existing) {
      res.status(409).json({ status: 'error', message: 'Username is already taken' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const coach = await prisma.user.create({
      data: {
        academyId,
        username,
        firstName,
        lastName,
        email,
        passwordHash,
        contactNo,
        role: Role.COACH,
        permissions: (permissions as Permission[]) || ['TAKE_CLASS'],
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        permissions: true,
      },
    });

    res.status(201).json({ status: 'success', data: coach });
  } catch (error) {
    console.error('Error creating coach:', error);
    res.status(500).json({ status: 'error', message: 'Failed to create coach' });
  }
};

export const updateCoachPermissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const academyId = req.user!.academyId;
    const { id } = req.params;
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      res.status(400).json({ status: 'error', message: 'Permissions must be an array' });
      return;
    }

    const coach = await prisma.user.findFirst({
      where: { id, academyId, role: Role.COACH },
    });

    if (!coach) {
      res.status(404).json({ status: 'error', message: 'Coach not found' });
      return;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { permissions: permissions as Permission[] },
      select: {
        id: true,
        username: true,
        permissions: true,
      },
    });

    res.json({ status: 'success', data: updated });
  } catch (error) {
    console.error('Error updating coach permissions:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update coach permissions' });
  }
};