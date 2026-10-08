// ============================================
// Digital Civil Registry - Type Definitions
// ============================================

// -------------------- Roles & Permissions --------------------

export type UserRole = 
  | 'super_admin'
  | 'zone_admin'
  | 'woreda_admin'
  | 'kebele_admin'
  | 'auditor'
  | 'verification_officer';

export type Permission =
  // Resident permissions
  | 'residents:create'
  | 'residents:read'
  | 'residents:update'
  | 'residents:delete'
  | 'residents:export'
  // Household permissions
  | 'households:create'
  | 'households:read'
  | 'households:update'
  | 'households:delete'
  // ID Management permissions
  | 'id:generate'
  | 'id:verify'
  | 'id:reissue'
  | 'id:revoke'
  // Duplicate permissions
  | 'duplicates:review'
  | 'duplicates:merge'
  | 'duplicates:flag'
  // Transfer permissions
  | 'transfers:initiate'
  | 'transfers:approve'
  | 'transfers:reject'
  | 'transfers:view'
  // Life events permissions
  | 'events:create'
  | 'events:read'
  | 'events:update'
  // Reports permissions
  | 'reports:view'
  | 'reports:export'
  | 'reports:create'
  // Finance permissions
  | 'finance:view'
  // Administration permissions
  | 'admin:users'
  | 'admin:zones'
  | 'admin:woredas'
  | 'admin:kebeles'
  | 'admin:settings'
  // Audit permissions
  | 'audit:view'
  | 'audit:export';

// -------------------- Geographic Hierarchy --------------------

