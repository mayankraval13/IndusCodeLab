import { db } from "../libs/db.js";
import {
  AssignmentStatus,
  NotificationType,
} from "../generated/prisma/index.js";
import { PRACTICAL_SUBMITTED } from "../libs/practicalStatus.js";

const OFFERING_SUMMARY = {
  select: {
    id: true,
    term: true,
    facultyId: true,
    batchId: true,
    subjectId: true,
    batch: { select: { id: true, name: true } },
    subject: { select: { id: true, name: true, code: true } },
    faculty: { select: { id: true, name: true } },
  },
};

const PROBLEM_SUMMARY = {
  select: {
    id: true,
    title: true,
    difficulty: true,
    unitId: true,
  },
};

const parseDate = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const shapeAssignment = (assignment) => ({
  id: assignment.id,
  offeringId: assignment.offeringId,
  title: assignment.title,
  description: assignment.description,
  status: assignment.status,
  publishAt: assignment.publishAt,
  dueAt: assignment.dueAt,
  allowLateSubmission: assignment.allowLateSubmission,
  createdAt: assignment.createdAt,
  updatedAt: assignment.updatedAt,
  ...(assignment.offering ? { offering: assignment.offering } : {}),
  ...(assignment.problems
    ? {
        problems: assignment.problems
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((link) => ({ ...link.problem, order: link.order })),
      }
    : {}),
  ...(assignment._count ? { problemCount: assignment._count.problems } : {}),
});

/**
 * The single gate for faculty access. Ownership is expressed as a nested filter
 * rather than a post-hoc check, so a mismatch returns null and the caller 404s
 * — a faculty member cannot even confirm another's assignment exists.
 */
const findOwnedAssignment = (assignmentId, facultyId, include) =>
  db.assignment.findFirst({
    where: { id: assignmentId, offering: { facultyId } },
    ...(include ? { include } : {}),
  });

/** The equivalent gate for students: published, and in one of their sections. */
const findVisibleAssignment = (assignmentId, userId, include) =>
  db.assignment.findFirst({
    where: {
      id: assignmentId,
      status: AssignmentStatus.PUBLISHED,
      offering: { batch: { members: { some: { userId } } } },
    },
    ...(include ? { include } : {}),
  });

const isOpen = (assignment, now = new Date()) =>
  assignment.status === AssignmentStatus.PUBLISHED &&
  (!assignment.publishAt || assignment.publishAt <= now);

/**
 * Validates a problem set against an offering. Rejects anything that is not a
 * practical, or that belongs to a different subject — a DSA allocation must not
 * become a way to assign another subject's work.
 */
const validateProblemIds = async (problemIds, subjectId) => {
  const unique = [...new Set(problemIds)];

  const problems = await db.problem.findMany({
    where: { id: { in: unique } },
    select: {
      id: true,
      type: true,
      unit: { select: { subjectId: true } },
    },
  });

  if (problems.length !== unique.length) {
    return { error: "One or more problems do not exist" };
  }

  const notPractical = problems.filter((p) => p.type !== "PRACTICAL");
  if (notPractical.length > 0) {
    return { error: "Only practical problems can be assigned" };
  }

  const wrongSubject = problems.filter(
    (p) => p.unit && p.unit.subjectId !== subjectId,
  );
  if (wrongSubject.length > 0) {
    return { error: "One or more problems belong to a different subject" };
  }

  return { problemIds: unique };
};

/* ------------------------------------------------------------------ faculty */

export const listAssignableProblems = async (req, res) => {
  try {
    const offering = await db.courseOffering.findFirst({
      where: { id: req.params.offeringId, facultyId: req.user.id },
      select: { subjectId: true },
    });

    if (!offering) {
      return res.status(404).json({ error: "Allocation not found" });
    }

    const problems = await db.problem.findMany({
      where: {
        type: "PRACTICAL",
        unit: { subjectId: offering.subjectId },
      },
      select: {
        id: true,
        title: true,
        difficulty: true,
        unit: { select: { id: true, title: true } },
      },
      orderBy: [{ unitId: "asc" }, { createdAt: "asc" }],
    });

    res.status(200).json({
      success: true,
      message: "Assignable problems fetched successfully",
      problems,
    });
  } catch (error) {
    console.error("Error fetching assignable problems:", error);
    res.status(500).json({ error: "Failed to fetch problems" });
  }
};

