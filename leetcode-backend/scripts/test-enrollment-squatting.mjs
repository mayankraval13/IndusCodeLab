/**
 * Regression test for the enrollment-squatting finding raised in the Phase 5
 * security review.
 *
 * The attack: bulk enrollment resolves students by enrollment number alone, so
 * a stranger who self-registers an unissued number gets swept into that section
 * when the admin enrols the range — inheriting its assignments, notifications
 * and submission rights.
 */
import { PrismaClient } from "../src/generated/prisma/index.js";

const BASE = "http://localhost:8000/api/v1";

const PREFIX = "IU288888";
const BATCH_NAME = "SQUAT-TEST";
const SQUATTED_ENROLLMENT = "IU2888880011";
const REAL_ENROLLMENT = "IU2888880012";
// Must sit under SIGNUP_ALLOWED_DOMAINS for the squatting half of this test to
// get as far as creating an account at all.
const ATTACKER_EMAIL = "attacker.squat@iite.indusuni.ac.in";
const REAL_EMAIL = "real.student.squat@iite.indusuni.ac.in";
const OUTSIDE_EMAIL = "outsider.squat@gmail.com";
const PASSWORD = "SquatTest!2024";

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

async function call(method, path, cookie, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: res.status, data: await res.json(), cookie: cookieFrom(res) };
}

async function cleanup() {
  await prisma.batch.deleteMany({
    where: { enrollmentPrefix: PREFIX, name: BATCH_NAME },
  });
  await prisma.user.deleteMany({
    where: { email: { in: [ATTACKER_EMAIL, REAL_EMAIL, OUTSIDE_EMAIL] } },
  });
}

async function main() {
  await cleanup();

  const admin = await call("POST", "/auth/login", null, {
    identifier: "admin@leetlab.com",
    password: "admin123",
  });
  if (admin.status !== 200) throw new Error("admin login failed");
  const adminCookie = admin.cookie;

  console.log("--- signup is restricted to college domains ---");
  const outsider = await call("POST", "/auth/register", null, {
    name: "Total Outsider",
    email: OUTSIDE_EMAIL,
    enrollmentNo: "IU2888880099",
    password: PASSWORD,
  });
  check(
    "a non-college address cannot register",
    outsider.status === 403 &&
      outsider.data.code === "EMAIL_DOMAIN_NOT_ALLOWED",
    outsider.data,
  );
  const outsiderExists = await prisma.user.count({
    where: { email: OUTSIDE_EMAIL },
  });
  check("and no account was created", outsiderExists === 0, outsiderExists);

  console.log("\n--- an insider claims an unissued enrollment number ---");
  const registered = await call("POST", "/auth/register", null, {
    name: "Not A Real Student",
    email: ATTACKER_EMAIL,
    enrollmentNo: SQUATTED_ENROLLMENT,
    password: PASSWORD,
  });
  check(
    "self-registration still succeeds",
    registered.status === 201 || registered.status === 200,
    registered.data,
  );

  const attacker = await prisma.user.findUnique({
    where: { email: ATTACKER_EMAIL },
    select: { id: true, provisionedByAdmin: true },
  });
  check(
    "but the account is not marked as institution-provisioned",
    attacker?.provisionedByAdmin === false,
    attacker,
  );

  // A genuine student, created the way the institution would.
  const realStudent = await prisma.user.create({
    data: {
      name: "Real Student",
      email: REAL_EMAIL,
      enrollmentNo: REAL_ENROLLMENT,
      // Never logged in as, so the hash does not need to be real.
      password: "unused",
      role: "USER",
      provisionedByAdmin: true,
    },
    select: { id: true },
  });

  console.log("\n--- admin bulk-enrols the range covering both numbers ---");
  const batch = await call("POST", "/admin/batches", adminCookie, {
    name: BATCH_NAME,
    enrollmentPrefix: PREFIX,
    serialStart: 1,
    serialEnd: 100,
  });
  const batchId = batch.data.batch.id;

  const dryRun = await call(
    "POST",
    `/admin/batches/${batchId}/enroll-range`,
    adminCookie,
    { dryRun: true },
  );
  check(
    "the dry run does not offer the squatted account",
    !dryRun.data.toEnroll?.some((s) => s.enrollmentNo === SQUATTED_ENROLLMENT),
    dryRun.data.toEnroll?.map((s) => s.enrollmentNo),
  );
  check(
    "but does offer the genuine student",
    dryRun.data.toEnroll?.some((s) => s.enrollmentNo === REAL_ENROLLMENT),
    dryRun.data.toEnroll?.map((s) => s.enrollmentNo),
  );

  const enrolled = await call(
    "POST",
    `/admin/batches/${batchId}/enroll-range`,
    adminCookie,
    { dryRun: false },
  );
  check("the real enrolment runs", enrolled.status === 200, enrolled.data);

  const attackerMemberships = await prisma.batchMember.count({
    where: { userId: attacker.id },
  });
  check(
    "the squatter was never enrolled in the section",
    attackerMemberships === 0,
    attackerMemberships,
  );

  const realMemberships = await prisma.batchMember.count({
    where: { userId: realStudent.id, batchId },
  });
  check(
    "the genuine student was enrolled",
    realMemberships === 1,
    realMemberships,
  );

  console.log("\n--- an admin adding by hand can see what they are adding ---");
  const manual = await call(
    "POST",
    `/admin/batches/${batchId}/members`,
    adminCookie,
    { enrollmentNo: SQUATTED_ENROLLMENT },
  );
  check(
    "the response flags the account as not provisioned",
    manual.data.student?.provisionedByAdmin === false,
    manual.data.student,
  );

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
