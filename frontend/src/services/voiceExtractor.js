import { OCCUPATIONS } from '../data/wageSchedules.js';

/**
 * Web Speech Recognition API wrapper.
 * Strictly verifies browser support and microphone connectivity.
 */
export class SpeechService {
  constructor() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.supported = !!SpeechRecognition;
    this.recognition = this.supported ? new SpeechRecognition() : null;
    this.isRecording = false;

    if (this.recognition) {
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
    }
  }

  isSupported() {
    return this.supported;
  }

  start({ lang = 'kn-IN', onTranscript, onError, onEnd }) {
    if (!this.supported) {
      if (onError) onError({ type: 'not_supported', message: 'Speech recognition is not supported in this browser' });
      return;
    }

    if (this.isRecording) {
      this.stop();
    }

    this.recognition.lang = lang;

    this.recognition.onstart = () => {
      this.isRecording = true;
    };

    this.recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (onTranscript) {
        onTranscript({
          final: finalTranscript.trim(),
          interim: interimTranscript.trim(),
          full: (finalTranscript || interimTranscript).trim()
        });
      }
    };

    this.recognition.onerror = (event) => {
      this.isRecording = false;
      let errorType = 'general';
      if (event.error === 'not-allowed') {
        errorType = 'permission_denied';
      } else if (event.error === 'no-speech') {
        errorType = 'no_speech';
      } else if (event.error === 'network') {
        errorType = 'network_error';
      }

      if (onError) {
        onError({
          type: errorType,
          originalError: event.error,
          message: event.message || event.error
        });
      }
    };

    this.recognition.onend = () => {
      this.isRecording = false;
      if (onEnd) onEnd();
    };

    try {
      this.recognition.start();
    } catch (e) {
      this.isRecording = false;
      if (onError) onError({ type: 'start_failed', message: e.message });
    }
  }

  stop() {
    if (this.recognition && this.isRecording) {
      this.recognition.stop();
      this.isRecording = false;
    }
  }
}

/**
 * Text-to-Speech audio reader using window.speechSynthesis.
 */
export function playAudioExplanation(text, lang = 'kn') {
  if (!window.speechSynthesis) return false;

  window.speechSynthesis.cancel(); // Stop any current audio

  const utterance = new SpeechSynthesisUtterance(text);
  
  if (lang === 'kn') {
    utterance.lang = 'kn-IN';
  } else if (lang === 'hi') {
    utterance.lang = 'hi-IN';
  } else {
    utterance.lang = 'en-IN';
  }

  utterance.rate = 0.95; // Slightly slower for clarity
  utterance.pitch = 1.0;

  window.speechSynthesis.speak(utterance);
  return true;
}

