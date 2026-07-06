export enum SlotStatus {
    AVAILABLE = 'AVAILABLE',
    RESERVED = 'RESERVED', 
    CONFIRMED = 'CONFIRMED',
    CANCELLED = 'CANCELLED'
}

// represents an Interviewer in a Pool
export interface PoolMember {
    pool_id: number;
    interviewer_id: number;
    reliability_score: number;
}

// represents a single Time Slot
export interface AvailabilitySlot {
    id: number;
    interviewer_id: number;
    start_time_utc: Date; 
    end_time_utc: Date;
    timezone_iana: string; 
    status: SlotStatus;
    recurrence_group_id?: string | null;
    created_at: Date;
}

export interface CreateSlotPayload {
    interviewer_id: number;
    start_time: string; 
    end_time: string;   
    timezone_iana: string;
    is_recurring: boolean;
    weeks_to_repeat?: number; 
}