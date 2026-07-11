// Hierarchical matching helper to resolve yachtName to a database yachtId
export function resolveYachtId(yachtName, yachts) {
  if (!yachtName) return null;
  const q = yachtName.toLowerCase();
  
  const cleanYachts = yachts.map(y => {
    const cleanName = y.name.toLowerCase().replace("capacity", "").trim();
    return { ...y, cleanName };
  });
  
  cleanYachts.sort((a, b) => b.cleanName.length - a.cleanName.length);
  
  // 1. Try matching cleanName with word boundaries
  let matched = cleanYachts.find(y => {
    if (y.cleanName.length <= 1) return false;
    const escaped = y.cleanName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`);
    return regex.test(q);
  });
  if (matched) return matched.id;
  
  // 2. Try simple substring match of cleanName (fallback)
  matched = cleanYachts.find(y => {
    if (y.cleanName.length <= 2) return false;
    return q.includes(y.cleanName);
  });
  if (matched) return matched.id;
  
  // 3. Digits match fallback
  matched = cleanYachts.find(y => {
    const digits = y.name.match(/\d+/);
    if (digits) {
      const regex = new RegExp(`\\b${digits[0]}\\b`);
      return regex.test(q);
    }
    return false;
  });
  if (matched) return matched.id;
  
  return null;
}

// Deterministic Fallback Parser function
export function fallbackParseQuickAdd(query, yachts) {
  const result = {
    yachtId: null,
    adults: 2,
    children: 0,
    startDate: "",
    durationHours: 4,
    cateringEnabled: false,
    guestName: ""
  };
  
  const q = query.toLowerCase();
  
  // 1. Parse Yacht using the hierarchical resolver
  result.yachtId = resolveYachtId(q, yachts) || yachts[0]?.id || "";
  
  // 2. Parse Guests count
  const adultsMatch = q.match(/(\d+)\s*(?:people|guest|adult)/);
  if (adultsMatch) {
    result.adults = parseInt(adultsMatch[1], 10);
  }
  const kidsMatch = q.match(/(\d+)\s*(?:child|kid|children)/);
  if (kidsMatch) {
    result.children = parseInt(kidsMatch[1], 10);
  }
  
  // 3. Parse Catering
  if (q.includes("with catering") || q.includes("including catering") || q.includes("toggles catering") || (q.includes("catering") && !q.includes("no catering"))) {
    result.cateringEnabled = true;
  }
  
  // 4. Parse Date (today, tomorrow, day of week)
  let targetDate = new Date();
  const daysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  
  if (q.includes("tomorrow")) {
    targetDate.setDate(targetDate.getDate() + 1);
  } else {
    for (let i = 0; i < 7; i++) {
      if (q.includes(daysOfWeek[i])) {
        const todayDay = targetDate.getDay();
        const targetDay = i;
        let daysDiff = targetDay - todayDay;
        if (daysDiff <= 0) {
          daysDiff += 7;
        }
        targetDate.setDate(targetDate.getDate() + daysDiff);
        break;
      }
    }
  }
  
  const yyyy = targetDate.getFullYear();
  const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
  const dd = String(targetDate.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;
  
  // 5. Parse Time and Duration
  let startHour = 10;
  let duration = 4;
  
  const timeRangeMatch = q.match(/(?:from|at)\s*(\d+)(?:\s*(am|pm))?\s*(?:to\s*(\d+)(?:\s*(am|pm))?)?/);
  if (timeRangeMatch) {
    let startVal = parseInt(timeRangeMatch[1], 10);
    const startAmPm = timeRangeMatch[2];
    const endValStr = timeRangeMatch[3];
    const endAmPm = timeRangeMatch[4];
    
    if (startAmPm === "pm" && startVal < 12) startVal += 12;
    if (startAmPm === "am" && startVal === 12) startVal = 0;
    
    startHour = startVal;
    
    if (endValStr) {
      let endVal = parseInt(endValStr, 10);
      if (endAmPm === "pm" && endVal < 12) endVal += 12;
      if (endAmPm === "am" && endVal === 12) endVal = 0;
      
      if (endVal > startVal) {
        duration = endVal - startVal;
      }
    }
  }
  
  const durationMatch = q.match(/for\s*(\d+)\s*(?:hour|hrs)/);
  if (durationMatch) {
    duration = parseInt(durationMatch[1], 10);
  }
  
  const formattedHour = String(startHour).padStart(2, '0');
  result.startDate = `${dateStr}T${formattedHour}:00`;
  result.durationHours = duration;
  
  return result;
}

// Master NLP query parser that coordinates API calling and fallback mechanisms
export async function parseNLPQuery(query, yachts) {
  let parsedData = null;
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const todayLocalDateStr = `${yyyy}-${mm}-${dd}`;
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const todayDayOfWeek = days[today.getDay()];

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are an NLP parser for a yacht booking app. Today is ${todayLocalDateStr} (day of the week: ${todayDayOfWeek}).
Parse the following booking request query into a structured JSON object matching this schema:
{
  "yachtName": string | null (name of the yacht, e.g. "SQX 12 capacity", "SQX 45 capacity", "SQX 75 capacity", "30 capacity", "SQX"),
  "adults": number,
  "children": number,
  "startDate": string (ISO date string YYYY-MM-DDTHH:MM, resolved relative to today's date),
  "durationHours": number,
  "cateringEnabled": boolean,
  "guestName": string | null
}

Query: "${query}"`
            }]
          }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      });

      if (response.ok) {
        const resJson = await response.json();
        const contentText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
        if (contentText) {
          parsedData = JSON.parse(contentText);
          console.log("Parsed query successfully using Gemini API:", parsedData);
        }
      } else {
        console.warn("Gemini API returned error status:", response.status);
      }
    } catch (geminiErr) {
      console.error("Gemini API call failed, falling back to regex parser:", geminiErr);
    }
  }

  if (!parsedData) {
    console.log("Using deterministic fallback parser for query:", query);
    parsedData = fallbackParseQuickAdd(query, yachts);
  }

  return parsedData;
}
