import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Secure PBKDF2 hash of user's password 'Pichcorp9@' with static salt
const EXPECTED_USER = 'rtkill';
const EXPECTED_HASH = '35f5eb4e35bbf24d24aca4aacb1786bd0aaee976c64c4877103303bdbb5fcc96f7a143f4590e1fb380eed00b73c0bb673532d5ce9ca83027a9ee42fa2b558b99';
const SALT = 'gg_admin_salt_2026';

// In-memory rate limiter to prevent brute force login attempts
const loginAttempts: Record<string, { count: number; lockUntil: number }> = {};

export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get('cookie') || '';
    const match = cookieHeader.match(/admin_session=([^;]+)/);
    if (!match) {
      return NextResponse.json({ authenticated: false });
    }

    const sessionVal = decodeURIComponent(match[1]);
    const [user, token, timestamp] = sessionVal.split('.');

    if (user === EXPECTED_USER && token && timestamp) {
      const expectedTokenPayload = `${user}:${timestamp}:${SALT}`;
      const expectedToken = crypto.createHmac('sha256', EXPECTED_HASH).update(expectedTokenPayload).digest('hex');
      if (crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken))) {
        return NextResponse.json({ authenticated: true, username: user });
      }
    }

    return NextResponse.json({ authenticated: false });
  } catch (err) {
    return NextResponse.json({ authenticated: false });
  }
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const now = Date.now();

    // Check rate limit lock
    if (loginAttempts[ip] && loginAttempts[ip].lockUntil > now) {
      const waitSeconds = Math.ceil((loginAttempts[ip].lockUntil - now) / 1000);
      return NextResponse.json(
        { success: false, error: `พยายามเข้าสู่ระบบผิดเกินจำนวนที่กำหนด กรุณารอ ${waitSeconds} วินาที` },
        { status: 429 }
      );
    }

    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ success: false, error: 'กรุณากรอก Username และ Password' }, { status: 400 });
    }

    // Compute PBKDF2 hash of provided password
    const computedHash = crypto.pbkdf2Sync(password, SALT, 100000, 64, 'sha512').toString('hex');

    const isUserValid = username.trim() === EXPECTED_USER;
    const isPassValid = crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(EXPECTED_HASH));

    if (!isUserValid || !isPassValid) {
      // Record failed attempt
      if (!loginAttempts[ip]) {
        loginAttempts[ip] = { count: 1, lockUntil: 0 };
      } else {
        loginAttempts[ip].count += 1;
      }

      // Lock IP for 5 minutes after 5 failed attempts
      if (loginAttempts[ip].count >= 5) {
        loginAttempts[ip].lockUntil = now + 5 * 60 * 1000;
        return NextResponse.json(
          { success: false, error: 'กรอกรหัสผ่านผิดเกิน 5 ครั้ง ระบบทำการระงับการลองชั่วคราว 5 นาที' },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { success: false, error: `Username หรือ Password ไม่ถูกต้อง (เหลือลองอีก ${5 - loginAttempts[ip].count} ครั้ง)` },
        { status: 401 }
      );
    }

    // Reset attempts on clean login
    delete loginAttempts[ip];

    // Generate secure session token
    const tokenPayload = `${username}:${now}:${SALT}`;
    const token = crypto.createHmac('sha256', EXPECTED_HASH).update(tokenPayload).digest('hex');

    const response = NextResponse.json({ success: true });
    
    // Set secure HTTP-only cookie
    response.cookies.set('admin_session', `${username}.${token}.${now}`, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('admin_session');
  return response;
}
