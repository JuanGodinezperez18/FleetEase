import { NextResponse } from "next/server";

export async function POST() {
  try {
    const res = NextResponse.json({ 
      status: "success",
      message: "Logged out successfully" 
    });

    res.cookies.delete('session');
    
    return res;
  } catch (err: any) {
    console.error("❌ [API Logout] Error:", err);
    return NextResponse.json({ 
      error: err.message 
    }, { status: 500 });
  }
}