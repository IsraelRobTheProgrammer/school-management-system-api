/**
 * Nigerian secondary school grading scale
 * Used whenever a grade record is created or updated
 */
export const computeLetterGrade = (totalScore: number): string => {
  if (totalScore >= 70) return "A";
  if (totalScore >= 60) return "B";
  if (totalScore >= 50) return "C";
  if (totalScore >= 45) return "D";
  if (totalScore >= 40) return "E";
  return "F";
};

/**
 * Validates that CA score does not exceed 40
 * and exam score does not exceed 60
 */
export const validateScores = (
  caScore: number,
  examScore: number
): { valid: boolean; message?: string } => {
  if (caScore < 0 || caScore > 40) {
    return { valid: false, message: "CA score must be between 0 and 40." };
  }
  if (examScore < 0 || examScore > 60) {
    return { valid: false, message: "Exam score must be between 0 and 60." };
  }
  return { valid: true };
};

/**
 * Returns a human-readable remark based on letter grade
 * Used in report cards
 */
export const getGradeRemark = (letterGrade: string): string => {
  const remarks: Record<string, string> = {
    A: "Excellent",
    B: "Very Good",
    C: "Good",
    D: "Pass",
    E: "Poor",
    F: "Fail",
  };
  return remarks[letterGrade] ?? "N/A";
};
