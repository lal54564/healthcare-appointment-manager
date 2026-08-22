/**
 * AI Gateway - Pluggable AI provider adapter
 * 
 * Supports:
 * - Mock provider (default, no API key needed)
 * - Can be extended for Google Gemini, OpenAI, etc.
 * 
 * The mock provider returns realistic structured responses
 * that match the expected AI output format.
 */

import {
  buildPreVisitPrompt,
  buildPostVisitPrompt,
  validatePreVisitResponse,
  validatePostVisitResponse,
  type PreVisitAIResponse,
  type PostVisitAIResponse,
} from './prompts';

export interface AIProvider {
  generatePreVisitSummary(symptoms: {
    main_symptoms: string;
    duration?: string;
    severity?: string;
    additional_info?: string;
  }): Promise<PreVisitAIResponse>;
  
  generatePostVisitSummary(data: {
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
  }): Promise<PostVisitAIResponse>;
}

/**
 * Mock AI Provider
 * Returns realistic structured responses without requiring an API key.
 * Simulates a ~500ms delay to mimic real API calls.
 */
class MockAIProvider implements AIProvider {
  private async simulateDelay(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 400));
  }

  private determineUrgency(symptoms: string, severity?: string): 'low' | 'medium' | 'high' {
    const highUrgencyKeywords = [
      'chest pain', 'breathing difficulty', 'unconscious', 'seizure',
      'severe bleeding', 'stroke', 'heart attack', 'anaphylaxis',
      'suicidal', 'poisoning', 'high fever',
    ];
    const mediumUrgencyKeywords = [
      'persistent', 'worsening', 'fever', 'vomiting', 'dizziness',
      'swelling', 'infection', 'pain', 'numbness', 'fatigue',
    ];
    
    const lowerSymptoms = symptoms.toLowerCase();
    
    if (severity === 'severe' || highUrgencyKeywords.some(k => lowerSymptoms.includes(k))) {
      return 'high';
    }
    if (severity === 'moderate' || mediumUrgencyKeywords.some(k => lowerSymptoms.includes(k))) {
      return 'medium';
    }
    return 'low';
  }

  async generatePreVisitSummary(symptoms: {
    main_symptoms: string;
    duration?: string;
    severity?: string;
    additional_info?: string;
  }): Promise<PreVisitAIResponse> {
    await this.simulateDelay();
    
    const urgency = this.determineUrgency(symptoms.main_symptoms, symptoms.severity);
    
    // Generate contextual chief complaint
    const symptomWords = symptoms.main_symptoms.split(/[,;]/).map(s => s.trim()).filter(Boolean);
    const primarySymptom = symptomWords[0] || symptoms.main_symptoms;
    
    const chiefComplaint = `Patient presents with ${primarySymptom.toLowerCase()}${
      symptoms.duration ? ` lasting ${symptoms.duration}` : ''
    }${symptoms.severity ? `, reported as ${symptoms.severity} in severity` : ''}.`;

    // Generate contextual suggested questions
    const questionSets: Record<string, string[]> = {
      high: [
        'When did the symptoms first appear and have they been progressively worsening?',
        'Are you currently taking any medications, and do you have any known allergies?',
        'Have you experienced similar episodes before, and if so, what treatment was given?',
      ],
      medium: [
        'Can you describe the exact nature and location of your symptoms?',
        'Have you noticed any triggers that make the symptoms better or worse?',
        'Are you experiencing any other symptoms alongside the primary complaint?',
      ],
      low: [
        'How has this condition affected your daily activities?',
        'Have you tried any home remedies or over-the-counter medications?',
        'Is there any relevant family medical history related to these symptoms?',
      ],
    };

    return {
      urgency,
      chief_complaint: chiefComplaint,
      suggested_questions: questionSets[urgency] as [string, string, string],
    };
  }

  async generatePostVisitSummary(data: {
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
  }): Promise<PostVisitAIResponse> {
    await this.simulateDelay();

    // Generate patient-friendly summary from doctor's notes
    const visitSummary = data.diagnosis
      ? `During your visit, the doctor examined you and identified ${data.diagnosis.toLowerCase()}. ${data.notes.slice(0, 150)}${data.notes.length > 150 ? '...' : ''}`
      : `During your visit, the doctor conducted a thorough examination. ${data.notes.slice(0, 150)}${data.notes.length > 150 ? '...' : ''}`;

    // Generate medication schedule
    let medicationSchedule = 'No medications were prescribed during this visit.';
    if (data.prescriptions && data.prescriptions.length > 0) {
      const meds = data.prescriptions.map(
        p => `Take ${p.drug} (${p.dose}) ${p.frequency} for ${p.duration}${p.instructions ? `. ${p.instructions}` : ''}`
      );
      medicationSchedule = meds.join('. ') + '.';
    }

    // Generate follow-up steps
    const followUpSteps = [
      data.follow_up_instructions || 'Follow up with your doctor if symptoms persist or worsen.',
      'Complete the full course of any prescribed medications.',
      'Maintain a record of your symptoms and bring it to your next visit.',
    ];

    // Generate important instructions
    const importantInstructions = [
      'If you experience any severe side effects from medications, discontinue use and contact your doctor immediately.',
      'Seek emergency care if you develop difficulty breathing, severe allergic reactions, or sudden worsening of symptoms.',
    ];

    return {
      visit_summary: visitSummary,
      medication_schedule: medicationSchedule,
      follow_up_steps: followUpSteps,
      important_instructions: importantInstructions,
    };
  }
}

// Singleton AI provider instance
let aiProvider: AIProvider | null = null;

/**
 * Get the configured AI provider.
 * Currently uses mock provider. Can be swapped for real AI by changing this function.
 */
export function getAIProvider(): AIProvider {
  if (!aiProvider) {
    // TODO: Check for real AI API keys and use appropriate provider
    // if (process.env.GOOGLE_AI_API_KEY) {
    //   aiProvider = new GeminiProvider(process.env.GOOGLE_AI_API_KEY);
    // } else {
    aiProvider = new MockAIProvider();
    // }
  }
  return aiProvider;
}

/**
 * Generate a pre-visit AI summary for symptoms
 */
export async function generatePreVisitSummary(symptoms: {
  main_symptoms: string;
  duration?: string;
  severity?: string;
  additional_info?: string;
}): Promise<PreVisitAIResponse> {
  const provider = getAIProvider();
  const result = await provider.generatePreVisitSummary(symptoms);
  
  if (!validatePreVisitResponse(result)) {
    throw new Error('AI returned invalid pre-visit response structure');
  }
  
  return result;
}

/**
 * Generate a post-visit AI summary from doctor notes
 */
export async function generatePostVisitSummary(data: {
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
}): Promise<PostVisitAIResponse> {
  const provider = getAIProvider();
  const result = await provider.generatePostVisitSummary(data);
  
  if (!validatePostVisitResponse(result)) {
    throw new Error('AI returned invalid post-visit response structure');
  }
  
  return result;
}
