const OPENAI_API_URL = 'https://api.openai.com/v1/responses';

const SYSTEM_PROMPT = `당신은 음식점 사장님을 대신해 고객 리뷰에 답글을 작성합니다.

반드시 다음을 지키세요.
- 리뷰에 실제로 적힌 내용과 감정에 직접 반응하세요. 단순히 "맛있게 드셔서 감사합니다"로 일반화하지 마세요.
- 칭찬에는 고객이 언급한 메뉴, 맛, 양, 포장, 배달, 재주문 등의 구체적인 표현을 한 가지 이상 짚어 답하세요.
- 불만에는 변명 없이 먼저 사과하고, 해당 불편(누락, 지연, 식음, 맛, 포장, 서비스 등)을 정확히 언급한 뒤 개선 의지를 전하세요.
- 리뷰에 없는 주문 상황, 보상, 이벤트, 약속, 메뉴는 지어내지 마세요.
- 닉네임이 제공된 경우에만 "닉네임님,"으로 시작하고, 없으면 "고객님,"으로 시작하세요.
- 요청된 길이와 말투를 분명히 다르게 적용하세요. 짧게는 1~2문장, 보통은 3~4문장, 길게는 5~7문장으로 작성하세요.
- 따뜻하고 자연스럽게: 다정하고 진심 어린 말투. 차분하고 정중하게: 격식 있고 절제된 말투. 밝고 친근하게: 활기차되 과하지 않은 말투와 이모지 1~3개.
- 개인정보, 주문번호, 연락처를 쓰지 마세요.
- 답글 본문만 한국어로 반환하세요. 제목, 설명, 따옴표, 마크다운은 쓰지 마세요.`;

function setCors(req, res) {
  const origin = req.headers.origin || '';
  const allowed = [
    'https://bm10321-eng.github.io',
    process.env.APP_ORIGIN
  ].filter(Boolean);
  if (allowed.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function getOutputText(payload) {
  if (typeof payload.output_text === 'string') return payload.output_text.trim();
  return (payload.output || [])
    .flatMap(item => item.content || [])
    .filter(item => item.type === 'output_text')
    .map(item => item.text || '')
    .join('\n')
    .trim();
}

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({error: 'POST 요청만 사용할 수 있습니다.'});
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({error: 'AI 서비스가 아직 설정되지 않았습니다.'});

  const {review = '', nickname = '', tone = 'warm', length = 'medium', previousReply = ''} = req.body || {};
  const cleanReview = String(review).trim().slice(0, 4000);
  const cleanNickname = String(nickname).trim().slice(0, 30);
  const safeTone = ['warm', 'calm', 'bright'].includes(tone) ? tone : 'warm';
  const safeLength = ['short', 'medium', 'long'].includes(length) ? length : 'medium';
  if (!cleanReview) return res.status(400).json({error: '리뷰 내용을 입력해 주세요.'});

  const userPrompt = [
    `고객 닉네임: ${cleanNickname || '(없음)'}`,
    `답글 길이: ${{short: '짧게', medium: '보통', long: '길게'}[safeLength]}`,
    `말투: ${{warm: '따뜻하고 자연스럽게', calm: '차분하고 정중하게', bright: '밝고 친근하게'}[safeTone]}`,
    `고객 리뷰:\n${cleanReview}`,
    previousReply ? `직전 답글(표현과 구조를 반복하지 마세요):\n${String(previousReply).slice(0, 1200)}` : ''
  ].filter(Boolean).join('\n\n');

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-5-mini',
        instructions: SYSTEM_PROMPT,
        input: userPrompt,
        max_output_tokens: {short: 180, medium: 360, long: 640}[safeLength]
      })
    });
    const payload = await response.json();
    if (!response.ok) {
      console.error('OpenAI request failed:', response.status, payload?.error?.message);
      return res.status(502).json({error: 'AI 답글 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.'});
    }
    const reply = getOutputText(payload);
    if (!reply) return res.status(502).json({error: 'AI가 답글을 반환하지 않았습니다. 다시 시도해 주세요.'});
    return res.status(200).json({reply});
  } catch (error) {
    console.error('AI reply function failed:', error);
    return res.status(502).json({error: 'AI 서비스에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.'});
  }
};
