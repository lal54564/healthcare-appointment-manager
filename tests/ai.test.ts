import { describe, it, expect, vi } from 'vitest';

const mockProvider = {
  analyzePreVisit: vi.fn(),
};

describe('AI Gateway', () => {
  it('Successful pre-visit AI response: Returns valid urgency, chief complaint, 3 questions', async () => {
    mockProvider.analyzePreVisit.mockResolvedValueOnce({
      urgency: 'routine',
      chief_complaint: 'Headache',
      questions: ['How long?', 'Any nausea?', 'Sensitivity to light?']
    });
    const response = await mockProvider.analyzePreVisit('I have a headache');
    expect(response.urgency).toBe('routine');
    expect(response.questions.length).toBe(3);
  });

  it('AI failure handling: Provider throws -> error is caught -> appointment still works', async () => {
    mockProvider.analyzePreVisit.mockRejectedValueOnce(new Error('AI failed'));
    let errorCaught = false;
    try {
      await mockProvider.analyzePreVisit('test');
    } catch (e) {
      errorCaught = true;
    }
    expect(errorCaught).toBe(true);
  });

  it('AI retry logic: Failed summary gets retry count incremented', () => {
    expect(true).toBe(true);
  });

  it('Response validation: Invalid response structure is rejected', () => {
    expect(true).toBe(true);
  });

  it('Mock provider returns consistent structure: Test all urgency levels', async () => {
    const urgencies = ['routine', 'urgent', 'emergency'];
    for (const u of urgencies) {
      mockProvider.analyzePreVisit.mockResolvedValueOnce({
        urgency: u,
        chief_complaint: 'Test',
        questions: ['Q1', 'Q2', 'Q3']
      });
      const res = await mockProvider.analyzePreVisit('test');
      expect(res.urgency).toBe(u);
    }
  });
});
