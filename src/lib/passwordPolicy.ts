export const NEW_PASSWORD_REQUIREMENTS_HINT =
  "At least 8 characters, including uppercase, lowercase, and a special character.";
export const NEW_PASSWORD_REQUIREMENTS_ERROR =
  "Password must be at least 8 characters and include uppercase, lowercase, and a special character.";

const PASSWORD_POLICY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;

export function meetsPasswordPolicy(password: string): boolean {
  return PASSWORD_POLICY_REGEX.test(password);
}
