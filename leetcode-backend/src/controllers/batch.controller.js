import { db } from "../libs/db.js";
import { UserRole } from "../generated/prisma/index.js";

const STUDENT_FIELDS = {
  id: true,
  name: true,
  email: true,
  enrollmentNo: true,
  provisionedByAdmin: true,
};

const normalizePrefix = (raw) => String(raw ?? "").trim().toUpperCase();

/**
 * Splits an enrollment number into its batch prefix and numeric tail without
 * assuming a fixed width, so a different college format still works as long as
 * it ends in digits. Returns null when the number does not sit under `prefix`.
 */
const serialFor = (enrollmentNo, prefix) => {
  if (!enrollmentNo || !enrollmentNo.startsWith(prefix)) return null;

  const tail = enrollmentNo.slice(prefix.length);
  if (!/^\d+$/.test(tail)) return null;

  return Number.parseInt(tail, 10);
};

const parseRange = (start, end) => {
  const serialStart = Number(start);
  const serialEnd = Number(end);

  if (!Number.isInteger(serialStart) || !Number.isInteger(serialEnd)) {
    return { error: "serialStart and serialEnd must be integers" };
  }

  if (serialStart < 0 || serialEnd < 0) {
    return { error: "serialStart and serialEnd must not be negative" };
  }

  if (serialStart > serialEnd) {
    return { error: "serialStart must not be greater than serialEnd" };
  }

  return { serialStart, serialEnd };
};

export const createBatch = async (req, res) => {
  const { name } = req.body;
  const enrollmentPrefix = normalizePrefix(req.body.enrollmentPrefix);

  if (!name || !enrollmentPrefix) {
    return res.status(400).json({
      error: "Name and enrollmentPrefix are required",
    });
  }

  const range = parseRange(req.body.serialStart, req.body.serialEnd);
  if (range.error) {
    return res.status(400).json({ error: range.error });
  }

  try {
    const batch = await db.batch.create({
      data: {
        name: String(name).trim(),
        enrollmentPrefix,
        serialStart: range.serialStart,
        serialEnd: range.serialEnd,
      },
    });

    res.status(201).json({
      success: true,
      message: "Batch created successfully",
      batch,
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(400).json({
        error: "A batch with this name already exists for this prefix",
      });
    }
    console.error("Error creating batch:", error);
    res.status(500).json({ error: "Failed to create batch" });
  }
};

export const getAllBatches = async (req, res) => {
  try {
    const batches = await db.batch.findMany({
      include: {
        _count: { select: { members: true, offerings: true } },
      },
      orderBy: [{ enrollmentPrefix: "asc" }, { name: "asc" }],
    });

    res.status(200).json({
      success: true,
      message: "Batches fetched successfully",
      batches: batches.map(({ _count, ...batch }) => ({
        ...batch,
        memberCount: _count.members,
        offeringCount: _count.offerings,
      })),
    });
  } catch (error) {
    console.error("Error fetching batches:", error);
    res.status(500).json({ error: "Failed to fetch batches" });
  }
};

export const getBatchById = async (req, res) => {
  const { id } = req.params;

  try {
    const batch = await db.batch.findUnique({
      where: { id },
      include: {
        members: {
          include: { user: { select: STUDENT_FIELDS } },
          orderBy: { user: { enrollmentNo: "asc" } },
        },
      },
    });

    if (!batch) {
      return res.status(404).json({ error: "Batch not found" });
    }

    const { members, ...rest } = batch;

    res.status(200).json({
      success: true,
      message: "Batch fetched successfully",
      batch: {
        ...rest,
        memberCount: members.length,
        members: members.map((member) => member.user),
      },
    });
  } catch (error) {
    console.error("Error fetching batch:", error);
    res.status(500).json({ error: "Failed to fetch batch" });
  }
};

export const updateBatch = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const data = {};

  if (name !== undefined) {
    if (!String(name).trim()) {
      return res.status(400).json({ error: "Name must not be empty" });
    }
    data.name = String(name).trim();
  }

  if (req.body.enrollmentPrefix !== undefined) {
    const enrollmentPrefix = normalizePrefix(req.body.enrollmentPrefix);
    if (!enrollmentPrefix) {
      return res.status(400).json({ error: "enrollmentPrefix must not be empty" });
    }
    data.enrollmentPrefix = enrollmentPrefix;
  }

  if (
    req.body.serialStart !== undefined ||
    req.body.serialEnd !== undefined
  ) {
    const existing = await db.batch.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Batch not found" });
    }

    const range = parseRange(
      req.body.serialStart ?? existing.serialStart,
      req.body.serialEnd ?? existing.serialEnd
    );
    if (range.error) {
      return res.status(400).json({ error: range.error });
    }

    data.serialStart = range.serialStart;
    data.serialEnd = range.serialEnd;
  }

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ error: "Nothing to update" });
  }

  try {
    const batch = await db.batch.update({ where: { id }, data });

    res.status(200).json({
      success: true,
      message: "Batch updated successfully",
      batch,
    });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Batch not found" });
    }
    if (error.code === "P2002") {
      return res.status(400).json({
        error: "A batch with this name already exists for this prefix",
      });
    }
    console.error("Error updating batch:", error);
    res.status(500).json({ error: "Failed to update batch" });
  }
};