export const createAssignment = async (req, res) => {
  const { offeringId, title, description, problemIds = [] } = req.body;

  if (!offeringId || !String(title ?? "").trim()) {
    return res
      .status(400)
      .json({ error: "offeringId and title are required" });
  }

  if (!Array.isArray(problemIds)) {
    return res.status(400).json({ error: "problemIds must be an array" });
  }

  const dueAt = parseDate(req.body.dueAt);
  if (dueAt === undefined) {
    return res.status(400).json({ error: "dueAt is not a valid date" });
  }

  try {
    const offering = await db.courseOffering.findFirst({
      where: { id: offeringId, facultyId: req.user.id },
      select: { id: true, subjectId: true },
    });

    if (!offering) {
      return res.status(404).json({ error: "Allocation not found" });
    }

    let validated = [];
    if (problemIds.length > 0) {
      const result = await validateProblemIds(problemIds, offering.subjectId);
      if (result.error) return res.status(400).json({ error: result.error });
      validated = result.problemIds;
    }

    const assignment = await db.assignment.create({
      data: {
        offeringId,
        title: String(title).trim(),
        description: description ? String(description).trim() : null,
        dueAt,
        allowLateSubmission: req.body.allowLateSubmission !== false,
        problems: {
          create: validated.map((problemId, index) => ({
            problemId,
            order: index,
          })),
        },
      },
      include: {
        offering: OFFERING_SUMMARY,
        problems: { include: { problem: PROBLEM_SUMMARY } },
      },
    });

    res.status(201).json({
      success: true,
      message: "Draft created successfully",
      assignment: shapeAssignment(assignment),
    });
  } catch (error) {
    console.error("Error creating assignment:", error);
    res.status(500).json({ error: "Failed to create assignment" });
  }
};

