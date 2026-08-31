import jwt from 'jsonwebtoken';

export function verifyAdminToken(authHeader?: string | null): boolean {
  if (!authHeader) return false;
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const jwtSecret = process.env.JWT_SECRET || 'development-only-change-me';
  try {
    jwt.verify(token, jwtSecret);
    return true;
  } catch {
    return false;
  }
}
