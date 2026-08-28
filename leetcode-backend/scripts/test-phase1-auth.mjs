import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/index.js";

const BASE = "http://localhost:8000/api/v1";

const STUDENT_ENROLLMENT = "IU2341230001";
const STUDENT_EMAIL = "ram.23.cse@iite.indusuni.ac.in";
const SECOND_STUDENT = "IU2341230002";

const prisma = new PrismaClient();

let failures = 0;

/** Puts the test student back on the seeded temporary password so this script
 *  can be re-run and manual testing starts from a known state. */
async function resetTestStudent() {
  await prisma.user.update({
    where: { enrollmentNo: STUDENT_ENROLLMENT },
    data: {
      password: await bcrypt.hash(STUDENT_ENROLLMENT, 10),
      mustChangePassword: true,
    },
  });
}

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

async function get(path, cookie) {
  const res = await fetch(`${BASE}${path}`, { headers: { Cookie: cookie } });
  return { status: res.status, data: await res.json() };
}

async function post(path, cookie, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

async function main() {
  await resetTestStudent();

  console.log("--- login by enrollment number ---");
  const byEnrollment = await login(STUDENT_ENROLLMENT, STUDENT_ENROLLMENT);
  check("logs in with enrollment number", byEnrollment.status === 200, byEnrollment.data);
  check(
    "mustChangePassword is true for seeded student",
    byEnrollment.data.user?.mustChangePassword === true,
    byEnrollment.data.user
  );

  console.log("\n--- login by email ---");
  const byEmail = await login(STUDENT_EMAIL, STUDENT_ENROLLMENT);
  check("same student logs in with email", byEmail.status === 200, byEmail.data);
  check(
    "lowercase/uppercase identifier is normalized",
    (await login(STUDENT_EMAIL.toUpperCase(), STUDENT_ENROLLMENT)).status === 200
  );
  check(
    "enrollment number is case insensitive",
    (await login(STUDENT_ENROLLMENT.toLowerCase(), STUDENT_ENROLLMENT)).status === 200
  );

  console.log("\n--- credential errors are indistinguishable ---");
  const wrongPassword = await login(STUDENT_ENROLLMENT, "totally-wrong-password");
  const noSuchUser = await login("IU2349999999", "totally-wrong-password");
  check("wrong password is rejected", wrongPassword.status === 401);
  check("unknown enrollment number is rejected", noSuchUser.status === 401);
  check(
    "both return the identical message (no account enumeration)",
    wrongPassword.data.error === noSuchUser.data.error,
    { wrongPassword: wrongPassword.data, noSuchUser: noSuchUser.data }
  );

  console.log("\n--- password gate blocks the rest of the API ---");
  const cookie = byEnrollment.cookie;
  const check1 = await get("/auth/check", cookie);
  check("/auth/check is reachable while gated", check1.status === 200, check1.data);
  check(
    "/auth/check reports mustChangePassword",
    check1.data.user?.mustChangePassword === true,
    check1.data.user
  );

  const problems = await get("/problems/get-all-problems", cookie);
  check("protected route is blocked with 403", problems.status === 403, problems.data);
  check(
    "block carries PASSWORD_CHANGE_REQUIRED code",
    problems.data.code === "PASSWORD_CHANGE_REQUIRED",
    problems.data
  );

  console.log("\n--- change-password rules ---");
  const tooShort = await post("/auth/change-password", cookie, {
    currentPassword: STUDENT_ENROLLMENT,
    newPassword: "short",
  });
  check("rejects a password under 8 characters", tooShort.status === 400, tooShort.data);

  const sameAsEnrollment = await post("/auth/change-password", cookie, {
    currentPassword: STUDENT_ENROLLMENT,
    newPassword: STUDENT_ENROLLMENT,
  });
  check(
    "rejects reusing the enrollment number",
    sameAsEnrollment.status === 400,
    sameAsEnrollment.data
  );

  const wrongCurrent = await post("/auth/change-password", cookie, {
    currentPassword: "not-my-password",
    newPassword: "BrandNewPass123",
  });
  check("rejects a wrong current password", wrongCurrent.status === 401, wrongCurrent.data);

  const changed = await post("/auth/change-password", cookie, {
    currentPassword: STUDENT_ENROLLMENT,
    newPassword: "BrandNewPass123",
  });
  check("accepts a valid new password", changed.status === 200, changed.data);
  check(
    "flag is cleared in the response",
    changed.data.user?.mustChangePassword === false,
    changed.data.user
  );

  console.log("\n--- after the change ---");
  const afterChange = await get("/problems/get-all-problems", cookie);
  check("protected route now works", afterChange.status === 200, afterChange.data);

  const oldPassword = await login(STUDENT_ENROLLMENT, STUDENT_ENROLLMENT);
  check("old password no longer works", oldPassword.status === 401, oldPassword.data);

  const newPassword = await login(STUDENT_ENROLLMENT, "BrandNewPass123");
  check("new password works", newPassword.status === 200, newPassword.data);
  check(
    "no longer flagged for change",
    newPassword.data.user?.mustChangePassword === false,
    newPassword.data.user
  );

  console.log("\n--- other roles ---");
  const admin = await login("admin@leetlab.com", "admin123");
  check("admin still logs in by email", admin.status === 200, admin.data);
  check("admin is not gated", admin.data.user?.mustChangePassword === false, admin.data.user);
  check("admin has no enrollment number", admin.data.user?.enrollmentNo === null, admin.data.user);
  const adminProblems = await get("/problems/get-all-problems", admin.cookie);
  check("admin reaches protected routes", adminProblems.status === 200);

  const faculty = await login("anil.sharma@iite.indusuni.ac.in", "Faculty@123");
  check("faculty logs in by email", faculty.status === 200, faculty.data);
  check("faculty role is FACULTY", faculty.data.user?.role === "FACULTY", faculty.data.user);
  check(
    "faculty is gated on first login",
    faculty.data.user?.mustChangePassword === true,
    faculty.data.user
  );

  console.log("\n--- untouched student is still on the temporary password ---");
  const second = await login(SECOND_STUDENT, SECOND_STUDENT);
  check("second student logs in", second.status === 200, second.data);
  check(
    "second student still flagged",
    second.data.user?.mustChangePassword === true,
    second.data.user
  );

  await resetTestStudent();
  console.log(`\n${STUDENT_ENROLLMENT} reset to its temporary password`);

  console.log(
    `${failures === 0 ? "All checks passed" : `${failures} check(s) failed`}`
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