export const deleteBatch = async (req, res) => {
  const { id } = req.params;

  try {
    const batch = await db.batch.findUnique({
      where: { id },
      include: { _count: { select: { members: true } } },
    });

    if (!batch) {
      return res.status(404).json({ error: "Batch not found" });
    }

    if (batch._count.members > 0) {
      return res.status(409).json({
        error: `Batch still has ${batch._count.members} enrolled student(s). Remove them before deleting.`,
      });
    }

    await db.batch.delete({ where: { id } });

    res.status(200).json({
      success: true,
      message: "Batch deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting batch:", error);
    res.status(500).json({ error: "Failed to delete batch" });
  }
};

/**
 * Resolves a serial range to students and reports what enrolling would do.
 * Always call with dryRun first from the UI — a mis-typed range silently moves
 * a hundred students into the wrong section otherwise.
 *
 * Body: { dryRun?: boolean, serialStart?: number, serialEnd?: number }
 */
export const enrollByRange = async (req, res) => {
  const { id } = req.params;
  const dryRun = req.body.dryRun === true;

  try {
    const batch = await db.batch.findUnique({ where: { id } });

    if (!batch) {
      return res.status(404).json({ error: "Batch not found" });
    }

    const range = parseRange(
      req.body.serialStart ?? batch.serialStart,
      req.body.serialEnd ?? batch.serialEnd
    );
    if (range.error) {
      return res.status(400).json({ error: range.error });
    }

    const candidates = await db.user.findMany({
      where: {
        role: UserRole.USER,
        enrollmentNo: { startsWith: batch.enrollmentPrefix },
      },
      select: {
        ...STUDENT_FIELDS,
        batches: {
          select: {
            batch: {
              select: { id: true, name: true, enrollmentPrefix: true },
            },
          },
        },
      },
      orderBy: { enrollmentNo: "asc" },
    });

    const matched = candidates.filter((user) => {
      const serial = serialFor(user.enrollmentNo, batch.enrollmentPrefix);
      return (
        serial !== null &&
        serial >= range.serialStart &&
        serial <= range.serialEnd
      );
    });

    const alreadyMembers = [];
    const conflicts = [];
    const toEnroll = [];
    // Self-registered accounts are listed, not swept in. An admin adds them
    // one at a time after seeing who the account actually is.
    const skipped = [];

    for (const user of matched) {
      if (!user.provisionedByAdmin) {
        skipped.push(shapeStudent(user));
        continue;
      }

      const memberships = user.batches.map((entry) => entry.batch);

      if (memberships.some((b) => b.id === batch.id)) {
        alreadyMembers.push(shapeStudent(user));
        continue;
      }

      // One section per cohort. Catches overlapping ranges, which is the most
      // likely way a bulk enroll goes wrong.
      const clashing = memberships.find(
        (b) => b.enrollmentPrefix === batch.enrollmentPrefix
      );

      if (clashing) {
        conflicts.push({
          ...shapeStudent(user),
          currentBatch: { id: clashing.id, name: clashing.name },
        });
        continue;
      }

      toEnroll.push(shapeStudent(user));
    }

    let enrolled = 0;

    if (!dryRun && toEnroll.length > 0) {
      const result = await db.batchMember.createMany({
        data: toEnroll.map((user) => ({ batchId: batch.id, userId: user.id })),
        skipDuplicates: true,
      });
      enrolled = result.count;
    }

    res.status(200).json({
      success: true,
      message: dryRun
        ? "Dry run complete — nothing was written"
        : `Enrolled ${enrolled} student(s)`,
      dryRun,
      batch: {
        id: batch.id,
        name: batch.name,
        enrollmentPrefix: batch.enrollmentPrefix,
      },
      range,
      summary: {
        matched: matched.length,
        alreadyMembers: alreadyMembers.length,
        conflicts: conflicts.length,
        toEnroll: toEnroll.length,
        skipped: skipped.length,
        enrolled,
      },
      alreadyMembers,
      conflicts,
      toEnroll,
      skipped,
    });
  } catch (error) {
    console.error("Error enrolling by range:", error);
    res.status(500).json({ error: "Failed to enroll students" });
  }
};

/** Adds one student, for transfers and the exceptions a range cannot express. */
export const addBatchMember = async (req, res) => {
  const { id } = req.params;
  const move = req.body.move === true;
  const enrollmentNo = req.body.enrollmentNo
    ? String(req.body.enrollmentNo).trim().toUpperCase()
    : null;
  const { userId } = req.body;

  if (!enrollmentNo && !userId) {
    return res.status(400).json({
      error: "Provide either enrollmentNo or userId",
    });
  }

  try {
    const batch = await db.batch.findUnique({ where: { id } });

    if (!batch) {
      return res.status(404).json({ error: "Batch not found" });
    }

    const user = await db.user.findFirst({
      where: enrollmentNo ? { enrollmentNo } : { id: userId },
      select: {
        ...STUDENT_FIELDS,
        role: true,
        batches: {
          select: {
            batch: {
              select: { id: true, name: true, enrollmentPrefix: true },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: "Student not found" });
    }

    if (user.role !== UserRole.USER) {
      return res.status(400).json({
        error: "Only students can be enrolled in a batch",
      });
    }

    const memberships = user.batches.map((entry) => entry.batch);

    if (memberships.some((b) => b.id === batch.id)) {
      return res.status(400).json({
        error: "Student is already in this batch",
      });
    }

    const clashing = memberships.find(
      (b) => b.enrollmentPrefix === batch.enrollmentPrefix
    );

    if (clashing && !move) {
      return res.status(409).json({
        error: `Student is already in batch "${clashing.name}". Send move: true to transfer them.`,
        currentBatch: { id: clashing.id, name: clashing.name },
      });
    }

    await db.$transaction(async (tx) => {
      if (clashing) {
        await tx.batchMember.delete({
          where: {
            batchId_userId: { batchId: clashing.id, userId: user.id },
          },
        });
      }

      await tx.batchMember.create({
        data: { batchId: batch.id, userId: user.id },
      });
    });

    res.status(201).json({
      success: true,
      message: clashing
        ? `Student transferred from "${clashing.name}" to "${batch.name}"`
        : "Student enrolled successfully",
      student: shapeStudent(user),
      transferredFrom: clashing
        ? { id: clashing.id, name: clashing.name }
        : null,
    });
  } catch (error) {
    console.error("Error adding batch member:", error);
    res.status(500).json({ error: "Failed to enroll student" });
  }
};

export const removeBatchMember = async (req, res) => {
  const { id, userId } = req.params;

  try {
    await db.batchMember.delete({
      where: { batchId_userId: { batchId: id, userId } },
    });

    res.status(200).json({
      success: true,
      message: "Student removed from batch",
    });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({
        error: "Student is not a member of this batch",
      });
    }
    console.error("Error removing batch member:", error);
    res.status(500).json({ error: "Failed to remove student" });
  }
};

function shapeStudent(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    enrollmentNo: user.enrollmentNo,
    // Surfaced so an admin adding a student by hand can see whether the account
    // came from the institution or someone signed up claiming that number.
    provisionedByAdmin: user.provisionedByAdmin,
  };
}
