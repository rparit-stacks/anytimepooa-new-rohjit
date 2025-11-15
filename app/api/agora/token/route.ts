import { NextRequest, NextResponse } from 'next/server';
import { RtcTokenBuilder, RtcRole } from 'agora-token';

export async function POST(request: NextRequest) {
  try {
    const { channelName, uid, role } = await request.json();

    const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE;

    if (!appId || !appCertificate) {
      return NextResponse.json(
        { error: 'Agora credentials not configured' },
        { status: 500 }
      );
    }

    if (!channelName) {
      return NextResponse.json(
        { error: 'Channel name is required' },
        { status: 400 }
      );
    }

    // Token expiration time (24 hours)
    const expirationTimeInSeconds = 3600 * 24;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    // Build token
    // buildTokenWithUid(appId, appCertificate, channelName, uid, role, tokenExpire, privilegeExpire)
    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      uid || 0,
      role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER,
      expirationTimeInSeconds, // token expire time
      privilegeExpiredTs // privilege expire timestamp
    );

    console.log('✅ Agora token generated:', {
      channelName,
      uid,
      role,
      expiresIn: expirationTimeInSeconds
    });

    return NextResponse.json({
      token,
      appId,
      channelName,
      uid: uid || 0,
      expiresIn: expirationTimeInSeconds
    });
  } catch (error: any) {
    console.error('❌ Failed to generate Agora token:', error);
    return NextResponse.json(
      { error: 'Failed to generate token', details: error.message },
      { status: 500 }
    );
  }
}

