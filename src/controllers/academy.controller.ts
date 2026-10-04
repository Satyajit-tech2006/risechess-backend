import { Request, Response } from 'express';
import prisma from '../prisma';

export const getAcademyProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const academyId = req.user!.academyId;

    const academy = await prisma.academy.findUnique({
      where: { id: academyId },
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!academy) {
      res.status(404).json({ status: 'error', message: 'Academy not found' });
      return;
    }

    res.json({ status: 'success', data: academy });
  } catch (error) {
    console.error('Error fetching academy profile:', error);
    res.status(500).json({ status: 'error', message: 'Failed to retrieve academy profile' });
  }
};

export const updateAcademyProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const academyId = req.user!.academyId;
    const { name } = req.body;

    if (!name || typeof name !== 'string') {
      res.status(400).json({ status: 'error', message: 'Valid academy name is required' });
      return;
    }

    const updated = await prisma.academy.update({
      where: { id: academyId },
      data: { name: name.trim() },
      select: {
        id: true,
        name: true,
        slug: true,
        updatedAt: true,
      },
    });

    res.json({ status: 'success', data: updated });
  } catch (error) {
    console.error('Error updating academy profile:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update academy profile' });
  }
};

export const getAcademyStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const academyId = req.user!.academyId;

    // Run parallel aggregation counts
    const [totalStudents, activeStudents, totalCoaches, totalBatches, totalTags] = await Promise.all([
      prisma.user.count({ where: { academyId, role: 'STUDENT' } }),
      prisma.user.count({ where: { academyId, role: 'STUDENT', status: 'ACTIVE' } }),
      prisma.user.count({ where: { academyId, role: 'COACH', status: 'ACTIVE' } }),
      prisma.batch.count({ where: { academyId } }),
      prisma.tag.count({ where: { academyId } }),
    ]);

    // Aggregate total remaining class credits across all students
    const creditAggregate = await prisma.user.aggregate({
      where: { academyId, role: 'STUDENT' },
      _sum: {
        classesLeft: true,
      },
    });

    res.json({
      status: 'success',
      data: {
        students: {
          total: totalStudents,
          active: activeStudents,
          inactive: totalStudents - activeStudents,
        },
        coaches: totalCoaches,
        batches: totalBatches,
        tags: totalTags,
        totalClassesRemaining: creditAggregate._sum.classesLeft || 0,
      },
    });
  } catch (error) {
    console.error('Error calculating academy stats:', error);
    res.status(500).json({ status: 'error', message: 'Failed to compute academy stats' });
  }
};