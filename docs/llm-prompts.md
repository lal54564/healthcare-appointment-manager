# LLM Prompt Documentation

## Pre-Visit Prompt

**Prompt Text**:
```text
You are an expert medical AI assistant. Analyze the patient's reported symptoms and provide a structured assessment.
Identify the primary issue, possible related conditions, and assess the urgency level.
Do not provide a definitive diagnosis.

Symptoms: {{symptoms}}
Patient History Context: {{history}}
```

**Input Fields**:
- `symptoms`: Free text provided by the patient.
- `history`: Key historical points (if any) from previous visits.

**Expected Output Structure (JSON)**:
```json
{
  "primary_issue": "string",
  "related_conditions": ["string"],
  "urgency_level": "string (low | moderate | high | immediate_attention_required)",
  "recommended_questions_for_doctor": ["string"]
}
```

**Urgency Level Definitions**:
- `low`: Routine issue, no immediate danger.
- `moderate`: Requires medical attention but not an emergency.
- `high`: Needs prompt attention, potentially severe.
- `immediate_attention_required`: Medical emergency, patient should seek urgent care.

**Validation Rules**:
- Ensure output is valid JSON matching the schema.
- `urgency_level` must strictly match one of the defined enumerations.

**Failure Handling Behavior**:
- If the AI fails or times out, default to `urgency_level: "moderate"`.
- Log the failure and flag the form for manual doctor review.

---

## Post-Visit Prompt

**Prompt Text**:
```text
You are an expert medical AI scribe. Read the doctor's raw visit notes and generate a clean, patient-friendly summary and a professional clinical note.
Extract any prescribed medications.

Doctor's Notes: {{raw_notes}}
```

**Input Fields**:
- `raw_notes`: Unstructured text or dictation from the doctor.

**Expected Output Structure (JSON)**:
```json
{
  "patient_friendly_summary": "string",
  "clinical_note": "string",
  "extracted_prescriptions": [
    {
      "medication_name": "string",
      "dosage": "string",
      "frequency": "string"
    }
  ]
}
```

**Validation Rules**:
- Must return valid JSON.
- `extracted_prescriptions` can be an empty array if none are found.

**Failure Handling Behavior**:
- If AI fails, the raw notes are saved as-is.
- A background job will retry the generation up to 3 times with exponential backoff.
- The UI reflects a "Processing" state until the summary is available.

---

## AI Provider Architecture

### Pluggable Provider Works
The application uses an abstract `AIGateway` interface. The implementation can be swapped via environment variables without changing the core logic. 

### Mock Provider Behavior
For local development and testing, a `MockAIProvider` is used. It simulates latency (e.g., 1-2 seconds) and returns static, pre-defined JSON responses based on keywords found in the input (e.g., "headache" triggers a specific mock response).

### How to Swap to a Real Provider
1. Implement the `AIGateway` interface using the SDK of the provider (e.g., Google Gemini or OpenAI).
2. Update the Dependency Injection container or factory method to instantiate the real provider when the `AI_PROVIDER_API_KEY` is present.
3. Ensure the prompt formatting matches the provider's specific chat/completion API requirements.
