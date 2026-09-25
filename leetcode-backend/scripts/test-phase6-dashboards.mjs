import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/index.js";
import { computeStreaks, buildHeatmap } from "../src/libs/activity.js";

const BASE = "http://localhost:8000/api/v1";

const PREFIX = "IU234123";
const SECTION = "PHASE6-A";
const ORPHAN_SECTION = "PHASE6-ORPHAN";
const SUBJECT_CODE = "PHASE6-SUB";
const TERM = "2099-P6";

const FACULTY = "phase6.faculty@iite.indusuni.ac.in";
const STUDENT = "IU2399900101";
const PASSWORD = "Phase6Password!24";

const DAY = 86400000;

const prisma = new PrismaClient();

let failures = 0;

function check(label, condition, detail) {
  console.log(`${condition ? "PASS" : "FAIL"}  ${label}`);
  if (!condition) {
    failures += 1;
    if (detail !== undefined) console.log("        got:", JSON.stringify(detail));
  }
}

function cookieFrom(res) {
  const setCookie = res.headers.getSetCookie?.() || [];
  return setCookie.map((c) => c.split(";")[0]).join("; ");
}

async function login(identifier, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password }),
  });
  return { status: res.status, data: await res.json(), cookie: cookieFrom(res) };
}

async function call(method, path, cookie, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: res.status, data: await res.json() };
}

async function cleanup() {
  await prisma.batch.deleteMany({
    where: { enrollmentPrefix: PREFIX, name: { in: [SECTION, ORPHAN_SECTION] } },
  });
  await prisma.subject.deleteMany({ where: { code: SUBJECT_CODE } });
  await prisma.user.deleteMany({ where: { email: FACULTY } });
  await prisma.user.deleteMany({ where: { enrollmentNo: STUDENT } });
}

async function makeUser({ name, email, enrollmentNo, role }) {
  return prisma.user.create({
    data: {
      name,
      email,
      enrollmentNo,
      password: await bcrypt.hash(PASSWORD, 10),
      role,
      mustChangePassword: false,
      provisionedByAdmin: true,
    },
    select: { id: true },
  });
}

/** Local midnight `offset` days ago, plus 10:00 so the day bucket is unambiguous. */
function daysAgo(offset) {
  const date = new Date();
  date.setHours(10, 0, 0, 0);
  return new Date(date.getTime() - offset * DAY);
}

async function seedFixture() {
  const faculty = await makeUser({
    name: "Phase 6 Faculty",
    email: FACULTY,
    role: "FACULTY",
  });
  const student = await makeUser({
    name: "Phase 6 Student",
    email: "phase6.student@example.com",
    enrollmentNo: STUDENT,
    role: "USER",
  });

  const batch = await prisma.batch.create({
    data: {
      name: SECTION,
      enrollmentPrefix: PREFIX,
      serialStart: 101,
      serialEnd: 105,
      members: { create: [{ userId: student.id }] },
    },
  });

  // A section with no faculty allocated: the admin dashboard must flag it.
  const orphan = await prisma.batch.create({
    data: {
      name: ORPHAN_SECTION,
      enrollmentPrefix: PREFIX,
      serialStart: 106,
      serialEnd: 110,
    },
  });

  const subject = await prisma.subject.create({
    data: {
      name: "Phase 6 Subject",
      code: SUBJECT_CODE,
      units: { create: [{ title: "Unit 1", order: 1 }] },
    },
    include: { units: true },
  });

  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    select: { id: true },
  });

  const makeProblem = ({ title, unitId, type, tags }) =>
    prisma.problem.create({
      data: {
        title,
        description: "Print something useful.",
        difficulty: "EASY",
        tags,
        userId: admin.id,
        examples: {},
        constraints: "None",
        testCases: [],
        codeSnippets: { PYTHON: "# your code" },
        referenceSolution: { PYTHON: "print(1)" },
        unitId,
        type,
        executionMode: type === "PRACTICAL" ? "JUDGE0_RUN" : "JUDGE0_GRADE",
      },
      select: { id: true, title: true },
    });

  const practical1 = await makeProblem({
    title: "Phase 6 Practical 1",
    unitId: subject.units[0].id,
    type: "PRACTICAL",
    tags: ["phase6"],
  });
  const practical2 = await makeProblem({
    title: "Phase 6 Practical 2",
    unitId: subject.units[0].id,
    type: "PRACTICAL",
    tags: ["phase6"],
  });
  const practice = await makeProblem({
    title: "Phase 6 Practice",
    unitId: null,
    type: "PRACTICE",
    tags: ["phase6-graphs"],
  });

  const offering = await prisma.courseOffering.create({
    data: {
      facultyId: faculty.id,
      batchId: batch.id,
      subjectId: subject.id,
      term: TERM,
      assignedById: admin.id,
    },
  });

  const assignment = await prisma.assignment.create({
    data: {
      offeringId: offering.id,
      title: "Phase 6 Assignment",
      status: "PUBLISHED",
      publishAt: daysAgo(3),
      dueAt: new Date(Date.now() + 7 * DAY),
      problems: {
        create: [
          { problemId: practical1.id, order: 1 },
          { problemId: practical2.id, order: 2 },
        ],
      },
    },
  });

  // Practical submissions on three consecutive days ending today, plus one old
  // day. Expected streak: current 3, longest 3, 4 active days.
  const submission = (problemId, status, createdAt) =>
    prisma.submission.create({
      data: {
        userId: student.id,
        problemId,
        sourceCode: { code: "print(1)" },
        language: "PYTHON",
        status,
        createdAt,
      },
    });

  for (const offset of [0, 1, 2, 10]) {
    await submission(practical1.id, "SUBMITTED", daysAgo(offset));
  }

  // Practice attempts, all on one old day so they cannot shift the streak.
  // 1 accepted of 4 => the tag should surface as a 25% focus area.
  await submission(practice.id, "Accepted", daysAgo(10));
  for (let i = 0; i < 3; i += 1) {
    await submission(practice.id, "Wrong Answer", daysAgo(10));
  }

  await prisma.problemSolved.createMany({
    data: [
      { userId: student.id, problemId: practical1.id },
      { userId: student.id, problemId: practice.id },
    ],
  });

  return {
    faculty,
    student,
    batch,
    orphan,
    offering,
    assignment,
    practical1,
    practical2,
    practice,
  };
}

