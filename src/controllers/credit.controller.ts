import { Request, Response } from 'express';
import { LogType } from '@prisma/client';
import prisma from '../prisma';

export const adjustStudentCredits = async (req: Request, res: Response): Promise<void> => {
  try {
    const academyId = req.user!.academyId;
    const { id: studentId } = req.params;
    const { change, type, notes } = req.body;

    if (typeof change !== 'number' || change === 0) {
      res.status(400).json({ status: 'error', message: 'A valid non-zero change integer is required' });
      return;
    }

    const student = await prisma.user.findFirst({
      where: { id: studentId, academyId, role: 'STUDENT' },
    });

    if (!student) {
      res.status(404).json({ status: 'error', message: 'Student not found in this academy' });
      return;
    }

    // Atomic update of user balance + audit log creation
    const updated = await prisma.$transaction(async (tx) => {
      const updatedStudent = await tx.user.update({
        where: { id: studentId },
        data: {
          classesLeft: {
            increment: change,
          },
        },
        select: {
          id: true,
          username: true,
          classesLeft: true,
        },
      });

      await tx.classLog.create({
        data: {
          studentId,
          change,
          type: (type as LogType) || (change > 0 ? LogType.CREDIT_ADDED : LogType.CLASS_ATTENDED),
          notes,
        },
      });

      return updatedStudent;
    });

    res.json({
      status: 'success',
      data: updated,
    });
  } catch (error) {
    console.error('Error adjusting credits:', error);
    res.status(500).json({ status: 'error', message: 'Failed to adjust student credits' });
  }
};

export const getStudentCreditHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const academyId = req.user!.academyId;
    const { id: studentId } = req.params;

    const student = await prisma.user.findFirst({
      where: { id: studentId, academyId, role: 'STUDENT' },
    });

    if (!student) {
      res.status(404).json({ status: 'error', message: 'Student not found' });
      return;
    }

    const logs = await prisma.classLog.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      status: 'success',
      data: logs,
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ status: 'error', message: 'Failed to retrieve credit logs' });
  }
};