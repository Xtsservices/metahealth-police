export interface Patient {
    id: string;
    name: string;
    mobile: string;
    aadhar: string;
    policeIdNo: string;
    status: 'active' | 'inactive' | 'suspended';
    createdDate: Date;
    updatedAt: Date;
    lastLogin?: Date;
}

export interface CreatePatientRequest {
    name: string;
    mobile: string;
    aadhar: string;
    policeIdNo: string;
    // Optional appointment fields (hospitalId comes from token)
    appointmentDate?: string; // YYYY-MM-DD format
    appointmentTime?: string; // HH:MM format
    purpose?: string;
    notes?: string;
}

export interface UpdatePatientRequest {
    name?: string;
    mobile?: string;
    aadhar?: string;
    policeIdNo?: string;
    status?: 'active' | 'inactive' | 'suspended';
}

export interface PatientLoginRequest {
    mobile: string;
}

export interface PatientOTPRequest {
    mobile: string;
    otp: string;
}
