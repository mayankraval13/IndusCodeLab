/**
 * `Submission.status` values used by practicals. Practicals have no test cases,
 * so these record whether the code ran rather than whether it was correct.
 *
 * Kept in their own module because both the submit handler and the assignment
 * controller need them, and importing across those two would be circular.
 */
export const PRACTICAL_SUBMITTED = "SUBMITTED";
export const PRACTICAL_FAILED = "RUN_FAILED";
