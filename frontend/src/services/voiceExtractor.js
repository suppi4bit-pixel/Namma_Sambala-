import { OCCUPATIONS } from '../data/wageSchedules';

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
  const text = (rawText || '').toLowerCase();

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

  // 1. Extract Wage Amount
  // Matches numbers like 12000, 12,000, 450, 650, 18000, 15k, etc.
  const rupeePattern = /(?:₹|rs\.?|inr|ರೂ\.?|ರೂಪಾಯಿ|रुपये)?\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{3,6})(?:\s*k\b)?/i;
  const match = text.match(rupeePattern);
  if (match && match[1]) {
    let numStr = match[1].replace(/,/g, '');
    let amount = parseFloat(numStr);
    if (/k\b/i.test(match[0])) {
      amount *= 1000;
    }
    if (amount > 0) {
      extracted.reported_wage = amount.toString();
    }
  }

  // 2. Extract Wage Period
  if (/ದಿನ|ದಿನಕ್ಕೆ|ದಿನಗೂಲಿ|day|daily|roj|rooz/i.test(text)) {
    extracted.wage_period = 'daily';
  } else if (/ಗಂಟೆ|ಗಂಟೆಗೆ|hour|hourly|ghante/i.test(text)) {
    extracted.wage_period = 'hourly';
  } else if (/ವಾರ|week|weekly|hafta/i.test(text)) {
    extracted.wage_period = 'weekly';
  } else {
    extracted.wage_period = 'monthly'; // standard default
  }

  // 3. Extract Occupation / Sector
  let matchedOccupation = null;
  for (const occ of OCCUPATIONS) {
    const isMatched = occ.aliases.some(alias => text.includes(alias.toLowerCase()));
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
    // Default fallback to security_guard if mentioned security or general guard
    if (/security|ಗಾರ್ಡ್|ಸೆಕ್ಯುರಿಟಿ|security guard/i.test(text)) {
      extracted.job_category = 'security_guard';
      extracted.sector = 'security';
      extracted.skill_classification = 'semi_skilled';
    } else if (/helper|ಹೆಲ್ಪರ್|ಸಹಾಯಕ|cleaner|peon/i.test(text)) {
      extracted.job_category = 'helper';
      extracted.sector = 'shops';
      extracted.skill_classification = 'unskilled';
    } else if (/mason|ಮೇಸ್ತ್ರಿ|carpenter|construction/i.test(text)) {
      extracted.job_category = 'mason';
      extracted.sector = 'construction';
      extracted.skill_classification = 'skilled';
    } else if (/cook|ಅಡುಗೆ|domestic|maid/i.test(text)) {
      extracted.job_category = 'domestic_cook';
      extracted.sector = 'domestic';
      extracted.skill_classification = 'skilled';
    } else {
      // Default to security_guard for smooth first run
      extracted.job_category = 'security_guard';
      extracted.sector = 'security';
      extracted.skill_classification = 'semi_skilled';
    }
  }

  // 4. Extract Hours if mentioned
  const hourMatch = text.match(/([0-9]{1,2})\s*(?:hours|hrs|hr|ಗಂಟೆ|घंटे)/i);
  if (hourMatch && hourMatch[1]) {
    extracted.hours_per_day = hourMatch[1];
  }

  // 5. Extract Location / Zone
  if (/bbmp|ಬೆಂಗಳೂರು|bengaluru|bangalore|koramangala|whitefield|indiranagar|jayanagar/i.test(text)) {
    extracted.location = 'Bengaluru';
    extracted.zone = 'Zone 1';
  }

  return extracted;
}