export const listFacultyAssignments = async (req, res) => {
  const { offeringId, status } = req.query;

  try {
    const assignments = await db.assignment.findMany({
      where: {
        offering: { facultyId: req.user.id },
        ...(offeringId ? { offeringId } : {}),
        ...(status === "DRAFT" || status === "PUBLISHED" ? { status } : {}),
      },
      include: {
        offering: OFFERING_SUMMARY,
        _count: { select: { problems: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      success: true,
      message: "Assignments fetched successfully",
      assignments: assignments.map(shapeAssignment),
    });
  } catch (error) {
    console.error("Error fetching assignments:", error);
    res.status(500).json({ error: "Failed to fetch assignments" });
  }
};

export const getFacultyAssignment = async (req, res) => {
  try {
    const assignment = await findOwnedAssignment(req.params.id, req.user.id, {
      offering: OFFERING_SUMMARY,
      problems: { include: { problem: PROBLEM_SUMMARY } },
    });

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    res.status(200).json({
      success: true,
      message: "Assignment fetched successfully",
      assignment: shapeAssignment(assignment),
    });
  } catch (error) {
    console.error("Error fetching assignment:", error);
    res.status(500).json({ error: "Failed to fetch assignment" });
  }
};

export const updateAssignment = async (req, res) => {
  const { title, description, problemIds } = req.body;

  const dueAt = parseDate(req.body.dueAt);
  if (dueAt === undefined) {
    return res.status(400).json({ error: "dueAt is not a valid date" });
  }

  try {
    const existing = await findOwnedAssignment(req.params.id, req.user.id, {
      offering: { select: { subjectId: true } },
    });

    if (!existing) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    if (title !== undefined && !String(title).trim()) {
      return res.status(400).json({ error: "title cannot be empty" });
    }

    // Students may already have started work against a published problem set,
    // so the set is frozen once published — only the metadata stays editable.
    if (problemIds !== undefined && existing.status !== AssignmentStatus.DRAFT) {
      return res.status(409).json({
        error: "Problems cannot be changed after publishing",
      });
    }

    let validated;
    if (problemIds !== undefined) {
      if (!Array.isArray(problemIds)) {
        return res.status(400).json({ error: "problemIds must be an array" });
      }
      const result = await validateProblemIds(
        problemIds,
        existing.offering.subjectId,
      );
      if (result.error) return res.status(400).json({ error: result.error });
      validated = result.problemIds;
    }

    const assignment = await db.$transaction(async (tx) => {
      if (validated) {
        await tx.assignmentProblem.deleteMany({
          where: { assignmentId: existing.id },
        });
        await tx.assignmentProblem.createMany({
          data: validated.map((problemId, index) => ({
            assignmentId: existing.id,
            problemId,
            order: index,
          })),
        });
      }

      return tx.assignment.update({
        where: { id: existing.id },
        data: {
          ...(title !== undefined ? { title: String(title).trim() } : {}),
          ...(description !== undefined
            ? { description: description ? String(description).trim() : null }
            : {}),
          ...(req.body.dueAt !== undefined ? { dueAt } : {}),
          ...(req.body.allowLateSubmission !== undefined
            ? { allowLateSubmission: !!req.body.allowLateSubmission }
            : {}),
        },
        include: {
          offering: OFFERING_SUMMARY,
          problems: { include: { problem: PROBLEM_SUMMARY } },
        },
      });
    });

    res.status(200).json({
      success: true,
      message: "Assignment updated successfully",
      assignment: shapeAssignment(assignment),
    });
  } catch (error) {
    console.error("Error updating assignment:", error);
    res.status(500).json({ error: "Failed to update assignment" });
  }
};

export const publishAssignment = async (req, res) => {
  const publishAt = parseDate(req.body.publishAt);
  if (publishAt === undefined) {
    return res.status(400).json({ error: "publishAt is not a valid date" });
  }

  try {
    const assignment = await findOwnedAssignment(req.params.id, req.user.id, {
      offering: OFFERING_SUMMARY,
      _count: { select: { problems: true } },
    });

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    if (assignment.status === AssignmentStatus.PUBLISHED) {
      return res.status(409).json({ error: "Assignment is already published" });
    }

    if (assignment._count.problems === 0) {
      return res.status(400).json({
        error: "Add at least one problem before publishing",
      });
    }

    const opensAt = publishAt ?? new Date();

    if (assignment.dueAt && assignment.dueAt <= opensAt) {
      return res.status(400).json({
        error: "The due date must be after the publish date",
      });
    }

    const members = await db.batchMember.findMany({
      where: { batchId: assignment.offering.batchId },
      select: { userId: true },
    });

    const dueLabel = assignment.dueAt
      ? ` Due ${assignment.dueAt.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
        })}.`
      : "";
    const opensLabel =
      opensAt > new Date()
        ? ` Opens ${opensAt.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
          })}.`
        : "";

    const published = await db.$transaction(async (tx) => {
      const updated = await tx.assignment.update({
        where: { id: assignment.id },
        data: { status: AssignmentStatus.PUBLISHED, publishAt: opensAt },
        include: {
          offering: OFFERING_SUMMARY,
          problems: { include: { problem: PROBLEM_SUMMARY } },
        },
      });

      if (members.length > 0) {
        await tx.notification.createMany({
          data: members.map(({ userId }) => ({
            userId,
            type: NotificationType.ASSIGNMENT_PUBLISHED,
            title: `New ${assignment.offering.subject.name} practical: ${assignment.title}`,
            body: `${assignment.offering.subject.code}.${opensLabel}${dueLabel}`,
            linkUrl: `/assignments/${assignment.id}`,
          })),
        });
      }

      return updated;
    });

    res.status(200).json({
      success: true,
      message: `Published to ${members.length} student(s)`,
      notified: members.length,
      assignment: shapeAssignment(published),
    });
  } catch (error) {
    console.error("Error publishing assignment:", error);
    res.status(500).json({ error: "Failed to publish assignment" });
  }
};

export const deleteAssignment = async (req, res) => {
  try {
    const assignment = await findOwnedAssignment(req.params.id, req.user.id);

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    // Published work has been announced and possibly worked on; deleting it
    // would strand notifications students have already seen.
    if (assignment.status !== AssignmentStatus.DRAFT) {
      return res.status(409).json({
        error: "Published assignments cannot be deleted",
      });
    }

    await db.assignment.delete({ where: { id: assignment.id } });

    res.status(200).json({
      success: true,
      message: "Draft deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting assignment:", error);
    res.status(500).json({ error: "Failed to delete assignment" });
  }
};

/**
 * Who has submitted, and how much. Faculty check the actual output physically,
 * so this deliberately reports counts and timestamps rather than code.
 */
export const getAssignmentRoster = async (req, res) => {
  try {
    const assignment = await findOwnedAssignment(req.params.id, req.user.id, {
      offering: OFFERING_SUMMARY,
      problems: { select: { problemId: true } },
    });

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    const problemIds = assignment.problems.map((p) => p.problemId);

    const members = await db.batchMember.findMany({
      where: { batchId: assignment.offering.batchId },
      select: {
        user: {
          select: { id: true, name: true, email: true, enrollmentNo: true },
        },
      },
      orderBy: { user: { enrollmentNo: "asc" } },
    });

    const submissions =
      problemIds.length === 0
        ? []
        : await db.submission.findMany({
            where: {
              problemId: { in: problemIds },
              userId: { in: members.map((m) => m.user.id) },
            },
            select: {
              userId: true,
              problemId: true,
              status: true,
              createdAt: true,
            },
          });

    const byUser = new Map();
    for (const submission of submissions) {
      if (!byUser.has(submission.userId)) byUser.set(submission.userId, []);
      byUser.get(submission.userId).push(submission);
    }

    const roster = members.map(({ user }) => {
      const mine = byUser.get(user.id) ?? [];
      const successful = mine.filter((s) => s.status === PRACTICAL_SUBMITTED);
      const solvedProblemIds = new Set(successful.map((s) => s.problemId));

      const times = successful.map((s) => s.createdAt.getTime());
      const firstSubmittedAt = times.length
        ? new Date(Math.min(...times))
        : null;
      const lastSubmittedAt = times.length
        ? new Date(Math.max(...times))
        : null;

      return {
        user,
        submissionCount: mine.length,
        problemsSubmitted: solvedProblemIds.size,
        firstSubmittedAt,
        lastSubmittedAt,
        isComplete:
          problemIds.length > 0 && solvedProblemIds.size === problemIds.length,
        // Late means they did not start delivering before the deadline, not
        // that they revised their work afterwards.
        isLate:
          !!assignment.dueAt &&
          !!firstSubmittedAt &&
          firstSubmittedAt > assignment.dueAt,
      };
    });

    res.status(200).json({
      success: true,
      message: "Roster fetched successfully",
      assignment: shapeAssignment(assignment),
      problemCount: problemIds.length,
      summary: {
        total: roster.length,
        submitted: roster.filter((r) => r.problemsSubmitted > 0).length,
        complete: roster.filter((r) => r.isComplete).length,
        late: roster.filter((r) => r.isLate).length,
      },
      roster,
    });
  } catch (error) {
    console.error("Error fetching roster:", error);
    res.status(500).json({ error: "Failed to fetch roster" });
  }
};

/* ------------------------------------------------------------------ student */

export const listStudentAssignments = async (req, res) => {
  try {
    const assignments = await db.assignment.findMany({
      where: {
        status: AssignmentStatus.PUBLISHED,
        offering: { batch: { members: { some: { userId: req.user.id } } } },
      },
      include: {
        offering: OFFERING_SUMMARY,
        problems: { select: { problemId: true } },
      },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
    });

    const allProblemIds = [
      ...new Set(
        assignments.flatMap((a) => a.problems.map((p) => p.problemId)),
      ),
    ];

    const solved =
      allProblemIds.length === 0
        ? []
        : await db.submission.findMany({
            where: {
              userId: req.user.id,
              problemId: { in: allProblemIds },
              status: PRACTICAL_SUBMITTED,
            },
            select: { problemId: true },
            distinct: ["problemId"],
          });

    const solvedSet = new Set(solved.map((s) => s.problemId));
    const now = new Date();

    res.status(200).json({
      success: true,
      message: "Assignments fetched successfully",
      assignments: assignments.map((assignment) => {
        const problemIds = assignment.problems.map((p) => p.problemId);
        const submitted = problemIds.filter((id) => solvedSet.has(id)).length;

        return {
          ...shapeAssignment(assignment),
          problems: undefined,
          problemCount: problemIds.length,
          submittedCount: submitted,
          isComplete: problemIds.length > 0 && submitted === problemIds.length,
          isOpen: isOpen(assignment, now),
          isOverdue:
            !!assignment.dueAt &&
            assignment.dueAt < now &&
            submitted < problemIds.length,
        };
      }),
    });
  } catch (error) {
    console.error("Error fetching student assignments:", error);
    res.status(500).json({ error: "Failed to fetch assignments" });
  }
};

export const getStudentAssignment = async (req, res) => {
  try {
    const assignment = await findVisibleAssignment(req.params.id, req.user.id, {
      offering: OFFERING_SUMMARY,
      problems: { include: { problem: PROBLEM_SUMMARY } },
    });

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    const now = new Date();
    const open = isOpen(assignment, now);
    const shaped = shapeAssignment(assignment);

    // Scheduled but not yet open: the student may see that it is coming, but
    // withholding the problems is the whole point of a publish date.
    if (!open) {
      return res.status(200).json({
        success: true,
        message: "Assignment fetched successfully",
        assignment: {
          ...shaped,
          problems: [],
          problemCount: assignment.problems.length,
          isOpen: false,
        },
      });
    }

    const problemIds = assignment.problems.map((p) => p.problemId);

    const submissions =
      problemIds.length === 0
        ? []
        : await db.submission.findMany({
            where: { userId: req.user.id, problemId: { in: problemIds } },
            select: { problemId: true, status: true, createdAt: true },
            orderBy: { createdAt: "desc" },
          });

    const progress = new Map();
    for (const submission of submissions) {
      const current = progress.get(submission.problemId) ?? {
        attempts: 0,
        submitted: false,
        lastSubmittedAt: null,
      };
      current.attempts += 1;
      if (submission.status === PRACTICAL_SUBMITTED) {
        current.submitted = true;
        if (!current.lastSubmittedAt) {
          current.lastSubmittedAt = submission.createdAt;
        }
      }
      progress.set(submission.problemId, current);
    }

    const problems = shaped.problems.map((problem) => ({
      ...problem,
      ...(progress.get(problem.id) ?? {
        attempts: 0,
        submitted: false,
        lastSubmittedAt: null,
      }),
    }));

    const submittedCount = problems.filter((p) => p.submitted).length;

    res.status(200).json({
      success: true,
      message: "Assignment fetched successfully",
      assignment: {
        ...shaped,
        problems,
        problemCount: problems.length,
        submittedCount,
        isComplete: problems.length > 0 && submittedCount === problems.length,
        isOpen: true,
        isOverdue:
          !!assignment.dueAt &&
          assignment.dueAt < now &&
          submittedCount < problems.length,
        acceptsSubmissions:
          !assignment.dueAt ||
          assignment.dueAt >= now ||
          assignment.allowLateSubmission,
      },
    });
  } catch (error) {
    console.error("Error fetching student assignment:", error);
    res.status(500).json({ error: "Failed to fetch assignment" });
  }
};

/* ------------------------------------------------------- submission gating */

/**
 * Decides whether a student may submit a given practical right now.
 *
 * A problem nobody assigned is free practice and always open. Once it is part
 * of a published assignment for one of the student's sections, that assignment
 * governs the deadline. If several assignments cover the same problem the most
 * permissive wins, so one section's closed deadline cannot block another's.
 */
export const evaluateSubmissionWindow = async (userId, problemId) => {
  const now = new Date();

  const links = await db.assignmentProblem.findMany({
    where: {
      problemId,
      assignment: {
        status: AssignmentStatus.PUBLISHED,
        offering: { batch: { members: { some: { userId } } } },
      },
    },
    select: {
      assignment: {
        select: {
          id: true,
          title: true,
          dueAt: true,
          publishAt: true,
          allowLateSubmission: true,
        },
      },
    },
  });

  if (links.length === 0) {
    return { allowed: true, assignment: null, isLate: false };
  }

  let blockedReason = null;

  for (const { assignment } of links) {
    if (assignment.publishAt && assignment.publishAt > now) {
      blockedReason ??= `"${assignment.title}" has not opened yet`;
      continue;
    }

    const overdue = !!assignment.dueAt && assignment.dueAt < now;

    if (overdue && !assignment.allowLateSubmission) {
      blockedReason ??= `The deadline for "${assignment.title}" has passed`;
      continue;
    }

    return {
      allowed: true,
      assignment: { id: assignment.id, title: assignment.title },
      isLate: overdue,
    };
  }

  return { allowed: false, reason: blockedReason };
};
