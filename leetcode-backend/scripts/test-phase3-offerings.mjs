import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/index.js";

const BASE = "http://localhost:8000/api/v1";

const PREFIX = "IU234123";
const TEST_BATCH = "PHASE3-SEC";
const TEST_SUBJECT_CODE = "PHASE3-SUB";
const TEST_FACULTY_EMAIL = "phase3.test.faculty@iite.indusuni.ac.in";
const TEST_FACULTY_PASSWORD = "Phase3Faculty!24";
const STUDENT_ENROLLMENT = "IU2341230001";
const TERM = "2099-ODD";

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

/** Removes only what this script creates; seeded data is left alone. */
async function cleanup() {
  await prisma.batch.deleteMany({
    where: { enrollmentPrefix: PREFIX, name: TEST_BATCH },
  });
  await prisma.subject.deleteMany({ where: { code: TEST_SUBJECT_CODE } });
  await prisma.user.deleteMany({ where: { email: TEST_FACULTY_EMAIL } });
}

/** Faculty created ready to use, bypassing the temporary-password dance. */
async function createFaculty() {
  return prisma.user.create({
    data: {
      name: "Phase 3 Faculty",
      email: TEST_FACULTY_EMAIL,
      password: await bcrypt.hash(TEST_FACULTY_PASSWORD, 10),
      role: "FACULTY",
      mustChangePassword: false,
    },
    select: { id: true },
  });
}

async function settleTestStudent() {
  return prisma.user.update({
    where: { enrollmentNo: STUDENT_ENROLLMENT },
    data: {
      password: await bcrypt.hash(STUDENT_ENROLLMENT, 10),
      mustChangePassword: false,
    },
    select: { id: true },
  });
}

