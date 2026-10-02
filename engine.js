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

// THE LOCAL PROCEDURAL ORACLE (Advanced Combinatorics Matrix)
export async function generateLocalOracleProphecy(astroFacts, focus, name) {
  // Simulate deep calculation delay for user experience
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Helper function to pick a random sentence and inject unique variables
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const fill = (template) => template.replace(/\{(\w+)\}/g, (_, key) => vars[key] || "");

  // Dynamic Variables for Injection
  const vars = {
    name: name.split(' ')[0], // Uses first name for a personal touch
    asc: astroFacts.ascendant,
    moon: astroFacts.moonSign,
    nak: astroFacts.nakshatra,
    dasha: astroFacts.dasha,
    bazi: astroFacts.bazi,
    focus: focus
  };

  // --- 1. EXECUTIVE SUMMARY VARIATIONS ---
  const summaries = [
    "For {name}, the rare convergence of a {asc} Ascendant and a {moon} Moon operating within the {dasha} Mahadasha creates a profound energetic window. The cosmos is actively aligning to manifest breakthroughs specifically in {focus}.",
    "The celestial blueprint for {name} reveals a highly dynamic signature. With your {moon} Moon driving your instincts and {dasha} ruling your current timeline, a massive shift in {focus} is imminent.",
    "Looking at {name}'s cosmic architecture, the combination of a {asc} rising sign and the active {dasha} period acts as a massive catalyst. You are entering a phase of rapid acceleration in {focus}.",
    "The stars indicate a period of intense manifestation for {name}. The tension between your {moon} Moon and {asc} Ascendant is currently being harmonized by the {dasha} Mahadasha, opening new doors in {focus}.",
    "{name}, your astrological matrix is incredibly specific. The universe is utilizing the energy of your {bazi} year to anchor the turbulent, transformative energy of your current {dasha} cycle, directly impacting your {focus}."
  ];

  // --- 2. ASTROLOGICAL DYNAMICS VARIATIONS ---
  const dynamics = [
    "Your cosmic architecture is complex. The {moon} Moon dictates your instinctual, emotional reactions, providing a restless drive. However, your {asc} Ascendant forces this raw energy into a structured, outward persona.",
    "Internally, you process the world through the lens of {moon}, making you highly intuitive and driven. Externally, society sees the {asc} archetype—a mask of control and deliberation. Balancing these two is your lifelong mastery.",
    "The core engine of your chart is the friction between your {moon} mind and your {asc} physical presence. While others might struggle with this duality, it gives you a distinct, unpredictable advantage.",
    "Because your foundational energy is rooted in {moon}, you require deep emotional resonance in everything you do. Your {asc} rising sign ensures that you execute those desires with precision and authority.",
    "You possess a dual-frequency aura. The {moon} energy makes you a visionary, while the {asc} energy forces you to build those visions in reality. This is not an easy path, but it is a powerful one."
  ];

  // --- 3. DASHA & BAZI INTEGRATION VARIATIONS ---
  const integrations = [
    "Because you are currently governed by the {dasha} period, this internal tension is harmonized, providing you with the exact stamina required to excel. This is further stabilized by your Chinese {bazi} nature, which grants you immense endurance.",
    "The current {dasha} cycle acts as a spotlight, exposing hidden opportunities. Meanwhile, your {bazi} element ensures that you do not rush blindly, forcing you to strategize before you strike.",
    "Operating under the {dasha} planetary ruler shifts your focus toward long-term legacy. Your {bazi} year acts as a protective shield, guarding your energy from those who try to siphon it.",
    "The {dasha} Mahadasha is known for stripping away illusions. You are currently being forced to rely on the grounded, pragmatic traits of your {bazi} animal sign to navigate this transition.",
    "With {dasha} taking the helm of your chart, the universe is demanding action. Fortunately, your {bazi} energetic signature provides the exact type of resilience needed to endure the incoming changes."
  ];

  // --- 4. NAKSHATRA FLAVOR VARIATIONS ---
  const nakshatras = [
    "The {nak} Nakshatra further flavors your approach, ensuring that your methods are entirely unique. While others follow traditional paths, your combination demands that you pioneer your own route to success.",
    "Born under the {nak} lunar mansion, you possess a hidden reservoir of esoteric knowledge. Trust your sudden flashes of insight—they are mathematically precise calculations made by your subconscious.",
    "The influence of {nak} grants you a magnetic, almost disruptive presence. You are not meant to blend in; you are meant to redefine the rules of the room the moment you walk in.",
    "Your placement in {nak} indicates a soul that learns through extreme cycles of destruction and rebirth. You build, you tear down, and you rebuild stronger.",
    "Governed by the {nak} star cluster, your greatest asset is your adaptability. You can read the hidden motives of others, allowing you to stay three steps ahead in any negotiation."
  ];

  // --- 5. PAST LIFE KARMA VARIATIONS ---
  const karmas = [
    "In previous incarnations, the soul struggled with the extreme polarities of your current signs. You either yielded too much power or hoarded it. Your mandate in this lifetime is to balance ambition with selfless service.",
    "Your karmic carryover involves themes of abandonment and radical independence. In this life, your task is to learn how to build enduring partnerships without losing your sovereign identity.",
    "Past life momentum developed a high level of spiritual resilience within you. However, you often neglected the material world. This lifetime forces you to master the physical realm and build tangible wealth.",
    "You carry the karma of the eternal student. In past lives, you accumulated immense knowledge but hesitated to share it. Now, the universe demands that you step into the role of the teacher and leader.",
    "Your soul's history is tied to rigid hierarchies and strict obedience. Your current chart is a rebellion against that past. You are here to break ancestral curses and forge a completely untraditional path."
  ];

  // --- 6. SOULMATE SIGNATURE VARIATIONS ---
  const soulmates = [
    "Your chart repels superficial connections. You require an energetic counterbalance—someone who possesses the grounding gravity necessary to anchor your dynamic, rapidly shifting cosmic momentum.",
    "You are magnetically drawn to individuals who challenge your intellect. Your ideal partner does not pacify you; they force you to evolve, matching your {moon} intensity note for note.",
    "Because your energy is so outward-focused, your romantic blueprint requires a partner who embodies profound stillness. You need a sanctuary, not another battlefield.",
    "Your astrological signature demands a co-creator, not a dependent. You will only find lasting peace with a partner who is equally obsessed with their own distinct life mission.",
    "You resonate with souls that carry a heavy, ancient frequency. You will likely bypass conventional romance in favor of a profound, psychologically transformative union."
  ];

  // Procedural Remedy Matrix based dynamically on Dasha Lord
  const remediesDB = {
    "Ketu": ["Donate to animal shelters on Tuesdays to balance karmic debts.", "Wear Cat's Eye (Chrysoberyl) to focus scattered spiritual energy.", "Practice grounding meditations barefoot on soil.", "Avoid making permanent life decisions during eclipse seasons."],
    "Venus": ["Incorporate white floral scents into your morning routine.", "Wear a clear Diamond, White Sapphire, or Zircon to attract material abundance.", "Keep your living space immaculately organized to allow energy flow.", "Practice gratitude journaling on Friday evenings."],
    "Sun": ["Offer water to the rising sun daily to boost executive authority.", "Wear Ruby or copper to enhance physical vitality and leadership.", "Recite the Gayatri Mantra at dawn.", "Engage in acts of anonymous generosity on Sundays."],
    "Moon": ["Meditate near flowing natural water on Monday evenings.", "Wear a natural Pearl set in silver to stabilize emotional fluctuations.", "Drink water from a silver vessel to cool mental anxiety.", "Prioritize a strict, uninterrupted sleep schedule."],
    "Mars": ["Engage in vigorous, exhausting physical exercise on Tuesday mornings.", "Wear Red Coral to channel raw aggression into disciplined ambition.", "Practice martial arts or competitive sports to burn excess kinetic energy.", "Donate blood or support emergency workers."],
    "Rahu": ["Avoid major impulsive decisions or risky investments during eclipses.", "Wear Hessonite (Gomed) to cut through modern illusions and digital anxiety.", "Limit screen time and social media scrolling before sleep.", "Feed stray dogs or birds on Saturdays."],
    "Jupiter": ["Mentor someone younger or less experienced every Thursday.", "Wear Yellow Sapphire to expand financial luck and philosophical wisdom.", "Donate educational materials or books to those in need.", "Maintain a daily practice of studying ancient texts or philosophy."],
    "Saturn": ["Engage in silent, disciplined, and repetitive routines on Saturdays.", "Wear Blue Sapphire or an Iron ring to build enduring, generational legacy.", "Provide service or charity to the elderly and marginalized.", "Embrace delays as periods of necessary structural testing."],
    "Mercury": ["Journal your most complex, racing thoughts on Wednesday mornings.", "Wear Emerald to sharpen neurological pathways and business communication.", "Engage in puzzles, coding, or learning a new language.", "Keep a green plant on your working desk to absorb mental static."]
  };

  // Select two random, unique remedies for the current Dasha
  const possibleRemedies = remediesDB[astroFacts.dasha] || remediesDB["Jupiter"];
  const shuffledRemedies = possibleRemedies.sort(() => 0.5 - Math.random());

  // Procedural Milestones based on Dasha
  const milestoneThemes = {
    "Venus": ["artistic breakthroughs", "financial windfalls", "romantic realignments"],
    "Sun": ["career elevation", "recognition from authority figures", "physical vitality peaks"],
    "Moon": ["deep emotional resets", "changes in residence or homeland", "intuitive awakenings"],
    "Mars": ["rapid property acquisition", "conquering competitors", "surge in physical energy"],
    "Rahu": ["sudden, unexpected foreign opportunities", "breaking social conventions", "technological gains"],
    "Jupiter": ["expansion of wealth", "birth of children or new projects", "spiritual pilgrimages"],
    "Saturn": ["heavy structural responsibilities", "slow but permanent financial gains", "mastery through discipline"],
    "Mercury": ["business networking success", "publishing or communication breakthroughs", "agile problem solving"],
    "Ketu": ["spiritual detachment from toxic cycles", "sudden intuitive flashes", "closure of past-life debts"]
  };

  const themes = milestoneThemes[astroFacts.dasha] || ["major transitions", "unexpected growth", "karmic balancing"];

  return {
    "executive_summary": fill(pick(summaries)),
    "deep_astrological_synthesis": fill(pick(dynamics)) + "\n\n" + fill(pick(integrations)) + "\n\n" + fill(pick(nakshatras)),
    "past_life_karmic_mandate": fill(pick(karmas)),
    "soulmate_energetic_radar": fill(pick(soulmates)),
    "yearly_prophetic_milestones": [
      `Months 1-4: The ${astroFacts.dasha} energy brings hidden opportunities regarding ${themes[0]} to the surface. Expect intense mental restructuring.`,
      `Months 5-8: A specific catalyst linked to your ${astroFacts.ascendant} nature forces a major decision concerning ${themes[1]}. Lean into intuition over pure logic.`,
      `Months 9-12: The culmination phase. Karmic dividends pay out, firmly establishing your new reality through ${themes[2]} in ${focus}.`
    ],
    "sacred_remedies": [shuffledRemedies[0], shuffledRemedies[1]]
  };
}