function unitTests() {
  console.log("--- streak maths ---");

  const key = (offset) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    return new Date(date.getTime() - offset * DAY);
  };

  const empty = computeStreaks([]);
  check(
    "no activity means no streak",
    empty.current === 0 && empty.longest === 0 && empty.activeDays === 0,
    empty,
  );

  const three = computeStreaks([key(0), key(1), key(2)]);
  check("three consecutive days count as a streak of 3", three.current === 3, three);

  const endedYesterday = computeStreaks([key(1), key(2)]);
  check(
    "a run ending yesterday is still live",
    endedYesterday.current === 2,
    endedYesterday,
  );

  const stale = computeStreaks([key(3), key(4), key(5)]);
  check(
    "a run that ended two days ago is broken but remembered",
    stale.current === 0 && stale.longest === 3,
    stale,
  );

  const duplicates = computeStreaks([key(0), key(0), key(0)]);
  check(
    "several submissions in one day count once",
    duplicates.current === 1 && duplicates.activeDays === 1,
    duplicates,
  );

  const gapped = computeStreaks([key(0), key(1), key(5), key(6), key(7), key(8)]);
  check(
    "longest streak is found away from today",
    gapped.current === 2 && gapped.longest === 4,
    gapped,
  );

  const heatmap = buildHeatmap([key(0), key(0), key(2)], 10);
  check("heatmap is zero-filled to the requested length", heatmap.length === 10, heatmap.length);
  check(
    "heatmap ends on today and counts repeats",
    heatmap[9].count === 2 && heatmap[7].count === 1 && heatmap[8].count === 0,
    heatmap.slice(-3),
  );
}