export interface Zone {
  id: string;
  code: string; // 2-digit code (e.g., "01")
  name: string;
  population: number;
  woredaCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Woreda {
  id: string;
  zoneId: string;
  code: string; // 2-digit code (e.g., "03")
  name: string;
  population: number;
  kebeleCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Kebele {
  id: string;
  woredaId: string;
  zoneId: string;
  code: string; // 2-digit code (e.g., "05")
  name: string;
  population: number;
  householdCount: number;
  createdAt: string;
  updatedAt: string;
}

// -------------------- Users --------------------

export interface User {
  id: string;
  email: string;
  password: string; // Hashed in real implementation
  firstName: string;
  lastName: string;
  role: UserRole;
  // Geographic scope - determines what data they can access
  scope: {
    type: 'city' | 'zone' | 'woreda' | 'kebele';
    zoneId?: string;
    woredaId?: string;
    kebeleId?: string;
  };
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

// -------------------- Residents --------------------

export type ResidentStatus = 
  | 'active'
  | 'inactive'
  | 'deceased'
  | 'transferred_out'
  | 'suspended';

export type Gender = 'male' | 'female';

export type MaritalStatus = 
  | 'single'
  | 'married'
  | 'divorced'
  | 'widowed'
  | 'separated';

export interface Resident {
  id: string;
  // Kebele ID - the main identifier
  kebeleId: string;
  woredaId: string;
  zoneId: string;
  
  // Personal Information
  firstName: string;
  fatherName: string; // Ethiopian naming convention
  grandFatherName: string;
  firstName_am?: string; // Amharic version
  fatherName_am?: string;
  grandFatherName_am?: string;
  
  dateOfBirth: string;
  gender: Gender;
  nationality: string;
  ethnicity?: string;
  religion?: string;
  maritalStatus: MaritalStatus;
  occupation?: string;
  
  // Contact Information
  phoneNumber?: string;
  alternatePhone?: string;
  email?: string;
  
  // Address
  address: {
    houseNumber?: string;
    streetName?: string;
    subcity?: string;
    city: string;
  };
  
  // Photo
  photoUrl?: string;
  faceStatus?: 'pending' | 'ready' | 'failed';
  faceError?: string;
  faceUpdatedAt?: string;
  
  // Household Information
  householdId?: string;
  householdRole?: 'head' | 'spouse' | 'child' | 'relative' | 'other';
  
  // ID Information
  idNumber?: string; // Generated Kebele ID
  idIssuedDate?: string;
  idExpiryDate?: string;
  idStatus?: 'pending' | 'active' | 'expired' | 'revoked' | 'reissued';
  
  // Status
  status: ResidentStatus;
  registrationDate: string;
  registeredBy: string; // User ID
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

// -------------------- Households --------------------

export interface Household {
  id: string;
  kebeleId: string;
  woredaId: string;
  zoneId: string;
  
  // Head of Household
  headResidentId: string;
  
  // Address
  address: {
    houseNumber: string;
    streetName?: string;
    landmark?: string;
    gpsCoordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  
  // Contact
  contactPhone?: string;
  
  // Members
  memberCount: number;
  
  // Status
  status: 'active' | 'inactive' | 'relocated';
  
  createdAt: string;
  updatedAt: string;
}

// -------------------- Family Relationships --------------------

export type RelationshipType =
  | 'parent'
  | 'child'
  | 'spouse'
  | 'sibling'
  | 'grandparent'
  | 'grandchild'
  | 'uncle_aunt'
  | 'nephew_niece'
  | 'cousin'
  | 'guardian'
  | 'dependent'
  | 'other';

export interface FamilyRelationship {
  id: string;
  residentId: string;
  relatedResidentId: string;
  relationshipType: RelationshipType;
  isPrimary: boolean; // Primary relationship (for graph display)
  startDate: string;
  endDate?: string; // For divorced, deceased relationships
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// -------------------- ID Card --------------------

export interface IDCard {
  id: string;
  residentId: string;
  idNumber: string; // ETH-ADD-01-03-05-2026-004589-X format
  internalId: number; // Numeric ID for database indexing
  
  // Issue Information
  issuedDate: string;
  expiryDate: string;
  issuedBy: string; // User ID
  issueLocation: string; // Kebele ID
  
  // QR Code
  qrToken: string; // Encrypted verification token
  
  // Status
  status: 'active' | 'expired' | 'revoked' | 'replaced';
  replacedById?: string;
  revocationReason?: string;
  
  // Print Information
  printCount: number;
  lastPrintedAt?: string;
  
  createdAt: string;
  updatedAt: string;
}

// -------------------- Duplicate Cases --------------------

export type DuplicateStatus = 
  | 'pending_review'
  | 'confirmed_duplicate'
  | 'not_duplicate'
  | 'merged'
  | 'flagged';

export interface DuplicateCase {
  id: string;
  resident1Id: string;
  resident2Id: string;
  
  // Scoring
  overallScore: number; // 0-100
  scores: {
    nameScore: number;
    phoneticScore: number;
    dobScore: number;
    phoneScore: number;
    addressScore: number;
    genderScore: number;
    householdScore: number;
    faceScore?: number;
  };
  
  // Status
  status: DuplicateStatus;
  priority: 'low' | 'medium' | 'high' | 'critical';
  
  // Review
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  decision?: 'merge' | 'keep_both' | 'flag_for_audit';
  
  // Merge Information
  mergedResidentId?: string;
  mergedAt?: string;
  
  // Auto-detection metadata
  detectedAt: string;
  detectionMethod: 'registration' | 'batch_scan' | 'manual_flag';
  
  createdAt: string;
  updatedAt: string;
}

// -------------------- Transfers --------------------

export type TransferStatus =
  | 'draft'
  | 'submitted'
  | 'pending_destination'
  | 'approved'
  | 'rejected'
  | 'completed'
  | 'cancelled';

export type TransferType = 'within_woreda' | 'cross_woreda' | 'cross_zone';

export interface Transfer {
  id: string;
  residentId: string;
  
  // Source Location
  sourceKebeleId: string;
  sourceWoredaId: string;
  sourceZoneId: string;
  
  // Destination Location
  destinationKebeleId: string;
  destinationWoredaId: string;
  destinationZoneId: string;
  
  // Transfer Details
  transferType: TransferType;
  reason: string;
  
  // Status & Workflow
  status: TransferStatus;
  
  // Approval Chain
  initiatedBy: string;
  initiatedAt: string;
  
  sourceApprovedBy?: string;
  sourceApprovedAt?: string;
  
  destinationApprovedBy?: string;
  destinationApprovedAt?: string;
  
  completedBy?: string;
  completedAt?: string;
  
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  
  // ID Handling
  requiresNewId: boolean;
  newIdNumber?: string;
  
  createdAt: string;
  updatedAt: string;
}

// -------------------- Life Events --------------------

export type LifeEventType =
  | 'birth'
  | 'death'
  | 'marriage'
  | 'divorce'
  | 'address_change'
  | 'name_change'
  | 'status_change';

export interface LifeEvent {
  id: string;
  residentId: string;
  eventType: LifeEventType;
  eventDate: string;
  
  // Event-specific data (polymorphic)
  data: BirthEventData | DeathEventData | MarriageEventData | DivorceEventData | AddressChangeData | NameChangeData | StatusChangeData;
  
  // Documentation
  documentRefs?: string[];
  notes?: string;
  
  // Related residents
  relatedResidentIds?: string[];
  
  // Registration
  registeredBy: string;
  registeredAt: string;
  verifiedBy?: string;
  verifiedAt?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface BirthEventData {
  type: 'birth';
  birthPlace: string;
  birthCertificateNumber?: string;
  motherId?: string;
  fatherId?: string;
  birthWeight?: number;
}

export interface DeathEventData {
  type: 'death';
  deathPlace: string;
  deathCertificateNumber?: string;
  causeOfDeath?: string;
  nextOfKinId?: string;
}

export interface MarriageEventData {
  type: 'marriage';
  spouseId: string;
  marriagePlace: string;
  marriageCertificateNumber?: string;
  witnessIds?: string[];
}

export interface DivorceEventData {
  type: 'divorce';
  exSpouseId: string;
  divorceCertificateNumber?: string;
  courtReference?: string;
}

export interface AddressChangeData {
  type: 'address_change';
  previousAddress: Resident['address'];
  newAddress: Resident['address'];
  previousHouseholdId?: string;
  newHouseholdId?: string;
}

export interface NameChangeData {
  type: 'name_change';
  previousFirstName: string;
  previousFatherName: string;
  previousGrandFatherName: string;
  newFirstName: string;
  newFatherName: string;
  newGrandFatherName: string;
  reason: string;
  courtReference?: string;
}

export interface StatusChangeData {
  type: 'status_change';
  previousStatus: ResidentStatus;
  newStatus: ResidentStatus;
  reason: string;
}

// -------------------- Audit Logs --------------------

export type AuditAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'payment'
  | 'login'
  | 'logout'
  | 'export'
  | 'merge'
  | 'transfer'
  | 'generate_id'
  | 'verify_id'
  | 'approve'
  | 'reject';

export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  userRole: UserRole;
  
  action: AuditAction;
  resourceType: 'resident' | 'household' | 'id_card' | 'transfer' | 'duplicate' | 'life_event' | 'user' | 'system';
  resourceId?: string;
  
  // Change Details
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  
  // Context
  description: string;
  ipAddress?: string;
  userAgent?: string;
  
  // Geographic context
  kebeleId?: string;
  woredaId?: string;
  zoneId?: string;
  
  timestamp: string;
}

// -------------------- Statistics --------------------

export interface DashboardStats {
  totalResidents: number;
  activeResidents: number;
  totalHouseholds: number;
  newRegistrationsToday: number;
  newRegistrationsThisWeek: number;
  newRegistrationsThisMonth: number;
  pendingDuplicates: number;
  pendingTransfers: number;
  idCardsIssued: number;
  malePopulation: number;
  femalePopulation: number;
}

export interface PopulationByAge {
  ageGroup: string;
  male: number;
  female: number;
}

export interface PopulationTrend {
  month: string;
  registrations: number;
  transfers_in: number;
  transfers_out: number;
  deaths: number;
}

// -------------------- Notifications --------------------

export type NotificationType =
  | 'duplicate_flagged'
  | 'transfer_request'
  | 'transfer_approved'
  | 'transfer_rejected'
  | 'id_expiring'
  | 'suspicious_activity'
  | 'system_alert';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

// -------------------- Search & Filters --------------------

export interface ResidentSearchFilters {
  query?: string;
  status?: ResidentStatus[];
  gender?: Gender;
  minAge?: number;
  maxAge?: number;
  kebeleId?: string;
  woredaId?: string;
  zoneId?: string;
  hasId?: boolean;
  registrationDateFrom?: string;
  registrationDateTo?: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
