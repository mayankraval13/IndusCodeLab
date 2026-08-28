import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/index.js";

const BASE = "http://localhost:8000/api/v1";
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
  const student = await settleTestStudent();

  const practical = await prisma.problem.findFirst({
    where: { type: "PRACTICAL" },
    select: { id: true, title: true },
  });
  const graded = await prisma.problem.findFirst({
    where: { type: "PRACTICE", executionMode: "JUDGE0_GRADE" },
    select: { id: true, title: true },
  });

  if (!practical) throw new Error("no PRACTICAL problem in the database to test against");
  console.log(`using practical: ${practical.title}\n`);

  // Start from a clean slate so append counts are unambiguous.
  await prisma.submission.deleteMany({
    where: { userId: student.id, problemId: practical.id },
  });
  await prisma.problemSolved.deleteMany({
    where: { userId: student.id, problemId: practical.id },
  });

  const session = await login(STUDENT_ENROLLMENT, STUDENT_ENROLLMENT);
  if (session.status !== 200) throw new Error("student login failed");
  const cookie = session.cookie;

  console.log("--- access control and validation ---");
  const anonymous = await call("POST", "/execute/submit", null, {
    problemId: practical.id,
    code: "print(1)",
    language: "PYTHON",
  });
  check("unauthenticated cannot submit", anonymous.status === 401, anonymous.data);

  const partial = await call("POST", "/execute/submit", cookie, {
    problemId: practical.id,
  });
  check("rejects a payload with no code", partial.status === 400, partial.data);

  const unknown = await call("POST", "/execute/submit", cookie, {
    problemId: "00000000-0000-0000-0000-000000000000",
    code: "print(1)",
    language: "PYTHON",
  });
  check("404s on an unknown problem", unknown.status === 404, unknown.data);

  const badLanguage = await call("POST", "/execute/submit", cookie, {
    problemId: practical.id,
    code: "print(1)",
    language: "COBOL",
  });
  check(
    "rejects an unsupported language",
    badLanguage.status === 400,
    badLanguage.data
  );

  if (graded) {
    const wrongMode = await call("POST", "/execute/submit", cookie, {
      problemId: graded.id,
      code: "print(1)",
      language: "PYTHON",
    });
    check(
      "refuses to submit a test-case graded problem",
      wrongMode.status === 400,
      wrongMode.data
    );
  }

  console.log("\n--- first submission ---");
  const first = await call("POST", "/execute/submit", cookie, {
    problemId: practical.id,
    code: "print('hello from phase 4')",
    language: "PYTHON",
    stdin: "",
  });

  if (first.status === 500) {
    console.log(
      "\nSubmit returned 500 — Judge0 at http://localhost:2358 is probably not running."
    );
    console.log("Start Judge0 and re-run this script.");
    process.exitCode = 1;
    return;
  }

  check("submission is accepted", first.status === 201, first.data);
  check("reports that the code ran", first.data.ran === true, first.data);
  check(
    "stores the submitted code",
    first.data.submission?.sourceCode === "print('hello from phase 4')",
    first.data.submission?.sourceCode
  );
  check(
    "stores the real output, not a client claim",
    first.data.submission?.stdout?.trim() === "hello from phase 4",
    first.data.submission?.stdout
  );
  check(
    "marks it SUBMITTED rather than grading it",
    first.data.submission?.status === "SUBMITTED",
    first.data.submission?.status
  );
  check(
    "records a timestamp",
    !!first.data.submission?.createdAt,
    first.data.submission?.createdAt
  );

  const solved = await prisma.problemSolved.count({
    where: { userId: student.id, problemId: practical.id },
  });
  check("marks the practical solved", solved === 1, solved);

  console.log("\n--- stdin is captured ---");
  const withStdin = await call("POST", "/execute/submit", cookie, {
    problemId: practical.id,
    code: "print(input().upper())",
    language: "PYTHON",
    stdin: "phase four",
  });
  check(
    "stores the stdin used",
    withStdin.data.submission?.stdin === "phase four",
    withStdin.data.submission?.stdin
  );
  check(
    "output reflects that stdin",
    withStdin.data.submission?.stdout?.trim() === "PHASE FOUR",
    withStdin.data.submission?.stdout
  );

  console.log("\n--- resubmission appends ---");
  const second = await call("POST", "/execute/submit", cookie, {
    problemId: practical.id,
    code: "print('revised answer')",
    language: "PYTHON",
    stdin: "",
  });
  check("resubmission is accepted", second.status === 201, second.data);
  check(
    "resubmission is a new row, not an overwrite",
    second.data.submission?.id !== first.data.submission?.id,
    { first: first.data.submission?.id, second: second.data.submission?.id }
  );

  const stored = await prisma.submission.count({
    where: { userId: student.id, problemId: practical.id },
  });
  check("all three submissions are kept", stored === 3, stored);

  const stillOneSolved = await prisma.problemSolved.count({
    where: { userId: student.id, problemId: practical.id },
  });
  check("solved stays a single row after resubmitting", stillOneSolved === 1, stillOneSolved);

  console.log("\n--- history endpoint ---");
  const history = await call(
    "GET",
    `/submission/get-all-submissions/${practical.id}`,
    cookie
  );
  check("history returns every submission", history.data.submissions?.length === 3, history.data.submissions?.length);
  check(
    "newest first",
    history.data.submissions?.[0]?.id === second.data.submission?.id,
    history.data.submissions?.map((s) => s.id)
  );
  check(
    "history is scoped to the signed-in student",
    history.data.submissions?.every((s) => s.userId === student.id),
    history.data.submissions?.map((s) => s.userId)
  );

  console.log("\n--- broken code is stored but does not count ---");
  await prisma.problemSolved.deleteMany({
    where: { userId: student.id, problemId: practical.id },
  });

  const broken = await call("POST", "/execute/submit", cookie, {
    problemId: practical.id,
    code: "this is not python(",
    language: "PYTHON",
    stdin: "",
  });
  check("broken code still returns 201", broken.status === 201, broken.status);
  check("but is flagged as not run", broken.data.ran === false, broken.data);
  check(
    "and stored as RUN_FAILED",
    broken.data.submission?.status === "RUN_FAILED",
    broken.data.submission?.status
  );

  const solvedAfterBroken = await prisma.problemSolved.count({
    where: { userId: student.id, problemId: practical.id },
  });
  check(
    "broken code does not mark the practical solved",
    solvedAfterBroken === 0,
    solvedAfterBroken
  );

  console.log("\n--- solved state reaches the problem list ---");
  await call("POST", "/execute/submit", cookie, {
    problemId: practical.id,
    code: "print('final')",
    language: "PYTHON",
    stdin: "",
  });
  const problems = await call(
    "GET",
    "/problems/get-all-problems?type=PRACTICAL",
    cookie
  );
  const listed = problems.data.problems?.find((p) => p.id === practical.id);
  check(
    "the practical now shows as solved for this student",
    listed?.solvedBy?.some((s) => s.userId === student.id),
    listed?.solvedBy
  );

  await prisma.submission.deleteMany({
    where: { userId: student.id, problemId: practical.id },
  });
  await prisma.problemSolved.deleteMany({
    where: { userId: student.id, problemId: practical.id },
  });
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
