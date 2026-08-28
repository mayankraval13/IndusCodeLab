import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/index.js";

const BASE = "http://localhost:8000/api/v1";

const PREFIX = "IU234123";
const SECTION_A = "PHASE5-A";
const SECTION_B = "PHASE5-B";
const SUBJECT_CODE = "PHASE5-SUB";
const OTHER_SUBJECT_CODE = "PHASE5-OTHER";
const TERM = "2099-P5";

const FACULTY_A = "phase5.faculty.a@iite.indusuni.ac.in";
const FACULTY_B = "phase5.faculty.b@iite.indusuni.ac.in";
const STUDENT_A = "IU2399900001";
const STUDENT_B = "IU2399900002";
const PASSWORD = "Phase5Password!24";

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
    where: { enrollmentPrefix: PREFIX, name: { in: [SECTION_A, SECTION_B] } },
  });
  await prisma.subject.deleteMany({
    where: { code: { in: [SUBJECT_CODE, OTHER_SUBJECT_CODE] } },
  });
  await prisma.user.deleteMany({
    where: { email: { in: [FACULTY_A, FACULTY_B] } },
  });
  await prisma.user.deleteMany({
    where: { enrollmentNo: { in: [STUDENT_A, STUDENT_B] } },
  });
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
    },
    select: { id: true },
  });
}

async function seedFixture() {
  const facultyA = await makeUser({
    name: "Phase 5 Faculty A",
    email: FACULTY_A,
    role: "FACULTY",
  });
  const facultyB = await makeUser({
    name: "Phase 5 Faculty B",
    email: FACULTY_B,
    role: "FACULTY",
  });
  const studentA = await makeUser({
    name: "Phase 5 Student A",
    email: "phase5.student.a@example.com",
    enrollmentNo: STUDENT_A,
    role: "USER",
  });
  const studentB = await makeUser({
    name: "Phase 5 Student B",
    email: "phase5.student.b@example.com",
    enrollmentNo: STUDENT_B,
    role: "USER",
  });

  const batchA = await prisma.batch.create({
    data: {
      name: SECTION_A,
      enrollmentPrefix: PREFIX,
      serialStart: 1,
      serialEnd: 5,
      members: { create: [{ userId: studentA.id }] },
    },
  });
  const batchB = await prisma.batch.create({
    data: {
      name: SECTION_B,
      enrollmentPrefix: PREFIX,
      serialStart: 6,
      serialEnd: 10,
      members: { create: [{ userId: studentB.id }] },
    },
  });

  // Two subjects, each with a unit and a practical, so cross-subject leakage
  // has something real to be caught against.
  const subject = await prisma.subject.create({
    data: {
      name: "Phase 5 Subject",
      code: SUBJECT_CODE,
      units: { create: [{ title: "Unit 1", order: 1 }] },
    },
    include: { units: true },
  });
  const otherSubject = await prisma.subject.create({
    data: {
      name: "Phase 5 Other Subject",
      code: OTHER_SUBJECT_CODE,
      units: { create: [{ title: "Unit 1", order: 1 }] },
    },
    include: { units: true },
  });

  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    select: { id: true },
  });

  const makeProblem = (title, unitId) =>
    prisma.problem.create({
      data: {
        title,
        description: "Print something useful.",
        difficulty: "EASY",
        tags: ["phase5"],
        userId: admin.id,
        examples: {},
        constraints: "None",
        testCases: [],
        codeSnippets: { PYTHON: "# your code" },
        referenceSolution: { PYTHON: "print(1)" },
        unitId,
        type: "PRACTICAL",
        executionMode: "JUDGE0_RUN",
      },
      select: { id: true, title: true },
    });

  const problem1 = await makeProblem("Phase 5 Practical 1", subject.units[0].id);
  const problem2 = await makeProblem("Phase 5 Practical 2", subject.units[0].id);
  // Reserved for the scheduled assignment only. If it also appeared in an open
  // assignment the student would legitimately be allowed to submit it.
  const problem3 = await makeProblem("Phase 5 Practical 3", subject.units[0].id);
  const foreignProblem = await makeProblem(
    "Phase 5 Foreign Practical",
    otherSubject.units[0].id,
  );

  const offeringA = await prisma.courseOffering.create({
    data: {
      facultyId: facultyA.id,
      batchId: batchA.id,
      subjectId: subject.id,
      term: TERM,
      assignedById: admin.id,
    },
  });
  const offeringB = await prisma.courseOffering.create({
    data: {
      facultyId: facultyB.id,
      batchId: batchB.id,
      subjectId: subject.id,
      term: TERM,
      assignedById: admin.id,
    },
  });

  return {
    facultyA,
    facultyB,
    studentA,
    studentB,
    offeringA,
    offeringB,
    problem1,
    problem2,
    problem3,
    foreignProblem,
  };
}

