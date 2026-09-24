/** Shared Creators Bootcamp survey schema (mission page + admin Events). */

export type BootcampSurveyQuestion =
  | { id: string; label: string; type: 'choice'; options: string[] }
  | { id: string; label: string; type: 'rating'; max: number }
  | { id: string; label: string; type: 'text' };

export const BOOTCAMP_SURVEY_QUESTIONS: BootcampSurveyQuestion[] = [
  {
    id: 'q1',
    label: 'โดยรวม คุณพึงพอใจกับงาน Creator Bootcamp ครั้งนี้มากน้อยเพียงใด?',
    type: 'rating',
    max: 5,
  },
  {
    id: 'q2',
    label:
      'เนื้อหาและความรู้ที่ได้รับจากงาน มีประโยชน์ต่อการพัฒนาทักษะการทำ Content ของคุณมากน้อยเพียงใด?',
    type: 'rating',
    max: 5,
  },
  {
    id: 'q3',
    label: 'Session “เล่าเรื่องอสังหาฯ ให้ขายได้” by Review by O มีประโยชน์กับคุณมากน้อยเพียงใด?',
    type: 'rating',
    max: 5,
  },
  {
    id: 'q4',
    label:
      'Session “Content Marketing & Short VDO” by พ่อมดติ๊กต็อก มีประโยชน์กับคุณมากน้อยเพียงใด?',
    type: 'rating',
    max: 5,
  },
  {
    id: 'q5',
    label: 'หลังจากเข้าร่วมงาน คุณสนใจทำ Affiliate กับ AssetWise มากขึ้นหรือไม่?',
    type: 'choice',
    options: ['มากขึ้นมาก', 'มากขึ้น', 'เท่าเดิม', 'ยังไม่มั่นใจ'],
  },
  {
    id: 'q6',
    label: 'คุณพึงพอใจกับ สถานที่ กิจกรรมและการดูแลของทีมงาน มากน้อยเพียงใด?',
    type: 'rating',
    max: 5,
  },
  {
    id: 'q7',
    label:
      'สิ่งที่คุณชอบ หรืออยากให้ AssetWise Creator Club เพิ่มเติม/ปรับปรุงในครั้งต่อไปคืออะไร?',
    type: 'text',
  },
];

/** Short CSV / UI headers for each question. */
export const BOOTCAMP_SURVEY_CSV_HEADERS: Record<string, string> = {
  q1: 'Q1 Overall Satisfaction (1-5)',
  q2: 'Q2 Content Usefulness (1-5)',
  q3: 'Q3 Session Review by O (1-5)',
  q4: 'Q4 Session พ่อมดติ๊กต็อก (1-5)',
  q5: 'Q5 Affiliate Interest',
  q6: 'Q6 Venue & Team Care (1-5)',
  q7: 'Q7 Open Feedback',
};

export function getBootcampSurveyAnswer(
  answers: Record<string, string> | undefined,
  questionId: string,
): string {
  return (answers?.[questionId] ?? '').trim();
}

export function formatBootcampSurveyAnswerDisplay(
  question: BootcampSurveyQuestion,
  raw: string,
): string {
  const value = raw.trim();
  if (!value) return '—';
  if (question.type === 'rating') return `${value}/${question.max}`;
  return value;
}

export type BootcampSurveyAggregate = {
  submittedCount: number;
  ratingAverages: Array<{ id: string; label: string; average: number | null; responses: number }>;
  affiliateInterest: Array<{ option: string; count: number; pct: number }>;
};

export function aggregateBootcampSurvey(
  participants: Array<{
    surveySubmittedAt?: string;
    surveyAnswers?: Record<string, string>;
  }>,
): BootcampSurveyAggregate {
  const submitted = participants.filter((p) => Boolean(p.surveySubmittedAt));
  const submittedCount = submitted.length;

  const ratingAverages = BOOTCAMP_SURVEY_QUESTIONS.filter(
    (q): q is Extract<BootcampSurveyQuestion, { type: 'rating' }> => q.type === 'rating',
  ).map((question) => {
    let sum = 0;
    let responses = 0;
    for (const participant of submitted) {
      const raw = getBootcampSurveyAnswer(participant.surveyAnswers, question.id);
      const n = Number(raw);
      if (!Number.isFinite(n) || n <= 0) continue;
      sum += n;
      responses += 1;
    }
    return {
      id: question.id,
      label: question.label,
      average: responses > 0 ? Math.round((sum / responses) * 10) / 10 : null,
      responses,
    };
  });

  const affiliateQuestion = BOOTCAMP_SURVEY_QUESTIONS.find((q) => q.id === 'q5');
  const options =
    affiliateQuestion?.type === 'choice' ? affiliateQuestion.options : ([] as string[]);
  const counts = Object.fromEntries(options.map((opt) => [opt, 0])) as Record<string, number>;
  let choiceResponses = 0;
  for (const participant of submitted) {
    const raw = getBootcampSurveyAnswer(participant.surveyAnswers, 'q5');
    if (!raw || !(raw in counts)) continue;
    counts[raw] += 1;
    choiceResponses += 1;
  }
  const affiliateInterest = options.map((option) => ({
    option,
    count: counts[option] ?? 0,
    pct: choiceResponses > 0 ? Math.round(((counts[option] ?? 0) / choiceResponses) * 100) : 0,
  }));

  return { submittedCount, ratingAverages, affiliateInterest };
}
