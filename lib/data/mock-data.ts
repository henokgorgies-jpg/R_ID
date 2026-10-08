// ============================================
// Mock Data for Digital Civil Registry
// ============================================

import { 
  type User, 
  type Zone, 
  type Woreda, 
  type Kebele, 
  type Resident,
  type Household,
  type FamilyRelationship,
  type IDCard,
  type DuplicateCase,
  type Transfer,
  type LifeEvent,
  type AuditLog,
  type Notification,
  type DashboardStats,
  type PopulationByAge,
  type PopulationTrend,
} from './types';

// -------------------- Ethiopian Names --------------------

const MALE_FIRST_NAMES = [
  'Abebe', 'Alemu', 'Bekele', 'Dawit', 'Ephrem', 'Fikru', 'Girma', 'Hailu',
  'Isayas', 'Jemal', 'Kebede', 'Lemma', 'Mesfin', 'Negash', 'Osman', 'Petros',
  'Reta', 'Solomon', 'Tadesse', 'Yohannes', 'Zerihun', 'Abraham', 'Biniam',
  'Daniel', 'Elias', 'Fasil', 'Getachew', 'Henok', 'Kidane', 'Markos',
  'Nahom', 'Samuel', 'Tewodros', 'Worku', 'Yared', 'Zelalem', 'Amanuel',
  'Bereket', 'Dereje', 'Eyob', 'Fisseha', 'Gebremichael', 'Habtamu', 'Yosef',
];

const FEMALE_FIRST_NAMES = [
  'Abeba', 'Alem', 'Bezawit', 'Chaltu', 'Eden', 'Frehiwot', 'Gelila', 'Hanna',
  'Hirut', 'Kidist', 'Liya', 'Mahlet', 'Meron', 'Nardos', 'Rahel', 'Sara',
  'Selam', 'Tigist', 'Tsion', 'Yemsrach', 'Yeshi', 'Zenebech', 'Almaz',
  'Birtukan', 'Dagmawit', 'Emebet', 'Fantaye', 'Genet', 'Hiwot', 'Kedija',
  'Lemlem', 'Meskerem', 'Nigist', 'Roman', 'Senait', 'Tadelech', 'Woinishet',
  'Yeneta', 'Zewditu', 'Azeb', 'Bethlehem', 'Desta', 'Eyerusalem', 'Fikirte',
];

const FATHER_NAMES = [
  'Tadesse', 'Bekele', 'Wolde', 'Gebre', 'Tessema', 'Abebe', 'Kebede', 'Haile',
  'Mulugeta', 'Tesfaye', 'Assefa', 'Girma', 'Worku', 'Fikre', 'Ayele', 'Berhanu',
  'Demissie', 'Getachew', 'Kassa', 'Mengistu', 'Negash', 'Shimelis', 'Tilahun',
  'Yilma', 'Alemayehu', 'Belete', 'Desalegn', 'Fasil', 'Gudeta', 'Hailemariam',
];

const OCCUPATIONS = [
  'Farmer', 'Teacher', 'Merchant', 'Civil Servant', 'Doctor', 'Nurse', 'Engineer',
  'Driver', 'Construction Worker', 'Tailor', 'Barber', 'Electrician', 'Carpenter',
  'Student', 'Housewife', 'Retired', 'Self-employed', 'Unemployed', 'Banker',
  'Accountant', 'Lawyer', 'Pharmacist', 'Shop Owner', 'Factory Worker',
];

const ETHNICITIES = ['Oromo', 'Amhara', 'Tigray', 'Somali', 'Sidama', 'Gurage', 'Welayta', 'Other'];
const RELIGIONS = ['Orthodox Christian', 'Muslim', 'Protestant', 'Catholic', 'Traditional', 'Other'];

// -------------------- Geographic Data --------------------

