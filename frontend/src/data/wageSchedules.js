/**
 * Standard occupations and schedules aligned with Karnataka Labour Department
 * notifications and verified in verified_wages_v1.json.
 */

export const OCCUPATIONS = [
  {
    id: "security_guard",
    sector: "security",
    skill: "semi_skilled",
    label: {
      kn: "ಸೆಕ್ಯುರಿಟಿ ಗಾರ್ಡ್ / ಕಾವಲುಗಾರ (Security Guard)",
      hi: "सुरक्षा गार्ड (Security Guard)",
      en: "Security Guard / Watchman (Semi-Skilled)",
    },
    aliases: ["security", "guard", "watchman", "chowkidar", "ಸೆಕ್ಯುರಿಟಿ", "ಕಾವಲುಗಾರ", "ಗಾರ್ಡ್"]
  },
  {
    id: "security_supervisor",
    sector: "security",
    skill: "skilled",
    label: {
      kn: "ಸೆಕ್ಯುರಿಟಿ ಸೂಪರ್‌ವೈಸರ್ (Security Supervisor)",
      hi: "सुरक्षा सुपरवाइज़र (Security Supervisor)",
      en: "Security Supervisor / Inspector (Skilled)",
    },
    aliases: ["supervisor", "inspector", "ಸೂಪರ್‌ವೈಸರ್"]
  },
  {
    id: "helper",
    sector: "shops",
    skill: "unskilled",
    label: {
      kn: "ಅಂಗಡಿ ಸಹಾಯಕ / ಹೆಲ್ಪರ್ / ಪ್ಯೂನ್ (Shop Helper / Peon)",
      hi: "दुकान सहायक / चपरासी (Shop Helper)",
      en: "Shop Helper / Peon / Cleaner (Unskilled)",
    },
    aliases: ["helper", "peon", "cleaner", "office boy", "sweeper", "ಹೆಲ್ಪರ್", "ಪ್ಯೂನ್", "ಸಹಾಯಕ", "ಕ್ಲೀನರ್"]
  },
  {
    id: "assistant_salesman",
    sector: "shops",
    skill: "semi_skilled",
    label: {
      kn: "ಅಸಿಸ್ಟೆಂಟ್ ಸೇಲ್ಸ್‌ಮ್ಯಾನ್ / ಬಿಲ್ ಕ್ಲರ್ಕ್ (Assistant Salesman / Bill Clerk)",
      hi: "सहायक सेल्समैन / बिल क्लर्क (Assistant Salesman)",
      en: "Assistant Salesman / Bill Clerk / Packer (Semi-Skilled)",
    },
    aliases: ["assistant salesman", "bill clerk", "packer", "godown keeper", "ಅಸಿಸ್ಟೆಂಟ್ ಸೇಲ್ಸ್‌ಮ್ಯಾನ್", "ಬಿಲ್ ಕ್ಲರ್ಕ್"]
  },
  {
    id: "salesman",
    sector: "shops",
    skill: "skilled",
    label: {
      kn: "ಮಾರಾಟಗಾರ / ಸೇಲ್ಸ್‌ಮ್ಯಾನ್ / ಕ್ಯಾಷಿಯರ್ (Salesman / Cashier)",
      hi: "सेल्समैन / कैशियर (Salesman)",
      en: "Salesperson / Cashier / Retail Sales (Skilled)",
    },
    aliases: ["salesman", "salesperson", "cashier", "ಮಾರಾಟಗಾರ", "ಸೇಲ್ಸ್‌ಮ್ಯಾನ್", "ಕ್ಯಾಷಿಯರ್"]
  },
  {
    id: "construction_labourer",
    sector: "construction",
    skill: "unskilled",
    label: {
      kn: "ಕಟ್ಟಡ ಕೂಲಿ ಕಾರ್ಮಿಕ / ಮಜದೂರ್ (Construction Labourer / Mazdoor)",
      hi: "निर्माण मजदूर / कुली (Construction Labourer)",
      en: "Construction Labourer / Mazdoor / Coolie (Unskilled)",
    },
    aliases: ["construction labourer", "mazdoor", "coolie", "ಕಟ್ಟಡ ಕಾರ್ಮಿಕ", "ಮಜದೂರ್", "ಕೂಲಿ"]
  },
  {
    id: "mason",
    sector: "construction",
    skill: "skilled",
    label: {
      kn: "ಕಟ್ಟಡ ಮೇಸ್ತ್ರಿ / ಬಡಗಿ / ಪ್ಲಂಬರ್ (Mason / Carpenter / Plumber)",
      hi: "मिस्त्री / बढ़ई / प्लंबर (Mason / Carpenter)",
      en: "Mason / Carpenter / Plumber / Electrician (Skilled)",
    },
    aliases: ["mason", "carpenter", "plumber", "electrician", "ಮೇಸ್ತ್ರಿ", "ಬಡಗಿ", "ಪ್ಲಂಬರ್", "ಎಲೆಕ್ಟ್ರಿಷಿಯನ್"]
  },
  {
    id: "domestic_worker",
    sector: "domestic",
    skill: "unskilled",
    label: {
      kn: "ಮನೆಗೆಲಸದವರು / ಸ್ವಚ್ಛತೆ ಕೆಲಸ (Domestic Worker / Maid)",
      hi: "घरेलू सहायिका / नौकरानी (Domestic Worker)",
      en: "Domestic Worker / Housemaid / Cleaner (Unskilled)",
    },
    aliases: ["domestic", "housemaid", "maid", "cleaner domestic", "ಮನೆ ಕೆಲಸ", "ಮನೆಗೆಲಸದವರು", "ಸ್ವಚ್ಛತೆ"]
  },
  {
    id: "domestic_cook",
    sector: "domestic",
    skill: "skilled",
    label: {
      kn: "ಮನೆ ಅಡುಗೆಯವರು / ಕೇರ್‌ಟೇಕರ್ (Domestic Cook / Caretaker)",
      hi: "घरेलू रसोइया / देखभालकर्ता (Domestic Cook)",
      en: "Domestic Cook / Nanny / Elder Care (Skilled)",
    },
    aliases: ["cook", "domestic cook", "nanny", "babysitter", "elder care", "ಅಡುಗೆ", "ಅಡುಗೆಯವರು", "ಕೇರ್‌ಟೇಕರ್"]
  }
];

export const SECTORS = [
  { id: "security", translationKey: "sectorSecurity" },
  { id: "shops", translationKey: "sectorShops" },
  { id: "construction", translationKey: "sectorConstruction" },
  { id: "domestic", translationKey: "sectorDomestic" },
  { id: "other", translationKey: "sectorOther" }
];
