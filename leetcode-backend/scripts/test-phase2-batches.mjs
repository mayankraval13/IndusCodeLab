import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/index.js";

const BASE = "http://localhost:8000/api/v1";

const PREFIX = "IU234123";
const OVERLAP_BATCH = "TEST-OVERLAP";
const TEST_FACULTY_EMAIL = "phase2.test.faculty@iite.indusuni.ac.in";
const STUDENT_ENROLLMENT = "IU2341230001";

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

/** Removes only what this script creates; seeded sections are left alone. */
async function cleanup() {
  await prisma.batch.deleteMany({
    where: { enrollmentPrefix: PREFIX, name: OVERLAP_BATCH },
  });
  await prisma.user.deleteMany({ where: { email: TEST_FACULTY_EMAIL } });
}

/**
 * Sets the test student's password rather than assuming the seeded one, so the
 * script still works after somebody has changed it through the UI.
 */
async function resetTestStudent() {
  return prisma.user.update({
    where: { enrollmentNo: STUDENT_ENROLLMENT },
    data: {
      password: await bcrypt.hash(STUDENT_ENROLLMENT, 10),
      mustChangePassword: true,
    },
    select: { id: true },
  });
}

async function memberCount(batchId) {
  return prisma.batchMember.count({ where: { batchId } });
}