async function main() {
  await cleanup();
  const fx = await seedFixture();

  unitTests();

  const student = (await login(STUDENT, PASSWORD)).cookie;
  const faculty = (await login(FACULTY, PASSWORD)).cookie;
  const admin = (await login("admin@leetlab.com", "admin123")).cookie;

  console.log("--- student dashboard ---");
  const sd = await call("GET", "/dashboard/student", student);
  check("student dashboard loads", sd.status === 200, sd.data);

  const d = sd.data.dashboard ?? {};
  check(
    "solved totals split practice and practical",
    d.solved?.total === 2 && d.solved?.practice === 1 && d.solved?.practical === 1,
    d.solved,
  );
  check(
    "difficulty buckets report solved against the catalogue",
    d.solved?.byDifficulty?.EASY?.solved === 2 &&
      d.solved?.byDifficulty?.EASY?.total >= 2,
    d.solved?.byDifficulty,
  );
  check(
    "streak reflects three consecutive days",
    d.streak?.current === 3 && d.streak?.longest === 3 && d.streak?.activeDays === 4,
    d.streak,
  );
  check("heatmap covers a year", d.heatmap?.length === 365, d.heatmap?.length);
  check(
    "today's heatmap cell counts the submission",
    d.heatmap?.[364]?.count === 1,
    d.heatmap?.slice(-2),
  );
  check("every submission is counted", d.totalSubmissions === 8, d.totalSubmissions);
  check(
    "the partly-finished assignment is pending, not overdue",
    d.assignments?.pending === 1 && d.assignments?.overdue === 0,
    d.assignments,
  );

  const upcoming = d.assignments?.upcoming?.[0];
  check(
    "pending assignment reports 1 of 2 problems submitted",
    upcoming?.problemCount === 2 &&
      upcoming?.submittedCount === 1 &&
      upcoming?.isComplete === false,
    upcoming,
  );
  check(
    "recent submissions are newest-first and flag success",
    d.recentSubmissions?.length === 8 && d.recentSubmissions?.[0]?.succeeded === true,
    d.recentSubmissions?.slice(0, 2),
  );
  check(
    "subject progress counts practicals in the student's subject",
    d.subjectProgress?.some(
      (s) => s.code === SUBJECT_CODE && s.total === 2 && s.solved === 1,
    ),
    d.subjectProgress,
  );
  check(
    "the student's section is listed",
    d.sections?.some((s) => s.name === SECTION),
    d.sections,
  );

  const focus = d.focusAreas?.find((f) => f.tag === "phase6-graphs");
  check(
    "weak practice tag surfaces with its accuracy",
    focus?.accuracy === 25 && focus?.submissions === 4 && focus?.problems === 1,
    focus,
  );
  check(
    "practicals are excluded from focus areas",
    !d.focusAreas?.some((f) => f.tag === "phase6"),
    d.focusAreas,
  );

  console.log("--- faculty dashboard ---");
  const fd = await call("GET", "/dashboard/faculty", faculty);
  check("faculty dashboard loads", fd.status === 200, fd.data);

  const f = fd.data.dashboard ?? {};
  check(
    "faculty totals cover their own sections only",
    f.totals?.sections === 1 &&
      f.totals?.students === 1 &&
      f.totals?.published === 1 &&
      f.totals?.drafts === 0,
    f.totals,
  );

  const section = f.sections?.[0];
  check(
    "section reports the allocated subject and batch",
    section?.subject?.code === SUBJECT_CODE && section?.batch?.name === SECTION,
    section,
  );

  const stat = section?.assignments?.[0];
  check(
    "a student who submitted one of two problems counts as started, not complete",
    stat?.students === 1 &&
      stat?.started === 1 &&
      stat?.complete === 0 &&
      stat?.completionRate === 0,
    stat,
  );
  check(
    "the open deadline appears in the upcoming list",
    f.upcomingDeadlines?.some((item) => item.id === fx.assignment.id),
    f.upcomingDeadlines,
  );
  check("faculty activity series covers 30 days", f.activity?.length === 30, f.activity?.length);

  console.log("--- admin dashboard ---");
  const ad = await call("GET", "/dashboard/admin", admin);
  check("admin dashboard loads", ad.status === 200, ad.data);

  const a = ad.data.dashboard ?? {};
  check(
    "platform totals are populated",
    a.totals?.students >= 1 &&
      a.totals?.faculty >= 1 &&
      a.totals?.batches >= 2 &&
      a.totals?.assignmentsPublished >= 1,
    a.totals,
  );
  check(
    "enrolled and unenrolled students add up",
    a.totals?.enrolledStudents + a.totals?.unenrolledStudents === a.totals?.students,
    a.totals,
  );
  check(
    "a section with no faculty is flagged",
    a.health?.sectionsWithoutFaculty?.some((b) => b.id === fx.orphan.id),
    a.health?.sectionsWithoutFaculty,
  );
  check(
    "a section with faculty is not flagged",
    !a.health?.sectionsWithoutFaculty?.some((b) => b.id === fx.batch.id),
    a.health?.sectionsWithoutFaculty,
  );
  check(
    "the empty section is flagged as having no members",
    a.health?.emptySections?.some((b) => b.id === fx.orphan.id),
    a.health?.emptySections,
  );
  check("admin activity series covers 30 days", a.activity?.length === 30, a.activity?.length);
  check(
    "recent allocations are listed",
    a.recentOfferings?.some((o) => o.id === fx.offering.id),
    a.recentOfferings?.map((o) => o.id),
  );

  console.log("--- role scoping ---");
  const studentOnAdmin = await call("GET", "/dashboard/admin", student);
  check("student cannot read the admin dashboard", studentOnAdmin.status === 403, studentOnAdmin.data);

  const studentOnFaculty = await call("GET", "/dashboard/faculty", student);
  check(
    "student cannot read the faculty dashboard",
    studentOnFaculty.status === 403,
    studentOnFaculty.data,
  );

  const facultyOnAdmin = await call("GET", "/dashboard/admin", faculty);
  check("faculty cannot read the admin dashboard", facultyOnAdmin.status === 403, facultyOnAdmin.data);

  const anonymous = await call("GET", "/dashboard/student", undefined);
  check("dashboards require a session", anonymous.status === 401, anonymous.data);

  console.log("--- isolation ---");
  const facultyAsStudent = await call("GET", "/dashboard/student", faculty);
  check(
    "a faculty member's own student view is empty, not another user's",
    facultyAsStudent.status === 200 &&
      facultyAsStudent.data.dashboard?.solved?.total === 0 &&
      facultyAsStudent.data.dashboard?.assignments?.total === 0,
    facultyAsStudent.data.dashboard?.solved,
  );

  await cleanup();

  console.log(
    failures === 0
      ? "\nAll dashboard checks passed."
      : `\n${failures} check(s) failed.`,
  );
  await prisma.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (error) => {
  console.error(error);
  await cleanup().catch(() => {});
  await prisma.$disconnect();
  process.exit(1);
});
