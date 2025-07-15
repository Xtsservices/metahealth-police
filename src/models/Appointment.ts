export interface Appointment {
    id: string;
    patientId: string;
    hospitalId: string;
    appointmentDate: Date;
    appointmentTime: string;
    status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
    purpose: string;
    notes?: string;
    createdDate: Date;
    updatedAt: Date;
    
    // Extended fields for API responses
    patientName?: string;
    patientMobile?: string;
    hospitalName?: string;
    hospitalPhone?: string;
}

export interface CreateAppointmentRequest {
    patientId: string;
    hospitalId: string;
    appointmentDate: string; // YYYY-MM-DD format
    appointmentTime: string; // HH:MM format
    purpose: string;
    notes?: string;
}

export interface UpdateAppointmentRequest {
    appointmentDate?: string;
    appointmentTime?: string;
    status?: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
    purpose?: string;
    notes?: string;
}

export interface AppointmentFilterRequest {
    patientId?: string;
    hospitalId?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
}
