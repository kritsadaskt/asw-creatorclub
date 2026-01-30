/**
 * Password hashing utilities using Web Crypto API
 * Note: For production with sensitive data, consider server-side hashing with bcrypt/argon2
 */

/**
 * Hash a password using SHA-256
 * @param password - Plain text password
 * @returns Hashed password as hex string
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify a password against a hash
 * @param password - Plain text password to verify
 * @param hash - Stored hash to compare against
 * @returns True if password matches
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const inputHash = await hashPassword(password);
  return inputHash === hash;
}

/**
 * Validate password strength
 * @param password - Password to validate
 * @returns Object with isValid flag and error message
 */
export function validatePassword(password: string): { isValid: boolean; error?: string } {
  if (!password) {
    return { isValid: false, error: 'กรุณากรอกรหัสผ่าน' };
  }

  if (password.length < 6) {
    return { isValid: false, error: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' };
  }

  return { isValid: true };
}

/**
 * Validate password confirmation
 * @param password - Original password
 * @param confirmPassword - Confirmation password
 * @returns Object with isValid flag and error message
 */
export function validatePasswordConfirm(
  password: string,
  confirmPassword: string
): { isValid: boolean; error?: string } {
  if (password !== confirmPassword) {
    return { isValid: false, error: 'รหัสผ่านไม่ตรงกัน' };
  }

  return { isValid: true };
}
