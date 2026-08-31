import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@omnicms.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'password123';
    const jwtSecret = process.env.JWT_SECRET || 'development-only-change-me';

    if (email.trim().toLowerCase() !== adminEmail.toLowerCase() || password !== adminPassword) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const token = jwt.sign({ email: adminEmail, role: 'admin' }, jwtSecret, { expiresIn: '7d' });
    return NextResponse.json({ token, success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Login failed' }, { status: 500 });
  }
}
