export interface Hospital {
    id: string;
    name: string;
    address: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
    };
    contactInfo: {
        countryCode: string;
        phone: string;
        email: string;
        pointOfContact: string;
    };
    licenseNumber: string;
    gstNumber: string;
    panNumber: string;
    registrationDate: Date;
    status: 'active' | 'inactive' | 'suspended';
}

export interface HospitalRegistrationRequest {
    name: string;
    address: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
    };
    contactInfo: {
        countryCode: string;
        phone: string;
        email: string;
        pointOfContact: string;
    };
    licenseNumber: string;
    gstNumber: string;
    panNumber: string;
}