async function main() {
  await cleanup();

  const admin = await login("admin@leetlab.com", "admin123");
  if (admin.status !== 200) throw new Error("admin login failed");
  const adminCookie = admin.cookie;

  const faculty = await createFaculty();
  const student = await settleTestStudent();

  const batch = await prisma.batch.create({
    data: {
      name: TEST_BATCH,
      enrollmentPrefix: PREFIX,
      serialStart: 1,
      serialEnd: 10,
    },
  });
  const subject = await prisma.subject.create({
    data: { name: "Phase 3 Subject", code: TEST_SUBJECT_CODE },
  });

  const facultySession = await login(TEST_FACULTY_EMAIL, TEST_FACULTY_PASSWORD);
  check("faculty can sign in with email", facultySession.status === 200, facultySession.data);
  const facultyCookie = facultySession.cookie;

  const studentSession = await login(STUDENT_ENROLLMENT, STUDENT_ENROLLMENT);
  const studentCookie = studentSession.cookie;

  console.log("--- access control ---");
  const anonymous = await call("GET", "/admin/offerings", null);
  check("unauthenticated cannot list allocations", anonymous.status === 401, anonymous.data);

  const studentOnAdmin = await call("GET", "/admin/offerings", studentCookie);
  check("student cannot list allocations", studentOnAdmin.status === 403, studentOnAdmin.data);

  const studentOnFaculty = await call("GET", "/faculty/offerings", studentCookie);
  check(
    "student cannot reach faculty routes",
    studentOnFaculty.status === 403,
    studentOnFaculty.data
  );

  const adminOnFaculty = await call("GET", "/faculty/offerings", adminCookie);
  check(
    "admin cannot reach faculty routes either",
    adminOnFaculty.status === 403,
    adminOnFaculty.data
  );

  const anonBell = await call("GET", "/notifications/unread-count", null);
  check("unauthenticated has no bell", anonBell.status === 401, anonBell.data);

  console.log("\n--- validation ---");
  const missing = await call("POST", "/admin/offerings", adminCookie, {
    batchId: batch.id,
  });
  check("rejects a partial payload", missing.status === 400, missing.data);

  const badFaculty = await call("POST", "/admin/offerings", adminCookie, {
    facultyId: student.id,
    batchId: batch.id,
    subjectId: subject.id,
    term: TERM,
  });
  check(
    "refuses to allocate a student as faculty",
    badFaculty.status === 400,
    badFaculty.data
  );

  const unknownBatch = await call("POST", "/admin/offerings", adminCookie, {
    facultyId: faculty.id,
    batchId: "00000000-0000-0000-0000-000000000000",
    subjectId: subject.id,
    term: TERM,
  });
  check("404s on an unknown section", unknownBatch.status === 404, unknownBatch.data);

  console.log("\n--- allocation ---");
  const before = await call("GET", "/notifications/unread-count", facultyCookie);
  const unreadBefore = before.data.count ?? 0;

  const created = await call("POST", "/admin/offerings", adminCookie, {
    facultyId: faculty.id,
    batchId: batch.id,
    subjectId: subject.id,
    term: TERM,
  });
  check("admin creates the allocation", created.status === 201, created.data);
  check(
    "response carries faculty, section and subject",
    created.data.offering?.faculty?.email === TEST_FACULTY_EMAIL &&
      created.data.offering?.batch?.name === TEST_BATCH &&
      created.data.offering?.subject?.code === TEST_SUBJECT_CODE,
    created.data.offering
  );
  check(
    "records who allocated it",
    created.data.offering?.assignedBy?.email === "admin@leetlab.com",
    created.data.offering?.assignedBy
  );

  const offeringId = created.data.offering?.id;

  const duplicate = await call("POST", "/admin/offerings", adminCookie, {
    facultyId: faculty.id,
    batchId: batch.id,
    subjectId: subject.id,
    term: TERM,
  });
  check(
    "one subject per section per term",
    duplicate.status === 409,
    duplicate.data
  );

  const defaultTerm = await call("POST", "/admin/offerings", adminCookie, {
    facultyId: faculty.id,
    batchId: batch.id,
    subjectId: subject.id,
  });
  check(
    "falls back to the current term when none is given",
    defaultTerm.status === 201 && defaultTerm.data.offering?.term !== TERM,
    defaultTerm.data.offering?.term
  );
  const defaultTermId = defaultTerm.data.offering?.id;

  console.log("\n--- notifications ---");
  const after = await call("GET", "/notifications/unread-count", facultyCookie);
  check(
    "allocation raised the faculty's unread count",
    after.data.count === unreadBefore + 2,
    { before: unreadBefore, after: after.data.count }
  );

  const list = await call("GET", "/notifications", facultyCookie);
  const notification = list.data.notifications?.find(
    (n) => n.type === "COURSE_ASSIGNED_TO_FACULTY" && n.title.includes(TEST_BATCH)
  );
  check("notification is readable and typed", !!notification, list.data.notifications);
  check(
    "notification links somewhere useful",
    notification?.linkUrl === "/faculty/sections",
    notification?.linkUrl
  );
  check("notification starts unread", notification?.readAt === null, notification);

  const studentList = await call("GET", "/notifications", studentCookie);
  check(
    "the student sees none of the faculty's notifications",
    !studentList.data.notifications?.some((n) => n.id === notification?.id),
    studentList.data.notifications
  );

  const crossRead = await call(
    "PATCH",
    `/notifications/${notification?.id}/read`,
    studentCookie
  );
  check(
    "a stranger cannot mark it read",
    crossRead.status === 404,
    crossRead.data
  );
  const stillUnread = await prisma.notification.findUnique({
    where: { id: notification?.id },
    select: { readAt: true },
  });
  check("and it really is still unread", stillUnread?.readAt === null, stillUnread);

  const marked = await call(
    "PATCH",
    `/notifications/${notification?.id}/read`,
    facultyCookie
  );
  check("owner marks it read", marked.status === 200, marked.data);
  const afterRead = await call("GET", "/notifications/unread-count", facultyCookie);
  check(
    "unread count dropped by one",
    afterRead.data.count === after.data.count - 1,
    afterRead.data
  );

  const markedAgain = await call(
    "PATCH",
    `/notifications/${notification?.id}/read`,
    facultyCookie
  );
  const idempotent = await call("GET", "/notifications/unread-count", facultyCookie);
  check(
    "marking read twice is idempotent",
    markedAgain.status === 200 && idempotent.data.count === afterRead.data.count,
    idempotent.data
  );

  const readAll = await call("PATCH", "/notifications/read-all", facultyCookie);
  const zeroed = await call("GET", "/notifications/unread-count", facultyCookie);
  check(
    "mark all read clears the badge",
    readAll.status === 200 && zeroed.data.count === 0,
    zeroed.data
  );

  console.log("\n--- faculty view ---");
  const mine = await call("GET", "/faculty/offerings", facultyCookie);
  check("faculty sees their allocations", mine.status === 200, mine.data);
  check(
    "and only their own",
    mine.data.offerings?.length === 2 &&
      mine.data.offerings.every((o) => o.faculty.email === TEST_FACULTY_EMAIL),
    mine.data.offerings?.map((o) => o.faculty?.email)
  );

  const filtered = await call(
    "GET",
    `/admin/offerings?term=${TERM}`,
    adminCookie
  );
  check(
    "admin can filter by term",
    filtered.data.offerings?.every((o) => o.term === TERM),
    filtered.data.offerings?.map((o) => o.term)
  );

  console.log("\n--- removal ---");
  const studentDelete = await call(
    "DELETE",
    `/admin/offerings/${offeringId}`,
    studentCookie
  );
  check("student cannot remove an allocation", studentDelete.status === 403, studentDelete.data);

  const removed = await call("DELETE", `/admin/offerings/${offeringId}`, adminCookie);
  check("admin removes the allocation", removed.status === 200, removed.data);

  const removedAgain = await call(
    "DELETE",
    `/admin/offerings/${offeringId}`,
    adminCookie
  );
  check("removing twice 404s", removedAgain.status === 404, removedAgain.data);

  const remaining = await call("GET", "/faculty/offerings", facultyCookie);
  check(
    "faculty view reflects the removal",
    remaining.data.offerings?.length === 1 &&
      remaining.data.offerings[0].id === defaultTermId,
    remaining.data.offerings?.map((o) => o.id)
  );

  // Deleting the section must take its allocations with it.
  await prisma.batch.delete({ where: { id: batch.id } });
  const orphaned = await prisma.courseOffering.count({
    where: { id: defaultTermId },
  });
  check("deleting a section cascades to its allocations", orphaned === 0, orphaned);

  await cleanup();
  await prisma.user.update({
    where: { enrollmentNo: STUDENT_ENROLLMENT },
    data: { mustChangePassword: true },
  });

  console.log(
    `\n${failures === 0 ? "All checks passed" : `${failures} check(s) failed`}`
  );
  process.exitCode = failures === 0 ? 0 : 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
