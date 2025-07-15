export interface User {
    id: string;
    name: string;
    phone: string;
    email: string;
    role: 'hospital_admin' | 'system_admin' | 'operator';
    status: 'active' | 'inactive' | 'suspended';
    hospitalId: string; // Foreign key to hospitals table
    createdDate: Date;
    updatedAt: Date;
}

export interface UserRegistrationRequest {
    name: string;
    phone: string;
    email: string;
    hospitalId: string;
    role?: 'hospital_admin' | 'system_admin' | 'operator'; // Optional, defaults to hospital_admin
}
