import { NextRequest, NextResponse } from 'next/server';
import { TripType } from '@prisma/client';

import { TripService } from '@/lib/trip-service';
import { requirePermission } from '@/lib/security/auth-context';
import { writeAuditLog } from '@/lib/security/audit-log';
import { PERMISSIONS } from '@/lib/security/permissions';

const MAX_MATERIAL_ROWS = 10;

type RouteContext = {
  params: Promise<{ id: string }>;
};

type MaterialInput = {
  id?: string;
  material_type: string;
  customer_weight?: number;
  received_weight?: number;
  bagged_weight?: number;
};

type NumericFieldName =
  | 'initial_weight'
  | 'final_weight'
  | 'loaded_weight_in'
  | 'empty_weight_after_unload'
  | 'customer_reported_weight';

const numericFields: NumericFieldName[] = [
  'initial_weight',
  'final_weight',
  'loaded_weight_in',
  'empty_weight_after_unload',
  'customer_reported_weight',
];

function validationError(message: string): never {
  throw new Error(`Validation: ${message}`);
}

function normalizeTripType(value: unknown): TripType {
  if (value === 'OUTBOUND_SALE') return 'OUTBOUND_SALE';
  return 'INBOUND_PURCHASE';
}

function parseNonNegativeNumber(value: unknown, fieldName: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    validationError(`${fieldName} ต้องเป็นตัวเลขที่มากกว่าหรือเท่ากับ 0`);
  }
  return Math.round(parsed);
}

function normalizeMaterials(materials: MaterialInput[]): MaterialInput[] {
  if (materials.length > MAX_MATERIAL_ROWS) {
    validationError(`รายการวัสดุเกินกำหนด (สูงสุด ${MAX_MATERIAL_ROWS} รายการ)`);
  }

  const sanitized: MaterialInput[] = [];

  for (const item of materials) {
    const materialType = String(item.material_type ?? '').trim();
    const customerWeight = Number(item.customer_weight ?? 0);
    const receivedWeight = Number(item.received_weight ?? 0);
    const baggedWeight = Number(item.bagged_weight ?? 0);

    if (!Number.isFinite(customerWeight) || customerWeight < 0) {
      validationError('น้ำหนักที่ลูกค้าชั่งต้องเป็นตัวเลขที่มากกว่าหรือเท่ากับ 0');
    }
    if (!Number.isFinite(receivedWeight) || receivedWeight < 0) {
      validationError('น้ำหนักรับจริงต้องเป็นตัวเลขที่มากกว่าหรือเท่ากับ 0');
    }
    if (!Number.isFinite(baggedWeight) || baggedWeight < 0) {
      validationError('น้ำหนักบรรจุเป้ต้องเป็นตัวเลขที่มากกว่าหรือเท่ากับ 0');
    }

    const hasType = materialType.length > 0;
    const hasCustomerWeight = customerWeight > 0;
    if (hasType !== hasCustomerWeight) {
      validationError('กรุณากรอกชนิดวัสดุและน้ำหนักลูกค้าให้ครบในแต่ละรายการ');
    }

    if (!hasType && !hasCustomerWeight) {
      continue;
    }

    sanitized.push({
      id: item.id,
      material_type: materialType,
      customer_weight: Math.round(customerWeight),
      received_weight: Math.round(receivedWeight),
      bagged_weight: Math.round(baggedWeight),
    });
  }

  if (sanitized.length > MAX_MATERIAL_ROWS) {
    validationError(`รายการวัสดุเกินกำหนด (สูงสุด ${MAX_MATERIAL_ROWS} รายการ)`);
  }

  return sanitized;
}

function isValidationError(message: string): boolean {
  return (
    message.startsWith('Validation:')
    || message.startsWith('NotFound:')
    || message.includes('Partner')
  );
}

