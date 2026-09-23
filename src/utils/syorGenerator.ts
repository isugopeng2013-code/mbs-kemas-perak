/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Acronyms that must remain in UPPERCASE
const PRESERVED_ACRONYMS = [
  "KEMAS", "PKD", "JKR", "TNB", "PBT", "MBI", "MDKAP", "DUN", "DM", 
  "KPDN", "LED", "OKU", "PDRM", "RELA", "AADK", "JPJ", "PKB", "HQ", "ADUN",
  "KG", "B40", "MBS"
];

// Local Proper Nouns to keep capitalized
const PROPER_NOUNS = [
  "Gopeng", "Teja", "Simpang Pulai", "Sungai Rapat", "Kampar", "Perak",
  "Desa Pakatan", "Ipoh Jaya", "Bandar Pulai Jaya", "Serdang Permai", 
  "Kampong Sungai Itek", "Pekan Razaki", "Siti Zuraidah", "Nur Amirah", 
  "Roslinda", "Halim", "Zabri", "Ahmad", "Mohamad", "Seng", "Ah Seng", "Tan"
];

// Extract sub-words for loose proper name matching
const PROPER_NOUN_WORDS = PROPER_NOUNS.flatMap(noun => noun.split(/\s+/));

/**
 * Lowercase the first character of a string, unless it is a proper acronym or uppercase name
 */
export function lowercaseFirst(s: string): string {
  if (!s) return "";
  if (/^[A-Z]{2,}/.test(s)) {
    return s;
  }
  return s.charAt(0).toLowerCase() + s.slice(1);
}

/**
 * Automatically corrects common administrative and language spelling typos in standard Malay
 */
export function fixMalayTypos(text: string): string {
  if (!text) return "";
  let temp = text;
  temp = temp.replace(/\bgologan\b/gi, "golongan");
  temp = temp.replace(/\bkedaan\b/gi, "keadaan");
  temp = temp.replace(/\bsimpung\b/gi, "simpang");
  temp = temp.replace(/\bkeranaia\b/gi, "kerana ia");
  temp = temp.replace(/\bsekiat\b/gi, "sekitar");
  temp = temp.replace(/\balpisan\b/gi, "lapisan");
  temp = temp.replace(/\basnaf b40\b/gi, "asnaf B40");
  temp = temp.replace(/\bb40\b/gi, "B40");
  temp = temp.replace(/\bmbs\b/gi, "MBS");
  temp = temp.replace(/\bpkd\b/gi, "PKD");
  temp = temp.replace(/\bjkr\b/gi, "JKR");
  temp = temp.replace(/\btnb\b/gi, "TNB");
  temp = temp.replace(/\bpbt\b/gi, "PBT");
  return temp;
}

/**
 * Filter and unique sentence list to eliminate duplicates
 */
export function cleanAndDeduplicateSentences(text: string): string[] {
  if (!text) return [];
  // Strip previous title prefixes
  let cleanText = text.replace(/^[^•]+•\s*/i, "").trim();

  // Strip transport labels from pre-structured form returns
  cleanText = cleanText.replace(/APA\s*\(What\)\s*:/gi, " ");
  cleanText = cleanText.replace(/DI\s*MANA\s*\(Where\)\s*:/gi, " ");
  cleanText = cleanText.replace(/SIAPA\s*\(Who\)\s*:/gi, " ");
  cleanText = cleanText.replace(/KENAPA\s*\(Why\)\s*:/gi, " ");
  cleanText = cleanText.replace(/BAGAIMANA\s*\(How\)\s*:/gi, " ");
  cleanText = cleanText.replace(/\|/g, " ");

  const rawSentences = cleanText.split(/(?<=[.!?])\s+/);
  const seenSignatures = new Set<string>();
  const uniqueSentences: string[] = [];

  for (const s of rawSentences) {
    let trimmed = s.trim();
    if (!trimmed) continue;
    trimmed = fixMalayTypos(trimmed);
    trimmed = normalizeSentenceCase(trimmed);

    const sig = trimmed.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!sig) continue;

    let isDuplicate = false;
    for (const seen of seenSignatures) {
      if (seen.includes(sig) || sig.includes(seen) || seen === sig) {
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      seenSignatures.add(sig);
      uniqueSentences.push(trimmed);
    }
  }

  return uniqueSentences;
}

/**
 * Standardize text case (sentence case) and preserve acronyms/proper nouns
 */