export const zones: Zone[] = [
  { id: 'zone-01', code: '01', name: 'Bole Zone', population: 45230, woredaCount: 3, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'zone-02', code: '02', name: 'Kirkos Zone', population: 38750, woredaCount: 3, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'zone-03', code: '03', name: 'Yeka Zone', population: 52180, woredaCount: 3, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
];

export const woredas: Woreda[] = [
  // Bole Zone woredas
  { id: 'woreda-01-01', zoneId: 'zone-01', code: '01', name: 'Bole Woreda 1', population: 15420, kebeleCount: 3, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'woreda-01-02', zoneId: 'zone-01', code: '02', name: 'Bole Woreda 2', population: 14580, kebeleCount: 3, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'woreda-01-03', zoneId: 'zone-01', code: '03', name: 'Bole Woreda 3', population: 15230, kebeleCount: 3, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  // Kirkos Zone woredas
  { id: 'woreda-02-01', zoneId: 'zone-02', code: '01', name: 'Kirkos Woreda 1', population: 12980, kebeleCount: 3, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'woreda-02-02', zoneId: 'zone-02', code: '02', name: 'Kirkos Woreda 2', population: 12450, kebeleCount: 3, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'woreda-02-03', zoneId: 'zone-02', code: '03', name: 'Kirkos Woreda 3', population: 13320, kebeleCount: 3, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  // Yeka Zone woredas
  { id: 'woreda-03-01', zoneId: 'zone-03', code: '01', name: 'Yeka Woreda 1', population: 17820, kebeleCount: 3, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'woreda-03-02', zoneId: 'zone-03', code: '02', name: 'Yeka Woreda 2', population: 16940, kebeleCount: 3, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'woreda-03-03', zoneId: 'zone-03', code: '03', name: 'Yeka Woreda 3', population: 17420, kebeleCount: 3, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
];

export const kebeles: Kebele[] = [];

// Generate kebeles for each woreda
woredas.forEach((woreda, woredaIndex) => {
  for (let k = 1; k <= 3; k++) {
    const kebeleCode = k.toString().padStart(2, '0');
    const population = Math.floor(woreda.population / 3) + Math.floor(Math.random() * 500);
    kebeles.push({
      id: `kebele-${woreda.id}-${kebeleCode}`,
      woredaId: woreda.id,
      zoneId: woreda.zoneId,
      code: kebeleCode,
      name: `${woreda.name} Kebele ${k}`,
      population,
      householdCount: Math.floor(population / 4.2),
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    });
  }
});

// -------------------- Users --------------------

export const users: User[] = [
  // Super Admin
  {
    id: 'user-001',
    email: 'admin@registry.gov.et',
    password: 'admin123',
    firstName: 'Alemayehu',
    lastName: 'Tadesse',
    role: 'super_admin',
    scope: { type: 'city' },
    isActive: true,
    lastLogin: '2026-03-04T08:30:00Z',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  // Zone Admins
  {
    id: 'user-002',
    email: 'bole.admin@registry.gov.et',
    password: 'zone123',
    firstName: 'Bekele',
    lastName: 'Hailu',
    role: 'zone_admin',
    scope: { type: 'zone', zoneId: 'zone-01' },
    isActive: true,
    lastLogin: '2026-03-04T09:15:00Z',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  {
    id: 'user-003',
    email: 'kirkos.admin@registry.gov.et',
    password: 'zone123',
    firstName: 'Meron',
    lastName: 'Gebre',
    role: 'zone_admin',
    scope: { type: 'zone', zoneId: 'zone-02' },
    isActive: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  // Woreda Admins
  {
    id: 'user-004',
    email: 'woreda1.bole@registry.gov.et',
    password: 'woreda123',
    firstName: 'Solomon',
    lastName: 'Kebede',
    role: 'woreda_admin',
    scope: { type: 'woreda', zoneId: 'zone-01', woredaId: 'woreda-01-01' },
    isActive: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  // Kebele Admins
  {
    id: 'user-005',
    email: 'kebele01.bole1@registry.gov.et',
    password: 'kebele123',
    firstName: 'Tigist',
    lastName: 'Alemu',
    role: 'kebele_admin',
    scope: { type: 'kebele', zoneId: 'zone-01', woredaId: 'woreda-01-01', kebeleId: 'kebele-woreda-01-01-01' },
    isActive: true,
    lastLogin: '2026-03-04T07:45:00Z',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  // Auditor
  {
    id: 'user-006',
    email: 'auditor@registry.gov.et',
    password: 'audit123',
    firstName: 'Daniel',
    lastName: 'Mengistu',
    role: 'auditor',
    scope: { type: 'city' },
    isActive: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  // Verification Officer
  {
    id: 'user-007',
    email: 'verify@registry.gov.et',
    password: 'verify123',
    firstName: 'Hanna',
    lastName: 'Girma',
    role: 'verification_officer',
    scope: { type: 'city' },
    isActive: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
];

// -------------------- Generate Residents --------------------

function randomDate(start: Date, end: Date): string {
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString().split('T')[0];
}

function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function generatePhoneNumber(): string {
  const prefix = randomElement(['091', '092', '093', '094', '095', '096', '097']);
  const suffix = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
  return `+251${prefix}${suffix}`;
}

export const residents: Resident[] = [];
export const households: Household[] = [];
export const familyRelationships: FamilyRelationship[] = [];
export const idCards: IDCard[] = [];

let residentCounter = 1;
let householdCounter = 1;
let idSequence = 1;

// Generate residents and households for each kebele
kebeles.forEach((kebele) => {
  const numHouseholds = Math.floor(kebele.householdCount * 0.3); // Generate 30% of households
  
  for (let h = 0; h < numHouseholds; h++) {
    const householdId = `household-${householdCounter++}`;
    const numMembers = Math.floor(Math.random() * 4) + 2; // 2-5 members
    const houseNumber = `${Math.floor(Math.random() * 999) + 1}/${String.fromCharCode(65 + Math.floor(Math.random() * 6))}`;
    
    // Create household head (always first)
    const headGender = Math.random() > 0.3 ? 'male' : 'female';
    const headFirstName = headGender === 'male' ? randomElement(MALE_FIRST_NAMES) : randomElement(FEMALE_FIRST_NAMES);
    const headFatherName = randomElement(FATHER_NAMES);
    const headGrandFatherName = randomElement(FATHER_NAMES);
    const headDob = randomDate(new Date(1960, 0, 1), new Date(1995, 0, 1));
    
    const headResident: Resident = {
      id: `resident-${residentCounter++}`,
      kebeleId: kebele.id,
      woredaId: kebele.woredaId,
      zoneId: kebele.zoneId,
      firstName: headFirstName,
      fatherName: headFatherName,
      grandFatherName: headGrandFatherName,
      dateOfBirth: headDob,
      gender: headGender as 'male' | 'female',
      nationality: 'Ethiopian',
      ethnicity: randomElement(ETHNICITIES),
      religion: randomElement(RELIGIONS),
      maritalStatus: 'married',
      occupation: randomElement(OCCUPATIONS),
      phoneNumber: generatePhoneNumber(),
      address: {
        houseNumber,
        streetName: `Street ${Math.floor(Math.random() * 50) + 1}`,
        city: 'Addis Ababa',
      },
      householdId,
      householdRole: 'head',
      status: 'active',
      registrationDate: randomDate(new Date(2024, 0, 1), new Date(2026, 2, 1)),
      registeredBy: 'user-005',
      createdAt: '2024-01-15',
      updatedAt: '2024-01-15',
    };
    
    // Generate ID for head
    if (Math.random() > 0.1) {
      const year = 2026;
      const seq = (idSequence++).toString().padStart(6, '0');
      const zone = kebele.zoneId.split('-')[1];
      const woreda = kebele.woredaId.split('-')[2];
      const keb = kebele.code;
      const baseId = `ETH-ADD-${zone}-${woreda}-${keb}-${year}-${seq}`;
      const checkDigit = calculateMod11CheckDigit(baseId);
      headResident.idNumber = `${baseId}-${checkDigit}`;
      headResident.idIssuedDate = headResident.registrationDate;
      headResident.idExpiryDate = '2031-12-31';
      headResident.idStatus = 'active';
      
      idCards.push({
        id: `idcard-${idCards.length + 1}`,
        residentId: headResident.id,
        idNumber: headResident.idNumber,
        internalId: idSequence - 1,
        issuedDate: headResident.idIssuedDate,
        expiryDate: headResident.idExpiryDate,
        issuedBy: 'user-005',
        issueLocation: kebele.id,
        qrToken: btoa(`${headResident.idNumber}:${headResident.id}:${Date.now()}`),
        status: 'active',
        printCount: 1,
        lastPrintedAt: headResident.idIssuedDate,
        createdAt: headResident.idIssuedDate,
        updatedAt: headResident.idIssuedDate,
      });
    }
    
    residents.push(headResident);
    
    // Add spouse if married
    if (numMembers >= 2) {
      const spouseGender = headGender === 'male' ? 'female' : 'male';
      const spouseFirstName = spouseGender === 'male' ? randomElement(MALE_FIRST_NAMES) : randomElement(FEMALE_FIRST_NAMES);
      
      const spouseResident: Resident = {
        id: `resident-${residentCounter++}`,
        kebeleId: kebele.id,
        woredaId: kebele.woredaId,
        zoneId: kebele.zoneId,
        firstName: spouseFirstName,
        fatherName: randomElement(FATHER_NAMES),
        grandFatherName: randomElement(FATHER_NAMES),
        dateOfBirth: randomDate(new Date(1965, 0, 1), new Date(1998, 0, 1)),
        gender: spouseGender as 'male' | 'female',
        nationality: 'Ethiopian',
        ethnicity: randomElement(ETHNICITIES),
        religion: randomElement(RELIGIONS),
        maritalStatus: 'married',
        occupation: randomElement(OCCUPATIONS),
        phoneNumber: Math.random() > 0.5 ? generatePhoneNumber() : undefined,
        address: headResident.address,
        householdId,
        householdRole: 'spouse',
        status: 'active',
        registrationDate: headResident.registrationDate,
        registeredBy: 'user-005',
        createdAt: '2024-01-15',
        updatedAt: '2024-01-15',
      };
      
      residents.push(spouseResident);
      
      // Add spouse relationship
      familyRelationships.push({
        id: `rel-${familyRelationships.length + 1}`,
        residentId: headResident.id,
        relatedResidentId: spouseResident.id,
        relationshipType: 'spouse',
        isPrimary: true,
        startDate: randomDate(new Date(2000, 0, 1), new Date(2020, 0, 1)),
        createdAt: '2024-01-15',
        updatedAt: '2024-01-15',
      });
    }
    
    // Add children
    for (let c = 2; c < numMembers; c++) {
      const childGender = Math.random() > 0.5 ? 'male' : 'female';
      const childFirstName = childGender === 'male' ? randomElement(MALE_FIRST_NAMES) : randomElement(FEMALE_FIRST_NAMES);
      
      const childResident: Resident = {
        id: `resident-${residentCounter++}`,
        kebeleId: kebele.id,
        woredaId: kebele.woredaId,
        zoneId: kebele.zoneId,
        firstName: childFirstName,
        fatherName: headGender === 'male' ? headFirstName : residents[residents.length - 1].firstName,
        grandFatherName: headGender === 'male' ? headFatherName : residents[residents.length - 1].fatherName,
        dateOfBirth: randomDate(new Date(2000, 0, 1), new Date(2020, 0, 1)),
        gender: childGender as 'male' | 'female',
        nationality: 'Ethiopian',
        maritalStatus: 'single',
        address: headResident.address,
        householdId,
        householdRole: 'child',
        status: 'active',
        registrationDate: headResident.registrationDate,
        registeredBy: 'user-005',
        createdAt: '2024-01-15',
        updatedAt: '2024-01-15',
      };
      
      residents.push(childResident);
      
      // Add parent relationship
      familyRelationships.push({
        id: `rel-${familyRelationships.length + 1}`,
        residentId: headResident.id,
        relatedResidentId: childResident.id,
        relationshipType: 'child',
        isPrimary: true,
        startDate: childResident.dateOfBirth,
        createdAt: '2024-01-15',
        updatedAt: '2024-01-15',
      });
    }
    
    // Create household
    households.push({
      id: householdId,
      kebeleId: kebele.id,
      woredaId: kebele.woredaId,
      zoneId: kebele.zoneId,
      headResidentId: headResident.id,
      address: {
        houseNumber,
        streetName: headResident.address.streetName,
      },
      contactPhone: headResident.phoneNumber,
      memberCount: numMembers,
      status: 'active',
      createdAt: '2024-01-15',
      updatedAt: '2024-01-15',
    });
  }
});

// -------------------- Mod-11 Check Digit --------------------

function calculateMod11CheckDigit(idWithoutCheck: string): string {
  const numericString = idWithoutCheck.replace(/[^0-9]/g, '');
  let sum = 0;
  let weight = 2;
  
  for (let i = numericString.length - 1; i >= 0; i--) {
    sum += parseInt(numericString[i]) * weight;
    weight = weight === 7 ? 2 : weight + 1;
  }
  
  const remainder = sum % 11;
  const checkDigit = 11 - remainder;
  
  if (checkDigit === 10) return 'X';
  if (checkDigit === 11) return '0';
  return checkDigit.toString();
}

// -------------------- Duplicate Cases --------------------

export const duplicateCases: DuplicateCase[] = [
  {
    id: 'dup-001',
    resident1Id: residents[0]?.id || 'resident-1',
    resident2Id: residents[5]?.id || 'resident-6',
    overallScore: 85,
    scores: {
      nameScore: 28,
      phoneticScore: 12,
      dobScore: 18,
      phoneScore: 12,
      addressScore: 8,
      genderScore: 5,
      householdScore: 2,
    },
    status: 'pending_review',
    priority: 'high',
    detectedAt: '2026-03-01T10:30:00Z',
    detectionMethod: 'batch_scan',
    createdAt: '2026-03-01',
    updatedAt: '2026-03-01',
  },
  {
    id: 'dup-002',
    resident1Id: residents[10]?.id || 'resident-11',
    resident2Id: residents[15]?.id || 'resident-16',
    overallScore: 78,
    scores: {
      nameScore: 25,
      phoneticScore: 10,
      dobScore: 15,
      phoneScore: 13,
      addressScore: 8,
      genderScore: 5,
      householdScore: 2,
    },
    status: 'pending_review',
    priority: 'medium',
    detectedAt: '2026-03-02T14:20:00Z',
    detectionMethod: 'registration',
    createdAt: '2026-03-02',
    updatedAt: '2026-03-02',
  },
  {
    id: 'dup-003',
    resident1Id: residents[20]?.id || 'resident-21',
    resident2Id: residents[25]?.id || 'resident-26',
    overallScore: 92,
    scores: {
      nameScore: 30,
      phoneticScore: 14,
      dobScore: 20,
      phoneScore: 13,
      addressScore: 8,
      genderScore: 5,
      householdScore: 2,
    },
    status: 'pending_review',
    priority: 'critical',
    detectedAt: '2026-03-03T09:15:00Z',
    detectionMethod: 'batch_scan',
    createdAt: '2026-03-03',
    updatedAt: '2026-03-03',
  },
];

// -------------------- Transfers --------------------

export const transfers: Transfer[] = [
  {
    id: 'transfer-001',
    residentId: residents[2]?.id || 'resident-3',
    sourceKebeleId: kebeles[0]?.id || 'kebele-woreda-01-01-01',
    sourceWoredaId: woredas[0]?.id || 'woreda-01-01',
    sourceZoneId: zones[0]?.id || 'zone-01',
    destinationKebeleId: kebeles[3]?.id || 'kebele-woreda-01-02-01',
    destinationWoredaId: woredas[1]?.id || 'woreda-01-02',
    destinationZoneId: zones[0]?.id || 'zone-01',
    transferType: 'within_woreda',
    reason: 'Employment relocation',
    status: 'pending_destination',
    initiatedBy: 'user-005',
    initiatedAt: '2026-03-01T11:00:00Z',
    sourceApprovedBy: 'user-005',
    sourceApprovedAt: '2026-03-01T11:30:00Z',
    requiresNewId: false,
    createdAt: '2026-03-01',
    updatedAt: '2026-03-01',
  },
  {
    id: 'transfer-002',
    residentId: residents[8]?.id || 'resident-9',
    sourceKebeleId: kebeles[5]?.id || 'kebele-woreda-01-02-02',
    sourceWoredaId: woredas[1]?.id || 'woreda-01-02',
    sourceZoneId: zones[0]?.id || 'zone-01',
    destinationKebeleId: kebeles[12]?.id || 'kebele-woreda-02-01-01',
    destinationWoredaId: woredas[3]?.id || 'woreda-02-01',
    destinationZoneId: zones[1]?.id || 'zone-02',
    transferType: 'cross_zone',
    reason: 'Marriage',
    status: 'submitted',
    initiatedBy: 'user-005',
    initiatedAt: '2026-03-02T09:00:00Z',
    requiresNewId: true,
    createdAt: '2026-03-02',
    updatedAt: '2026-03-02',
  },
];

// -------------------- Life Events --------------------

export const lifeEvents: LifeEvent[] = [
  {
    id: 'event-001',
    residentId: residents[0]?.id || 'resident-1',
    eventType: 'birth',
    eventDate: '2024-06-15',
    data: {
      type: 'birth',
      birthPlace: 'Addis Ababa',
      birthCertificateNumber: 'BC-2024-001234',
    },
    registeredBy: 'user-005',
    registeredAt: '2024-06-20T10:00:00Z',
    createdAt: '2024-06-20',
    updatedAt: '2024-06-20',
  },
  {
    id: 'event-002',
    residentId: residents[5]?.id || 'resident-6',
    eventType: 'marriage',
    eventDate: '2025-01-10',
    data: {
      type: 'marriage',
      spouseId: residents[6]?.id || 'resident-7',
      marriagePlace: 'Addis Ababa',
      marriageCertificateNumber: 'MC-2025-005678',
    },
    registeredBy: 'user-005',
    registeredAt: '2025-01-15T14:00:00Z',
    createdAt: '2025-01-15',
    updatedAt: '2025-01-15',
  },
];

// -------------------- Audit Logs --------------------

export const auditLogs: AuditLog[] = [
  {
    id: 'audit-001',
    userId: 'user-005',
    userEmail: 'kebele01.bole1@registry.gov.et',
    userRole: 'kebele_admin',
    action: 'create',
    resourceType: 'resident',
    resourceId: 'resident-1',
    description: 'Registered new resident: Abebe Tadesse Wolde',
    kebeleId: kebeles[0]?.id,
    woredaId: woredas[0]?.id,
    zoneId: zones[0]?.id,
    timestamp: '2026-03-04T08:15:00Z',
  },
  {
    id: 'audit-002',
    userId: 'user-005',
    userEmail: 'kebele01.bole1@registry.gov.et',
    userRole: 'kebele_admin',
    action: 'generate_id',
    resourceType: 'id_card',
    resourceId: 'idcard-1',
    description: 'Generated ID card for resident: Abebe Tadesse Wolde',
    kebeleId: kebeles[0]?.id,
    woredaId: woredas[0]?.id,
    zoneId: zones[0]?.id,
    timestamp: '2026-03-04T08:20:00Z',
  },
  {
    id: 'audit-003',
    userId: 'user-001',
    userEmail: 'admin@registry.gov.et',
    userRole: 'super_admin',
    action: 'login',
    resourceType: 'system',
    description: 'User logged in to the system',
    timestamp: '2026-03-04T08:30:00Z',
  },
  {
    id: 'audit-004',
    userId: 'user-005',
    userEmail: 'kebele01.bole1@registry.gov.et',
    userRole: 'kebele_admin',
    action: 'update',
    resourceType: 'resident',
    resourceId: 'resident-5',
    previousValue: { phoneNumber: '+251911234567' },
    newValue: { phoneNumber: '+251912345678' },
    description: 'Updated phone number for resident',
    kebeleId: kebeles[0]?.id,
    woredaId: woredas[0]?.id,
    zoneId: zones[0]?.id,
    timestamp: '2026-03-04T09:45:00Z',
  },
];

// -------------------- Notifications --------------------

export const notifications: Notification[] = [
  {
    id: 'notif-001',
    userId: 'user-005',
    type: 'duplicate_flagged',
    title: 'New Duplicate Detected',
    message: 'A potential duplicate has been flagged with 85% confidence score.',
    link: '/duplicates/dup-001',
    isRead: false,
    createdAt: '2026-03-04T10:00:00Z',
  },
  {
    id: 'notif-002',
    userId: 'user-005',
    type: 'transfer_request',
    title: 'Incoming Transfer Request',
    message: 'A resident transfer request requires your approval.',
    link: '/transfers/transfer-001',
    isRead: false,
    createdAt: '2026-03-04T09:30:00Z',
  },
  {
    id: 'notif-003',
    userId: 'user-004',
    type: 'transfer_approved',
    title: 'Transfer Approved',
    message: 'The transfer for resident ID ETH-ADD-01-01-01-2026-000012 has been approved.',
    link: '/transfers/transfer-001',
    isRead: true,
    createdAt: '2026-03-03T16:00:00Z',
  },
];

// Backward-compatible aliases for pages importing legacy mock names.
export const mockZones = zones;
export const mockWoredas = woredas;
export const mockKebeles = kebeles;
export const mockResidents = residents;
export const mockHouseholds = households;
export const mockLifeEvents = lifeEvents;
export const mockTransfers = transfers;
export const mockAuditLogs = auditLogs;
export const mockVerificationRequests = transfers;
export const mockDuplicateCandidates = duplicateCases;
export const mockAdminUsers = users;

// -------------------- Dashboard Statistics --------------------

export function getDashboardStats(scope?: { zoneId?: string; woredaId?: string; kebeleId?: string }): DashboardStats {
  let filteredResidents = residents;
  let filteredHouseholds = households;
  
  if (scope?.kebeleId) {
    filteredResidents = residents.filter(r => r.kebeleId === scope.kebeleId);
    filteredHouseholds = households.filter(h => h.kebeleId === scope.kebeleId);
  } else if (scope?.woredaId) {
    filteredResidents = residents.filter(r => r.woredaId === scope.woredaId);
    filteredHouseholds = households.filter(h => h.woredaId === scope.woredaId);
  } else if (scope?.zoneId) {
    filteredResidents = residents.filter(r => r.zoneId === scope.zoneId);
    filteredHouseholds = households.filter(h => h.zoneId === scope.zoneId);
  }
  
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  return {
    totalResidents: filteredResidents.length,
    activeResidents: filteredResidents.filter(r => r.status === 'active').length,
    totalHouseholds: filteredHouseholds.length,
    newRegistrationsToday: filteredResidents.filter(r => r.registrationDate >= today).length || Math.floor(Math.random() * 5) + 1,
    newRegistrationsThisWeek: filteredResidents.filter(r => r.registrationDate >= weekAgo).length || Math.floor(Math.random() * 25) + 5,
    newRegistrationsThisMonth: filteredResidents.filter(r => r.registrationDate >= monthAgo).length || Math.floor(Math.random() * 80) + 20,
    pendingDuplicates: duplicateCases.filter(d => d.status === 'pending_review').length,
    pendingTransfers: transfers.filter(t => ['submitted', 'pending_destination'].includes(t.status)).length,
    idCardsIssued: idCards.filter(id => id.status === 'active').length,
    malePopulation: filteredResidents.filter(r => r.gender === 'male').length,
    femalePopulation: filteredResidents.filter(r => r.gender === 'female').length,
  };
}

export function getPopulationByAge(): PopulationByAge[] {
  return [
    { ageGroup: '0-4', male: 3420, female: 3280 },
    { ageGroup: '5-14', male: 8150, female: 7980 },
    { ageGroup: '15-24', male: 12450, female: 12780 },
    { ageGroup: '25-34', male: 15200, female: 15800 },
    { ageGroup: '35-44', male: 11800, female: 12100 },
    { ageGroup: '45-54', male: 8900, female: 9200 },
    { ageGroup: '55-64', male: 5600, female: 5900 },
    { ageGroup: '65+', male: 4100, female: 4500 },
  ];
}

export function getPopulationTrends(): PopulationTrend[] {
  return [
    { month: 'Oct', registrations: 245, transfers_in: 32, transfers_out: 28, deaths: 12 },
    { month: 'Nov', registrations: 312, transfers_in: 45, transfers_out: 38, deaths: 15 },
    { month: 'Dec', registrations: 198, transfers_in: 28, transfers_out: 35, deaths: 18 },
    { month: 'Jan', registrations: 367, transfers_in: 52, transfers_out: 41, deaths: 14 },
    { month: 'Feb', registrations: 289, transfers_in: 38, transfers_out: 44, deaths: 11 },
    { month: 'Mar', registrations: 156, transfers_in: 25, transfers_out: 22, deaths: 8 },
  ];
}

// -------------------- Helper Functions --------------------

export function getResidentById(id: string): Resident | undefined {
  return residents.find(r => r.id === id);
}

export function getHouseholdById(id: string): Household | undefined {
  return households.find(h => h.id === id);
}

export function getZoneById(id: string): Zone | undefined {
  return zones.find(z => z.id === id);
}

export function getWoredaById(id: string): Woreda | undefined {
  return woredas.find(w => w.id === id);
}

export function getKebeleById(id: string): Kebele | undefined {
  return kebeles.find(k => k.id === id);
}

export function getHouseholdMembers(householdId: string): Resident[] {
  return residents.filter(r => r.householdId === householdId);
}

export function getResidentRelationships(residentId: string): FamilyRelationship[] {
  return familyRelationships.filter(
    r => r.residentId === residentId || r.relatedResidentId === residentId
  );
}

export function getUserById(id: string): User | undefined {
  return users.find(u => u.id === id);
}

export function getUserByEmail(email: string): User | undefined {
  return users.find(u => u.email === email);
}
