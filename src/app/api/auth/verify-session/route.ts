import { NextRequest, NextResponse } from 'next/server';
import { admin } from '@/lib/server/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    console.log('🔍 [Verify Session] Request recibido');

    const { sessionCookie } = await req.json();

    if (!sessionCookie) {
      console.error('❌ [Verify Session] No session cookie provided');
      return NextResponse.json(
        { error: 'No session cookie provided' },
        { status: 401 }
      );
    }

    console.log('🔍 [Verify Session] Verificando cookie con Firebase Admin...');
    const decodedToken = await admin.auth().verifySessionCookie(sessionCookie, true);

    console.log('✅ [Verify Session] Token verificado exitosamente:', {
      uid: decodedToken.uid,
      role: decodedToken.role || 'NO_ROLE',
      companyId: decodedToken.companyId || 'NO_COMPANY',
    });

    return NextResponse.json({
      uid: decodedToken.uid,
      role: decodedToken.role,
      companyId: decodedToken.companyId,
    });
  } catch (error) {
    console.error('❌ [Verify Session] Error verificando sesión:', error);
    return NextResponse.json(
      { error: 'Invalid session' },
      { status: 401 }
    );
  }
}
