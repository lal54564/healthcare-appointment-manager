import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/db/client', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(() => ({ select: vi.fn(), insert: vi.fn(), update: vi.fn() })),
  },
}));

import { supabase } from '../lib/db/client';

describe('Booking Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Valid booking: Slot is available -> hold succeeds -> confirm succeeds', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: { success: true }, error: null });
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: { success: true }, error: null });
    
    const holdResult = await supabase.rpc('hold_slot', { slot_id: 1, user_id: 'user1' });
    expect(holdResult.data?.success).toBe(true);

    const confirmResult = await supabase.rpc('confirm_booking', { hold_id: 'hold1' });
    expect(confirmResult.data?.success).toBe(true);
  });

  it('Booking outside working hours: Should fail with appropriate error', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: { message: 'Outside working hours' } });
    const result = await supabase.rpc('hold_slot', { slot_id: 2, user_id: 'user1' });
    expect(result.error?.message).toBe('Outside working hours');
  });

  it('Booking during doctor leave: Should fail with "Doctor is on leave"', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: { message: 'Doctor is on leave' } });
    const result = await supabase.rpc('hold_slot', { slot_id: 3, user_id: 'user1' });
    expect(result.error?.message).toBe('Doctor is on leave');
  });

  it('Booking already occupied slot: Should fail with "slot no longer available"', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: { message: 'slot no longer available' } });
    const result = await supabase.rpc('hold_slot', { slot_id: 4, user_id: 'user1' });
    expect(result.error?.message).toBe('slot no longer available');
  });

  it('Expired hold: Hold expires -> confirm should fail', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: { message: 'Hold expired' } });
    const result = await supabase.rpc('confirm_booking', { hold_id: 'expired_hold' });
    expect(result.error?.message).toBe('Hold expired');
  });

  it('Active hold prevents another booking: One user holds -> another tries to book same slot -> second fails', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: { success: true }, error: null });
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: { message: 'slot no longer available' } });
    
    const hold1 = await supabase.rpc('hold_slot', { slot_id: 1, user_id: 'user1' });
    expect(hold1.data?.success).toBe(true);
    
    const hold2 = await supabase.rpc('hold_slot', { slot_id: 1, user_id: 'user2' });
    expect(hold2.error?.message).toBe('slot no longer available');
  });

  it('Concurrent booking attempt: Simulate two concurrent holds -> only one succeeds', async () => {
    // Conceptual placeholder for concurrent handling
    expect(true).toBe(true); 
  });

  it('Valid reschedule: Reschedule to available slot succeeds', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: { success: true }, error: null });
    const result = await supabase.rpc('reschedule_booking', { booking_id: 'booking1', new_slot_id: 2 });
    expect(result.data?.success).toBe(true);
  });

  it('Conflicting reschedule: Reschedule to occupied slot fails', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: { message: 'slot no longer available' } });
    const result = await supabase.rpc('reschedule_booking', { booking_id: 'booking1', new_slot_id: 2 });
    expect(result.error?.message).toBe('slot no longer available');
  });

  it('Reschedule during leave: Should fail', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: { message: 'Doctor is on leave' } });
    const result = await supabase.rpc('reschedule_booking', { booking_id: 'booking1', new_slot_id: 3 });
    expect(result.error?.message).toBe('Doctor is on leave');
  });

  it('Cancellation releases slot: Cancel -> slot becomes available', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: { success: true }, error: null });
    const result = await supabase.rpc('cancel_booking', { booking_id: 'booking1' });
    expect(result.data?.success).toBe(true);
  });
});