async function main() {
  await cleanup();
  const fx = await seedFixture();

  const facultyA = (await login(FACULTY_A, PASSWORD)).cookie;
  const facultyB = (await login(FACULTY_B, PASSWORD)).cookie;
  const studentA = (await login(STUDENT_A, PASSWORD)).cookie;
  const studentB = (await login(STUDENT_B, PASSWORD)).cookie;
  const admin = (await login("admin@leetlab.com", "admin123")).cookie;

  console.log("--- assignable problems are scoped to the subject ---");
  const assignable = await call(
    "GET",
    `/faculty/offerings/${fx.offeringA.id}/problems`,
    facultyA,
  );
  check("faculty lists assignable practicals", assignable.status === 200, assignable.data);
  check(
    "only this subject's practicals are offered",
    assignable.data.problems?.some((p) => p.id === fx.problem1.id) &&
      !assignable.data.problems?.some((p) => p.id === fx.foreignProblem.id),
    assignable.data.problems?.map((p) => p.title),
  );

  const crossOffering = await call(
    "GET",
    `/faculty/offerings/${fx.offeringA.id}/problems`,
    facultyB,
  );
  check(
    "faculty B cannot read faculty A's allocation",
    crossOffering.status === 404,
    crossOffering.data,
  );

  console.log("\n--- creation and validation ---");
  const noTitle = await call("POST", "/faculty/assignments", facultyA, {
    offeringId: fx.offeringA.id,
  });
  check("rejects a missing title", noTitle.status === 400, noTitle.data);

  const badDate = await call("POST", "/faculty/assignments", facultyA, {
    offeringId: fx.offeringA.id,
    title: "Bad date",
    dueAt: "not-a-date",
  });
  check("rejects an unparseable dueAt", badDate.status === 400, badDate.data);

  const foreignProblemAttempt = await call(
    "POST",
    "/faculty/assignments",
    facultyA,
    {
      offeringId: fx.offeringA.id,
      title: "Cross-subject attempt",
      problemIds: [fx.foreignProblem.id],
    },
  );
  check(
    "refuses a problem from another subject",
    foreignProblemAttempt.status === 400,
    foreignProblemAttempt.data,
  );

  const stealOffering = await call("POST", "/faculty/assignments", facultyB, {
    offeringId: fx.offeringA.id,
    title: "Assignment on someone else's section",
    problemIds: [fx.problem1.id],
  });
  check(
    "faculty B cannot create work on faculty A's section",
    stealOffering.status === 404,
    stealOffering.data,
  );

  const created = await call("POST", "/faculty/assignments", facultyA, {
    offeringId: fx.offeringA.id,
    title: "Loops and conditionals",
    description: "Complete both practicals in the lab.",
    problemIds: [fx.problem1.id, fx.problem2.id],
    dueAt: new Date(Date.now() + 7 * 864e5).toISOString(),
  });
  check("draft is created", created.status === 201, created.data);
  check("draft starts unpublished", created.data.assignment?.status === "DRAFT", created.data.assignment?.status);
  check(
    "problems are attached in order",
    created.data.assignment?.problems?.length === 2,
    created.data.assignment?.problems,
  );
  const assignmentId = created.data.assignment?.id;

  console.log("\n--- a draft is invisible to students ---");
  const draftForStudent = await call("GET", `/assignments/${assignmentId}`, studentA);
  check(
    "the student in the section cannot read the draft",
    draftForStudent.status === 404,
    draftForStudent.data,
  );

  const draftInList = await call("GET", "/assignments", studentA);
  check(
    "and it is absent from their list",
    !draftInList.data.assignments?.some((a) => a.id === assignmentId),
    draftInList.data.assignments,
  );

  console.log("\n--- cross-faculty access on a specific assignment ---");
  for (const [label, path, method, body] of [
    ["read", `/faculty/assignments/${assignmentId}`, "GET", undefined],
    ["edit", `/faculty/assignments/${assignmentId}`, "PATCH", { title: "Hijacked" }],
    ["publish", `/faculty/assignments/${assignmentId}/publish`, "POST", {}],
    ["roster", `/faculty/assignments/${assignmentId}/roster`, "GET", undefined],
    ["delete", `/faculty/assignments/${assignmentId}`, "DELETE", undefined],
  ]) {
    const attempt = await call(method, path, facultyB, body);
    check(`faculty B cannot ${label} it`, attempt.status === 404, attempt.data);
  }

  const stillOwned = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    select: { title: true, status: true },
  });
  check(
    "none of that changed the assignment",
    stillOwned?.title === "Loops and conditionals" && stillOwned?.status === "DRAFT",
    stillOwned,
  );

  console.log("\n--- students and admins cannot use faculty routes ---");
  const studentOnFaculty = await call("GET", "/faculty/assignments", studentA);
  check("student is refused", studentOnFaculty.status === 403, studentOnFaculty.data);
  const adminOnFaculty = await call("GET", "/faculty/assignments", admin);
  check("admin is refused", adminOnFaculty.status === 403, adminOnFaculty.data);
  const anonOnStudent = await call("GET", "/assignments", null);
  check("anonymous is refused", anonOnStudent.status === 401, anonOnStudent.data);

  console.log("\n--- publishing ---");
  const emptyDraft = await call("POST", "/faculty/assignments", facultyA, {
    offeringId: fx.offeringA.id,
    title: "Empty draft",
  });
  const publishEmpty = await call(
    "POST",
    `/faculty/assignments/${emptyDraft.data.assignment.id}/publish`,
    facultyA,
    {},
  );
  check(
    "refuses to publish with no problems",
    publishEmpty.status === 400,
    publishEmpty.data,
  );

  const unreadBefore = await call("GET", "/notifications/unread-count", studentA);
  const unreadBeforeB = await call("GET", "/notifications/unread-count", studentB);

  const published = await call(
    "POST",
    `/faculty/assignments/${assignmentId}/publish`,
    facultyA,
    {},
  );
  check("publishes successfully", published.status === 200, published.data);
  check(
    "notified exactly the one student in the section",
    published.data.notified === 1,
    published.data.notified,
  );

  const republish = await call(
    "POST",
    `/faculty/assignments/${assignmentId}/publish`,
    facultyA,
    {},
  );
  check("cannot publish twice", republish.status === 409, republish.data);

  const unreadAfter = await call("GET", "/notifications/unread-count", studentA);
  check(
    "student A's badge went up",
    unreadAfter.data.count === unreadBefore.data.count + 1,
    { before: unreadBefore.data.count, after: unreadAfter.data.count },
  );
  const unreadAfterB = await call("GET", "/notifications/unread-count", studentB);
  check(
    "student B in another section was not notified",
    unreadAfterB.data.count === unreadBeforeB.data.count,
    { before: unreadBeforeB.data.count, after: unreadAfterB.data.count },
  );

  const notifications = await call("GET", "/notifications", studentA);
  const assignmentNote = notifications.data.notifications?.find(
    (n) => n.type === "ASSIGNMENT_PUBLISHED",
  );
  check(
    "the notification deep-links to the assignment",
    assignmentNote?.linkUrl === `/assignments/${assignmentId}`,
    assignmentNote?.linkUrl,
  );

  console.log("\n--- published problem set is frozen ---");
  const editProblems = await call(
    "PATCH",
    `/faculty/assignments/${assignmentId}`,
    facultyA,
    { problemIds: [fx.problem1.id] },
  );
  check(
    "problems cannot change after publishing",
    editProblems.status === 409,
    editProblems.data,
  );

  const editMeta = await call(
    "PATCH",
    `/faculty/assignments/${assignmentId}`,
    facultyA,
    { description: "Bring your lab notebook." },
  );
  check("but metadata still can", editMeta.status === 200, editMeta.data);

  const deletePublished = await call(
    "DELETE",
    `/faculty/assignments/${assignmentId}`,
    facultyA,
  );
  check(
    "published assignments cannot be deleted",
    deletePublished.status === 409,
    deletePublished.data,
  );

  console.log("\n--- student visibility across sections ---");
  const visibleToA = await call("GET", `/assignments/${assignmentId}`, studentA);
  check("student A can now read it", visibleToA.status === 200, visibleToA.data);
  check(
    "and sees the problems",
    visibleToA.data.assignment?.problems?.length === 2,
    visibleToA.data.assignment?.problems?.length,
  );

  const visibleToB = await call("GET", `/assignments/${assignmentId}`, studentB);
  check(
    "student B in section B cannot read section A's assignment",
    visibleToB.status === 404,
    visibleToB.data,
  );

  const listB = await call("GET", "/assignments", studentB);
  check(
    "and it is absent from their list too",
    !listB.data.assignments?.some((a) => a.id === assignmentId),
    listB.data.assignments,
  );

  const facultyBAsStudent = await call("GET", "/assignments", facultyB);
  check(
    "a faculty member has no student assignments",
    facultyBAsStudent.data.assignments?.length === 0,
    facultyBAsStudent.data.assignments,
  );

  console.log("\n--- scheduled publishing hides the problems ---");
  const scheduledDraft = await call("POST", "/faculty/assignments", facultyA, {
    offeringId: fx.offeringA.id,
    title: "Opens next week",
    problemIds: [fx.problem3.id],
  });
  const scheduledId = scheduledDraft.data.assignment.id;
  const future = new Date(Date.now() + 5 * 864e5).toISOString();
  const scheduled = await call(
    "POST",
    `/faculty/assignments/${scheduledId}/publish`,
    facultyA,
    { publishAt: future },
  );
  check("can publish with a future open date", scheduled.status === 200, scheduled.data);

  const scheduledForStudent = await call(
    "GET",
    `/assignments/${scheduledId}`,
    studentA,
  );
  check(
    "the student sees it is coming",
    scheduledForStudent.status === 200 &&
      scheduledForStudent.data.assignment?.isOpen === false,
    scheduledForStudent.data.assignment,
  );
  check(
    "but the problems are withheld",
    scheduledForStudent.data.assignment?.problems?.length === 0,
    scheduledForStudent.data.assignment?.problems,
  );

  const earlySubmit = await call("POST", "/execute/submit", studentA, {
    problemId: fx.problem3.id,
    code: "print('early')",
    language: "PYTHON",
  });
  check(
    "and submitting to an unopened practical is refused",
    earlySubmit.status === 403 && earlySubmit.data.code === "SUBMISSION_CLOSED",
    earlySubmit.data,
  );

  // A problem that is also live in an open assignment must stay submittable —
  // a future-dated assignment elsewhere should not retroactively lock it.
  const stillOpenElsewhere = await call("POST", "/execute/submit", studentA, {
    problemId: fx.problem1.id,
    code: "print('still open')",
    language: "PYTHON",
  });
  check(
    "a problem open under another assignment is still submittable",
    stillOpenElsewhere.status === 201,
    stillOpenElsewhere.data,
  );

  console.log("\n--- deadline gating ---");
  // problem2 is only in the open assignment, so it is a clean subject for the
  // deadline tests without the scheduled assignment interfering.
  const onTime = await call("POST", "/execute/submit", studentA, {
    problemId: fx.problem2.id,
    code: "print('on time')",
    language: "PYTHON",
  });
  check("submitting before the deadline works", onTime.status === 201, onTime.data);
  check("and is not flagged late", onTime.data.isLate === false, onTime.data);
  check(
    "the response names the assignment it counted for",
    onTime.data.assignment?.id === assignmentId,
    onTime.data.assignment,
  );

  // Move the deadline into the past, late submissions still allowed.
  await prisma.assignment.update({
    where: { id: assignmentId },
    data: { dueAt: new Date(Date.now() - 864e5), allowLateSubmission: true },
  });
  const late = await call("POST", "/execute/submit", studentA, {
    problemId: fx.problem2.id,
    code: "print('late')",
    language: "PYTHON",
  });
  check("late submission is accepted when allowed", late.status === 201, late.data);
  check("and is flagged late", late.data.isLate === true, late.data);

  await prisma.assignment.update({
    where: { id: assignmentId },
    data: { allowLateSubmission: false },
  });
  const blocked = await call("POST", "/execute/submit", studentA, {
    problemId: fx.problem2.id,
    code: "print('too late')",
    language: "PYTHON",
  });
  check(
    "late submission is refused when disallowed",
    blocked.status === 403 && blocked.data.code === "SUBMISSION_CLOSED",
    blocked.data,
  );

  const storedAfterBlock = await prisma.submission.count({
    where: { userId: fx.studentA.id, problemId: fx.problem2.id },
  });
  check(
    "the refused submission was not stored",
    storedAfterBlock === 2,
    storedAfterBlock,
  );

  console.log("\n--- an unassigned practical stays free practice ---");
  const freeSubmit = await call("POST", "/execute/submit", studentB, {
    problemId: fx.foreignProblem.id,
    code: "print('free')",
    language: "PYTHON",
  });
  check(
    "a student can submit a practical nobody assigned",
    freeSubmit.status === 201,
    freeSubmit.data,
  );
  check(
    "with no assignment attached",
    freeSubmit.data.assignment === null,
    freeSubmit.data.assignment,
  );

  console.log("\n--- another section's deadline does not block a student ---");
  // Faculty B assigns the same problem to section B with an open deadline while
  // section A's copy is closed. Student B must still be able to submit.
  const bDraft = await call("POST", "/faculty/assignments", facultyB, {
    offeringId: fx.offeringB.id,
    title: "Section B copy",
    problemIds: [fx.problem2.id],
    dueAt: new Date(Date.now() + 7 * 864e5).toISOString(),
  });
  await call(
    "POST",
    `/faculty/assignments/${bDraft.data.assignment.id}/publish`,
    facultyB,
    {},
  );
  const bSubmit = await call("POST", "/execute/submit", studentB, {
    problemId: fx.problem2.id,
    code: "print('section b')",
    language: "PYTHON",
  });
  check(
    "student B submits under their own section's deadline",
    bSubmit.status === 201,
    bSubmit.data,
  );

  console.log("\n--- roster ---");
  const roster = await call(
    "GET",
    `/faculty/assignments/${assignmentId}/roster`,
    facultyA,
  );
  check("faculty reads the roster", roster.status === 200, roster.data);
  check(
    "it covers exactly the section's students",
    roster.data.roster?.length === 1 &&
      roster.data.roster[0].user.enrollmentNo === STUDENT_A,
    roster.data.roster?.map((r) => r.user.enrollmentNo),
  );
  check(
    "it counts every attempt, including the resubmission",
    roster.data.roster?.[0]?.submissionCount === 3,
    roster.data.roster?.[0],
  );
  check(
    "it reports both problems delivered",
    roster.data.roster?.[0]?.problemsSubmitted === 2 &&
      roster.data.problemCount === 2,
    roster.data.roster?.[0],
  );
  check(
    "so the student counts as complete",
    roster.data.roster?.[0]?.isComplete === true,
    roster.data.roster?.[0],
  );
  check(
    "and the summary agrees",
    roster.data.summary?.total === 1 &&
      roster.data.summary?.submitted === 1 &&
      roster.data.summary?.complete === 1,
    roster.data.summary,
  );
  check(
    "the roster never exposes submitted code",
    JSON.stringify(roster.data).includes("sourceCode") === false,
    Object.keys(roster.data.roster?.[0] ?? {}),
  );

  // The scheduled assignment has had no submissions, so it exercises the
  // opposite branch of the same aggregation.
  const emptyRoster = await call(
    "GET",
    `/faculty/assignments/${scheduledId}/roster`,
    facultyA,
  );
  check(
    "a roster with no submissions reports nobody delivered",
    emptyRoster.data.roster?.[0]?.problemsSubmitted === 0 &&
      emptyRoster.data.roster?.[0]?.isComplete === false &&
      emptyRoster.data.summary?.submitted === 0,
    emptyRoster.data.roster?.[0],
  );

  console.log("\n--- deleting a draft ---");
  const draftToDelete = emptyDraft.data.assignment.id;
  const deleted = await call(
    "DELETE",
    `/faculty/assignments/${draftToDelete}`,
    facultyA,
  );
  check("drafts can be deleted", deleted.status === 200, deleted.data);
  const goneCount = await prisma.assignment.count({
    where: { id: draftToDelete },
  });
  check("and it is really gone", goneCount === 0, goneCount);

  console.log("\n--- allocation removal cascades ---");
  await prisma.courseOffering.delete({ where: { id: fx.offeringA.id } });
  const orphaned = await prisma.assignment.count({
    where: { offeringId: fx.offeringA.id },
  });
  check("removing an allocation removes its assignments", orphaned === 0, orphaned);

  await cleanup();

  console.log(
    `\n${failures === 0 ? "All checks passed" : `${failures} check(s) failed`}`,
  );
  process.exitCode = failures === 0 ? 0 : 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
