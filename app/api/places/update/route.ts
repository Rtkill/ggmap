import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { updatePlace } from '@/lib/places';

const EXPECTED_USER = 'rtkill';
const EXPECTED_HASH = '35f5eb4e35bbf24d24aca4aacb1786bd0aaee976c64c4877103303bdbb5fcc96f7a143f4590e1fb380eed00b73c0bb673532d5ce9ca83027a9ee42fa2b558b99';
const SALT = 'gg_admin_salt_2026';

function verifyAdminSession(req: Request): boolean {
  try {
    const cookieHeader = req.headers.get('cookie') || '';
    const match = cookieHeader.match(/admin_session=([^;]+)/);
    if (!match) return false;

    const sessionVal = decodeURIComponent(match[1]);
    const [user, token, timestamp] = sessionVal.split('.');

    if (user === EXPECTED_USER && token && timestamp) {
      const expectedTokenPayload = `${user}:${timestamp}:${SALT}`;
      const expectedToken = crypto.createHmac('sha256', EXPECTED_HASH).update(expectedTokenPayload).digest('hex');
      return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken));
    }
    return false;
  } catch (err) {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const isAdmin = verifyAdminSession(req);
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Super Admin access required' }, { status: 401 });
    }

    const { id, personal_notes, rating } = await req.json();
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing place ID' }, { status: 400 });
    }

    const updateFields: any = {};
    if (typeof personal_notes === 'string') {
      updateFields.personal_notes = personal_notes;
    }
    if (typeof rating === 'number') {
      updateFields.rating = rating;
    }

    const updated = await updatePlace(id, updateFields);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Failed to update place in database' }, { status: 500 });
    }

    return NextResponse.json({ success: true, place: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
