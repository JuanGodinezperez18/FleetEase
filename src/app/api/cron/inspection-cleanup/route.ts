import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const STORAGE_BUCKET = 'inspection-images';
const BATCH_SIZE = 100;

interface InspectionRecord {
  id: string;
  vehicle_id: string;
  company_id: string;
  photos: Record<string, string>;
  expires_at: string;
}

async function verifyAuth(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  return authHeader === expected;
}

function extractStoragePath(url: string): string | null {
  // Handle signed URLs: https://.../storage/v1/object/sign/inspection-images/companies/...?token=...
  const signMatch = url.match(/\/inspection-images\/(.+?)(?:\?|$)/);
  if (signMatch) return decodeURIComponent(signMatch[1]);

  // Handle public URLs or raw paths
  const pathMatch = url.match(/inspection-images\/(.+?)(?:\?|$)/);
  if (pathMatch) return decodeURIComponent(pathMatch[1]);

  return null;
}

export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET) {
    console.error('CRON_SECRET is not configured');
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 },
    );
  }

  const isAuthorized = await verifyAuth(request);
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let expiredFound = 0;
  let filesDeleted = 0;
  let recordsDeleted = 0;

  try {
    // Fetch expired inspections
    const { data: inspections, error: fetchError } = await supabase
      .from('vehicle_inspections')
      .select('id, vehicle_id, company_id, photos, expires_at')
      .lte('expires_at', new Date().toISOString())
      .limit(BATCH_SIZE);

    if (fetchError) {
      console.error('Error fetching expired inspections:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch expired inspections', details: fetchError.message },
        { status: 500 },
      );
    }

    expiredFound = inspections?.length ?? 0;

    if (expiredFound === 0) {
      return NextResponse.json({
        success: true,
        expiredFound: 0,
        filesDeleted: 0,
        recordsDeleted: 0,
      });
    }

    console.log(`Found ${expiredFound} expired inspections`);

    // Process each expired inspection
    for (const inspection of inspections as InspectionRecord[]) {
      // Delete associated files from Storage
      if (inspection.photos) {
        const photoUrls = Object.values(inspection.photos);

        for (const url of photoUrls) {
          try {
            const storagePath = extractStoragePath(url);
            if (storagePath) {
              const { error: removeError } = await supabase.storage
                .from(STORAGE_BUCKET)
                .remove([storagePath]);

              if (removeError) {
                console.error(
                  `Failed to delete file ${storagePath}:`,
                  removeError.message,
                );
              } else {
                filesDeleted++;
                console.log(`Deleted file: ${storagePath}`);
              }
            } else {
              console.warn(`Could not extract storage path from URL: ${url}`);
            }
          } catch (error) {
            console.error(`Error deleting file for inspection ${inspection.id}:`, error);
          }
        }
      }

      // Delete the database record (soft delete)
      const { error: deleteError } = await supabase
        .from('vehicle_inspections')
        .update({ is_deleted: true })
        .eq('id', inspection.id);

      if (deleteError) {
        console.error(`Failed to soft-delete inspection ${inspection.id}:`, deleteError);
        // Attempt hard delete as fallback
        const { error: hardDeleteError } = await supabase
          .from('vehicle_inspections')
          .delete()
          .eq('id', inspection.id);

        if (hardDeleteError) {
          console.error(`Hard delete also failed for ${inspection.id}:`, hardDeleteError);
        } else {
          recordsDeleted++;
        }
      } else {
        recordsDeleted++;
      }
    }

    return NextResponse.json({
      success: true,
      expiredFound,
      filesDeleted,
      recordsDeleted,
    });
  } catch (error) {
    console.error('Inspection cleanup cron job failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        expiredFound,
        filesDeleted,
        recordsDeleted,
      },
      { status: 500 },
    );
  }
}