export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  const auth = await requirePermission(request, PERMISSIONS.TRIPS_VIEW);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { id } = await params;
    const trip = await TripService.getTripWithBags(id);
    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }
    return NextResponse.json(trip);
  } catch (error) {
    console.error('Failed to fetch trip:', error);
    return NextResponse.json({ error: 'Failed to fetch trip' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
) {
  const auth = await requirePermission(request, PERMISSIONS.TRIPS_MANAGE);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { id } = await params;
    const currentTrip = await TripService.getTripWithBags(id);
    if (!currentTrip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    const body = (await request.json()) as {
      materials?: MaterialInput[];
      trip_type?: TripType;
      [key: string]: unknown;
    };

    const materials = Array.isArray(body.materials)
      ? normalizeMaterials(body.materials)
      : undefined;
    const { materials: _ignored, ...rawTripPayload } = body;
    const tripUpdatePayload = rawTripPayload as Parameters<typeof TripService.updateTrip>[1];

    if (tripUpdatePayload.trip_type) {
      tripUpdatePayload.trip_type = normalizeTripType(tripUpdatePayload.trip_type);
    }

    if (tripUpdatePayload.partner_id === '') {
      tripUpdatePayload.partner_id = null;
    }

    for (const fieldName of numericFields) {
      if (tripUpdatePayload[fieldName] !== undefined) {
        tripUpdatePayload[fieldName] = parseNonNegativeNumber(
          tripUpdatePayload[fieldName],
          fieldName
        );
      }
    }

    const loadedWeightIn = Number(tripUpdatePayload.loaded_weight_in ?? 0);
    const emptyWeightAfterUnload = Number(tripUpdatePayload.empty_weight_after_unload ?? 0);
    if (
      loadedWeightIn > 0 &&
      emptyWeightAfterUnload > 0 &&
      loadedWeightIn < emptyWeightAfterUnload
    ) {
      validationError('น้ำหนักรวมขาเข้าต้องไม่น้อยกว่าน้ำหนักรถเปล่าหลังลงของ');
    }

    if (materials) {
      const incomingMaterialIds = new Set(
        materials.map((item) => item.id).filter((id): id is string => Boolean(id))
      );
      const hasDeletedSavedRows = currentTrip.materials.some(
        (material) => !incomingMaterialIds.has(material.id)
      );
      const isClosedTrip =
        currentTrip.status === 'COMPLETED' || currentTrip.status === 'RECONCILED';

      if (hasDeletedSavedRows && isClosedTrip) {
        validationError('ปิดเที่ยวแล้ว ไม่สามารถลบรายการวัสดุที่บันทึกไว้ได้');
      }

      const customerReportedWeight = materials.reduce(
        (sum, item) => sum + (Number(item.customer_weight) || 0),
        0
      );
      tripUpdatePayload.customer_reported_weight = customerReportedWeight;
    }

    await TripService.updateTrip(id, tripUpdatePayload);

    if (materials) {
      await TripService.upsertTripMaterials(id, materials);
    }

    const withMaterials = await TripService.getTripWithBags(id);
    if (!withMaterials) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });

    await writeAuditLog({
      actor: auth.actor,
      request,
      action: 'trips.update',
      resource_type: 'trip',
      resource_id: id,
      success: true,
      status_code: 200,
      metadata: {
        status: withMaterials.status,
        material_rows: withMaterials.materials.length,
      },
    });

    return NextResponse.json(withMaterials);
  } catch (error) {
    console.error('Failed to update trip:', error);
    const message = error instanceof Error ? error.message : 'Failed to update trip';
    const status = isValidationError(message) ? 400 : 500;

    await writeAuditLog({
      actor: auth.actor,
      request,
      action: 'trips.update',
      resource_type: 'trip',
      success: false,
      status_code: status,
      message,
    });

    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  const auth = await requirePermission(request, PERMISSIONS.TRIPS_MANAGE);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { id } = await params;
    const deleted = await TripService.deleteInboundRemovedTrip(id);

    await writeAuditLog({
      actor: auth.actor,
      request,
      action: 'trips.delete_permanent',
      resource_type: 'trip',
      resource_id: deleted.id,
      success: true,
      status_code: 200,
      metadata: {
        trip_type: deleted.trip_type,
        status: deleted.status,
      },
    });

    return NextResponse.json({
      success: true,
      id: deleted.id,
    });
  } catch (error) {
    console.error('Failed to delete trip:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete trip';
    const status = message.startsWith('NotFound:') ? 404 : isValidationError(message) ? 400 : 500;

    await writeAuditLog({
      actor: auth.actor,
      request,
      action: 'trips.delete_permanent',
      resource_type: 'trip',
      success: false,
      status_code: status,
      message,
    });

    return NextResponse.json({ error: message }, { status });
  }
}
