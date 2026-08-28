import { db } from "../libs/db.js";
import { NotificationType, UserRole } from "../generated/prisma/index.js";

const OFFERING_INCLUDE = {
  faculty: { select: { id: true, name: true, email: true } },
  batch: {
    select: {
      id: true,
      name: true,
      enrollmentPrefix: true,
      _count: { select: { members: true } },
    },
  },
  subject: { select: { id: true, name: true, code: true } },
  assignedBy: { select: { id: true, name: true, email: true } },
};

/**
 * Indian academic convention: July–December is the odd semester, January–June
 * the even one. Only a fallback — callers should pass `term` explicitly.
 */
export const currentTerm = (now = new Date()) => {
  const month = now.getMonth(); // 0-indexed
  return month >= 6
    ? `${now.getFullYear()}-ODD`
    : `${now.getFullYear()}-EVEN`;
};

const shapeOffering = (offering) => {
  const { batch, ...rest } = offering;
  return {
    ...rest,
    batch: batch
      ? {
          id: batch.id,
          name: batch.name,
          enrollmentPrefix: batch.enrollmentPrefix,
          memberCount: batch._count.members,
        }
      : null,
  };
};

export const createOffering = async (req, res) => {
  const { facultyId, batchId, subjectId } = req.body;
  const term = String(req.body.term ?? "").trim() || currentTerm();

  if (!facultyId || !batchId || !subjectId) {
    return res.status(400).json({
      error: "facultyId, batchId and subjectId are required",
    });
  }

  try {
    const [faculty, batch, subject] = await Promise.all([
      db.user.findUnique({
        where: { id: facultyId },
        select: { id: true, name: true, role: true },
      }),
      db.batch.findUnique({ where: { id: batchId } }),
      db.subject.findUnique({ where: { id: subjectId } }),
    ]);

    if (!faculty) return res.status(404).json({ error: "Faculty not found" });
    if (!batch) return res.status(404).json({ error: "Section not found" });
    if (!subject) return res.status(404).json({ error: "Subject not found" });

    if (faculty.role !== UserRole.FACULTY) {
      return res.status(400).json({
        error: "Only a FACULTY account can be allocated to a section",
      });
    }

    const offering = await db.$transaction(async (tx) => {
      const created = await tx.courseOffering.create({
        data: {
          facultyId,
          batchId,
          subjectId,
          term,
          assignedById: req.user.id,
        },
        include: OFFERING_INCLUDE,
      });

      await tx.notification.create({
        data: {
          userId: facultyId,
          type: NotificationType.COURSE_ASSIGNED_TO_FACULTY,
          title: `You are teaching ${subject.name} to Section ${batch.name}`,
          body: `${term} · ${subject.code}. You can now publish practical assignments to this section.`,
          linkUrl: "/faculty/sections",
        },
      });

      return created;
    });

    res.status(201).json({
      success: true,
      message: "Allocation created successfully",
      offering: shapeOffering(offering),
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        error:
          "This subject is already allocated to this section for this term",
      });
    }
    console.error("Error creating offering:", error);
    res.status(500).json({ error: "Failed to create allocation" });
  }
};

export const getAllOfferings = async (req, res) => {
  const { term, facultyId, batchId } = req.query;

  try {
    const offerings = await db.courseOffering.findMany({
      where: {
        ...(term ? { term } : {}),
        ...(facultyId ? { facultyId } : {}),
        ...(batchId ? { batchId } : {}),
      },
      include: OFFERING_INCLUDE,
      orderBy: [{ term: "desc" }, { createdAt: "desc" }],
    });

    res.status(200).json({
      success: true,
      message: "Allocations fetched successfully",
      offerings: offerings.map(shapeOffering),
    });
  } catch (error) {
    console.error("Error fetching offerings:", error);
    res.status(500).json({ error: "Failed to fetch allocations" });
  }
};

export const deleteOffering = async (req, res) => {
  const { id } = req.params;

  try {
    await db.courseOffering.delete({ where: { id } });

    res.status(200).json({
      success: true,
      message: "Allocation removed successfully",
    });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Allocation not found" });
    }
    console.error("Error deleting offering:", error);
    res.status(500).json({ error: "Failed to remove allocation" });
  }
};

/** Scoped to the signed-in faculty member — never accepts a facultyId param. */
export const getMyOfferings = async (req, res) => {
  try {
    const offerings = await db.courseOffering.findMany({
      where: { facultyId: req.user.id },
      include: OFFERING_INCLUDE,
      orderBy: [{ term: "desc" }, { createdAt: "desc" }],
    });

    res.status(200).json({
      success: true,
      message: "Allocations fetched successfully",
      offerings: offerings.map(shapeOffering),
    });
  } catch (error) {
    console.error("Error fetching faculty offerings:", error);
    res.status(500).json({ error: "Failed to fetch allocations" });
  }
};