async function main() {
  await cleanup();
  const { id: studentId } = await resetTestStudent();

  const admin = await login("admin@leetlab.com", "admin123");
  if (admin.status !== 200) throw new Error("admin login failed");
  const adminCookie = admin.cookie;

  console.log("--- access control ---");
  const anonymous = await call("GET", "/admin/overview", null);
  check("unauthenticated is rejected", anonymous.status === 401, anonymous.data);

  const student = await login(STUDENT_ENROLLMENT, STUDENT_ENROLLMENT);
  const studentGated = await call("GET", "/admin/overview", student.cookie);
  check(
    "student on temporary password is blocked by the password gate",
    studentGated.status === 403 &&
      studentGated.data.code === "PASSWORD_CHANGE_REQUIRED",
    studentGated.data
  );

  // A student past the password gate must still be refused on role grounds.
  await prisma.user.update({
    where: { enrollmentNo: STUDENT_ENROLLMENT },
    data: { mustChangePassword: false },
  });
  const settledStudent = await login(STUDENT_ENROLLMENT, STUDENT_ENROLLMENT);
  const studentForbidden = await call(
    "GET",
    "/admin/overview",
    settledStudent.cookie
  );
  check(
    "student with a settled password is still forbidden",
    studentForbidden.status === 403 &&
      studentForbidden.data.code !== "PASSWORD_CHANGE_REQUIRED",
    studentForbidden.data
  );
  await prisma.user.update({
    where: { enrollmentNo: STUDENT_ENROLLMENT },
    data: { mustChangePassword: true },
  });

  const adminOverview = await call("GET", "/admin/overview", adminCookie);
  check("admin reaches the overview", adminOverview.status === 200, adminOverview.data);

  console.log("\n--- user listing ---");
  const allUsers = await call("GET", "/admin/users?limit=100", adminCookie);
  check("lists users", allUsers.status === 200, allUsers.data);
  check(
    "never returns password hashes",
    allUsers.data.users?.every((u) => u.password === undefined),
    allUsers.data.users?.[0]
  );

  const students = await call("GET", "/admin/users?role=USER&limit=100", adminCookie);
  check(
    "filters by role",
    students.data.users?.every((u) => u.role === "USER"),
    students.data.users?.map((u) => u.role)
  );

  const searched = await call(
    "GET",
    `/admin/users?q=${STUDENT_ENROLLMENT}`,
    adminCookie
  );
  check(
    "searches by enrollment number",
    searched.data.total === 1 &&
      searched.data.users[0].enrollmentNo === STUDENT_ENROLLMENT,
    searched.data
  );

  const badRole = await call("GET", "/admin/users?role=WIZARD", adminCookie);
  check("rejects an unknown role filter", badRole.status === 400, badRole.data);

  console.log("\n--- batch validation ---");
  const backwards = await call("POST", "/admin/batches", adminCookie, {
    name: "BAD",
    enrollmentPrefix: PREFIX,
    serialStart: 50,
    serialEnd: 10,
  });
  check("rejects an inverted range", backwards.status === 400, backwards.data);

  const duplicate = await call("POST", "/admin/batches", adminCookie, {
    name: "A",
    enrollmentPrefix: PREFIX,
    serialStart: 1,
    serialEnd: 132,
  });
  check("rejects a duplicate section name", duplicate.status === 400, duplicate.data);

  console.log("\n--- range enrollment ---");
  const batches = await call("GET", "/admin/batches", adminCookie);
  const sectionA = batches.data.batches?.find((b) => b.name === "A");
  const sectionB = batches.data.batches?.find((b) => b.name === "B");
  check("seeded sections exist", Boolean(sectionA && sectionB), batches.data);

  // Start from empty so the dry run and the write are both observable.
  await prisma.batchMember.deleteMany({ where: { batchId: sectionA.id } });

  const dryRun = await call(
    "POST",
    `/admin/batches/${sectionA.id}/enroll-range`,
    adminCookie,
    { dryRun: true }
  );
  check("dry run succeeds", dryRun.status === 200, dryRun.data);
  check(
    "dry run matches the 10 seeded students",
    dryRun.data.summary?.matched === 10 && dryRun.data.summary?.toEnroll === 10,
    dryRun.data.summary
  );
  check(
    "dry run wrote nothing",
    (await memberCount(sectionA.id)) === 0,
    await memberCount(sectionA.id)
  );

  const enroll = await call(
    "POST",
    `/admin/batches/${sectionA.id}/enroll-range`,
    adminCookie,
    {}
  );
  check("enrolls the matched students", enroll.data.summary?.enrolled === 10, enroll.data.summary);
  check(
    "membership is persisted",
    (await memberCount(sectionA.id)) === 10,
    await memberCount(sectionA.id)
  );

  const rerun = await call(
    "POST",
    `/admin/batches/${sectionA.id}/enroll-range`,
    adminCookie,
    {}
  );
  check(
    "re-running is idempotent",
    rerun.data.summary?.alreadyMembers === 10 &&
      rerun.data.summary?.toEnroll === 0 &&
      rerun.data.summary?.enrolled === 0,
    rerun.data.summary
  );

  const sectionBDry = await call(
    "POST",
    `/admin/batches/${sectionB.id}/enroll-range`,
    adminCookie,
    { dryRun: true }
  );
  check(
    "Section B matches nobody (serials 133+ do not exist yet)",
    sectionBDry.data.summary?.matched === 0,
    sectionBDry.data.summary
  );

  const narrowed = await call(
    "POST",
    `/admin/batches/${sectionA.id}/enroll-range`,
    adminCookie,
    { dryRun: true, serialStart: 1, serialEnd: 3 }
  );
  check(
    "an explicit narrower range overrides the batch range",
    narrowed.data.summary?.matched === 3,
    narrowed.data.summary
  );

  console.log("\n--- overlapping range is caught ---");
  const overlap = await call("POST", "/admin/batches", adminCookie, {
    name: OVERLAP_BATCH,
    enrollmentPrefix: PREFIX,
    serialStart: 1,
    serialEnd: 20,
  });
  check("creates the overlapping batch", overlap.status === 201, overlap.data);
  const overlapId = overlap.data.batch.id;

  const overlapDry = await call(
    "POST",
    `/admin/batches/${overlapId}/enroll-range`,
    adminCookie,
    { dryRun: true }
  );
  check(
    "students already in Section A are reported as conflicts, not re-enrolled",
    overlapDry.data.summary?.conflicts === 10 &&
      overlapDry.data.summary?.toEnroll === 0,
    overlapDry.data.summary
  );

  const overlapWrite = await call(
    "POST",
    `/admin/batches/${overlapId}/enroll-range`,
    adminCookie,
    {}
  );
  check(
    "a real run also refuses to double-enrol them",
    overlapWrite.data.summary?.enrolled === 0 &&
      (await memberCount(overlapId)) === 0,
    overlapWrite.data.summary
  );

  console.log("\n--- individual add, transfer and remove ---");
  const addWithoutMove = await call(
    "POST",
    `/admin/batches/${overlapId}/members`,
    adminCookie,
    { enrollmentNo: STUDENT_ENROLLMENT }
  );
  check(
    "adding a student who is already in another section needs move: true",
    addWithoutMove.status === 409,
    addWithoutMove.data
  );

  const transfer = await call(
    "POST",
    `/admin/batches/${overlapId}/members`,
    adminCookie,
    { enrollmentNo: STUDENT_ENROLLMENT, move: true }
  );
  check("transfers with move: true", transfer.status === 201, transfer.data);
  check(
    "transfer moved rather than duplicated",
    (await memberCount(sectionA.id)) === 9 &&
      (await memberCount(overlapId)) === 1,
    {
      sectionA: await memberCount(sectionA.id),
      overlap: await memberCount(overlapId),
    }
  );

  const addFaculty = await call(
    "POST",
    `/admin/batches/${overlapId}/members`,
    adminCookie,
    { enrollmentNo: null, userId: (await prisma.user.findFirst({ where: { role: "FACULTY" } })).id }
  );
  check("refuses to enrol a non-student", addFaculty.status === 400, addFaculty.data);

  const transferBack = await call(
    "POST",
    `/admin/batches/${sectionA.id}/members`,
    adminCookie,
    { enrollmentNo: STUDENT_ENROLLMENT, move: true }
  );
  check("transfers back to Section A", transferBack.status === 201, transferBack.data);
  check(
    "Section A is whole again",
    (await memberCount(sectionA.id)) === 10 &&
      (await memberCount(overlapId)) === 0,
    {
      sectionA: await memberCount(sectionA.id),
      overlap: await memberCount(overlapId),
    }
  );

  const removeMissing = await call(
    "DELETE",
    `/admin/batches/${overlapId}/members/${studentId}`,
    adminCookie
  );
  check("removing a non-member 404s", removeMissing.status === 404, removeMissing.data);

  console.log("\n--- delete guards ---");
  const deleteNonEmpty = await call(
    "DELETE",
    `/admin/batches/${sectionA.id}`,
    adminCookie
  );
  check(
    "refuses to delete a section with students",
    deleteNonEmpty.status === 409,
    deleteNonEmpty.data
  );

  const deleteEmpty = await call("DELETE", `/admin/batches/${overlapId}`, adminCookie);
  check("deletes an empty section", deleteEmpty.status === 200, deleteEmpty.data);

  console.log("\n--- faculty accounts ---");
  const created = await call("POST", "/admin/users/faculty", adminCookie, {
    name: "Phase Two Tester",
    email: TEST_FACULTY_EMAIL,
  });
  check("creates a faculty account", created.status === 201, created.data);
  check(
    "returns a generated temporary password",
    typeof created.data.temporaryPassword === "string" &&
      created.data.temporaryPassword.length >= 8,
    created.data.temporaryPassword
  );
  check(
    "new faculty must change password",
    created.data.faculty?.mustChangePassword === true,
    created.data.faculty
  );

  const facultyLogin = await login(
    TEST_FACULTY_EMAIL,
    created.data.temporaryPassword
  );
  check(
    "new faculty can log in with that password",
    facultyLogin.status === 200 && facultyLogin.data.user.role === "FACULTY",
    facultyLogin.data
  );

  const duplicateFaculty = await call("POST", "/admin/users/faculty", adminCookie, {
    name: "Duplicate",
    email: TEST_FACULTY_EMAIL,
  });
  check(
    "rejects a duplicate email",
    duplicateFaculty.status === 409 &&
      duplicateFaculty.data.code === "EMAIL_IN_USE",
    duplicateFaculty.data
  );

  console.log("\n--- role changes ---");
  const promoteStudent = await call(
    "PATCH",
    `/admin/users/${studentId}/role`,
    adminCookie,
    { role: "FACULTY" }
  );
  check(
    "refuses to promote an account that has an enrollment number",
    promoteStudent.status === 400,
    promoteStudent.data
  );

  const demoteSelf = await call(
    "PATCH",
    `/admin/users/${admin.data.user.id}/role`,
    adminCookie,
    { role: "USER" }
  );
  check("refuses to change your own role", demoteSelf.status === 400, demoteSelf.data);

  const badRoleValue = await call(
    "PATCH",
    `/admin/users/${created.data.faculty.id}/role`,
    adminCookie,
    { role: "WIZARD" }
  );
  check("rejects an unknown role value", badRoleValue.status === 400, badRoleValue.data);

  const promoteFaculty = await call(
    "PATCH",
    `/admin/users/${created.data.faculty.id}/role`,
    adminCookie,
    { role: "ADMIN" }
  );
  check(
    "promotes an email-only account",
    promoteFaculty.status === 200 && promoteFaculty.data.user.role === "ADMIN",
    promoteFaculty.data
  );

  await cleanup();
  await resetTestStudent();
  console.log(
    `\nTest artifacts removed; ${STUDENT_ENROLLMENT} reset to its temporary password; Section A left enrolled with 10 students`
  );

  console.log(
    `${failures === 0 ? "All checks passed" : `${failures} check(s) failed`}`
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await cleanup().catch(() => {});
  process.exit(1);
});
