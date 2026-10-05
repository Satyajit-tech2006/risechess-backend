import { Request, Response } from 'express';
import prisma from '../prisma';

/**
 * Verifies if user can manage this specific batch.
 * Strict Rule: ADMIN can manage any batch in the academy.
 * COACH can ONLY manage if they have MANAGE_BATCHES AND they own this batch.
 */
const canManageBatch = (user: any, batch: { coachId: string }): boolean => {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;

  if (user.role === 'COACH') {
    const currentUserId = user.id || user.userId;
    const hasPerm = Array.isArray(user.permissions) && user.permissions.includes('MANAGE_BATCHES');
    const isOwner = String(batch.coachId) === String(currentUserId);
    return Boolean(hasPerm && isOwner);
  }

  return false;
};

/**
 * GET /api/v1/batches
 * - ADMIN: Retrieves all batches in the academy.
 * - COACH: Strictly retrieves only batches assigned to req.user.id.
 */
export const getBatches = async (req: Request, res: Response): Promise<void> => {
  try {
    const academyId = req.user!.academyId;
    const isCoach = req.user!.role === 'COACH';
    const isStudent = req.user!.role === 'STUDENT';
    const currentUserId = req.user!.id || req.user!.userId;

    const whereClause: any = { academyId };
    if (isCoach) {
      whereClause.coachId = currentUserId;
    } else if (isStudent) {
      // Find batches where this student is enrolled
      whereClause.students = {
        some: {
          studentId: currentUserId,
        },
      };
    }

    const batches = await prisma.batch.findMany({
      where: whereClause,
      include: {
        coach: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            email: true,
          },
        },
        students: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                username: true,
                // Only share email if not student role
                email: !isStudent,
                classesLeft: true,
                status: true,
                tags: {
                  select: {
                    tag: {
                      select: { name: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = batches.map((b) => ({
      id: b.id,
      name: b.name,
      coachId: b.coachId,
      coach: b.coach,
      createdAt: b.createdAt,
      students: b.students.map((s) => ({
        ...s.student,
        tags: s.student.tags.map((t) => t.tag.name),
      })),
      studentCount: b.students.length,
    }));

    res.json({ status: 'success', data: formatted });
  } catch (error) {
    console.error('Error fetching batches:', error);
    res.status(500).json({ status: 'error', message: 'Failed to retrieve batches' });
  }
};

/**
 * POST /api/v1/batches
 * - ADMIN can specify any coachId.
 * - COACH is locked to req.user.id. Any attempt to pass another coachId is overridden.
 */
export const createBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const academyId = req.user!.academyId;
    const { name, coachId, studentIds } = req.body;
    const currentUserId = req.user!.id || req.user!.userId;

    if (!name || typeof name !== 'string') {
      res.status(400).json({ status: 'error', message: 'Batch name is required' });
      return;
    }

    // Role verification
    if (req.user!.role === 'COACH' && !req.user!.permissions?.includes('MANAGE_BATCHES')) {
      res.status(403).json({ status: 'error', message: 'You do not have permission to create batches' });
      return;
    }

    // Strict Coach Id resolution
    const finalCoachId = req.user!.role === 'COACH' ? currentUserId : (coachId || currentUserId);

    // Verify assigned coach belongs to academy
    const coachExists = await prisma.user.findFirst({
      where: { id: finalCoachId, academyId, role: 'COACH' },
    });

    if (!coachExists) {
      res.status(400).json({ status: 'error', message: 'Invalid coach specified' });
      return;
    }

    const batch = await prisma.$transaction(async (tx) => {
      const newBatch = await tx.batch.create({
        data: {
          academyId,
          name: name.trim(),
          coachId: finalCoachId,
        },
      });

      if (studentIds && Array.isArray(studentIds) && studentIds.length > 0) {
        const studentEnrollments = studentIds.map((sId: string) => ({
          batchId: newBatch.id,
          studentId: sId,
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

/**
 * PATCH /api/v1/batches/:id
 * Only batch owner (or Admin) can update.
 */
export const updateBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const academyId = req.user!.academyId;
    const { id } = req.params;
    const { name } = req.body;

    const batch = await prisma.batch.findFirst({
      where: { id, academyId },
    });

    if (!batch) {
      res.status(404).json({ status: 'error', message: 'Batch not found' });
      return;
    }

    if (!canManageBatch(req.user, batch)) {
      res.status(403).json({ status: 'error', message: 'You can only edit your own assigned batches' });
      return;
    }

    const updated = await prisma.batch.update({
      where: { id },
      data: {
        name: name ? name.trim() : batch.name,
      },
    });

    res.json({ status: 'success', data: updated });
  } catch (error) {
    console.error('Error updating batch:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update batch' });
  }
};

/**
 * POST /api/v1/batches/:id/students
 * Only batch owner (or Admin) can enroll students.
 */
export const addStudentToBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: batchId } = req.params;
    const { studentId } = req.body;
    const academyId = req.user!.academyId;

    if (!studentId) {
      res.status(400).json({ status: 'error', message: 'studentId is required' });
      return;
    }

    const batch = await prisma.batch.findFirst({ where: { id: batchId, academyId } });
    const student = await prisma.user.findFirst({ where: { id: studentId, academyId, role: 'STUDENT' } });

    if (!batch || !student) {
      res.status(404).json({ status: 'error', message: 'Batch or Student not found in this academy' });
      return;
    }

    if (!canManageBatch(req.user, batch)) {
      res.status(403).json({ status: 'error', message: 'You can only enroll students in your own batches' });
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

/**
 * DELETE /api/v1/batches/:id/students/:studentId
 * Only batch owner (or Admin) can remove students.
 */
export const removeStudentFromBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: batchId, studentId } = req.params;
    const academyId = req.user!.academyId;

    const batch = await prisma.batch.findFirst({ where: { id: batchId, academyId } });
    if (!batch) {
      res.status(404).json({ status: 'error', message: 'Batch not found' });
      return;
    }

    if (!canManageBatch(req.user, batch)) {
      res.status(403).json({ status: 'error', message: 'You can only remove students from your own batches' });
      return;
    }

    await prisma.batchStudent.deleteMany({
      where: {
        batchId,
        studentId,
      },
    });

    res.json({ status: 'success', message: 'Student removed from batch' });
  } catch (error) {
    console.error('Error removing student from batch:', error);
    res.status(500).json({ status: 'error', message: 'Failed to remove student from batch' });
  }
};