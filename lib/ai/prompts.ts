/**
 * AI Prompts Module
 * 
 * ALL LLM prompts are centralized in this single file.
 * This makes it easy to review, test, and modify prompts without
 * searching through the codebase.
 */

/**
 * Pre-visit symptom summarization prompt.
 * 
 * Input: Patient's symptom form data
 * Output: Structured summary with urgency, chief complaint, and suggested questions
 * 
 * Urgency levels:
 * - low: Routine concern, no immediate danger
 * - medium: Warrants timely attention, potential for escalation
 * - high: Requires urgent medical attention
 * 
 * Validation rules:
 * - urgency must be exactly one of: "low", "medium", "high"
 * - chief_complaint must be a concise single sentence
 * - suggested_questions must contain exactly 3 questions
 * - All output must be in English
 */
export function buildPreVisitPrompt(symptoms: {
  main_symptoms: string;
  duration?: string;
  severity?: string;
  additional_info?: string;
}): string {
  return `You are a medical triage assistant helping a doctor prepare for a patient consultation.

Based on the following patient-reported symptoms, provide a structured pre-visit summary.

PATIENT SYMPTOMS:
- Main symptoms: ${symptoms.main_symptoms}
${symptoms.duration ? `- Duration: ${symptoms.duration}` : ''}
${symptoms.severity ? `- Severity: ${symptoms.severity}` : ''}
${symptoms.additional_info ? `- Additional information: ${symptoms.additional_info}` : ''}

Respond with ONLY a valid JSON object (no markdown, no code blocks) in this exact format:
{
  "urgency": "low" | "medium" | "high",
  "chief_complaint": "A concise one-sentence summary of the primary concern",
  "suggested_questions": [
    "Question 1 the doctor should ask during consultation",
    "Question 2 the doctor should ask during consultation",
    "Question 3 the doctor should ask during consultation"
  ]
}

RULES:
- urgency must be exactly "low", "medium", or "high"
- chief_complaint must be a single concise sentence
- suggested_questions must contain EXACTLY 3 relevant clinical questions
- Questions should help the doctor gather important clinical information
- Be medically accurate but concise
- Do not diagnose - only summarize and suggest questions`;
}

/**
 * Post-visit consultation summarization prompt.
 * 
 * Input: Doctor's consultation notes, diagnosis, prescriptions
 * Output: Patient-friendly summary of the visit
 * 
 * Validation rules:
 * - summary must be in simple, patient-friendly language
 * - medication_schedule must list each medication clearly
 * - follow_up_steps must be actionable
 * - important_instructions must highlight critical warnings
 */
export function buildPostVisitPrompt(data: {
  diagnosis?: string;
  notes: string;
  follow_up_instructions?: string;
  prescriptions?: Array<{
    drug: string;
    dose: string;
    frequency: string;
    duration: string;
    instructions?: string;
  }>;
}): string {
  const prescriptionText = data.prescriptions?.length
    ? data.prescriptions
        .map(
          (p, i) =>
            `${i + 1}. ${p.drug} - ${p.dose}, ${p.frequency} for ${p.duration}${
              p.instructions ? ` (${p.instructions})` : ''
            }`
        )
        .join('\n')
    : 'No medications prescribed';

  return `You are a healthcare communication assistant. Convert the following doctor's consultation notes into a clear, patient-friendly summary.

DOCTOR'S NOTES:
${data.notes}

${data.diagnosis ? `DIAGNOSIS: ${data.diagnosis}` : ''}

${data.follow_up_instructions ? `FOLLOW-UP INSTRUCTIONS: ${data.follow_up_instructions}` : ''}

PRESCRIBED MEDICATIONS:
${prescriptionText}

Respond with ONLY a valid JSON object (no markdown, no code blocks) in this exact format:
{
  "visit_summary": "A simple explanation of what was discussed during the visit, written for the patient to understand",
  "medication_schedule": "Clear instructions on when and how to take each medication",
  "follow_up_steps": ["Step 1", "Step 2", ...],
  "important_instructions": ["Important warning or instruction 1", ...]
}

RULES:
- Use simple, non-medical language that any patient can understand
- Be warm and reassuring in tone
- Medication schedule should be very specific about timing
- Follow-up steps should be actionable and clear
- Important instructions should highlight anything critical (allergies, side effects to watch for, when to seek emergency care)
- Do not add medical information beyond what the doctor noted`;
}

/**
 * Expected response types for validation
 */
export interface PreVisitAIResponse {
  urgency: 'low' | 'medium' | 'high';
  chief_complaint: string;
  suggested_questions: [string, string, string];
}

export interface PostVisitAIResponse {
  visit_summary: string;
  medication_schedule: string;
  follow_up_steps: string[];
  important_instructions: string[];
}

/**
 * Validate pre-visit AI response structure
 */
export function validatePreVisitResponse(data: unknown): data is PreVisitAIResponse {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  
  if (!['low', 'medium', 'high'].includes(obj.urgency as string)) return false;
  if (typeof obj.chief_complaint !== 'string' || !obj.chief_complaint) return false;
  if (!Array.isArray(obj.suggested_questions) || obj.suggested_questions.length !== 3) return false;
  if (!obj.suggested_questions.every((q: unknown) => typeof q === 'string' && q)) return false;
  
  return true;
}

/**
 * Validate post-visit AI response structure
 */
export function validatePostVisitResponse(data: unknown): data is PostVisitAIResponse {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  
  if (typeof obj.visit_summary !== 'string' || !obj.visit_summary) return false;
  if (typeof obj.medication_schedule !== 'string') return false;
  if (!Array.isArray(obj.follow_up_steps)) return false;
  if (!Array.isArray(obj.important_instructions)) return false;
  
  return true;
}