export function stopAudioExplanation() {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Intelligent client-side heuristic parser to extract wage details
 * from spoken or typed natural language inputs in Kannada, Hindi, and English.
 */
export function extractDetailsFromText(rawText) {
  const text = (rawText || '').trim();
  const lowerText = text.toLowerCase();

  const extracted = {
    job_category: '',
    sector: 'security',
    skill_classification: 'semi_skilled',
    reported_wage: '',
    wage_period: 'monthly',
    location: 'Bengaluru',
    zone: 'Zone 1',
    hours_per_day: '8',
    days_per_month: '26',
    extracted_summary: ''
  };

  // 1. Extract Working Hours & Days first (so these numeric values are not misread as wage amounts)
  const hourMatch = lowerText.match(/\b([0-9]{1,2})\s*(?:hours|hrs|hr|ಗಂಟೆ|ಗಂಟೆಗಳು|घंटे|घंटा|ghante)\b/i);
  let hourSpan = null;
  if (hourMatch && hourMatch[1]) {
    extracted.hours_per_day = hourMatch[1];
    hourSpan = { start: hourMatch.index, end: hourMatch.index + hourMatch[0].length };
  }

  const dayMatch = lowerText.match(/\b([0-9]{1,2})\s*(?:days|day|ದಿನ|ದಿನಗಳು|दिन|din)\b/i);
  let daySpan = null;
  if (dayMatch && dayMatch[1]) {
    extracted.days_per_month = dayMatch[1];
    daySpan = { start: dayMatch.index, end: dayMatch.index + dayMatch[0].length };
  }

  // 2. Extract Wage Period
  if (/ದಿನ|ದಿನಕ್ಕೆ|ದಿನಗೂಲಿ|day|daily|roj|rooz|रोज़|रोज/i.test(lowerText)) {
    extracted.wage_period = 'daily';
  } else if (/ಗಂಟೆ|ಗಂಟೆಗೆ|hour|hourly|ghante|प्रति घंटा|प्रति घंटे/i.test(lowerText)) {
    extracted.wage_period = 'hourly';
  } else if (/ವಾರ|week|weekly|hafta|हफ्ते/i.test(lowerText)) {
    extracted.wage_period = 'weekly';
  } else if (/ತಿಂಗಳು|ತಿಂಗಳಿಗೆ|month|monthly|mahina|mahine|प्रति माह|हर महीने/i.test(lowerText)) {
    extracted.wage_period = 'monthly';
  } else {
    extracted.wage_period = 'monthly';
  }

  // 3. Extract Wage Amount
  // Supports:
  // - Indian comma formatting: 1,50,000 or 15,000
  // - Decimals: 15,500.50 or 650.75
  // - Currency prefixes: ₹, Rs, INR, ರೂ, ರೂಪಾಯಿ, रुपये, रुपया
  // - Currency suffixes: ₹, rs, inr, ರೂ, ರೂಪಾಯಿ, rupees, रुपये, रुपया, रुपयों, rupaye
  // - "k" suffix: 15k, 15.5k
  // - Contextual disambiguation: prioritizes worker's reported pay over statutory benchmark / legal minimum wage
  const clauseSplitRegex = /(?:\s+)(?:but|however|while|ಆದರೆ|ಆದ್ರೂ|ಆದ್ರೆ|ಆದಾಗ್ಯೂ|ಆದರೂ|लेकिन|परंतु|मगर|किंतु)(?:\s+)|(?:,\s+|\s+,\s*|[;\.]\s*)/gi;
  const clauses = [];
  let lastIdx = 0;
  let cm;
  while ((cm = clauseSplitRegex.exec(text)) !== null) {
    clauses.push({ text: text.slice(lastIdx, cm.index), start: lastIdx, end: cm.index });
    lastIdx = cm.index + cm[0].length;
  }
  clauses.push({ text: text.slice(lastIdx), start: lastIdx, end: text.length });

  const numRegex = /(?:(₹|rs\.?|inr|ರೂ\.?|ರೂಪಾಯಿ|रुपये|रुपया)\s*)?([0-9]{1,2}(?:,[0-9]{2})*,\d{3}(?:\.\d+)?|[0-9]{1,3}(?:,[0-9]{3})+(?:\.\d+)?|[0-9]+(?:\.[0-9]+)?)(?:\s*(k\b|₹|rs\.?|inr|ರೂ\.?|ರೂಪಾಯಿ|rupees?|रुपये|रुपया|रुपयों|rupaye))?/gi;
  
  const candidates = [];
  let match;
  while ((match = numRegex.exec(text)) !== null) {
    const fullMatch = match[0];
    const prefix = match[1] || '';
    const numPart = match[2];
    const suffix = match[3] || '';
    const matchStart = match.index;
    const matchEnd = match.index + fullMatch.length;

    // Skip if this number was part of the hours/day match
    if (hourSpan && matchStart >= hourSpan.start && matchEnd <= hourSpan.end) continue;
    // Skip if this number was part of the days/month match
    if (daySpan && matchStart >= daySpan.start && matchEnd <= daySpan.end) continue;

    // Discard standalone 1- or 2-digit numbers that have no currency symbols, no decimals, and no k
    const rawDigitsOnly = numPart.replace(/,/g, '');
    const numVal = parseFloat(rawDigitsOnly);
    const hasCurrency = Boolean(prefix || (suffix && suffix.toLowerCase() !== 'k'));
    const isK = suffix.toLowerCase() === 'k';

    if (numVal < 30 && !hasCurrency && !isK) {
      continue;
    }

    // Identify which clause this candidate falls into
    const clause = clauses.find(c => matchStart >= c.start && matchStart <= c.end) || { text };
    const clauseLower = clause.text.toLowerCase();

    // Check if THIS clause is associated with statutory benchmark / legal minimum wage
    const isStatutory = /minimum wage|statutory|benchmark|legal rate|govt rate|official wage|ಕನಿಷ್ಠ ವೇತನ|ಕನಿಷ್ಟ ವೇತನ|ಸರ್ಕಾರಿ ವೇತನ|ಸರ್ಕಾರದ ದರ|ನಿಕಷ|न्यूनतम वेतन|सरकारी वेतन|कानूनी वेतन/i.test(clauseLower);

    // Check if THIS clause is associated with worker's reported pay
    const isReportedPay = /i get|i receive|i earn|i make|my pay|my salary|my wage|paid to me|take home|receive|receiving|credited|ನನಗೆ|ನಂಗೆ|ಬರುತ್ತದೆ|ಬರುತ್ತೆ|ಸಿಗುತ್ತದೆ|ಸಿಗುತ್ತೆ|ಪಡೆಯುತ್ತೇನೆ|ಕೈಗೆ|ತಗೋತೀನಿ|ಕೊಡ್ತಾರೆ|ನೀಡುತ್ತಾರೆ|मुझे|मुझको|मिलता|मिलते|मिलती|कमाई|कमाता|पाता|मिल रहा/i.test(clauseLower);

    let score = 0;
    if (isStatutory) score -= 100;
    if (isReportedPay) score += 60;
    if (hasCurrency) score += 20;
    if (isK) score += 10;
    if (numVal >= 100) score += 10;

    let finalAmount = numVal;
    let finalStr = rawDigitsOnly;
    if (isK) {
      finalAmount = numVal * 1000;
      finalStr = finalAmount.toString();
    }

    candidates.push({
      fullMatch,
      rawDigitsOnly,
      amount: finalAmount,
      amountStr: finalStr,
      score,
      isStatutory,
      isReportedPay,
      hasCurrency
    });
  }

  // Filter out definitely statutory candidates if any non-statutory candidates exist
  const nonStatutoryCandidates = candidates.filter(c => !c.isStatutory);
  if (nonStatutoryCandidates.length > 0) {
    nonStatutoryCandidates.sort((a, b) => b.score - a.score);
    const best = nonStatutoryCandidates[0];
    if (best.amount > 0) {
      extracted.reported_wage = best.amountStr;
    }
  }

  // 4. Extract Occupation / Sector
  let matchedOccupation = null;
  for (const occ of OCCUPATIONS) {
    const isMatched = occ.aliases.some(alias => lowerText.includes(alias.toLowerCase()));
    if (isMatched) {
      matchedOccupation = occ;
      break;
    }
  }

  if (matchedOccupation) {
    extracted.job_category = matchedOccupation.id;
    extracted.sector = matchedOccupation.sector;
    extracted.skill_classification = matchedOccupation.skill;
  } else {
    if (/security|ಗಾರ್ಡ್|ಸೆಕ್ಯುರಿಟಿ|security guard|सुरक्षा|गार्ड/i.test(lowerText)) {
      extracted.job_category = 'security_guard';
      extracted.sector = 'security';
      extracted.skill_classification = 'semi_skilled';
    } else if (/helper|ಹೆಲ್ಪರ್|ಸಹಾಯಕ|cleaner|peon|मददगार|हेल्पर|सफाई/i.test(lowerText)) {
      extracted.job_category = 'helper';
      extracted.sector = 'shops';
      extracted.skill_classification = 'unskilled';
    } else if (/mason|ಮೇಸ್ತ್ರಿ|carpenter|construction|मिस्त्री|राजमिस्त्री|बढ़ई/i.test(lowerText)) {
      extracted.job_category = 'mason';
      extracted.sector = 'construction';
      extracted.skill_classification = 'skilled';
    } else if (/cook|ಅಡುಗೆ|domestic|maid|रसोइया|खाना बनाने|बाई/i.test(lowerText)) {
      extracted.job_category = 'domestic_cook';
      extracted.sector = 'domestic';
      extracted.skill_classification = 'skilled';
    } else {
      extracted.job_category = 'security_guard';
      extracted.sector = 'security';
      extracted.skill_classification = 'semi_skilled';
    }
  }

  // 5. Extract Location / Zone
  if (/bbmp|ಬೆಂಗಳೂರು|bengaluru|bangalore|koramangala|whitefield|indiranagar|jayanagar|बेंगलुरु|बैंगलोर/i.test(lowerText)) {
    extracted.location = 'Bengaluru';
    extracted.zone = 'Zone 1';
  }

  return extracted;
}
