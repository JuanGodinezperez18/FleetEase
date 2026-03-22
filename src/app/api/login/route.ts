import { NextRequest, NextResponse } from "next/server";
import { admin } from "@/lib/server/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    console.log('📥 [API Login] Request recibido');
    
    const { idToken } = await req.json();

    if (!idToken) {
      console.error('❌ [API Login] Falta idToken');
      return NextResponse.json({ error: "Missing ID token" }, { status: 400 });
    }

    console.log('🔍 [API Login] IdToken recibido, length:', idToken.length);

    const expiresIn = 1000 * 60 * 60 * 24 * 5; // 5 días

    console.log('🔐 [API Login] Creando session cookie...');
    
    const sessionCookie = await admin
      .auth()
      .createSessionCookie(idToken, { expiresIn });

    console.log('✅ [API Login] Session cookie creada, length:', sessionCookie.length);

    const res = NextResponse.json({ 
      status: "success",
      message: "Session created successfully"
    });

    res.cookies.set({
      name: 'session',
      value: sessionCookie,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: expiresIn / 1000,
      path: '/',
    });

    console.log('✅ [API Login] Response configurado');

    return res;
  } catch (err: any) {
    console.error("❌ [API Login] Error:", {
      message: err.message,
      code: err.code,
      name: err.name
    });
    
    return NextResponse.json({ 
      error: err.message || "Failed to create session",
      code: err.code,
      details: err.toString()
    }, { status: 500 });
  }
}
