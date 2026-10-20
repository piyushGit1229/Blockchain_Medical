// Synthetic multi-institutional hospital dataset (paper Section IV-A: simulated
// patient demographics, ICD-10 diagnosis entries, clinical notes / images).
// No public benchmark dataset exists for blockchain EHR sharing [10][11][18],
// so we generate de-identified records matching prior testbed schemas.
import crypto from 'node:crypto';

const FIRST = ['Aarav', 'Vivaan', 'Aditya', 'Ishaan', 'Kabir', 'Ananya', 'Diya', 'Myra', 'Sara', 'Aadhya', 'Rohan', 'Arjun', 'Meera', 'Kavya', 'Rahul', 'Simran', 'Harsh', 'Tanvi'];
const LAST = ['Sharma', 'Verma', 'Gupta', 'Singh', 'Mehta', 'Nair', 'Iyer', 'Reddy', 'Chopra', 'Malhotra', 'Kaur', 'Patel', 'Joshi', 'Das'];

const ICD10 = [
  { code: 'I21.9', label: 'Acute myocardial infarction', type: 'cardiology' },
  { code: 'E11.9', label: 'Type 2 diabetes mellitus', type: 'endocrinology' },
  { code: 'J18.9', label: 'Pneumonia, unspecified organism', type: 'pulmonology' },
  { code: 'S72.001A', label: 'Fracture of unspecified part of neck of right femur', type: 'trauma' },
  { code: 'C34.90', label: 'Malignant neoplasm of lung, unspecified', type: 'oncology' },
  { code: 'N39.0', label: 'Urinary tract infection', type: 'nephrology' },
  { code: 'K35.80', label: 'Acute appendicitis', type: 'surgery' },
  { code: 'F41.1', label: 'Generalized anxiety disorder', type: 'psychiatry' },
  { code: 'I63.9', label: 'Cerebral infarction', type: 'neurology' },
  { code: 'M54.5', label: 'Low back pain', type: 'orthopedics' },
];

const RECORD_TYPES = ['discharge-summary', 'lab-report', 'imaging-report', 'prescription', 'clinical-note'];

function pick(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
}

/** Deterministic PRNG so benchmarks are reproducible. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate a synthetic dataset.
 * @returns {{patients:Array, providers:Array, records:Array}} records contain
 *          plaintext clinical payloads (later encrypted before IPFS upload).
 */
export function generateDataset({ patients = 60, providers = 18, recordsPerPatient = 3, organizations = ['HospitalOrg1', 'HospitalOrg2', 'HospitalOrg3'], seed = 42 } = {}) {
  const rng = mulberry32(seed);

  const provs = [];
  const roles = ['nurse', 'resident', 'physician', 'specialist', 'surgeon'];
  const departments = ['Emergency', 'Cardiology', 'General Medicine', 'Radiology', 'Orthopedics', 'Oncology'];
  const specialties = ['cardiology', 'endocrinology', 'pulmonology', 'trauma', 'oncology', 'nephrology', 'surgery', 'psychiatry', 'neurology', 'orthopedics', 'general'];
  for (let i = 0; i < providers; i++) {
    provs.push({
      providerId: `PROV-${String(i + 1).padStart(3, '0')}`,
      name: `${pick(FIRST, rng)} ${pick(LAST, rng)}`,
      role: pick(roles, rng),
      org: organizations[i % organizations.length],
      department: pick(departments, rng),
      specialty: pick(specialties, rng),
    });
  }

  const pats = [];
  for (let i = 0; i < patients; i++) {
    pats.push({
      patientId: `PAT-${String(i + 1).padStart(4, '0')}`,
      name: `${pick(FIRST, rng)} ${pick(LAST, rng)}`,
      age: 1 + Math.floor(rng() * 90),
      gender: pick(['M', 'F', 'Other'], rng),
      org: organizations[i % organizations.length],
    });
  }

  const recs = [];
  for (const p of pats) {
    for (let j = 0; j < recordsPerPatient; j++) {
      const dx = pick(ICD10, rng);
      const type = pick(RECORD_TYPES, rng);
      const recordId = `REC-${p.patientId.slice(4)}-${j + 1}`;
      // Clinical payload that would be encrypted and pushed to IPFS.
      const clinicalPayload = {
        recordId,
        patient: { id: p.patientId, age: p.age, gender: p.gender }, // pseudonymous
        encounter: {
          date: new Date(2025, Math.floor(rng() * 12), 1 + Math.floor(rng() * 27)).toISOString().slice(0, 10),
          hospital: p.org,
          icd10: dx.code,
          diagnosis: dx.label,
          notes: `Patient presented with symptoms consistent with ${dx.label.toLowerCase()}. Vitals stable. Treatment plan documented under standard ${dx.type} protocol.`,
        },
        attachments: type === 'imaging-report' ? [{ kind: 'dicom-ref', sizeKB: 2048 + Math.floor(rng() * 6000) }] : [],
        _pad: crypto.randomBytes(512 + Math.floor(rng() * 2048)).toString('base64'), // realistic file size
      };
      recs.push({
        recordId,
        patientId: p.patientId,
        doctorId: pick(provs, rng).providerId,
        recordType: type,
        metadata: { icd10: dx.code, category: dx.type, encounterDate: clinicalPayload.encounter.date },
        payload: clinicalPayload,
      });
    }
  }

  return { patients: pats, providers: provs, records: recs };
}
