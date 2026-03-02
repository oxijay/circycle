'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FocusEvent, KeyboardEvent } from 'react';

import {
  MATERIAL_OPTIONS,
  MAX_MATERIAL_ROWS,
  TRIP_STEPS,
} from '../constants';
import type {
  BagSummary,
  MaterialSummary,
  Partner,
  PartnerPayload,
  StepFourSummary,
  StepThreeSummary,
  Trip,
  TripMaterial,
  TripType,
  VehicleOption,
  VehiclePayload,
} from '../types';

export function useTripWorkflow() {
  const LAST_STEP = TRIP_STEPS.length;
  const COMPLETION_STEP = LAST_STEP + 1;

  const [trips, setTrips] = useState<Trip[]>([]);
  const [historyTrips, setHistoryTrips] = useState<Trip[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize] = useState(20);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [vehicleOptions, setVehicleOptions] = useState<VehicleOption[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [currentTrip, setCurrentTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [isInitialWeightSkipped, setIsInitialWeightSkipped] = useState(true);

  const driverOptions = useMemo(() => {
    const names = vehicleOptions
      .map((vehicle) => vehicle.driverName?.trim())
      .filter((name): name is string => Boolean(name));

    return Array.from(new Set(names));
  }, [vehicleOptions]);

  const filteredPartners = useMemo(() => {
    const tripType = currentTrip?.trip_type ?? 'INBOUND_PURCHASE';

    return partners.filter((partner) => {
      if (tripType === 'INBOUND_PURCHASE') {
        return partner.partner_type === 'SUPPLIER' || partner.partner_type === 'BOTH';
      }

      return partner.partner_type === 'BUYER' || partner.partner_type === 'BOTH';
    });
  }, [partners, currentTrip?.trip_type]);

  const activeTrips = useMemo(() => {
    return trips.filter((trip) => {
      const isCurrentTrip = currentTrip ? trip.id === currentTrip.id : false;
      const isFinished = trip.status === 'COMPLETED' || trip.status === 'RECONCILED';
      return !isCurrentTrip && !isFinished;
    });
  }, [trips, currentTrip]);

  const materialSummary = useMemo<MaterialSummary>(() => {
    const rows = currentTrip?.materials ?? [];
    const validRows = rows.filter(
      (row) => row.material_type.trim() && (Number(row.customer_weight) || 0) > 0
    );
    const hasPartialRows = rows.some((row) => {
      const hasType = row.material_type.trim().length > 0;
      const hasWeight = (Number(row.customer_weight) || 0) > 0;
      return hasType !== hasWeight;
    });

    const totalWeight = validRows.reduce(
      (sum, row) => sum + (Number(row.customer_weight) || 0),
      0
    );

    return {
      validRows,
      hasPartialRows,
      totalWeight,
    };
  }, [currentTrip?.materials]);

  const stepThreeSummary = useMemo<StepThreeSummary>(() => {
    const emptyTruckWeight = currentTrip?.initial_weight ?? 0;
    const cargoWeight = materialSummary.totalWeight;
    const grossWeight = emptyTruckWeight + cargoWeight;

    return {
      emptyTruckWeight,
      cargoWeight,
      grossWeight,
      materialCount: materialSummary.validRows.length,
    };
  }, [currentTrip?.initial_weight, materialSummary]);

  const suggestedLoadedWeightIn = useMemo(() => {
    return Math.round(Math.max(stepThreeSummary.grossWeight, 0));
  }, [stepThreeSummary.grossWeight]);

  const stepFourSummary = useMemo<StepFourSummary>(() => {
    const grossInbound = Number(currentTrip?.loaded_weight_in ?? 0);
    const emptyAfterUnload = 0;
    const cargoFromCustomer = materialSummary.totalWeight;
    const storedNetWeight = Number(currentTrip?.our_net_weight ?? 0);
    const inboundMaterialWeight = (currentTrip?.materials ?? [])
      .filter((row) => row.material_type.trim().length > 0 && (Number(row.customer_weight) || 0) > 0)
      .reduce((sum, row) => sum + (Number(row.received_weight) || 0), 0);
    const hasScaleResult = inboundMaterialWeight > 0;
    const cargoActual = hasScaleResult
      ? inboundMaterialWeight
      : storedNetWeight > 0
        ? storedNetWeight
        : cargoFromCustomer;
    const variance = hasScaleResult ? cargoActual - cargoFromCustomer : 0;

    return {
      grossInbound,
      emptyAfterUnload,
      cargoActual,
      cargoFromCustomer,
      variance,
      hasScaleResult,
    };
  }, [
    currentTrip?.loaded_weight_in,
    currentTrip?.materials,
    currentTrip?.our_net_weight,
    materialSummary.totalWeight,
  ]);

  const bagSummary = useMemo<BagSummary>(() => {
    const bags = currentTrip?.bags ?? [];
    const totalWeight = bags.reduce((sum, bag) => sum + (Number(bag.weight) || 0), 0);
    const expectedWeight = stepFourSummary.cargoActual;
    const remainingWeight = expectedWeight - totalWeight;
    const difference = totalWeight - expectedWeight;
    const isMatched = expectedWeight > 0 && remainingWeight === 0;
    const isOverPacked = remainingWeight < 0;
    const progressPct =
      expectedWeight > 0
        ? Math.min((Math.max(totalWeight, 0) / expectedWeight) * 100, 100)
        : 0;

    return {
      totalWeight,
      expectedWeight,
      remainingWeight,
      difference,
      isMatched,
      isOverPacked,
      progressPct,
      bagCount: bags.length,
    };
  }, [currentTrip?.bags, stepFourSummary.cargoActual]);

  const bagMaterialOptions = useMemo(() => {
    const fromMaterials = (currentTrip?.materials ?? [])
      .map((item) => item.material_type.trim())
      .filter((item) => item.length > 0);

    const fromBags = (currentTrip?.bags ?? [])
      .map((bag) => (bag.material ?? '').trim())
      .filter((item) => item.length > 0);

    return Array.from(new Set([...fromMaterials, ...fromBags]));
  }, [currentTrip?.materials, currentTrip?.bags]);

  const isStepOneReady = useMemo(() => {
    if (!currentTrip) return false;
    if (!currentTrip.vehicle_id.trim()) return false;
    if (!(currentTrip.driver_name ?? '').trim()) return false;
    if (!currentTrip.customer_factory.trim()) return false;
    return true;
  }, [currentTrip]);

  const canDeletePersistedMaterials = useMemo(() => {
    if (!currentTrip) return true;
    return currentTrip.status !== 'COMPLETED' && currentTrip.status !== 'RECONCILED';
  }, [currentTrip]);

  useEffect(() => {
    if (currentStep !== 3) return;

    setCurrentTrip((prev) => {
      if (!prev) return prev;
      if (isInitialWeightSkipped) {
        if ((Number(prev.loaded_weight_in) || 0) === 0) return prev;
        return {
          ...prev,
          loaded_weight_in: 0,
        };
      }
      if ((Number(prev.loaded_weight_in) || 0) > 0) return prev;
      if (suggestedLoadedWeightIn <= 0) return prev;

      return {
        ...prev,
        loaded_weight_in: suggestedLoadedWeightIn,
      };
    });
  }, [currentStep, currentTrip?.id, isInitialWeightSkipped, suggestedLoadedWeightIn]);

  const loadTrips = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/trips?scope=active&page=1&pageSize=200');
      if (!response.ok) throw new Error('Failed to load trips');
      const data = await response.json();
      const rows = Array.isArray(data)
        ? data
        : Array.isArray((data as { items?: Trip[] }).items)
          ? (data as { items: Trip[] }).items
          : [];
      setTrips(rows);
    } catch (fetchError) {
      console.error('Error loading trips:', fetchError);
      setError('ไม่สามารถโหลดข้อมูลการเดินทางได้');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHistoryTrips = useCallback(async (page = historyPage) => {
    try {
      setHistoryLoading(true);
      const response = await fetch(
        `/api/trips?scope=history&page=${encodeURIComponent(String(page))}&pageSize=${encodeURIComponent(String(historyPageSize))}`
      );
      if (!response.ok) throw new Error('Failed to load trip history');
      const data = (await response.json()) as {
        items?: Trip[];
        total?: number;
        page?: number;
        pageSize?: number;
        totalPages?: number;
      };

      const items = Array.isArray(data.items) ? data.items : [];
      const total = Number(data.total) || 0;
      const totalPages = Math.max(1, Number(data.totalPages) || 1);
      const currentPage = Math.min(Math.max(1, Number(data.page) || page), totalPages);

      setHistoryTrips(items);
      setHistoryTotal(total);
      setHistoryTotalPages(totalPages);
      if (currentPage !== historyPage) {
        setHistoryPage(currentPage);
      }
    } catch (fetchError) {
      console.error('Error loading trip history:', fetchError);
      setError('ไม่สามารถโหลดประวัติการเดินทางได้');
    } finally {
      setHistoryLoading(false);
    }
  }, [historyPage, historyPageSize]);

  const cleanupStaleActiveTrips = async (olderThanDays = 30) => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/trips/cleanup-stale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          older_than_days: Math.max(0, Math.floor(Number(olderThanDays) || 0)),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'ไม่สามารถลบเที่ยวค้างเก่าได้');
      }

      await Promise.all([loadTrips(), loadHistoryTrips(historyPage)]);
      return payload as {
        deleted?: number;
        scanned?: number;
        protectedByPlan?: number;
      };
    } catch (cleanupError) {
      console.error('Error cleaning stale trips:', cleanupError);
      setError(cleanupError instanceof Error ? cleanupError.message : 'ไม่สามารถลบเที่ยวค้างเก่าได้');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const loadVehicleOptions = useCallback(async () => {
    try {
      const response = await fetch('/api/integrations/automil/vehicles');
      if (!response.ok) throw new Error('Failed to load vehicles');
      const data: VehiclePayload = await response.json();
      setVehicleOptions(data.vehicles || []);
    } catch (fetchError) {
      console.error('Error loading vehicles:', fetchError);
    }
  }, []);

  const loadPartners = useCallback(async () => {
    try {
      const response = await fetch('/api/partners?active=true');
      if (!response.ok) throw new Error('Failed to load partners');
      const data: PartnerPayload = await response.json();
      setPartners(Array.isArray(data) ? data : []);
    } catch (fetchError) {
      console.error('Error loading partners:', fetchError);
    }
  }, []);

  useEffect(() => {
    void loadTrips();
    void loadVehicleOptions();
    void loadPartners();
  }, [loadPartners, loadTrips, loadVehicleOptions]);

  useEffect(() => {
    void loadHistoryTrips(historyPage);
  }, [historyPage, loadHistoryTrips]);

  const resolveStepFromTrip = (trip: Trip): number => {
    const validMaterials = getValidMaterials(trip.materials ?? []);
    const hasInboundWeight = (Number(trip.loaded_weight_in) || 0) > 0;
    const hasInboundMaterial = validMaterials.some((item) => (Number(item.received_weight) || 0) > 0);

    if (hasInboundWeight || hasInboundMaterial) return 3;
    if (validMaterials.length > 0 || (Number(trip.initial_weight) || 0) > 0) return 2;
    return 1;
  };

  const openTrip = async (tripId: string) => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`/api/trips/${tripId}`);
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'ไม่สามารถเปิดเที่ยวนี้ได้');
      }

      const trip = (await response.json()) as Trip;
      setCurrentTrip(trip);
      setCurrentStep(resolveStepFromTrip(trip));
      setIsInitialWeightSkipped((Number(trip.initial_weight) || 0) <= 0);
      return true;
    } catch (fetchError) {
      console.error('Error opening trip:', fetchError);
      setError(fetchError instanceof Error ? fetchError.message : 'ไม่สามารถเปิดเที่ยวนี้ได้');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const createNewTrip = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/trips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vehicleId: '',
          tripType: 'INBOUND_PURCHASE',
          partnerId: null,
          driverName: '',
          customerFactory: '',
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to create trip');
      }

      const newTrip = await response.json();
      setCurrentTrip({ ...newTrip, bags: [], materials: [] });
      setCurrentStep(1);
      setIsInitialWeightSkipped(true);
    } catch (fetchError) {
      console.error('Error creating trip:', fetchError);
      setError(fetchError instanceof Error ? fetchError.message : 'ไม่สามารถสร้างเที่ยวใหม่ได้');
    } finally {
      setLoading(false);
    }
  };

  const updateTrip = async (updates: Partial<Trip>) => {
    if (!currentTrip) return;

    try {
      setLoading(true);
      setError('');

      const response = await fetch(`/api/trips/${currentTrip.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to update trip');
      }

      const updatedTrip = await response.json();
      setCurrentTrip(updatedTrip);
      setIsInitialWeightSkipped((Number(updatedTrip.initial_weight) || 0) <= 0);
    } catch (fetchError) {
      console.error('Error updating trip:', fetchError);
      setError(fetchError instanceof Error ? fetchError.message : 'ไม่สามารถอัพเดทข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  const getValidMaterials = (materials: TripMaterial[] = []): TripMaterial[] => {
    return materials
      .map((material) => ({
        ...material,
        material_type: material.material_type.trim(),
        customer_weight: Number(material.customer_weight) || 0,
        received_weight: Number(material.received_weight) || 0,
        bagged_weight: Number(material.bagged_weight) || 0,
      }))
      .filter((material) => material.material_type && material.customer_weight > 0);
  };

  const buildStepUpdates = (targetStep: number): Partial<Trip> => {
    if (!currentTrip) return {};

    const updates: Partial<Trip> = {};
    updates.vehicle_id = currentTrip.vehicle_id;
    updates.automil_vehicle_id = currentTrip.automil_vehicle_id ?? null;
    updates.driver_name = currentTrip.driver_name ?? '';
    updates.trip_type = currentTrip.trip_type;
    updates.partner_id = currentTrip.partner_id ?? null;
    updates.customer_factory = currentTrip.customer_factory;
    updates.initial_weight = currentTrip.initial_weight;
    updates.loaded_weight_in = currentTrip.loaded_weight_in ?? 0;
    updates.empty_weight_after_unload = currentTrip.empty_weight_after_unload ?? 0;
    updates.materials = getValidMaterials(currentTrip.materials ?? []);
    const now = new Date().toISOString();

    if (targetStep <= 1) {
      updates.status = 'PENDING';
      updates.arrival_time = null;
      updates.return_time = null;
      return updates;
    }

    if (targetStep === 2) {
      updates.status = 'ARRIVED';
      if (!currentTrip.arrival_time) updates.arrival_time = now;
      updates.return_time = null;
      return updates;
    }

    if (targetStep === 3) {
      updates.status = 'ARRIVED_PLANT';
      if (!currentTrip.arrival_time) updates.arrival_time = now;
      if (!currentTrip.return_time) updates.return_time = now;
      return updates;
    }

    updates.status = 'RECONCILED';
    if (!currentTrip.arrival_time) updates.arrival_time = now;
    if (!currentTrip.return_time) updates.return_time = now;
    return updates;
  };

  const jumpToStep = async (targetStep: number) => {
    if (!currentTrip || loading) return;

    const normalizedStep = Math.max(1, Math.min(targetStep, COMPLETION_STEP));
    if (normalizedStep === currentStep) return;

    if (normalizedStep > 1) {
      if (!currentTrip.vehicle_id.trim()) {
        setError('กรุณาเลือกทะเบียนรถก่อนไปขั้นตอนถัดไป');
        return;
      }
      if (!(currentTrip.driver_name ?? '').trim()) {
        setError('กรุณาเลือกคนขับก่อนไปขั้นตอนถัดไป');
        return;
      }
      if (!currentTrip.customer_factory.trim()) {
        setError('กรุณาระบุว่าจะไปที่ไหนก่อนไปขั้นตอนถัดไป');
        return;
      }
    }

    if (normalizedStep > 2) {
      if (!isInitialWeightSkipped && currentTrip.initial_weight === 0) {
        setError('กรุณากรอกน้ำหนักรถเปล่าก่อนขึ้นของ');
        return;
      }
      if (materialSummary.validRows.length === 0 || materialSummary.hasPartialRows) {
        setError('กรุณาระบุรายการ scrap และน้ำหนักให้ครบก่อนข้ามขั้นตอน');
        return;
      }
    }

    if (normalizedStep > 3) {
      if (!isInitialWeightSkipped) {
        const grossInbound = currentTrip.loaded_weight_in ?? 0;
        if (grossInbound === 0) {
          setError('กรุณากรอกน้ำหนักรถขาเข้าก่อนไปขั้นตอนถัดไป');
          return;
        }
      }
    }

    const updates = buildStepUpdates(normalizedStep);
    await updateTrip(updates);

    if (normalizedStep === COMPLETION_STEP) {
      await Promise.all([loadTrips(), loadHistoryTrips(historyPage)]);
      setCurrentTrip(null);
      setCurrentStep(1);
      setIsInitialWeightSkipped(true);
      setHistoryPage(1);
      await loadHistoryTrips(1);
      return;
    }

    setCurrentStep(normalizedStep);
  };

  const saveCurrentStep = async () => {
    if (!currentTrip) return;

    const validMaterials = getValidMaterials(currentTrip.materials ?? []);
    const basePayload: Partial<Trip> = {
      vehicle_id: currentTrip.vehicle_id,
      automil_vehicle_id: currentTrip.automil_vehicle_id ?? null,
      driver_name: currentTrip.driver_name ?? '',
      trip_type: currentTrip.trip_type,
      partner_id: currentTrip.partner_id ?? null,
      customer_factory: currentTrip.customer_factory,
    };

    if (currentStep === 1) {
      await updateTrip(basePayload);
      await Promise.all([loadTrips(), loadHistoryTrips(historyPage)]);
      return;
    }

    if (currentStep === 2) {
      await updateTrip({
        ...basePayload,
        initial_weight: isInitialWeightSkipped
          ? 0
          : Math.max(0, Math.round(Number(currentTrip.initial_weight) || 0)),
        customer_reported_weight: validMaterials.reduce(
          (sum, item) => sum + (Number(item.customer_weight) || 0),
          0
        ),
        materials: validMaterials,
      });
      await Promise.all([loadTrips(), loadHistoryTrips(historyPage)]);
      return;
    }

    await updateTrip({
      ...basePayload,
      loaded_weight_in: Math.max(0, Math.round(Number(currentTrip.loaded_weight_in) || 0)),
      customer_reported_weight: validMaterials.reduce(
        (sum, item) => sum + (Number(item.customer_weight) || 0),
        0
      ),
      materials: validMaterials,
    });
    await Promise.all([loadTrips(), loadHistoryTrips(historyPage)]);
  };

  const nextStep = async () => {
    if (!currentTrip || currentStep > LAST_STEP) return;
    await jumpToStep(currentStep + 1);
  };

  const updateTripField = (field: keyof Trip, value: string | number | null) => {
    if (!currentTrip) return;

    setCurrentTrip({
      ...currentTrip,
      [field]: value,
    });
  };

  const submitMaterialReceivedWeight = async (index: number, value?: number) => {
    if (!currentTrip) return;
    const materials = [...(currentTrip.materials ?? [])];
    const target = materials[index];
    if (!target) return;

    const receivedWeight = Math.max(
      0,
      Math.round((value ?? Number(target.received_weight)) || 0)
    );
    if (receivedWeight <= 0) {
      setError('กรุณากรอกน้ำหนักขาเข้าของรายการนี้ก่อนบันทึก');
      return;
    }

    materials[index] = {
      ...target,
      received_weight: receivedWeight,
    };

    setCurrentTrip({
      ...currentTrip,
      materials,
    });

    setError('');
    await updateTrip({
      materials: getValidMaterials(materials),
    } as Partial<Trip>);
  };

  const clearMaterialReceivedWeight = async (index: number) => {
    if (!currentTrip) return;
    const materials = [...(currentTrip.materials ?? [])];
    const target = materials[index];
    if (!target) return;

    materials[index] = {
      ...target,
      received_weight: 0,
    };

    setCurrentTrip({
      ...currentTrip,
      materials,
    });

    setError('');
    await updateTrip({
      materials: getValidMaterials(materials),
    } as Partial<Trip>);
  };

  const submitLoadedInboundWeight = async (value?: number) => {
    if (!currentTrip) return;

    const loadedInbound = Math.max(
      0,
      Math.round((value ?? Number(currentTrip.loaded_weight_in)) || 0)
    );
    if (loadedInbound <= 0) {
      setError('กรุณากรอกน้ำหนักรถขาเข้าก่อนบันทึก');
      return;
    }

    setCurrentTrip({
      ...currentTrip,
      loaded_weight_in: loadedInbound,
    });

    setError('');
    await updateTrip({
      loaded_weight_in: loadedInbound,
    });
  };

  const setInitialWeight = (weight: number) => {
    if (!currentTrip) return;
    setError('');
    setIsInitialWeightSkipped(false);
    setCurrentTrip({
      ...currentTrip,
      initial_weight: Math.max(0, Math.round(weight)),
    });
  };

  const toggleInitialWeightSkip = (value: boolean) => {
    if (!currentTrip) return;

    setError('');
    setIsInitialWeightSkipped(value);

    if (value && (currentTrip.initial_weight !== 0 || (currentTrip.loaded_weight_in ?? 0) !== 0)) {
      setCurrentTrip({
        ...currentTrip,
        initial_weight: 0,
        loaded_weight_in: 0,
      });
    }
  };

  const clearInitialWeight = () => {
    if (!currentTrip) return;
    setCurrentTrip({
      ...currentTrip,
      initial_weight: 0,
    });
  };

  const addMaterialItem = (materialType: string, customerWeight: number) => {
    if (!currentTrip) return;

    const type = materialType.trim();
    const weight = Math.max(0, Math.round(customerWeight));
    if (!type || weight <= 0) return;

    const currentRows = (currentTrip.materials ?? []).filter(
      (row) => row.material_type.trim() && (Number(row.customer_weight) || 0) > 0
    );

    if (currentRows.length >= MAX_MATERIAL_ROWS) {
      setError(`เพิ่มรายการได้สูงสุด ${MAX_MATERIAL_ROWS} รายการต่อเที่ยว`);
      return;
    }

    setError('');
    setCurrentTrip({
      ...currentTrip,
      materials: [
        ...(currentTrip.materials ?? []),
        {
          material_type: type,
          customer_weight: weight,
          received_weight: 0,
          bagged_weight: 0,
        },
      ],
    });
  };

  const removeMaterialRow = (index: number) => {
    if (!currentTrip) return;
    const materials = [...(currentTrip.materials ?? [])];
    const target = materials[index];
    if (!target) return;

    if (target.id && !canDeletePersistedMaterials) {
      setError('ปิดเที่ยวแล้ว ไม่สามารถลบรายการวัสดุที่บันทึกแล้วได้');
      return;
    }

    const next = materials.filter((_, i) => i !== index);
    setCurrentTrip({
      ...currentTrip,
      materials: next,
    });
    setError('');

    if (target.id) {
      void updateTrip({
        materials: getValidMaterials(next),
      } as Partial<Trip>);
    }
  };

  const updateVehicleSelection = (vehicleId: string) => {
    if (!currentTrip) return;

    const selectedVehicle = vehicleOptions.find((vehicle) => vehicle.id === vehicleId);
    setCurrentTrip({
      ...currentTrip,
      automil_vehicle_id: selectedVehicle?.id ?? null,
      vehicle_id: selectedVehicle?.plateNo ?? '',
    });
  };

  const updatePartnerSelection = (partnerId: string) => {
    if (!currentTrip) return;

    if (!partnerId) {
      setCurrentTrip({
        ...currentTrip,
        partner_id: null,
      });
      return;
    }

    const partner = partners.find((item) => item.id === partnerId);
    setCurrentTrip({
      ...currentTrip,
      partner_id: partnerId,
      customer_factory: currentTrip.customer_factory || partner?.factory_name || partner?.name || '',
    });
  };

  const updateTripType = (tripType: TripType) => {
    if (!currentTrip) return;

    const selectedPartner = partners.find((item) => item.id === currentTrip.partner_id);
    const isCompatible = !selectedPartner
      ? true
      : tripType === 'INBOUND_PURCHASE'
        ? selectedPartner.partner_type === 'SUPPLIER' || selectedPartner.partner_type === 'BOTH'
        : selectedPartner.partner_type === 'BUYER' || selectedPartner.partner_type === 'BOTH';

    setCurrentTrip({
      ...currentTrip,
      trip_type: tripType,
      partner_id: isCompatible ? currentTrip.partner_id ?? null : null,
    });
  };

  const addBag = async () => {
    if (!currentTrip) return;

    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/bags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          weight: 0,
          material: '',
          tripId: currentTrip.id,
        }),
      });

      if (!response.ok) throw new Error('Failed to create bag');

      const newBag = await response.json();
      setCurrentTrip({
        ...currentTrip,
        bags: [...(currentTrip.bags || []), newBag],
      });
    } catch (fetchError) {
      console.error('Error creating bag:', fetchError);
      setError('ไม่สามารถเพิ่มเป้ได้');
    } finally {
      setLoading(false);
    }
  };

  const updateBag = (bagId: string, field: 'weight' | 'material', value: string | number) => {
    if (!currentTrip) return;

    setCurrentTrip({
      ...currentTrip,
      bags:
        currentTrip.bags?.map((bag) =>
          bag.id === bagId ? { ...bag, [field]: value } : bag
        ) || [],
    });
  };

  const saveBagData = async (bagId: string, data: { weight?: number; material?: string }) => {
    try {
      const response = await fetch(`/api/bags/${bagId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to update bag');
    } catch (fetchError) {
      console.error('Error updating bag:', fetchError);
      setError('ไม่สามารถอัพเดทข้อมูลเป้ได้');
    }
  };

  const deleteBag = async (bagId: string) => {
    if (!currentTrip) return;

    try {
      const response = await fetch(`/api/bags/${bagId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete bag');

      setCurrentTrip({
        ...currentTrip,
        bags: currentTrip.bags?.filter((bag) => bag.id !== bagId) || [],
      });
    } catch (fetchError) {
      console.error('Error deleting bag:', fetchError);
      setError('ไม่สามารถลบเป้ได้');
    }
  };

  const resetTrip = () => {
    setCurrentTrip(null);
    setCurrentStep(1);
    setError('');
    setIsInitialWeightSkipped(true);
  };

  const preventDecimalInput = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === '.' || event.key === ',') {
      event.preventDefault();
    }
  };

  const selectInputValueOnFocus = (event: FocusEvent<HTMLInputElement>) => {
    event.currentTarget.select();
  };

  const numberInputValue = (value: number): string => {
    if (value === 0) return '';
    return String(Math.round(value));
  };

  const parseWeightInput = (raw: string): number => {
    if (raw === '') return 0;
    return Math.max(0, Math.round(parseFloat(raw) || 0));
  };

  const formatWeight = (value: number): string => {
    return Math.round(value).toLocaleString('th-TH');
  };

  const fillBagToRemaining = async (bagId: string) => {
    if (!currentTrip) return;

    const targetBag = (currentTrip.bags ?? []).find((bag) => bag.id === bagId);
    if (!targetBag) return;

    const otherWeight = bagSummary.totalWeight - (targetBag.weight || 0);
    const nextWeight = Math.max(bagSummary.expectedWeight - otherWeight, 0);

    updateBag(bagId, 'weight', nextWeight);
    await saveBagData(bagId, { weight: nextWeight });
  };

  const isNextStepDisabled = useMemo((): boolean => {
    if (loading) return true;
    if (currentStep === 1 && !isStepOneReady) return true;
    if (currentStep === 2) {
      if (!isInitialWeightSkipped && currentTrip?.initial_weight === 0) return true;
      if (materialSummary.validRows.length === 0) return true;
      if (materialSummary.hasPartialRows) return true;
    }
    if (currentStep === 3) {
      if (!isInitialWeightSkipped) {
        if ((currentTrip?.loaded_weight_in ?? 0) === 0) return true;
      }
    }
    return false;
  }, [
    loading,
    currentStep,
    isInitialWeightSkipped,
    isStepOneReady,
    currentTrip?.initial_weight,
    currentTrip?.loaded_weight_in,
    materialSummary.validRows.length,
    materialSummary.hasPartialRows,
  ]);

  return {
    currentTrip,
    currentStep,
    loading,
    error,
    trips,
    activeTrips,
    vehicleOptions,
    partners,
    driverOptions,
    filteredPartners,
    historyTrips,
    historyPage,
    historyPageSize,
    historyTotal,
    historyTotalPages,
    historyLoading,
    materialSummary,
    stepThreeSummary,
    stepFourSummary,
    bagSummary,
    bagMaterialOptions,
    canDeletePersistedMaterials,
    isInitialWeightSkipped,
    suggestedLoadedWeightIn,
    isNextStepDisabled,
    steps: TRIP_STEPS,
    materialOptions: MATERIAL_OPTIONS,
    maxMaterialRows: MAX_MATERIAL_ROWS,
    lastStep: LAST_STEP,
    createNewTrip,
    cleanupStaleActiveTrips,
    openTrip,
    nextStep,
    jumpToStep,
    saveCurrentStep,
    resetTrip,
    updateTripField,
    updateTripType,
    updateVehicleSelection,
    updatePartnerSelection,
    submitMaterialReceivedWeight,
    clearMaterialReceivedWeight,
    submitLoadedInboundWeight,
    setInitialWeight,
    toggleInitialWeightSkip,
    clearInitialWeight,
    addMaterialItem,
    removeMaterialRow,
    addBag,
    updateBag,
    saveBagData,
    deleteBag,
    fillBagToRemaining,
    preventDecimalInput,
    selectInputValueOnFocus,
    numberInputValue,
    parseWeightInput,
    formatWeight,
    setHistoryPage,
  };
}
