import { Request, Response } from 'express';
import prisma from '../prisma';

export const getTags = async (req: Request, res: Response): Promise<void> => {
  try {
    const academyId = req.user!.academyId;

    const tags = await prisma.tag.findMany({
      where: { academyId },
      select: {
        id: true,
        name: true,
        _count: {
          select: { users: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const formatted = tags.map((t) => ({
      id: t.id,
      name: t.name,
      studentCount: t._count.users,
    }));

    res.json({ status: 'success', data: formatted });
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ status: 'error', message: 'Failed to retrieve tags' });
  }
};