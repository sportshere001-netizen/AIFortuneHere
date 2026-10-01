// engine.js - High-Precision Astronomy + Procedural Synthesis Engine
let ASTRO_DB = null;

fetch("fortune-data.json")
  .then(res => res.json())
  .then(data => { ASTRO_DB = data; })
  .catch(err => console.warn("Local JSON database load fallback", err));

export async function getCoordinates(locationStr) {
  try {
    const cleanCity = locationStr.split(',')[0].trim();
    const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cleanCity)}&count=1&format=json`);
    const data = await response.json();
    if (data.results && data.results.length > 0) {
      return {
        lat: parseFloat(data.results[0].latitude),
        lon: parseFloat(data.results[0].longitude),
        cityClean: data.results[0].name
      };
    }
    return { lat: 18.18, lon: 76.04, cityClean: cleanCity };
  } catch (e) {
    return { lat: 18.18, lon: 76.04, cityClean: locationStr.split(',')[0] };
  }
}

export function calculateNumerology(dobString) {
  const digits = dobString.replace(/\D/g, "");
  let sum = 0;
  for (let ch of digits) sum += parseInt(ch, 10);
  while (sum > 9 && sum !== 11 && sum !== 22 && sum !== 33) {
    sum = sum.toString().split("").reduce((acc, curr) => acc + parseInt(curr, 10), 0);
  }
  return sum;
}

export function calculateChineseZodiac(year) {
  const animals = ["Monkey", "Rooster", "Dog", "Pig", "Rat", "Ox", "Tiger", "Rabbit", "Dragon", "Snake", "Horse", "Goat"];
  const elements = ["Metal", "Metal", "Water", "Water", "Wood", "Wood", "Fire", "Fire", "Earth", "Earth"];
  return { animal: animals[year % 12], element: elements[year % 10] };
}

export function calculateVedicChart(dobString, hour, minute, ampm, lon, lat) {
  const [Y_str, M_str, D_str] = dobString.split('-');
  let Y = parseInt(Y_str, 10);
  let M = parseInt(M_str, 10);
  const D = parseInt(D_str, 10);

  let H = parseInt(hour, 10);
  if (ampm === "PM" && H !== 12) H += 12;
  if (ampm === "AM" && H === 12) H = 0;

  const offsetHours = new Date().getTimezoneOffset() / -60;
  const UT = H + (parseInt(minute, 10) / 60) - offsetHours;

  let y = Y, m = M;
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  const JD = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + D + (UT / 24) + B - 1524.5;
  const T = (JD - 2451545.0) / 36525;

  const rad = Math.PI / 180;
  const L_prime = (218.3164477 + 481267.88123421 * T) % 360;
  const D_elong = (297.8501921 + 445267.1114034 * T) % 360;
  const M_sun = (357.5291092 + 35999.0502909 * T) % 360;
  const M_moon = (134.9633964 + 477198.8675055 * T) % 360;

  let trueMoonLon = L_prime
    + 6.289 * Math.sin(M_moon * rad)
    - 1.274 * Math.sin((M_moon - 2 * D_elong) * rad)
    + 0.658 * Math.sin(2 * D_elong * rad)
    - 0.186 * Math.sin(M_sun * rad);
  trueMoonLon = (trueMoonLon + 360) % 360;

  const ayanamsa = 23.85 + (1.396 * T);
  const siderealMoon = (trueMoonLon - ayanamsa + 360) % 360;

  const gmst = (280.46061837 + 360.98564736629 * (JD - 2451545.0)) % 360;
  let lst = (gmst + lon) % 360;
  if (lst < 0) lst += 360;

  const eps = 23.439 * rad;
  const lstRad = lst * rad;
  const latRad = lat * rad;

  const yAxis = Math.cos(lstRad);
  const xAxis = -(Math.sin(lstRad) * Math.cos(eps) + Math.tan(latRad) * Math.sin(eps));

  let ascTropical = Math.atan2(yAxis, xAxis) / rad;
  if (ascTropical < 0) ascTropical += 360;
  const siderealAsc = (ascTropical - ayanamsa + 360) % 360;

  const rashiNames = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
  const nakshatraIndex = Math.floor(siderealMoon / 13.333333) % 27;
  const dashaLords = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];

  return {
    ascendant: rashiNames[Math.floor(siderealAsc / 30) % 12],
    moonSign: rashiNames[Math.floor(siderealMoon / 30) % 12],
    nakshatraIndex,
    dasha: dashaLords[nakshatraIndex % 9]
  };
}

export async function generateInstantReport(params) {
  if (!ASTRO_DB) {
    const res = await fetch("fortune-data.json");
    ASTRO_DB = await res.json();
  }

  const { name, dob, hour, minute, ampm, location, focus } = params;
  const birthYear = parseInt(dob.split("-")[0], 10);
  const coords = await getCoordinates(location);
  const vedic = calculateVedicChart(dob, hour, minute, ampm, coords.lon, coords.lat);
  const numerology = calculateNumerology(dob);
  const bazi = calculateChineseZodiac(birthYear);

  const ascData = ASTRO_DB.zodiac_signs[vedic.ascendant];
  const moonData = ASTRO_DB.zodiac_signs[vedic.moonSign];
  const nakshatra = ASTRO_DB.nakshatras[vedic.nakshatraIndex];

  const colorPalette = ["Royal Indigo & Gold", "Emerald Green & Copper", "Deep Crimson & Pearl", "Sun Amber & Sapphire"];
  const luckyDays = ["Thursday & Sunday", "Monday & Friday", "Tuesday & Saturday", "Wednesday & Friday"];

  return {
    coords,
    vedic: {
      ascendant: `${vedic.ascendant} (${ascData.vedic})`,
      moonSign: `${vedic.moonSign} (${moonData.vedic})`,
      nakshatra: `${nakshatra.name} (Lord: ${nakshatra.lord})`,
      dasha: `${vedic.dasha} Mahadasha`,
      insight: `${moonData.core_insight} Your external presence is channeled through your Ascendant in ${vedic.ascendant}: ${ascData.traits.toLowerCase()}. With the current ${vedic.dasha} period active, cosmic momentum supports decisive growth in ${focus}.`
    },
    bazi_element: `${bazi.element} ${bazi.animal}`,
    karmic_echoes: `As a ${vedic.ascendant} Ascendant with Moon in ${vedic.moonSign}, you navigate the intersection of ${ascData.element} and ${moonData.element}. Past-life momentum developed high resilience; your life task is to apply ${nakshatra.quality.toLowerCase()} without attachment to ego.`,
    soulmate_signature: `Your astrological signature resonates with a partner possessing strong ${bazi.element} grounding, stabilizing your ${moonData.element} impulse.`,
    lucky_indicators: {
      numbers: `${numerology}, ${(numerology * 3) % 9 + 1}, ${(numerology * 7) % 9 + 1}`,
      colors: colorPalette[(birthYear + numerology) % colorPalette.length],
      days: luckyDays[vedic.nakshatraIndex % luckyDays.length]
    },
    rawAstro: {
      ascendant: vedic.ascendant,
      moonSign: vedic.moonSign,
      nakshatra: nakshatra.name,
      dasha: vedic.dasha,
      bazi: `${bazi.element} ${bazi.animal}`,
      numerology
    }
  };
}

// THE LOCAL PROCEDURAL ORACLE (Replaces Cloud APIs for 100% uptime & privacy)
export async function generateLocalOracleProphecy(astroFacts, focus, name) {
  // Simulate deep calculation delay for user experience
  await new Promise(resolve => setTimeout(resolve, 2500));

  // Procedural Remedy Matrix based on Dasha Lord
  const remediesDB = {
    "Ketu": ["Donate to animal shelters on Tuesdays.", "Wear Cat's Eye (Chrysoberyl) to focus scattered spiritual energy."],
    "Venus": ["Incorporate white floral scents into your morning routine.", "Wear a clear Diamond or White Sapphire to attract material abundance."],
    "Sun": ["Offer water to the rising sun daily.", "Wear Ruby or copper to enhance executive leadership and vitality."],
    "Moon": ["Meditate near flowing water on Monday evenings.", "Wear a natural Pearl set in silver to stabilize emotional fluctuations."],
    "Mars": ["Engage in vigorous physical exercise on Tuesdays.", "Wear Red Coral to channel raw aggression into disciplined ambition."],
    "Rahu": ["Avoid major impulsive decisions during eclipses.", "Wear Hessonite (Gomed) to cut through modern illusions and anxiety."],
    "Jupiter": ["Mentor someone younger or less experienced every Thursday.", "Wear Yellow Sapphire to expand financial and philosophical luck."],
    "Saturn": ["Engage in silent, disciplined routines on Saturdays.", "Wear Blue Sapphire or Iron to build enduring, generational legacy."],
    "Mercury": ["Journal your most complex thoughts on Wednesday mornings.", "Wear Emerald to sharpen neurological pathways and communication."]
  };

  const currentRemedies = remediesDB[astroFacts.dasha] || ["Maintain a consistent daily routine.", "Focus on mindful breathing at dawn."];

  return {
    "executive_summary": `For ${name}, the rare convergence of a ${astroFacts.ascendant} Ascendant and a ${astroFacts.moonSign} Moon operating within the ${astroFacts.dasha} Mahadasha creates a profound energetic window. The cosmos is actively aligning to manifest breakthroughs specifically in ${focus}.`,
    "deep_astrological_synthesis": `Your cosmic architecture is complex. The ${astroFacts.moonSign} Moon dictates your instinctual, emotional reactions, providing a restless drive. However, your ${astroFacts.ascendant} Ascendant forces this raw energy into a structured, outward persona. Because you are currently governed by the ${astroFacts.dasha} period, the tension between these signs is harmonized, providing you with the exact stamina and insight required to excel in ${focus}. \n\nThe ${astroFacts.nakshatra} Nakshatra further flavors your approach, ensuring that your methods are entirely unique. While others follow traditional paths, your combination demands that you pioneer your own route to success.`,
    "past_life_karmic_mandate": `In previous incarnations, the soul struggled with the extreme polarities of your current signs. You either yielded too much power or hoarded it. Your mandate in this lifetime, under the watchful eye of ${astroFacts.dasha}, is to balance ambition with selfless service.`,
    "soulmate_energetic_radar": `Your chart repels superficial connections. You require an energetic counterbalance—someone who embodies the ${astroFacts.bazi} frequency. This partner will possess the grounding gravity necessary to anchor your dynamic, rapidly shifting cosmic momentum.`,
    "yearly_prophetic_milestones": [
      `Months 1-4: The ${astroFacts.dasha} energy brings hidden opportunities in ${focus} to the surface. Expect a period of intense mental restructuring.`,
      `Months 5-8: A specific catalyst directly linked to your ${astroFacts.ascendant} nature forces a major decision. Lean into your intuition rather than pure logic.`,
      `Months 9-12: The culmination phase. Karmic dividends pay out, firmly establishing your new reality in ${focus}.`
    ],
    "sacred_remedies": currentRemedies
  };
}
