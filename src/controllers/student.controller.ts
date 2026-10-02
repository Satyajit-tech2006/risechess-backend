import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../prisma';

export const getStudents = async (req: Request, res: Response): Promise<void> => {
  try {
    const academyId = req.user!.academyId;
    const { search, tag, sort } = req.query;

    const whereClause: any = {
      academyId,
      role: 'STUDENT',
    };

    if (search && typeof search === 'string') {
      whereClause.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (tag && typeof tag === 'string' && tag !== 'ALL') {
      whereClause.tags = {
        some: {
          tag: {
            name: tag,
          },
        },
      };
    }

    const orderByClause: any = {};
    if (sort === 'oldest') {
      orderByClause.createdAt = 'asc';
    } else if (sort === 'name') {
      orderByClause.firstName = 'asc';
    } else {
      orderByClause.createdAt = 'desc';
    }

    const students = await prisma.user.findMany({
      where: whereClause,
      orderBy: orderByClause,
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        email: true,
        contactNo: true,
        dob: true,
        gender: true,
        classesLeft: true,
        status: true,
        createdAt: true,
        tags: {
          select: {
            tag: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    const formattedStudents = students.map((s) => ({
      ...s,
      tags: s.tags.map((t) => t.tag.name),
    }));

    res.json({ status: 'success', data: formattedStudents });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ status: 'error', message: 'Failed to retrieve students' });
  }
};

export const getStudentById = async (req: Request, res: Response): Promise<void> => {
  try {
    const academyId = req.user!.academyId;
    const { id } = req.params;

    const student = await prisma.user.findFirst({
      where: { id, academyId, role: 'STUDENT' },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        email: true,
        contactNo: true,
        dob: true,
        gender: true,
        classesLeft: true,
        status: true,
        createdAt: true,
        tags: {
          select: {
            tag: {
              select: {
                name: true,
              },
            },
          },
        },
        batches: {
          select: {
            batch: {
              select: {
                id: true,
                name: true,
                coach: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!student) {
      res.status(404).json({ status: 'error', message: 'Student not found' });
      return;
    }

    res.json({
      status: 'success',
      data: {
        ...student,
        tags: student.tags.map((t) => t.tag.name),
        batches: student.batches.map((b) => b.batch),
      },
    });
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({ status: 'error', message: 'Failed to retrieve student' });
  }
};

export const createStudent = async (req: Request, res: Response): Promise<void> => {
  try {
    const academyId = req.user!.academyId;
    const {
      username,
      firstName,
      lastName,
      email,
      password,
      dob,
      gender,
      contactNo,
      classesLeft,
      tags,
    } = req.body;

    if (!username || !firstName) {
      res.status(400).json({ status: 'error', message: 'Username and First Name are required' });
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
    const passwordHash = await bcrypt.hash(password || 'StudyChess@123', salt);

    const student = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          academyId,
          username,
          firstName,
          lastName,
          email,
          passwordHash,
          dob: dob ? new Date(dob) : null,
          gender: gender || 'Not specified',
          contactNo,
          classesLeft: classesLeft !== undefined ? Number(classesLeft) : 0,
          role: 'STUDENT',
          permissions: [],
        },
      });

      if (tags && Array.isArray(tags) && tags.length > 0) {
        for (const tagName of tags) {
          const trimmed = tagName.trim();
          if (!trimmed) continue;

          let tagRecord = await tx.tag.findUnique({
            where: {
              academyId_name: {
                academyId,
                name: trimmed,
              },
            },
          });

          if (!tagRecord) {
            tagRecord = await tx.tag.create({
              data: {
                academyId,
                name: trimmed,
              },
            });
          }

          await tx.userTag.create({
            data: {
              userId: createdUser.id,
              tagId: tagRecord.id,
            },
          });
        }
      }

      return createdUser;
    });

    res.status(201).json({ status: 'success', data: { id: student.id, username: student.username } });
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(500).json({ status: 'error', message: 'Failed to create student' });
  }
};

export const updateStudent = async (req: Request, res: Response): Promise<void> => {
  try {
    const academyId = req.user!.academyId;
    const { id } = req.params;
    const { firstName, lastName, email, contactNo, dob, gender, status, classesLeft, tags } = req.body;

    const existingStudent = await prisma.user.findFirst({
      where: { id, academyId, role: 'STUDENT' },
    });

    if (!existingStudent) {
      res.status(404).json({ status: 'error', message: 'Student not found' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          firstName: firstName ?? existingStudent.firstName,
          lastName: lastName !== undefined ? lastName : existingStudent.lastName,
          email: email !== undefined ? email : existingStudent.email,
          contactNo: contactNo !== undefined ? contactNo : existingStudent.contactNo,
          dob: dob ? new Date(dob) : existingStudent.dob,
          gender: gender ?? existingStudent.gender,
          status: status ?? existingStudent.status,
          classesLeft: classesLeft !== undefined ? Number(classesLeft) : existingStudent.classesLeft,
        },
      });

      if (tags && Array.isArray(tags)) {
        await tx.userTag.deleteMany({ where: { userId: id } });

        for (const tagName of tags) {
          const trimmed = tagName.trim();
          if (!trimmed) continue;

          let tagRecord = await tx.tag.findUnique({
            where: {
              academyId_name: {
                academyId,
                name: trimmed,
              },
            },
          });

          if (!tagRecord) {
            tagRecord = await tx.tag.create({
              data: {
                academyId,
                name: trimmed,
              },
            });
          }

          await tx.userTag.create({
            data: {
              userId: id,
              tagId: tagRecord.id,
            },
          });
        }
      }
    });

    res.json({ status: 'success', message: 'Student updated successfully' });
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update student' });
  }
};

export const deleteStudent = async (req: Request, res: Response): Promise<void> => {
  try {
    const academyId = req.user!.academyId;
    const { id } = req.params;

    const student = await prisma.user.findFirst({
      where: { id, academyId, role: 'STUDENT' },
    });

    if (!student) {
      res.status(404).json({ status: 'error', message: 'Student not found' });
      return;
    }

    await prisma.user.delete({ where: { id } });

    res.json({ status: 'success', message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ status: 'error', message: 'Failed to delete student' });
  }
};