import { Request, Response } from 'express';
import prisma from '../prisma';

export const getBatches = async (req: Request, res: Response): Promise<void> => {
  try {
    const academyId = req.user!.academyId;

    const batches = await prisma.batch.findMany({
      where: { academyId },
      include: {
        coach: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: { students: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = batches.map((b) => ({
      id: b.id,
      name: b.name,
      coach: b.coach,
      studentCount: b._count.students,
      createdAt: b.createdAt,
    }));

    res.json({ status: 'success', data: formatted });
  } catch (error) {
    console.error('Error fetching batches:', error);
    res.status(500).json({ status: 'error', message: 'Failed to retrieve batches' });
  }
};

export const createBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const academyId = req.user!.academyId;
    const { name, coachId, studentIds } = req.body;

    if (!name || !coachId) {
      res.status(400).json({ status: 'error', message: 'Batch name and coachId are required' });
      return;
    }

    // Verify coach belongs to this academy
    const coach = await prisma.user.findFirst({
      where: { id: coachId, academyId, role: 'COACH' },
    });

    if (!coach) {
      res.status(400).json({ status: 'error', message: 'Invalid coach selected' });
      return;
    }

    const batch = await prisma.$transaction(async (tx) => {
      const newBatch = await tx.batch.create({
        data: {
          academyId,
          name,
          coachId,
        },
      });

      if (studentIds && Array.isArray(studentIds) && studentIds.length > 0) {
        const studentEnrollments = studentIds.map((studentId: string) => ({
          batchId: newBatch.id,
          studentId,
        }));

        await tx.batchStudent.createMany({
          data: studentEnrollments,
          skipDuplicates: true,
        });
      }

      return newBatch;
    });

    res.status(201).json({ status: 'success', data: batch });
  } catch (error) {
    console.error('Error creating batch:', error);
    res.status(500).json({ status: 'error', message: 'Failed to create batch' });
  }
};

export const addStudentToBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: batchId } = req.params;
    const { studentId } = req.body;
    const academyId = req.user!.academyId;

    if (!studentId) {
      res.status(400).json({ status: 'error', message: 'studentId is required' });
      return;
    }

    // Verify batch and student belong to this academy
    const batch = await prisma.batch.findFirst({ where: { id: batchId, academyId } });
    const student = await prisma.user.findFirst({ where: { id: studentId, academyId, role: 'STUDENT' } });

    if (!batch || !student) {
      res.status(404).json({ status: 'error', message: 'Batch or Student not found in this academy' });
      return;
    }

    await prisma.batchStudent.upsert({
      where: {
        batchId_studentId: {
          batchId,
          studentId,
        },
      },
      update: {},
      create: {
        batchId,
        studentId,
      },
    });

    res.json({ status: 'success', message: 'Student added to batch' });
  } catch (error) {
    console.error('Error adding student to batch:', error);
    res.status(500).json({ status: 'error', message: 'Failed to add student to batch' });
  }
};