export interface AppointmentDocument {
    id: string;
    appointmentId: string;
    documentType: 'lab_report' | 'prescription' | 'operation_sheet' | 'other';
    documentName: string;
    filePath: string;
    fileSize: number;
    mimeType: string;
    uploadedBy: string;
    uploadedById?: string;
    description?: string;
    createdDate: Date;
    updatedAt: Date;
}

export interface UploadDocumentRequest {
    appointmentId: string;
    documentType: 'lab_report' | 'prescription' | 'operation_sheet' | 'other';
    description?: string;
}

export interface DocumentListResponse {
    appointmentId: string;
    documents: {
        labReports: AppointmentDocument[];
        prescriptions: AppointmentDocument[];
        operationSheets: AppointmentDocument[];
        other: AppointmentDocument[];
    };
    totalCount: number;
}

export interface DocumentUploadResponse {
    id: string;
    appointmentId: string;
    documentType: string;
    documentName: string;
    fileSize: number;
    mimeType: string;
    uploadedBy: string;
    description?: string;
    createdDate: Date;
}