export function normalizeSentenceCase(text: string): string {
  if (!text) return "";
  
  // Clean double spaces and normalize common typos across all types of whitespace (including NBSP, tab, newline, etc.)
  let cleaned = text.replace(/[\s\xa0\u00a0\u3000\u2000-\u200b\u202f\u205f]+/g, " ").trim();
  
  // Ensure space after punctuation
  cleaned = cleaned.replace(/([.,!?;:])([^\s\d])/g, "$1 $2");

  // Split into sentences
  const sentenceRegex = /([^.!?]+[.!?]*)/g;
  const matches = cleaned.match(sentenceRegex) || [cleaned];

  const processedSentences = matches.map((sentence) => {
    let trimmed = sentence.trim();
    if (!trimmed) return "";

    // Keep track of original words to handle mixed-case and proper casing
    const originalWords = trimmed.split(" ").filter(Boolean);
    let words = originalWords.map((word, index) => {
      // Stripped of punctuation for matching
      const cleanWordUpper = word.replace(/[.,!?;:()"'`]/g, "").toUpperCase();
      const cleanWordOrig = word.replace(/[.,!?;:()"'`]/g, "");
      
      // 1. Check preserved acronyms
      if (PRESERVED_ACRONYMS.includes(cleanWordUpper)) {
        return word.toUpperCase();
      }

      // 2. Check local proper nouns or proper sub-words
      const matchedNoun = PROPER_NOUNS.find(
        (noun) => noun.toUpperCase() === cleanWordUpper
      ) || PROPER_NOUN_WORDS.find(
        (subWord) => subWord.toUpperCase() === cleanWordUpper
      );

      if (matchedNoun) {
        const punctuationPrefix = word.match(/^[.,!?;:()"'`]+/)?.[0] || "";
        const punctuationSuffix = word.match(/[.,!?;:()"'`]+$/)?.[0] || "";
        return punctuationPrefix + matchedNoun + punctuationSuffix;
      }

      // 3. Preserve mixed-case words, acronyms (e.g. B40, JKR/PBT), and proper nouns typed by user
      const isPartiallyUpper = /[A-Z]/.test(cleanWordOrig);
      const isCapitalized = /^[A-Z]/.test(cleanWordOrig);

      if (isPartiallyUpper || (index > 0 && isCapitalized)) {
        // Keep original word casing
        return word;
      }

      return word.toLowerCase();
    });
    
    // Capitalize first word of sentence if it isn't already mixed-case or acronym
    if (words.length > 0 && words[0]) {
      const cleanFirst = words[0].replace(/[.,!?;:()"'`]/g, "");
      if (!/[A-Z]/.test(cleanFirst)) {
        words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);
      }
    }

    return words.join(" ");
  });

  return processedSentences.filter(Boolean).join(" ");
}

/**
 * Clean statement, extract/generate title, and standardize format based on 4W 1H guidelines
 */
export function standardizePernyataanAndGenerateTitle(text: string, category: string, lokaliti: string = ""): string {
  if (!text) return "";

  let title = "";
  let rawClean = text.trim();

  // Strip previous title separator " • " if it exists to retrieve the inner clean body
  if (rawClean.includes(" • ")) {
    const split = rawClean.split(" • ");
    title = split[0].trim().toUpperCase();
    rawClean = split.slice(1).join(" • ").trim();
  }

  // Detect if the text is ALREADY in formatted 4W 1H structure
  const match4W1H = /APA\s*\(What\)\s*:/i.test(rawClean);

  let apaText = "";
  let diManaText = "";
  let siapaText = "";
  let kenapaText = "";
  let bagaimanaText = "";

  if (match4W1H) {
    // Parser for structured 4W1H transport representation
    const parseField = (fieldPattern: string): string => {
      const regex = new RegExp(`${fieldPattern}\\s*:\\s*(.*?)(?=\\s*(?:\\||APA\\s*\\(|DI\\s*MANA\\s*\\(|SIAPA\\s*\\(|KENAPA\\s*\\(|BAGAIMANA\\s*\\(|$))`, "is");
      const match = rawClean.match(regex);
      return match ? match[1].trim() : "";
    };

    apaText = parseField("APA\\s*\\(What\\)");
    diManaText = parseField("DI\\s*MANA\\s*\\(Where\\)");
    siapaText = parseField("SIAPA\\s*\\(Who\\)");
    kenapaText = parseField("KENAPA\\s*\\(Why\\)");
    bagaimanaText = parseField("BAGAIMANA\\s*\\(How\\)");

    if ((!diManaText || diManaText.toLowerCase() === "kawasan lokaliti aduan" || diManaText.toLowerCase() === "kawasan terbabit" || diManaText.toLowerCase() === "lokaliti aduan") && lokaliti) {
      diManaText = lokaliti;
    }
  } else {
    // Plain text input: run deep semantic 4W1H extraction to summarize
    const sentences = cleanAndDeduplicateSentences(rawClean);

    // Filter and group sentences by their direct 4W1H keywords
    let diManaSentences: string[] = [];
    let bagaimanaSentences: string[] = [];
    let siapaSentences: string[] = [];
    let kenapaSentences: string[] = [];
    let apaSentences: string[] = [];

    for (const s of sentences) {
      const sLower = s.toLowerCase();

      // Check BAGAIMANA
      if (sLower.includes("mohon") || sLower.includes("syorkan") || sLower.includes("sehubungan dengan itu") || sLower.includes("sehubungan itu") || sLower.includes("oleh itu") || sLower.includes("pentadbir") || sLower.includes("diharap pihak") || sLower.includes("disegerakan")) {
        bagaimanaSentences.push(s);
        continue;
      }

      // Check DI MANA
      if (sLower.includes("berlaku di") || sLower.includes("di sekitar") || sLower.includes("sekitar kawasan") || sLower.includes("berlaku terutamanya di") || sLower.includes("di jalan ") || sLower.includes("sekitar kg") || sLower.includes("sekitar kampung")) {
        diManaSentences.push(s);
        continue;
      }

      // Check SIAPA
      if (sLower.includes("terkesan") || sLower.includes("golongan") || sLower.includes("penduduk setempat") || sLower.includes("pengguna jalan raya") || sLower.includes("asnaf") || sLower.includes("anak-anak") || sLower.includes("warga emas") || sLower.includes("pemandu kenderaan") || sLower.includes("merugikan rakyat") || sLower.includes("beban perbelanjaan rakyat")) {
        siapaSentences.push(s);
        continue;
      }

      // Check KENAPA
      if (sLower.includes("menjejaskan") || sLower.includes("membahayakan") || sLower.includes("risiko") || sLower.includes("beban fizikal") || sLower.includes("impak") || sLower.includes("meningkatkan") || sLower.includes("menambah beban")) {
        kenapaSentences.push(s);
        continue;
      }

      // Default is APA
      apaSentences.push(s);
    }

    // Pull from fallback groups if a group is empty
    if (apaSentences.length === 0) {
      const coreIssueSentence = sentences.find(s => {
        const sl = s.toLowerCase();
        return sl.includes("harga minyak") || sl.includes("harga barang") || sl.includes("jalan rosak") || sl.includes("longkang tersumbat") || sl.includes("lampu isyarat") || sl.includes("lampu jalan") || sl.includes("pembuangan sampah") || sl.includes("nyamuk aedes") || sl.includes("denggi") || sl.includes("sara hidup");
      });
      if (coreIssueSentence) {
        apaText = coreIssueSentence;
        diManaSentences = diManaSentences.filter(s => s !== coreIssueSentence);
        siapaSentences = siapaSentences.filter(s => s !== coreIssueSentence);
        kenapaSentences = kenapaSentences.filter(s => s !== coreIssueSentence);
        bagaimanaSentences = bagaimanaSentences.filter(s => s !== coreIssueSentence);
      } else if (sentences.length > 0) {
        apaText = sentences[0];
      }
    } else {
      apaText = apaSentences[0];
    }

    if (!diManaText) {
      if (diManaSentences.length > 0) {
        diManaText = diManaSentences[0];
      } else {
        diManaText = lokaliti || "Kawasan terbabit";
      }
    }

    if (!siapaText) {
      if (siapaSentences.length > 0) {
        siapaText = siapaSentences[0];
      }
    }

    if (!kenapaText) {
      if (kenapaSentences.length > 0) {
        kenapaText = kenapaSentences[0];
      }
    }

    if (!bagaimanaText) {
      if (bagaimanaSentences.length > 0) {
        bagaimanaText = bagaimanaSentences[0];
      }
    }
  }

  // Normalize spelling and fix typos across all variables
  apaText = fixMalayTypos(normalizeSentenceCase(apaText).trim());
  diManaText = fixMalayTypos(diManaText.trim());
  siapaText = fixMalayTypos(siapaText.trim());
  kenapaText = fixMalayTypos(kenapaText.trim());
  bagaimanaText = fixMalayTypos(bagaimanaText.trim());

  // Deduplicate any repeated oil-price/cost terms in the main variables
  const cleanMinyakStr = (str: string): string => {
    return str
      .replace(/kenaikan harga minyak kenaikan harga minyak/gi, "kenaikan harga minyak")
      .replace(/kenaikang harga minyak kenaikan harga minyak/gi, "kenaikan harga minyak");
  };

  apaText = cleanMinyakStr(apaText);
  diManaText = cleanMinyakStr(diManaText);
  siapaText = cleanMinyakStr(siapaText);
  kenapaText = cleanMinyakStr(kenapaText);
  bagaimanaText = cleanMinyakStr(bagaimanaText);

  // Strip raw issue boilerplate prefix if any to make it sound cleaner
  apaText = apaText.replace(/^masalah yang dilaporkan ini memberi kesan langsung kepada isu /gi, "Isu ").trim();

  // Ensure 'apaText' has clean casing and isn't empty
  if (!apaText || apaText.trim() === "") {
    apaText = "Laporan aduan berkenaan isu semasa penduduk setempat.";
  }

  const cleanLower = apaText.toLowerCase();

  // "tajuk pendek sahaja" (Short titles only - 2-3 words maximum)
  const isValidShortTitle = title && title.split(/\s+/).length <= 4 && !title.includes("APA") && !title.includes(":") && !title.includes("|");

  if (!isValidShortTitle) {
    if (cleanLower.includes("jalan") && (cleanLower.includes("rosak") || cleanLower.includes("lubang") || cleanLower.includes("penurapan") || cleanLower.includes("tar") || cleanLower.includes("pothole"))) {
      title = "JALAN ROSAK";
    } else if (cleanLower.includes("longkang") || cleanLower.includes("parit") || cleanLower.includes("tersumbat") || cleanLower.includes("saliran") || cleanLower.includes("banjir")) {
      title = "LONGKANG TERSUMBAT";
    } else if (cleanLower.includes("kesesakan") || cleanLower.includes("jem") || cleanLower.includes("sesak") || cleanLower.includes("trafik") || cleanLower.includes("lintas")) {
      title = "KESESAKAN TRAFIK";
    } else if (cleanLower.includes("isyarat") || cleanLower.includes("lampu isyarat")) {
      title = "LAMPU ISYARAT ROSAK";
    } else if (cleanLower.includes("lampu") && (cleanLower.includes("padam") || cleanLower.includes("rosak") || cleanLower.includes("gelap") || cleanLower.includes("malam"))) {
      title = "LAMPU JALAN ROSAK";
    } else if (cleanLower.includes("sampah") || cleanLower.includes("kotor") || cleanLower.includes("kutipan") || cleanLower.includes("bau")) {
      title = "PENGURUSAN SAMPAH";
    } else if (cleanLower.includes("denggi") || cleanLower.includes("nyamuk") || cleanLower.includes("aedes") || cleanLower.includes("fogging") || cleanLower.includes("klinik")) {
      title = "ANCAMAN DENGGI";
    } else if (cleanLower.includes("harga") || cleanLower.includes("minyak") || cleanLower.includes("sara hidup") || cleanLower.includes("beban") || cleanLower.includes("barang")) {
      title = "KOS SARA HIDUP";
    } else if (cleanLower.includes("anjing") || cleanLower.includes("liar") || cleanLower.includes("monyet") || cleanLower.includes("ular")) {
      title = "GANGGUAN HAIWAN";
    } else if (cleanLower.includes("tabika") || cleanLower.includes("kemas") || cleanLower.includes("tadika") || cleanLower.includes("kelas")) {
      title = "PRASARANA KEMAS";
    } else if (cleanLower.includes("api") || cleanLower.includes("kebakaran") || cleanLower.includes("litar")) {
      title = "BAHAYA KEBAKARAN";
    } else {
      // Fallback templates based on category (Short titles)
      switch (category) {
        case "Sosial":
          title = "ISU SOSIAL";
          break;
        case "Ekonomi":
          title = "ISU EKONOMI";
          break;
        case "Infrastruktur":
          title = "INFRASTRUKTUR AWAM";
          break;
        case "Keselamatan":
          title = "ISU KESELAMATAN";
          break;
        case "Kesihatan":
          title = "ISU KESIHATAN";
          break;
        case "Pendidikan":
          title = "PRASARANA PENDIDIKAN";
          break;
        default:
          title = "ISU SEMASA";
      }
    }
  }

  // Ensure Title is UPPERCASE
  title = title.toUpperCase().trim();

  const isEconomicIssue = cleanLower.includes("harga") || 
                          cleanLower.includes("minyak") || 
                          cleanLower.includes("sara hidup") || 
                          cleanLower.includes("beban") || 
                          cleanLower.includes("barang") || 
                          cleanLower.includes("ekonomi") || 
                          cleanLower.includes("subsidi") || 
                          cleanLower.includes("perbelanjaan") || 
                          cleanLower.includes("api");

  // If WHO (siapaText) is empty or placeholder, auto-generate it based on context
  if (!siapaText || siapaText.toLowerCase() === "penduduk") {
    siapaText = "penduduk setempat & pengguna harian";
    if (cleanLower.includes("murid") || cleanLower.includes("anak") || cleanLower.includes("sekolah") || cleanLower.includes("tabika") || cleanLower.includes("kemas")) {
      siapaText = "murid-murid prasekolah, guru-guru & waris keluarga";
    } else if (cleanLower.includes("jalan") || cleanLower.includes("tar") || cleanLower.includes("motor") || cleanLower.includes("pemandu") || cleanLower.includes("kereta")) {
      siapaText = "pengguna jalan raya & penduduk setempat";
    } else if (cleanLower.includes("peniaga") || cleanLower.includes("gerai") || cleanLower.includes("pasar")) {
      siapaText = "peniaga kecil & pengunjung premis perniagaan";
    } else if (cleanLower.includes("warga emas") || cleanLower.includes("pesakit") || cleanLower.includes("tua")) {
      siapaText = "kanak-kanak, warga emas & golongan rentan";
    }
  }

  // If WHY (kenapaText) is empty, auto-generate it
  if (!kenapaText) {
    kenapaText = "menjejaskan keselesaan, kesihatan dan kesejahteraan harian penduduk";
    if (cleanLower.includes("bahaya") || cleanLower.includes("kemalangan") || cleanLower.includes("rosak") || cleanLower.includes("lubang") || cleanLower.includes("litar") || cleanLower.includes("kebakaran")) {
      kenapaText = "membahayakan keselamatan fizikal pengguna & risiko kemalangan jalan raya";
    } else if (cleanLower.includes("longkang") || cleanLower.includes("parit") || cleanLower.includes("tersumbat") || cleanLower.includes("saliran") || cleanLower.includes("banjir")) {
      kenapaText = "risiko limpahan banjir kilat & pembiakan vektor nyamuk";
    } else if (cleanLower.includes("sampah") || cleanLower.includes("kotor") || cleanLower.includes("bau")) {
      kenapaText = "menimbulkan pencemaran bau busuk serta mengganggu imej persekitaran";
    } else if (cleanLower.includes("nyamuk") || cleanLower.includes("denggi") || cleanLower.includes("aedes")) {
      kenapaText = "mengancam nyawa penduduk setempat oleh risiko wabak demam denggi";
    } else if (cleanLower.includes("isyarat") || cleanLower.includes("lampu isyarat")) {
      kenapaText = "membahayakan keselamatan pengguna jalan raya dan berisiko mencetuskan kemalangan";
    } else if (cleanLower.includes("gelap") || cleanLower.includes("lampu") || cleanLower.includes("padam")) {
      kenapaText = "menyukarkan penglihatan waktu malam serta mengundang risiko keselamatan";
    } else if (cleanLower.includes("anjing") || cleanLower.includes("liar") || cleanLower.includes("monyet")) {
      kenapaText = "menimbulkan ketakutan kepada kanak-kanak & risiko serangan gigitan haiwan liar";
    } else if (cleanLower.includes("harga") || cleanLower.includes("barang") || cleanLower.includes("belanja") || cleanLower.includes("sara hidup")) {
      kenapaText = "meningkatkan kos belanja dapur & menjejaskan kualiti hidup asnaf B40";
    }
  }

  // If HOW (bagaimanaText) is empty, auto-generate it
  if (!bagaimanaText) {
    bagaimanaText = "mohon perhatian, lawatan tapak dan tindakan pembetulan segera daripada jabatan teknikal berkaitan";
    if (cleanLower.includes("isyarat") || cleanLower.includes("lampu isyarat")) {
      bagaimanaText = "pemasangan sistem solar lampu isyarat sandaran dikoordinasikan segera bersama agensi penyelaras";
    } else if (isEconomicIssue) {
      bagaimanaText = "pemantauan kawalan harga barangan dan penyelarasan skim bantuan subsidi bersasar dipertingkatkan segera demi kebajikan golongan sasar";
    } else if (category === "Infrastruktur" || category === "Pembangunan") {
      bagaimanaText = "pembetulan fizikal oleh agensi penyelaras teknikal (JKR/PBT) disegerakan";
    } else if (category === "Sosial") {
      bagaimanaText = "Pejabat Kebajikan mengadakan ziarah bantuan kecemasan bersasar";
    } else if (category === "Ekonomi") {
      bagaimanaText = "penyelarasan program Jualan Rahmah atau agihan bantuan dapur dilaksanakan segera";
    } else if (category === "Keselamatan") {
      bagaimanaText = "pihak berkuasa tempatan mempertingkatkan rondaan bersepadu di laluan terbabit";
    } else if (category === "Kesihatan") {
      bagaimanaText = "gotong-royong membanteras pembiakan vektor dan semburan fogging Pejabat Kesihatan";
    }
  }

  // Override / correct bagaimanaText for economic issues to prevent physical JKR/PBT suggestions
  if (isEconomicIssue) {
    const isPhysicalText = bagaimanaText.toLowerCase().includes("fizikal") || 
                           bagaimanaText.toLowerCase().includes("jkr") || 
                           bagaimanaText.toLowerCase().includes("pbt") || 
                           bagaimanaText.toLowerCase().includes("jalan") || 
                           bagaimanaText.toLowerCase().includes("longkang") ||
                           bagaimanaText.toLowerCase().includes("jabatan teknikal");
    if (isPhysicalText) {
      bagaimanaText = "pemantauan kawalan harga barangan dan penyelarasan skim bantuan subsidi bersasar dipertingkatkan segera demi kebajikan golongan sasar";
    }
  }

  // Summarize and Merge into precisely 3 cohesive sentences in native Malay
  let sentence1 = apaText.trim();
  if (!sentence1.endsWith(".")) sentence1 += ".";

  let sentence2 = "";
  let cleanLokaliti = diManaText.replace(/^sekitar\s+/i, "").trim();
  let locationClause = "";

  const isDescLoc = cleanLokaliti.toLowerCase().includes("berlaku") || 
                    cleanLokaliti.toLowerCase().includes("memerlukan") || 
                    cleanLokaliti.split(/\s+/).length > 6;

  let whoClean = siapaText.trim();
  whoClean = whoClean.replace(/^pihak yang terkesan secara langsung berikutan perkara ini termasuklah/gi, "").trim();
  whoClean = whoClean.replace(/^golongan yang paling terkesan ialah/gi, "").trim();
  whoClean = whoClean.replace(/^gologan yang paling terkesan ialah/gi, "").trim();
  whoClean = whoClean.replace(/[.]+$/, "").trim();
  if (whoClean) {
    whoClean = lowercaseFirst(whoClean);
  } else {
    whoClean = "penduduk setempat";
  }

  let whyClean = kenapaText.trim();
  whyClean = whyClean.replace(/^beban fizikal ini memberi impak yang tinggi kerana/gi, "").trim();
  whyClean = whyClean.replace(/^keadaan ini amat dibimbangkan memandangkan ia boleh/gi, "").trim();
  whyClean = whyClean.replace(/^kesan kenaikan harga minyak dirasai apabila harga bahan api meningkat dan berlanjutan selagi harga minyak kekal tinggi, sekali gus/gi, "").trim();
  whyClean = whyClean.replace(/[.]+$/, "").trim();
  whyClean = lowercaseFirst(whyClean);
  if (whyClean.startsWith("ia ")) {
    whyClean = whyClean.slice(3).trim();
  }

  if (isDescLoc) {
    let descLocJoined = cleanLokaliti;
    if (!descLocJoined.endsWith(".")) descLocJoined = descLocJoined.replace(/[.]+$/, "") + ",";
    else descLocJoined = descLocJoined.replace(/[.]+$/, "");
    
    let whyCleanPart = whyClean;
    if (whyCleanPart.toLowerCase().startsWith("sekali gus")) {
      whyCleanPart = whyCleanPart.replace(/^sekali gus/gi, "").trim();
    }
    whyCleanPart = lowercaseFirst(whyCleanPart);

    sentence2 = `${descLocJoined} sekali gus memberi kesan langsung kepada ${whoClean}, serta ${whyCleanPart}.`;
  } else {
    if (cleanLokaliti && cleanLokaliti.toLowerCase() !== "kawasan terbabit" && cleanLokaliti.toLowerCase() !== "kawasan lokaliti aduan" && cleanLokaliti.toLowerCase() !== "lokaliti aduan") {
      if (!sentence1.toLowerCase().includes(cleanLokaliti.toLowerCase())) {
        locationClause = ` di sekitar ${cleanLokaliti}`;
      }
    }
    sentence2 = `Masalah yang dilaporkan${locationClause} ini memberi kesan langsung kepada ${whoClean}, sekali gus ${whyClean}.`;
  }

  let sentence3 = bagaimanaText.trim();
  sentence3 = sentence3.replace(/[.]+$/, "").trim();
  if (!sentence3.toLowerCase().startsWith("sehubungan") && !sentence3.toLowerCase().startsWith("oleh itu") && !sentence3.toLowerCase().startsWith("oleh yang demikian")) {
    sentence3 = `Sehubungan dengan itu, dipohon agar ${lowercaseFirst(sentence3)}`;
  }
  if (!sentence3.endsWith(".")) sentence3 += ".";

  const finalParagraph = `${sentence1} ${sentence2} ${sentence3}`;

  return `${title} • ${finalParagraph}`;
}

/**
 * Generate a highly comprehensive, formal Malaysian-style PKD / KEMAS recommendation (Syor)
 */
export function generateSystemSyor(category: string, pernyataanMbs: string, lokaliti: string): string {
  const cleanLower = pernyataanMbs.toLowerCase();
  const locationText = lokaliti || "lokaliti terbabit";

  // 1. Drains / Flooding / Drainage Issues
  if (cleanLower.includes("longkang") || cleanLower.includes("parit") || cleanLower.includes("tersumbat") || cleanLower.includes("saliran") || cleanLower.includes("banjir")) {
    return `Telah disemak oleh PKD Kampar. Mengesyorkan pihak Majlis Daerah Kampar (MDKap) menjalankan kerja-kerja pembersihan longkang tersumbat dengan segera di ${locationText}. Cadangan penandatanganan jadual pembersihan berkala bersepadu dan menaik taraf sistem perparitan di lokasi sasar bagi mengelakkan risiko limpahan air parit bertakung yang boleh memicu banjir kilat.`;
  }

  // 2. Road damage / pothole
  if (cleanLower.includes("jalan") && (cleanLower.includes("rosak") || cleanLower.includes("lubang") || cleanLower.includes("berlubang") || cleanLower.includes("penurapan") || cleanLower.includes("tar") || cleanLower.includes("pothole"))) {
    return `Mengesyorkan aduan diajukan kepada Jabatan Kerja Raya (JKR) Daerah Kampar / Pihak Berkuasa Tempatan (PBT) untuk kelulusan peruntukan segera bagi melaksanakan kerja-kerja penampalan lubang jalan ('patching') menggunakan 'cold mix' atau 'hot mix' buat masa terdekat, serta memohon penjadualan penurapan jalan raya utama secara menyeluruh demi menjamin keselamatan komuniti dan pengguna jalan raya di kawasan ${locationText}.`;
  }

  // 3. Traffic jams / signal
  if (cleanLower.includes("kesesakan") || cleanLower.includes("jem") || cleanLower.includes("sesak") || cleanLower.includes("trafik") || cleanLower.includes("lintas") || cleanLower.includes("simpung")) {
    return `Cadangan dikemukakan kepada JKR / pihak Majlis Daerah Kampar (MDKap) untuk menjalankan kajian semula aliran trafik terutamanya pada waktu puncak pagi dan petang. Syor pemasangan sistem solar lampu isyarat sandaran di persimpangan keluar, pembukaan jalan alternatif, meningkatkan papan tanda amaran kelajuan, serta memohon pemantauan kenderaan berat oleh pihak polis trafik bagi melancarkan pergerakan trafik serta memelihara keselamatan di ${locationText}.`;
  }

  // 3b. Traffic signal / Lampu Isyarat
  if (cleanLower.includes("isyarat") || cleanLower.includes("lampu isyarat")) {
    return `Syor pembaikan dikemukakan kepada Jabatan Kerja Raya (JKR) Daerah Kampar / Pihak Berkuasa Tempatan (PBT) untuk kelulusan peruntukan segera bagi kerja-kerja membaiki kerosakan litar kawalan, serta pemasangan sistem solar lampu isyarat sandaran demi menjamin kelancaran aliran trafik dan keselamatan optimum pengguna jalan raya di kawasan ${locationText}.`;
  }

  // 4. Lights / Dark / Blackout issues
  if (cleanLower.includes("lampu") && (cleanLower.includes("padam") || cleanLower.includes("rosak") || cleanLower.includes("gelap") || cleanLower.includes("malam"))) {
    return `Syor pembaikan dikemukakan kepada pihak Tenaga Nasional Berhad (TNB) dan Jabatan Kejuruteraan Majlis Daerah Kampar (MDKap) untuk menggantikan fius / mentol lampu jalan yang terpadam dan memasang tiang lampu jalan LED baharu di lokasi gelap. Langkah ini kritikal bagi memelihara keselamatan kenderaan pada waktu malam serta mencegah kejadian jenayah pecah rumah atau gangguan sosial di sekitar ${locationText}.`;
  }

  // 5. Trash / Garbage collection
  if (cleanLower.includes("sampah") || cleanLower.includes("kotor") || cleanLower.includes("kutipan") || cleanLower.includes("bau")) {
    return `Syor penyelarasan dibuat bersama pihak konsesi pembersihan sisa pepejal negeri untuk menstrukturkan semula jadual kutipan sampah domestik sekurang-kurangnya 3 kali seminggu. Memohon penyediaan tong sampah roro yang besar secara berpusat di ${locationText} dan menggerakkan kempen gotong-royong bersepadu kelolaan KEMAS bersama komuniti bagi mengekalkan tahap kebersihan kawasan setempat.`;
  }

  // 6. Dengue / Mosquito / Fogging issues
  if (cleanLower.includes("denggi") || cleanLower.includes("nyamuk") || cleanLower.includes("aedes") || cleanLower.includes("fogging") || cleanLower.includes("sakit") || cleanLower.includes("klinik")) {
    return `Telah disemak oleh PKD Kampar bersama Pejabat Kesihatan Daerah (PKD) Kampar. Syor pelaksanaan operasi semburan asap ('fogging') berskala luas di ${locationText} dan pengedaran risalah kesedaran bahaya pembiakan nyamuk Aedes. Ujian pengesanan jentik-jentik akan dilaksanakan di seluruh punca takungan air kosong dan menggesa penduduk menyertai kempen gotong-royong pembersihan punca pembiakan siri 1/2026.`;
  }

  // 7. Stray animals (wild dogs / monkeys / stray cows)
  if (cleanLower.includes("anjing") || cleanLower.includes("liar") || cleanLower.includes("monyet") || cleanLower.includes("kucing") || cleanLower.includes("ular") || cleanLower.includes("babi")) {
    return `Syor dikemukakan kepada Jabatan Perlindungan Hidupan Liar (PERHILITAN) atau Bahagian Kesihatan Awam MDKap untuk tindakan penguatkuasaan tangkapan haiwan liar secara selamat bagi mencegah ancaman serbuan fizikal ataupun gigitan haiwan terhadap kanak-kanak dan warga emas di sekitar ${locationText}. Penduduk dinasihati berwaspada dan mengurus sisa makanan secara tertutup.`;
  }

  // 8. Financial burden / prices / oil price hikes
  if (cleanLower.includes("harga") || cleanLower.includes("minyak") || cleanLower.includes("sara hidup") || cleanLower.includes("beban") || cleanLower.includes("barang") || cleanLower.includes("ekonomi")) {
    return `Syor penyelarasan bersama Kementerian Perdagangan Dalam Negeri dan Kos Sara Hidup (KPDN) Perak untuk melancarkan program Jualan Rahmah atau Kedai Rahmah Bergerak di parlimen secara berkala bagi meringankan duka belanja isi rumah. Mengesyorkan bantuan bersasar (seperti skim bakul rahmah KEMAS) diagihkan terus kepada golongan B40, pemandu teksi/bas mini dan peniaga kecil yang terjejas teruk akibat inflasi kos pengangkutan di ${locationText}.`;
  }

  // 9. Tabika KEMAS / Education / Preschool facilities
  if (cleanLower.includes("tabika") || cleanLower.includes("kemas") || cleanLower.includes("tadika") || cleanLower.includes("sekolah") || cleanLower.includes("pendidikan")) {
    return `Aduan diambil maklum oleh pihak Pejabat KEMAS Kampar. Ulasan dicadangkan agar permohonan kemudahan fasiliti baharu, pembaikan alat pendingin hawa, penambahan alat bantu mengajar, atau senggaraan struktur bumbung Tabika KEMAS ${locationText} diajukan ke Unit Pembangunan Pejabat KEMAS Negeri Perak untuk pertimbangan peruntukan kewangan tahunan segera bagi kesejahteraan optimum anak-anak tabika.`;
  }

  // Default Categories
  switch (category) {
    case "Sosial":
      return `Dipanjangkan kepada Pegawai Kebajikan Masyarakat Daerah Kampar untuk tindakan susulan ziarah prihatin keluarga terjejas di ${locationText}. Mengesyorkan program sokongan psikososial, bantuan kewangan segera e-Kasih, serta penyelarasan agihan makanan asas bagi meringankan beban keluarga tersebut.`;
    case "Ekonomi":
      return `Mengesyorkan syor latihan kemahiran keusahawanan mikro KEMAS atau program ikhtiar hidup dipertingkatkan bagi peniaga kecil di ${locationText}. Pemantauan berkala premis perniagaan oleh KPDN juga disyorkan bagi menyelia sebarang pencatutan haram atau pencabutan bekalan ruji.`;
    case "Infrastruktur":
      return `Syor pemantauan secara fizikal dijalankan bersama Pihak Berkuasa Tempatan (PBT) dan JKR Kampar di ${locationText}. Pegawai teknikal disyor merangka pelan penambahbaikan struktur / kemudahan awam terjejas untuk kelulusan bajet kecemasan kerajaan negeri Perak.`;
    case "Keselamatan":
      return `Dipanjangkan untuk perhatian Balai Polis berhampiran dan rukun tetangga setempat bagi memperketat rondaan keselamatan pencegahan jenayah malam di kawasan ${locationText}. Pemasangan papan tanda amaran dan kempen pencegahan vandalisme disyorkan untuk penyertaan proaktif penduduk.`;
    case "Kesihatan":
      return `Mengesyorkan penganjuran program saringan kesihatan KEMAS Kampar percuma dan taklimat penjagaan kebersihan diri secara komuniti di ${locationText}. Syor pemeriksaan dan pengawasan punca pencemaran air/udara setempat dikemukakan kepada Jabatan Alam Sekitar Perak.`;
    case "Pendidikan":
      return `Syor mengadakan sesi taklimat bimbingan akademik dan pengaktifan persatuan ibu bapa dan guru (PIBG) di ${locationText} bagi menambah baik tumpuan penyertaan aktiviti ko-kurikulum serta pembekalan alat pintar digital mesra prasekolah.`;
    default:
      return `Telah disemak oleh PKD Kampar. Memajukan aduan dan laporan ini kepada agensi-agensi teknikal berkaitan mengikut fungsi tugas rasmi demi memastikan kebajikan dan jaminan keselesaan penduduk di ${locationText} sentiasa terpelihara sewajarnya.`;
  }
}
