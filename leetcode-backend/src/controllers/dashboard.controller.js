import { db } from "../libs/db.js";
import { AssignmentStatus, UserRole } from "../generated/prisma/index.js";
import { PRACTICAL_SUBMITTED } from "../libs/practicalStatus.js";
import {
  buildDailySeries,
  buildHeatmap,
  computeStreaks,
} from "../libs/activity.js";

const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"];

/** Graded practice problems record "Accepted"; practicals record "SUBMITTED". */
const SUCCESS_STATUSES = ["Accepted", PRACTICAL_SUBMITTED];

const countBy = (rows, key) => {
  const counts = {};
  for (const row of rows) {
    const value = row[key];
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return counts;
};

/* ------------------------------------------------------------------ student */

export const getStudentDashboard = async (req, res) => {
  const userId = req.user.id;

  try {
    const [
      solved,
      problemTotals,
      submissionDates,
      recentSubmissions,
      memberships,
    ] = await Promise.all([
      db.problemSolved.findMany({
        where: { userId },
        select: {
          createdAt: true,
          problem: {
            select: { id: true, difficulty: true, type: true, tags: true },
          },
        },
      }),
      db.problem.groupBy({
        by: ["difficulty", "type"],
        _count: { _all: true },
      }),
      db.submission.findMany({
        where: { userId },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      db.submission.findMany({
        where: { userId },
        select: {
          id: true,
          status: true,
          language: true,
          createdAt: true,
          problem: {
            select: { id: true, title: true, difficulty: true, type: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      db.batchMember.findMany({
        where: { userId },
        select: { batch: { select: { id: true, name: true } } },
      }),
    ]);

    const solvedProblems = solved.map((row) => row.problem);

    const byDifficulty = countBy(solvedProblems, "difficulty");
    const totalsByDifficulty = {};
    for (const row of problemTotals) {
      totalsByDifficulty[row.difficulty] =
        (totalsByDifficulty[row.difficulty] ?? 0) + row._count._all;
    }

    const dates = submissionDates.map((row) => row.createdAt);

    // Assignments the student can actually act on right now.
    const assignments = await db.assignment.findMany({
      where: {
        status: AssignmentStatus.PUBLISHED,
        offering: { batch: { members: { some: { userId } } } },
      },
      include: {
        offering: {
          select: {
            subject: { select: { name: true, code: true } },
            faculty: { select: { name: true } },
          },
        },
        problems: { select: { problemId: true } },
      },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
    });

    const assignedProblemIds = [
      ...new Set(assignments.flatMap((a) => a.problems.map((p) => p.problemId))),
    ];

    const assignedSubmitted =
      assignedProblemIds.length === 0
        ? []
        : await db.submission.findMany({
            where: {
              userId,
              problemId: { in: assignedProblemIds },
              status: PRACTICAL_SUBMITTED,
            },
            select: { problemId: true },
            distinct: ["problemId"],
          });

    const submittedSet = new Set(assignedSubmitted.map((s) => s.problemId));
    const now = new Date();

    const shapedAssignments = assignments.map((assignment) => {
      const problemIds = assignment.problems.map((p) => p.problemId);
      const submittedCount = problemIds.filter((id) => submittedSet.has(id))
        .length;

      return {
        id: assignment.id,
        title: assignment.title,
        dueAt: assignment.dueAt,
        publishAt: assignment.publishAt,
        subject: assignment.offering.subject,
        facultyName: assignment.offering.faculty?.name ?? null,
        problemCount: problemIds.length,
        submittedCount,
        isComplete: problemIds.length > 0 && submittedCount === problemIds.length,
        isOpen: !assignment.publishAt || assignment.publishAt <= now,
        isOverdue:
          !!assignment.dueAt &&
          assignment.dueAt < now &&
          submittedCount < problemIds.length,
      };
    });

    const pending = shapedAssignments.filter((a) => !a.isComplete);

    // Per-subject practical progress, so a student sees course coverage rather
    // than one undifferentiated total.
    // Only subjects this student is actually enrolled in. A campus-wide catalogue
    // would otherwise show every course as "0 of N" for people who never take it.
    const subjects = await db.subject.findMany({
      where: {
        offerings: {
          some: { batch: { members: { some: { userId } } } },
        },
      },
      select: {
        id: true,
        name: true,
        code: true,
        units: {
          select: {
            problems: {
              where: { type: "PRACTICAL" },
              select: { id: true },
            },
          },
        },
      },
    });

    const solvedIds = new Set(solvedProblems.map((p) => p.id));
    const focusAreas = await computeFocusAreas(userId);

    const subjectProgress = subjects
      .map((subject) => {
        const problemIds = subject.units.flatMap((unit) =>
          unit.problems.map((p) => p.id),
        );
        return {
          id: subject.id,
          name: subject.name,
          code: subject.code,
          total: problemIds.length,
          solved: problemIds.filter((id) => solvedIds.has(id)).length,
        };
      })
      .filter((subject) => subject.total > 0);

    res.status(200).json({
      success: true,
      message: "Dashboard fetched successfully",
      dashboard: {
        solved: {
          total: solvedProblems.length,
          practice: solvedProblems.filter((p) => p.type === "PRACTICE").length,
          practical: solvedProblems.filter((p) => p.type === "PRACTICAL").length,
          byDifficulty: Object.fromEntries(
            DIFFICULTIES.map((level) => [
              level,
              {
                solved: byDifficulty[level] ?? 0,
                total: totalsByDifficulty[level] ?? 0,
              },
            ]),
          ),
        },
        streak: computeStreaks(dates, now),
        heatmap: buildHeatmap(dates, 365, now),
        totalSubmissions: dates.length,
        assignments: {
          total: shapedAssignments.length,
          pending: pending.length,
          overdue: shapedAssignments.filter((a) => a.isOverdue).length,
          upcoming: pending.slice(0, 5),
        },
        recentSubmissions: recentSubmissions.map((submission) => ({
          id: submission.id,
          status: submission.status,
          language: submission.language,
          createdAt: submission.createdAt,
          problem: submission.problem,
          succeeded: SUCCESS_STATUSES.includes(submission.status),
        })),
        subjectProgress,
        sections: memberships.map((m) => m.batch),
        focusAreas,
      },
    });
  } catch (error) {
    console.error("Error building student dashboard:", error);
    res.status(500).json({ error: "Failed to build dashboard" });
  }
};

/**
 * Weakest tags, by accuracy across the student's graded practice submissions.
 *
 * Only practice problems count: practicals are ungraded, so a "failed" practical
 * means the code did not compile, which says nothing about the topic. Tags with
 * very few submissions are excluded — one bad attempt is noise, not a weakness.
 */
const MIN_SUBMISSIONS_FOR_SIGNAL = 3;

const computeFocusAreas = async (userId) => {
  const submissions = await db.submission.findMany({
    where: { userId, problem: { type: "PRACTICE" } },
    select: {
      status: true,
      problemId: true,
      problem: { select: { tags: true } },
    },
  });

  const byTag = new Map();

  for (const submission of submissions) {
    for (const tag of submission.problem.tags) {
      const entry = byTag.get(tag) ?? {
        tag,
        submissions: 0,
        accepted: 0,
        problemIds: new Set(),
      };
      entry.submissions += 1;
      if (submission.status === "Accepted") entry.accepted += 1;
      entry.problemIds.add(submission.problemId);
      byTag.set(tag, entry);
    }
  }

  return [...byTag.values()]
    .filter((entry) => entry.submissions >= MIN_SUBMISSIONS_FOR_SIGNAL)
    .map((entry) => ({
      tag: entry.tag,
      submissions: entry.submissions,
      accepted: entry.accepted,
      problems: entry.problemIds.size,
      accuracy: Math.round((entry.accepted / entry.submissions) * 100),
    }))
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 5);
};

/* ------------------------------------------------------------------ faculty */

export const getFacultyDashboard = async (req, res) => {
  const facultyId = req.user.id;

  try {
    const offerings = await db.courseOffering.findMany({
      where: { facultyId },
      select: {
        id: true,
        term: true,
        batch: {
          select: {
            id: true,
            name: true,
            _count: { select: { members: true } },
            members: { select: { userId: true } },
          },
        },
        subject: { select: { id: true, name: true, code: true } },
        assignments: {
          select: {
            id: true,
            title: true,
            status: true,
            dueAt: true,
            publishAt: true,
            problems: { select: { problemId: true } },
          },
        },
      },
      orderBy: [{ term: "desc" }, { createdAt: "desc" }],
    });

    const allProblemIds = [
      ...new Set(
        offerings.flatMap((offering) =>
          offering.assignments.flatMap((a) =>
            a.problems.map((p) => p.problemId),
          ),
        ),
      ),
    ];
    const allStudentIds = [
      ...new Set(
        offerings.flatMap((offering) =>
          offering.batch.members.map((m) => m.userId),
        ),
      ),
    ];

    const submissions =
      allProblemIds.length === 0 || allStudentIds.length === 0
        ? []
        : await db.submission.findMany({
            where: {
              problemId: { in: allProblemIds },
              userId: { in: allStudentIds },
              status: PRACTICAL_SUBMITTED,
            },
            select: { userId: true, problemId: true, createdAt: true },
          });

    // userId -> Set(problemId) delivered
    const delivered = new Map();
    for (const submission of submissions) {
      if (!delivered.has(submission.userId)) {
        delivered.set(submission.userId, new Set());
      }
      delivered.get(submission.userId).add(submission.problemId);
    }

    const now = new Date();
    const upcomingDeadlines = [];
    let totalDrafts = 0;
    let totalPublished = 0;

    const sections = offerings.map((offering) => {
      const studentIds = offering.batch.members.map((m) => m.userId);
      const published = offering.assignments.filter(
        (a) => a.status === AssignmentStatus.PUBLISHED,
      );
      const drafts = offering.assignments.filter(
        (a) => a.status === AssignmentStatus.DRAFT,
      );

      totalDrafts += drafts.length;
      totalPublished += published.length;

      const assignmentStats = published.map((assignment) => {
        const problemIds = assignment.problems.map((p) => p.problemId);

        let complete = 0;
        let started = 0;
        for (const studentId of studentIds) {
          const mine = delivered.get(studentId);
          const count = problemIds.filter((id) => mine?.has(id)).length;
          if (count > 0) started += 1;
          if (problemIds.length > 0 && count === problemIds.length) complete += 1;
        }

        const stat = {
          id: assignment.id,
          title: assignment.title,
          dueAt: assignment.dueAt,
          problemCount: problemIds.length,
          students: studentIds.length,
          started,
          complete,
          completionRate:
            studentIds.length === 0
              ? 0
              : Math.round((complete / studentIds.length) * 100),
        };

        const unfinished = stat.complete < studentIds.length;
        if (assignment.dueAt && (assignment.dueAt >= now || unfinished)) {
          upcomingDeadlines.push({
            ...stat,
            sectionName: offering.batch.name,
            subjectCode: offering.subject.code,
            isOverdue: assignment.dueAt < now && unfinished,
          });
        }

        return stat;
      });

      // Averaged across the section's published assignments.
      const completionRate =
        assignmentStats.length === 0
          ? 0
          : Math.round(
              assignmentStats.reduce((sum, a) => sum + a.completionRate, 0) /
                assignmentStats.length,
            );

      return {
        offeringId: offering.id,
        term: offering.term,
        subject: offering.subject,
        batch: {
          id: offering.batch.id,
          name: offering.batch.name,
          memberCount: offering.batch._count.members,
        },
        draftCount: drafts.length,
        publishedCount: published.length,
        completionRate,
        assignments: assignmentStats,
      };
    });

    upcomingDeadlines.sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));

    res.status(200).json({
      success: true,
      message: "Dashboard fetched successfully",
      dashboard: {
        totals: {
          sections: offerings.length,
          students: allStudentIds.length,
          drafts: totalDrafts,
          published: totalPublished,
        },
        sections,
        upcomingDeadlines: upcomingDeadlines.slice(0, 5),
        activity: buildDailySeries(
          submissions.map((s) => s.createdAt),
          30,
          now,
        ),
      },
    });
  } catch (error) {
    console.error("Error building faculty dashboard:", error);
    res.status(500).json({ error: "Failed to build dashboard" });
  }
};

/* -------------------------------------------------------------------- admin */

export const getAdminDashboard = async (req, res) => {
  try {
    const [
      students,
      faculty,
      admins,
      batches,
      offerings,
      problems,
      subjects,
      assignments,
      enrolledStudents,
      submissionDates,
      recentOfferings,
    ] = await Promise.all([
      db.user.count({ where: { role: UserRole.USER } }),
      db.user.count({ where: { role: UserRole.FACULTY } }),
      db.user.count({ where: { role: UserRole.ADMIN } }),
      db.batch.count(),
      db.courseOffering.count(),
      db.problem.count(),
      db.subject.count(),
      db.assignment.groupBy({ by: ["status"], _count: { _all: true } }),
      db.batchMember.findMany({ select: { userId: true }, distinct: ["userId"] }),
      db.submission.findMany({
        where: {
          createdAt: { gte: new Date(Date.now() - 30 * 86400000) },
        },
        select: { createdAt: true },
      }),
      db.courseOffering.findMany({
        select: {
          id: true,
          term: true,
          createdAt: true,
          faculty: { select: { name: true, email: true } },
          batch: { select: { name: true } },
          subject: { select: { name: true, code: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    // Health checks: the states that silently stop students seeing any work.
    const [sectionsWithoutFaculty, emptySections, unprovisioned] =
      await Promise.all([
        db.batch.findMany({
          where: { offerings: { none: {} } },
          select: {
            id: true,
            name: true,
            _count: { select: { members: true } },
          },
        }),
        db.batch.findMany({
          where: { members: { none: {} } },
          select: { id: true, name: true },
        }),
        db.user.count({
          where: { role: UserRole.USER, provisionedByAdmin: false },
        }),
      ]);

    const assignmentCounts = { DRAFT: 0, PUBLISHED: 0 };
    for (const row of assignments) {
      assignmentCounts[row.status] = row._count._all;
    }

    res.status(200).json({
      success: true,
      message: "Dashboard fetched successfully",
      dashboard: {
        totals: {
          students,
          faculty,
          admins,
          batches,
          offerings,
          problems,
          subjects,
          assignmentsDraft: assignmentCounts.DRAFT,
          assignmentsPublished: assignmentCounts.PUBLISHED,
          enrolledStudents: enrolledStudents.length,
          unenrolledStudents: Math.max(0, students - enrolledStudents.length),
        },
        health: {
          sectionsWithoutFaculty: sectionsWithoutFaculty.map((batch) => ({
            id: batch.id,
            name: batch.name,
            memberCount: batch._count.members,
          })),
          emptySections,
          selfRegisteredStudents: unprovisioned,
        },
        activity: buildDailySeries(
          submissionDates.map((s) => s.createdAt),
          30,
        ),
        recentOfferings,
      },
    });
  } catch (error) {
    console.error("Error building admin dashboard:", error);
    res.status(500).json({ error: "Failed to build dashboard" });
  }
};
