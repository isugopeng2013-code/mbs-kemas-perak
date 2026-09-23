export interface LocalityInfo {
  code: string;
  name: string;
}

export interface DMInfo {
  code: string;
  name: string;
  localities: LocalityInfo[];
}

export const LOCALITY_DATA: Record<string, DMInfo[]> = {
  "N.44 SUNGAI RAPAT": [
    {
      code: "0714401",
      name: "ARA PAYONG",
      localities: [
        { code: "0714401001", name: "MALAYAN TIN DREDGE" },
        { code: "0714401002", name: "KAMPONG SHIN" },
        { code: "0714401003", name: "TMN MELOR" },
        { code: "0714401004", name: "METRO PENGKALAN" },
        { code: "0714401005", name: "KG SUNGAI PAYONG" },
        { code: "0714401006", name: "KG TERSUSUN JLN GOPENG" },
        { code: "0714401007", name: "KG SERI INDAH SG TRAP" },
        { code: "0714401008", name: "KUARTERS LLN JLN MTD" },
        { code: "0714401009", name: "KG TASEK PERMAI JLN GOPENG" },
        { code: "0714401010", name: "KAMPONG BARU SG TRAP" },
        { code: "0714401011", name: "KG BENDERA" },
        { code: "0714401012", name: "KG KAMARIAH" },
        { code: "0714401013", name: "KG SG TERAP TAMBAHAN" },
        { code: "0714401014", name: "KG SG TERAP" },
        { code: "0714401015", name: "KG PASIR JLN GOPENG" },
        { code: "0714401016", name: "KUARTERS P.M.C BATU GAJAH" },
        { code: "0714401017", name: "KG BARU SG TRAP" },
        { code: "0714401018", name: "KG TERSUSUN ARA PAYONG TAMB 2" },
        { code: "0714401019", name: "TMN ORKID" },
        { code: "0714401020", name: "KG BERSATU" },
        { code: "0714401021", name: "TMN MEWAH BARU" },
        { code: "0714401022", name: "TMN TASEK PERMAI" },
        { code: "0714401023", name: "TMN MEWAH INDAH" },
        { code: "0714401024", name: "TMN LEMBAH PERMAI" },
        { code: "0714401025", name: "TMN KINTA PERMAI" },
        { code: "0714401026", name: "BEKAS BATU GAJAH TRANSIT" },
        { code: "0714401027", name: "TMN METRO MAYA" },
        { code: "0714401028", name: "TMN PENGKALAN PRISMA" }
      ]
    },
    {
      code: "0714402",
      name: "KAMPONG PISANG",
      localities: [
        { code: "0714402001", name: "KG PISANG" },
        { code: "0714402002", name: "KG SERANI" },
        { code: "0714402003", name: "KG JERNEH BARU" },
        { code: "0714402004", name: "KG KUALA KOH KG SERANI" },
        { code: "0714402005", name: "BANDAR TASIK IDAMAN" },
        { code: "0714402006", name: "TMN JERNIH" },
        { code: "0714402007", name: "TMN LAWAN INDAH" },
        { code: "0714402008", name: "DESA TAMAN SENTRAL" }
      ]
    },
    {
      code: "0714403",
      name: "SRI JAYA",
      localities: [
        { code: "0714403001", name: "KG BT DUA" },
        { code: "0714403002", name: "KG SRI JAYA" },
        { code: "0714403003", name: "KG AJI BT 2 JLN GOPENG" },
        { code: "0714403004", name: "KG AJI BT 2" },
        { code: "0714403005", name: "KG ALANG JERNIH" }
      ]
    },
    {
      code: "0714404",
      name: "SRI RAHMAT",
      localities: [
        { code: "0714404001", name: "KG SUNGAI TARANG MALAY RESERVE" },
        { code: "0714404002", name: "LDG MERANTI LAPAN" },
        { code: "0714404003", name: "KG SRI RAHMAT" },
        { code: "0714404004", name: "KG TERSUSUN SERI RAHMAT" },
        { code: "0714404005", name: "TMN VILLA SANCTUARY" },
        { code: "0714404006", name: "DESA SERI MURNI" },
        { code: "0714404007", name: "HALAMAN SERI RAHMAT" }
      ]
    },
    {
      code: "0714406",
      name: "DESA PELANCONGAN",
      localities: [
        { code: "0714406030", name: "DESA PELANCONGAN PENG PEGOH" },
        { code: "0714406031", name: "PINJI PERDANA" },
        { code: "0714406032", name: "DESA PELANCONGAN 2" },
        { code: "0714406033", name: "QUARTERS DESA SERI ANGKASA" }
      ]
    },
    {
      code: "0714406",
      name: "DESA PAKATAN",
      localities: [
        { code: "0714406001", name: "DESA PAKATAN" },
        { code: "0714406002", name: "MEDAN PENGKALAN DAMAI" },
        { code: "0714406003", name: "TMN PENGKALAN INTAN" },
        { code: "0714406004", name: "TMN REZKI MEWAH" },
        { code: "0714406005", name: "DESA PENGKALAN INDAH" },
        { code: "0714406006", name: "MEDAN PENGKALAN RIA" },
        { code: "0714406007", name: "MEDAN PENGKALAN MAXMUR" },
        { code: "0714406008", name: "PTG BAHAGIA, PENGKALAN" },
        { code: "0714406009", name: "RPT PENGKALAN PEGOH SEBERANG" },
        { code: "0714406010", name: "MEDAN PENGKALAN SAUJANA" },
        { code: "0714406011", name: "TMN PENGKALAN BIDARI" },
        { code: "0714406012", name: "MEDAN PENGKALAN PERDANA" },
        { code: "0714406013", name: "MEDAN PENGKALAN IMPIAN" },
        { code: "0714406014", name: "DESA PENGKALAN MEGAH" },
        { code: "0714406015", name: "TMN PENGKALAN HARMONI" },
        { code: "0714406016", name: "MEDAN PENGKALAN PRIMA" },
        { code: "0714406017", name: "MEDAN PENGKALAN MUTIARA" },
        { code: "0714406018", name: "MEDAN PENGKALAN INDAH" },
        { code: "0714406019", name: "MEDAN PASIR PUTEH" },
        { code: "0714406020", name: "TMN PINJI RIA" },
        { code: "0714406021", name: "PINGGIRAN PENGKALAN PERMAI" },
        { code: "0714406022", name: "MEDAN PENGKALAN INDAH" },
        { code: "0714406023", name: "MEDAN PENGKALAN SETIA" },
        { code: "0714406024", name: "PINGGIRAN PENGKALAN BAYU" },
        { code: "0714406025", name: "PINGGIRAN PENGKALAN INDAH" },
        { code: "0714406026", name: "PANORAMA LAPANGAN AKASIA" },
        { code: "0714406027", name: "KG MERANTI LAPAN" },
        { code: "0714406028", name: "LDG PINJI" },
        { code: "0714406029", name: "KG CHANGKAT LARANG" }
      ]
    },
    {
      code: "0714407",
      name: "RAPAT JAYA",
      localities: [
        { code: "0714407001", name: "KG RAPAT JAYA" },
        { code: "0714407002", name: "KG BINA RIA RAPAT JAYA TAMBAHAN" },
        { code: "0714407003", name: "KG TERSUSUN RAPAT JAYA / DESA RAPAT JAYA" },
        { code: "0714407004", name: "TMN SRI RAPAT" },
        { code: "0714407005", name: "MEDAN LAPANGAN SENTOSA" },
        { code: "0714407006", name: "TMN RAJA EKRAM" },
        { code: "0714407007", name: "JLN LAPANGAN JAYA" },
        { code: "0714407008", name: "TMN SRI PERKASA" },
        { code: "0714407009", name: "PANORAMA PARKVIEW" },
        { code: "0714407010", name: "TMN LAPANGAN PERDANA" },
        { code: "0714407011", name: "REGAT RAPAT JAYA" },
        { code: "0714407012", name: "TMN LAPANGAN LAPANGAN PERDANA" },
        { code: "0714407013", name: "PANORAMA LAPANGAN CAMELLIA" }
      ]
    },
    {
      code: "0714408",
      name: "SUNGAI RAPAT",
      localities: [
        { code: "0714408001", name: "KG SUNGAI RAPAT" },
        { code: "0714408002", name: "AERODROME" },
        { code: "0714408003", name: "JLN BIRO" },
        { code: "0714408004", name: "JLN RAJA OMAR" },
        { code: "0714408005", name: "TMN SRI RAPAT" },
        { code: "0714408006", name: "JLN HJ MOHD NOORDIN" },
        { code: "0714408007", name: "JLN JUMBO JET" },
        { code: "0714408008", name: "JLN CONCORDE" },
        { code: "0714408009", name: "JLN HELIKOPTER" },
        { code: "0714408010", name: "JLN RAJA ABDULLAH" },
        { code: "0714408011", name: "JLN RAPAT TAMBAHAN" },
        { code: "0714408012", name: "JLN PIPER" },
        { code: "0714408013", name: "JLN CARAVELLE" },
        { code: "0714408014", name: "KAW POLIS HUTAN" },
        { code: "0714408015", name: "TMN MAJU RAPAT" },
        { code: "0714408016", name: "TMN RAPAT UTAMA GOPENG" },
        { code: "0714408017", name: "KAW TUDM" },
        { code: "0714408018", name: "KUARTERS UNIT UDARA POLIS, IPOH" },
        { code: "0714408019", name: "TMN RAPAT JAYA" },
        { code: "0714408020", name: "TMN HARLELA" },
        { code: "0714408021", name: "TMN LAPANGAN RIA" },
        { code: "0714408022", name: "TMN LAPANGAN KINARA" },
        { code: "0714408023", name: "TMN CASALAPANGA" },
        { code: "0714408024", name: "TMN LAPANGAN HARMONI" },
        { code: "0714408025", name: "BEKAS POLIS UNIT UDARA" },
        { code: "0714408026", name: "BEKAS TENTERA TUDM" },
        { code: "0714408027", name: "PANGKALAN TUDM" },
        { code: "0714408028", name: "UNIT UDARA PDRM IPOH" }
      ]
    },
    {
      code: "0714405",
      name: "SUNGAI ROKAM",
      localities: [
        { code: "0714405001", name: "KG SG ROKAM" },
        { code: "0714405002", name: "JLN BELIMBING" },
        { code: "0714405003", name: "JLN KELUBI" },
        { code: "0714405004", name: "JLN KENANGA" },
        { code: "0714405005", name: "JLN MAWAR" },
        { code: "0714405006", name: "JLN MELATI" },
        { code: "0714405007", name: "JLN ROKAM" },
        { code: "0714405008", name: "JLN SALAK" },
        { code: "0714405009", name: "JLN TERATAI" },
        { code: "0714405010", name: "JLN TAMPOI" },
        { code: "0714405011", name: "JLN KEMBOJA" },
        { code: "0714405012", name: "KAW KEDAI" },
        { code: "0714405013", name: "JLN THEATRE" },
        { code: "0714405014", name: "TMN TUNAS JAYA" },
        { code: "0714405015", name: "LRG INDAH DATU TMN SRI ROKAM" },
        { code: "0714405016", name: "TMN RAPAT AMAN" },
        { code: "0714405017", name: "TMN ROKAM" },
        { code: "0714405018", name: "TMN ROKAM JAYA" },
        { code: "0714405019", name: "TMN INDAH ROKAM" },
        { code: "0714405020", name: "LEBUHRAYA INDAH ROKAM" },
        { code: "0714405021", name: "BEKAS POLIS KG RAPAT" },
        { code: "0714405022", name: "BALAI POLIS KG RAPAT" }
      ]
    }
  ],
  "N.45 SIMPANG PULAI": [
    {
      code: "0714501",
      name: "PEKAN RAZAKI",
      localities: [
        { code: "0714501001", name: "PEKAN RAZAKI" },
        { code: "0714501002", name: "LINTASAN ROKAM" },
        { code: "0714501003", name: "PEKELILING ROKAM" },
        { code: "0714501004", name: "REGAT ROKAM" },
        { code: "0714501005", name: "REGAT ROKAM 1" },
        { code: "0714501006", name: "REGAT ROKAM 3" },
        { code: "0714501007", name: "REGAT ROKAM 4" },
        { code: "0714501008", name: "REGAT ROKAM 2" },
        { code: "0714501009", name: "REGAT ROKAM 5" },
        { code: "0714501010", name: "LALUAN ROKAM 11" },
        { code: "0714501011", name: "LALUAN ROKAM 12 PEKAN RAZAKI" },
        { code: "0714501012", name: "LALUAN ROKAM 10 PEKAN RAZAKI" },
        { code: "0714501013", name: "LALUAN ROKAM 16" },
        { code: "0714501014", name: "LALUAN ROKAM 18" },
        { code: "0714501015", name: "LINTASAN ROKAM 10" },
        { code: "0714501016", name: "LALUAN ROKAM 22" },
        { code: "0714501017", name: "LALUAN ROKAM 20" },
        { code: "0714501018", name: "LALUAN ROKAM 14" },
        { code: "0714501019", name: "REGAT ROKAM 9" },
        { code: "0714501020", name: "LALUAN ROKAM 24" }
      ]
    },
    {
      code: "0714501",
      name: "AMPANG BAHARU",
      localities: [
        { code: "0714501001", name: "JLN WONG CHOONG" },
        { code: "0714502000", name: "JLN LIEW YIN CHIN" },
        { code: "0714502004", name: "JLN AMPANG" },
        { code: "0714502006", name: "JLN LIEW FONG" },
        { code: "0714502007", name: "JLN LIEW CHIN SUM" },
        { code: "0714502008", name: "JLN CHOW YEE CHONG" },
        { code: "0714502009", name: "JLN LIM CHEE YOON" },
        { code: "0714502010", name: "JLN AMPANG BARU 10" },
        { code: "0714502011", name: "JLN AMPANG BARU 8" },
        { code: "0714502012", name: "JLN AMPANG BARU 4" },
        { code: "0714502013", name: "JLN AMPANG BARU 12" },
        { code: "0714502014", name: "JLN AMPANG BARU 6" },
        { code: "0714502015", name: "JLN AMPANG BARU 2" }
      ]
    },
    {
      code: "0714503",
      name: "TAMAN AMPANG",
      localities: [
        { code: "0714503001", name: "TMN AMPANG" },
        { code: "0714503002", name: "PESIARAN SARI 34 TMN AMPANG JAYA" },
        { code: "0714503003", name: "TMN AMPANG JAYA" },
        { code: "0714503004", name: "TMN PELANGI" },
        { code: "0714503005", name: "TMN AMPANG TIMOR" },
        { code: "0714503006", name: "TMN AMPANG MEWAH" },
        { code: "0714503007", name: "HALAMAN AMPANG MEWAH" },
        { code: "0714503008", name: "HALAMAN AMPANG INDAH" },
        { code: "0714503009", name: "HALAMAN AMPANG JAYA" },
        { code: "0714503010", name: "TMN AMPANG INDAH" },
        { code: "0714503011", name: "TMN RASI AMPANG" },
        { code: "0714503012", name: "TMN CEMERLANG AMPANG" }
      ]
    },
    {
      code: "0714504",
      name: "KAMPONG SERI AMPANG",
      localities: [
        { code: "0714504001", name: "DESA SENGAT AMAN" },
        { code: "0714504002", name: "TMN SERI AMPANG" },
        { code: "0714504003", name: "KG TERSUSUN AMPANG BHARU" },
        { code: "0714504004", name: "KG SERI AMPANG (AMPANG BARU)" },
        { code: "0714504005", name: "KG TERSUSUN SRI AMPANG" },
        { code: "0714504006", name: "KAW POLIS" },
        { code: "0714504007", name: "LALUAN SRI AMPANG" },
        { code: "0714504008", name: "KG SERI AMPANG B & KG SERI AMPANG" },
        { code: "0714504009", name: "KG SERI AMPANG A, AMPANG" },
        { code: "0714504010", name: "KG SRI AMPANG B" },
        { code: "0714504011", name: "AMPANG" },
        { code: "0714504012", name: "PESIARAN WIRA JAYA BARAT 29 TMN DESA INDAH" },
        { code: "0714504013", name: "TMN DESA INDAH" },
        { code: "0714504014", name: "PESIARAN WIRA JAYA 23" },
        { code: "0714504015", name: "PESIARAN WIRA JAYA TIMUR 2" }
      ]
    },
    {
      code: "0714505",
      name: "TAMAN IPOH JAYA",
      localities: [
        { code: "0714505001", name: "SELASAR ROKAM 20" },
        { code: "0714505002", name: "TMN MUTIARA" },
        { code: "0714505003", name: "LRG HILLVIEW" },
        { code: "0714505004", name: "REGAT HILL VIEW" },
        { code: "0714505005", name: "LEBUH MADRASAH" },
        { code: "0714505006", name: "HALAMAN MADRASAH" },
        { code: "0714505007", name: "HALA HILLVIEW" },
        { code: "0714505008", name: "LINTASAN HILLVIEW" },
        { code: "0714505009", name: "HALAMAN HILLVIEW" },
        { code: "0714505010", name: "JLN TINGKAT LDG HILLVIEW" },
        { code: "0714505011", name: "SELASAR HILLVIEW" },
        { code: "0714505012", name: "LENGKOK HILLVIEW" },
        { code: "0714505013", name: "DESA PERWIRA" },
        { code: "0714505014", name: "TMN IPOH JAYA GUNUNG RAPAT" },
        { code: "0714505015", name: "LALUAN ROKAM 22" },
        { code: "0714505016", name: "LDG HILLVIEW" },
        { code: "0714505017", name: "TMN HILLVIEW" },
        { code: "0714505018", name: "SELASAR ROKAM 4" },
        { code: "0714505019", name: "SELASAR ROKAM 12" },
        { code: "0714505020", name: "SELASAR ROKAM 14" },
        { code: "0714505021", name: "SELASAR ROKAM 6" },
        { code: "0714505022", name: "SELASAR ROKAM 10" },
        { code: "0714505023", name: "SELASAR ROKAM 8" },
        { code: "0714505024", name: "SELASAR ROKAM 24, TMN IPOH JAYA" },
        { code: "0714505025", name: "SELASAR ROKAM 36, TMN IPOH JAYA" },
        { code: "0714505026", name: "SELASAR ROKAM 9, TMN IPOH JAYA" },
        { code: "0714505027", name: "SELASAR ROKAM 16, TMN IPOH JAYA" },
        { code: "0714505028", name: "SELASAR ROKAM 13" },
        { code: "0714505029", name: "SELASAR ROKAM 42" },
        { code: "0714505030", name: "JLN LUANA" },
        { code: "0714505031", name: "JLN KERJASAMA" },
        { code: "0714505032", name: "JLN PASAR" }
      ]
    },
    {
      code: "0714506",
      name: "RAPAT SETIA BARU",
      localities: [
        { code: "0714506001", name: "PINGGIRAN WIRA GUNONG RAPAT" },
        { code: "0714506002", name: "PESIARAN WIRA JAYA BARAT 76 RAPAT SETIA BARU" },
        { code: "0714506003", name: "PESIARAN WIRA JAYA BARAT 74 RAPAT SETIA BARU" },
        { code: "0714506004", name: "KG LALUAN GUNUNG RAPAT" },
        { code: "0714506005", name: "PESIARAN WIRA JAYA TIMUR 50 RAPAT SETIA BARU" },
        { code: "0714506006", name: "PESIARAN WIRA JAYA TIMUR 48 TMN PANGKIMA" },
        { code: "0714506007", name: "RAPAT SETIA BARU" },
        { code: "0714506008", name: "TMN TIMAH GUNUNG RAPAT" },
        { code: "0714506009", name: "TMN SETIA KEBEDAYAAN" },
        { code: "0714506010", name: "TMN RAPAT DAMAI" },
        { code: "0714506011", name: "TMN SRI JAYA" },
        { code: "0714506012", name: "TMN HARMONI" },
        { code: "0714506013", name: "TMN PANORAMA RAPAT INDAH" },
        { code: "0714506014", name: "TMN RAPAT KOPERASI" },
        { code: "0714506015", name: "TMN RAPAT PERDANA" },
        { code: "0714506016", name: "PINGGIRAN RAPAT PERDANA" },
        { code: "0714506017", name: "TMN RAPAT BISTARI" },
        { code: "0714506018", name: "PESIARAN WIRA JAYA BARAT 62 RAPAT SETIA BARU" },
        { code: "0714506019", name: "PESIARAN WIRA JAYA BARAT 60 RAPAT SETIA BARU" },
        { code: "0714506020", name: "TMN RAPAT PERMAI" },
        { code: "0714506021", name: "TMN GUNUNG VIEW" }
      ]
    },
    {
      code: "0714507",
      name: "RAPAT SETIA",
      localities: [
        { code: "0714507001", name: "JLN MAHSURI" },
        { code: "0714507002", name: "JLN PUTERI GUNONG LEDANG" },
        { code: "0714507003", name: "JLN MADRASAH" },
        { code: "0714507004", name: "JLN LOKMAN" },
        { code: "0714507005", name: "JLN TENAGA" },
        { code: "0714507006", name: "JLN BARKAT" },
        { code: "0714507007", name: "JLN SEPAKAT" },
        { code: "0714507008", name: "JLN USAHA" },
        { code: "0714507009", name: "JLN SEMANGAT" },
        { code: "0714507010", name: "JLN JAYA" },
        { code: "0714507011", name: "JLN AMAN" },
        { code: "0714507012", name: "JLN PEMBANGUNAN" },
        { code: "0714507013", name: "JLN PADANG" },
        { code: "0714507014", name: "JLN KEMAJUAN" },
        { code: "0714507015", name: "JLN KAMPONG PASAR" },
        { code: "0714507016", name: "PESIARAN SEPAKAT LIMA" },
        { code: "0714507017", name: "TMN INDAH JAYA IPOH" },
        { code: "0714507018", name: "PESIARAN SEMANGAT 1 TMN R INDAH" },
        { code: "0714507019", name: "LR RAYA SEMANGAT 2 TMN R INDAH" },
        { code: "0714507020", name: "TMN RAPAT INDAH" },
        { code: "0714507021", name: "TMN DESA RAPAT" },
        { code: "0714507022", name: "LALUAN SEPAKAT" },
        { code: "0714507023", name: "TMN RAPAT JAYA" },
        { code: "0714507024", name: "TMN RAPAT BAHAGIA" },
        { code: "0714507025", name: "TMN BAHAGIA" },
        { code: "0714507026", name: "TMN RAPAT MURNI" },
        { code: "0714507027", name: "JLN DATO DAMANHURI" },
        { code: "0714507028", name: "TMN RAPAT SETIA" }
      ]
    },
    {
      code: "0714508",
      name: "GUNUNG RAPAT UTARA",
      localities: [
        { code: "0714502016", name: "GUNUNG RAPAT UTARA" },
        { code: "0714508004", name: "LRG GUNUNG RAPAT 1" },
        { code: "0714508005", name: "LRG GUNUNG RAPAT 3" },
        { code: "0714508006", name: "LRG GUNUNG RAPAT 4" },
        { code: "0714508007", name: "KG GUNUNG RAPAT" },
        { code: "0714508008", name: "KILANG GETAH GHEE SENG" },
        { code: "0714508009", name: "JLN JQA" },
        { code: "0714508010", name: "PESIARAN KINTA VALLEY" },
        { code: "0714508011", name: "PESIARAN GUNUNG RAPAT 1" },
        { code: "0714508012", name: "LRG GUNUNG RAPAT 7" },
        { code: "0714508013", name: "TMN CEMERLANG EMAS" },
        { code: "0714508014", name: "JLN RAPAT" },
        { code: "0714508015", name: "TMN CEMERLANG RAPAT" }
      ]
    },
    {
      code: "0714509",
      name: "GUNUNG RAPAT SELATAN",
      localities: [
        { code: "0714509001", name: "PESIARAN GUNUNG RAPAT 6" },
        { code: "0714509002", name: "PESIARAN GUNUNG RAPAT 3" },
        { code: "0714509003", name: "GUNUNG RAPAT N/V SELATAN" },
        { code: "0714509004", name: "JLN KAMPUNG" },
        { code: "0714509005", name: "SAM POH TONG TEMPLE GOPENG ROAD" },
        { code: "0714509006", name: "JLN CORADO" },
        { code: "0714509007", name: "PESIARAN GUNUNG RAPAT 3" },
        { code: "0714509008", name: "LRG GUNUNG RAPAT 21" },
        { code: "0714509009", name: "LRG GUNUNG RAPAT 19" },
        { code: "0714509010", name: "LRG GUNUNG RAPAT 23" },
        { code: "0714509011", name: "LENGKOK GUNUNG RAPAT" },
        { code: "0714509012", name: "TMN SAIKAT" },
        { code: "0714509013", name: "LRG GUNUNG RAPAT 9" },
        { code: "0714509014", name: "LRG GUNUNG RAPAT 17" },
        { code: "0714509015", name: "PINGGIRAN RAPAT RIA" }
      ]
    },
    {
      code: "0714510",
      name: "TAMAN TAUFIK",
      localities: [
        { code: "0714510001", name: "CHOONG SAM TIN MINES" },
        { code: "0714510002", name: "TMN TAUFIK" },
        { code: "0714510003", name: "BANDAR CYBER" },
        { code: "0714510004", name: "TMN SONG CHOON" },
        { code: "0714510005", name: "TMN LAPANGAN PERMAI" },
        { code: "0714510006", name: "TMN SERI BERJAYA" },
        { code: "0714510007", name: "TMN LAPANGAN LAGENDA" },
        { code: "0714510008", name: "TMN LAPANGAN MELODI" },
        { code: "0714510009", name: "KONDOMINIUM HILLCITY" },
        { code: "0714510010", name: "TMN LAPANGAN PELANGI" },
        { code: "0714510011", name: "TMN LAPANGAN INDAH" },
        { code: "0714510012", name: "MEDAN LAPANGAN PERMATA" },
        { code: "0714510013", name: "MEDAN LAPANGAN IDAMAN" },
        { code: "0714510014", name: "MEDAN LAPANGAN SURIA" },
        { code: "0714510015", name: "TMN PULAI MUTIARA" },
        { code: "0714510016", name: "MEDAN LAPANGAN MULIA" },
        { code: "0714510017", name: "MEDAN LAPANGAN LAGENDA" },
        { code: "0714510018", name: "KAWASAN PERINDUSTRIAN RINGAN KINTA JAYA" },
        { code: "0714510019", name: "TMN LAPANGAN SETIA" },
        { code: "0714510020", name: "SYMPHONY BUSINESS PARK" }
      ]
    },
    {
      code: "0714511",
      name: "KAMPONG SENGAT",
      localities: [
        { code: "0714511001", name: "PULAI HEIGHTS" },
        { code: "0714511002", name: "BANDAR SERI BOTANI" },
        { code: "0714511003", name: "TMN LAPANGAN HARTAMAS" },
        { code: "0714511004", name: "LRG SENGAT" },
        { code: "0714511005", name: "LDG DUSUN BERTAM" },
        { code: "0714511006", name: "KG SENGAT" },
        { code: "0714511007", name: "KG TANJONG" },
        { code: "0714511008", name: "KAMPUNG IPOH" },
        { code: "0714511009", name: "RUMAH ORANG TUA-TUA" },
        { code: "0714511010", name: "KAMPUNG BARU" },
        { code: "0714511011", name: "LDG PINJI" },
        { code: "0714511012", name: "KG TERSUSUN SENGAT" },
        { code: "0714511013", name: "SERI MARGOSA BANDAR SERI BOTANI" },
        { code: "0714511014", name: "SERI PALMA BANDAR SERI BOTANI" },
        { code: "0714511015", name: "SERI BOUGAINVILLEA BANDAR SERI BOTANI" },
        { code: "0714511016", name: "TMN LAPANGAN RAYA" },
        { code: "0714511017", name: "TMN LAPANGAN MARGOSA" },
        { code: "0714511018", name: "CHINESE KONGSI" },
        { code: "0714511019", name: "SERI TEOM BANDAR SERI BOTANI" },
        { code: "0714511020", name: "SERI TASIK BOTANI BANDAR SERI BOTANI" },
        { code: "0714511021", name: "SERI SUTERA BANDAR SERI BOTANI" },
        { code: "0714511022", name: "SERI BINDANG BANDAR SERI BOTANI" },
        { code: "0714511023", name: "SERI TERATAI RESIDENCE BANDAR SERI BOTANI" },
        { code: "0714511024", name: "PANORAMA LAPANGAN SALIANA @ GREEN PARK" },
        { code: "0714511025", name: "BOTANICAL VIEW SANCTUARY" }
      ]
    },
    {
      code: "0714512",
      name: "TAMAN BERSATU",
      localities: [
        { code: "0714512001", name: "KG BERSATU" },
        { code: "0714512002", name: "GUNUNG KROH AMPANG" },
        { code: "0714512003", name: "LDG PULAI" },
        { code: "0714512004", name: "RUMAH MURAH PERINGKAT 1" },
        { code: "0714512005", name: "RUMAH MURAH PERINGKAT 2" },
        { code: "0714512006", name: "TMN BERSATU SIMPANG PULAI" },
        { code: "0714512007", name: "TMN CHANDAN DESA" },
        { code: "0714512008", name: "PERUMAHAN AWAM" },
        { code: "0714512009", name: "DESA PULAI INDAH" },
        { code: "0714512010", name: "DESA PULAI AMAN" },
        { code: "0714512011", name: "PUSAT PERNIAGAAN PULAI" },
        { code: "0714512012", name: "TMN SENGAT BARU" },
        { code: "0714512013", name: "TMN PULAI SENTOSA" },
        { code: "0714512014", name: "DESA PULAI JAYA" },
        { code: "0714512015", name: "DESA PULAI IMPIAN" },
        { code: "0714512016", name: "DESA PULAI RAYA" },
        { code: "0714512017", name: "KUARTERS BOMBA, SIMPANG PULAI" }
      ]
    },
    {
      code: "0714513",
      name: "SIMPANG PULAI",
      localities: [
        { code: "0714513001", name: "SIMPANG PULAI BARU" },
        { code: "0714513002", name: "KAW POLIS" },
        { code: "0714513003", name: "JLN GOPENG" },
        { code: "0714513004", name: "JLN PADANG" },
        { code: "0714513005", name: "JLN SEKOLAH" },
        { code: "0714513006", name: "SIMPANG PULAI L C A" },
        { code: "0714513007", name: "JLN TRUNA" },
        { code: "0714513008", name: "PESIARAN SIMPANG PULAI 1" },
        { code: "0714513009", name: "PESIARAN SIMPANG PULAI 2" },
        { code: "0714513010", name: "PESIARAN SIMPANG PULAI 3" },
        { code: "0714513011", name: "PESIARAN SIMPANG PULAI 5" },
        { code: "0714513012", name: "PESIARAN SIMPANG PULAI 7" },
        { code: "0714513013", name: "LRG SIMPANG PULAI 3" },
        { code: "0714513014", name: "LRG SIMPANG PULAI 9" },
        { code: "0714513015", name: "LRG SIMPANG PULAI 13" },
        { code: "0714513016", name: "BEKAS POLIS SIMPANG PULAI" },
        { code: "0714513017", name: "BALAI POLIS SIMPANG PULAI" }
      ]
    }
  ],
  "N.46 TEJA": [
    {
      code: "0714601",
      name: "POS RAYA",
      localities: [
        { code: "0714601001", name: "POS RAYA" }
      ]
    },
    {
      code: "0714602",
      name: "KAMPONG KEPAYANG",
      localities: [
        { code: "0714602001", name: "KG KEPAYANG" },
        { code: "0714602002", name: "KG SIMPANG PULAI" },
        { code: "0714602003", name: "KG BENDANG" },
        { code: "0714602004", name: "JLN BESAR" },
        { code: "0714602005", name: "PAYA RENGAS" },
        { code: "0714602006", name: "KG SG RAIA" },
        { code: "0714602007", name: "KG SERDANG PERMAI" },
        { code: "0714602008", name: "BANDAR PULAI JAYA" },
        { code: "0714602009", name: "KG TERSUSUN PULAI JAYA" },
        { code: "0714602010", name: "KG MERAWAN INDAH" },
        { code: "0714602011", name: "KG ULAR" },
        { code: "0714602012", name: "KG TIANG" },
        { code: "0714602013", name: "KG KAMPONG TUJUH" }
      ]
    },
    {
      code: "0714603",
      name: "KAMPONG TEKKAH BAHARU",
      localities: [
        { code: "0714603001", name: "KG TEKKAH" },
        { code: "0714603002", name: "KG SINDU" },
        { code: "0714603003", name: "KG KURNIA" },
        { code: "0714603004", name: "KG JALAN BAHRU" },
        { code: "0714603005", name: "TMN RAIA MESRA" },
        { code: "0714603006", name: "KG TERSUSUN TEKKAH" },
        { code: "0714603007", name: "TMN SERI RAIA" },
        { code: "0714603008", name: "KG TERSUSUN BATU 5" },
        { code: "0714603009", name: "TMN RAIA DAMAI" },
        { code: "0714603010", name: "TMN RAIA GEMILANG" },
        { code: "0714603011", name: "TMN RAIA SENTOSA" },
        { code: "0714603012", name: "TMN RAIA KEMASIK" }
      ]
    },
    {
      code: "0714604",
      name: "KAMPONG BHARU KOPISAN",
      localities: [
        { code: "0714604001", name: "KG TERSUSUN MUHIBAH" },
        { code: "0714604002", name: "KG TERSUSUN MULIA" },
        { code: "0714604003", name: "RPT MUHIBAH" },
        { code: "0714604004", name: "TMN SRI INDAH" },
        { code: "0714604005", name: "TMN LAWAN KUDA" },
        { code: "0714604006", name: "TMN LAWAN KUDA FASA 2" },
        { code: "0714604007", name: "KG KOPISAN" },
        { code: "0714604008", name: "GOPENG CONSOLIDATED" },
        { code: "0714604009", name: "KUARTERS BOMBA GOPENG" },
        { code: "0714604010", name: "RUMAH MURAH DUA" }
      ]
    },
    {
      code: "0714605",
      name: "LAWAN KUDA BARAT",
      localities: [
        { code: "0714605001", name: "LAWAN KUDA BARAT L C A" },
        { code: "0714605002", name: "TMN KELUARGA BARU" },
        { code: "0714605003", name: "RUMAH MURAH LAWAN KUDA" },
        { code: "0714605004", name: "DESA LAWAN KUDA" },
        { code: "0714605005", name: "LRG AMAN DESA LAWAN KUDA" },
        { code: "0714605006", name: "JLN PADANG DESA LAWAN KUDA" },
        { code: "0714605007", name: "JLN PERPADUAN DESA LAWAN KUDA" },
        { code: "0714605008", name: "LRG SENTOSA DESA LAWAN KUDA" },
        { code: "0714605009", name: "TMN DESA CAHAYA" },
        { code: "0714605010", name: "TMN KINTA MEWAH" },
        { code: "0714605011", name: "LAWAN KUDA FASA 2" },
        { code: "0714605012", name: "TMN KINTA EMAS" }
      ]
    },
    {
      code: "0714606",
      name: "LAWAN KUDA TIMOR",
      localities: [
        { code: "0714607001", name: "LAWAN KUDA TIMUR L C A" },
        { code: "0714607002", name: "KG LALANG" },
        { code: "0714607003", name: "JLN KOTA BHARU" }
      ]
    },
    {
      code: "0714606",
      name: "LAWAN KUDA SELATAN",
      localities: [
        { code: "0714606001", name: "KG JUANG" },
        { code: "0714606002", name: "KG KARAWAT" },
        { code: "0714606003", name: "KG CHIDOK" },
        { code: "0714606004", name: "KG PULAU SEMBILAN" },
        { code: "0714606005", name: "KG PERGUM/KG PAKU" }
      ]
    },
    {
      code: "0714608",
      name: "KAMPONG PULAI",
      localities: [
        { code: "0714608001", name: "KG LAWAN KUDA" },
        { code: "0714608002", name: "KG PULAI" },
        { code: "0714608003", name: "KAW UKK" },
        { code: "0714608004", name: "KG TERSUSUN KG PULAI" },
        { code: "0714608005", name: "TMN GOPENG MEWAH" }
      ]
    },
    {
      code: "0714609",
      name: "KAMPONG RAWA",
      localities: [
        { code: "0714609001", name: "JLN KAMPAR" },
        { code: "0714609002", name: "KG RAWA" },
        { code: "0714609003", name: "RUMAH MURAH" },
        { code: "0714609004", name: "SOON WOH KONGSI" },
        { code: "0714609005", name: "TMN GOPENG BARU" },
        { code: "0714609006", name: "TMN GOPENG SETIA" },
        { code: "0714609007", name: "TMN GOPENG JAYA" },
        { code: "0714609008", name: "TMN GOPENG INDAH" },
        { code: "0714609009", name: "KAMPONG BISTARI" }
      ]
    },
    {
      code: "0714610",
      name: "GOPENG",
      localities: [
        { code: "0714610001", name: "FRENCH TEKKA" },
        { code: "0714610002", name: "JLN EU KONG" },
        { code: "0714610003", name: "JLN TEMBOH / JLN TASIK" },
        { code: "0714610004", name: "JLN KG RAWA" },
        { code: "0714610005", name: "JLN KAYLONG" },
        { code: "0714610006", name: "LRG TEJA" },
        { code: "0714610007", name: "JLN SEKOLAH" },
        { code: "0714610008", name: "SEKOLAH CINA MAN MING" },
        { code: "0714610009", name: "KG BERSATU / JLN SG ITEK" },
        { code: "0714610010", name: "LUCKY GARDEN" },
        { code: "0714610011", name: "TMN TEE SANG" },
        { code: "0714610012", name: "KG SANGKILI" },
        { code: "0714610013", name: "TMN CHANGKAT GOLF" },
        { code: "0714610014", name: "KAW POLIS" },
        { code: "0714610015", name: "JLN SG RAYA" },
        { code: "0714610016", name: "TMN IMPIAN PERANG" },
        { code: "0714610017", name: "TMN GOPENG PRIMA" },
        { code: "0714610018", name: "TMN RAIA UTAMA" },
        { code: "0714610019", name: "TMN INDAH POLIS GOPENG" },
        { code: "0714610020", name: "BALAI POLIS GOPENG" }
      ]
    },
    {
      code: "0714611",
      name: "KAMPONG SUNGAI ITEK",
      localities: [
        { code: "0714611001", name: "KG SUNGAI ITEK" },
        { code: "0714611002", name: "SG ITEK" },
        { code: "0714611003", name: "ULU GROH" },
        { code: "0714611004", name: "JLN KAMPAR" },
        { code: "0714611005", name: "KG JELENTOH BARU" },
        { code: "0714611006", name: "SG BULOH" },
        { code: "0714611007", name: "KG JELENTOH" },
        { code: "0714611008", name: "KG PINTU PADANG" },
        { code: "0714611009", name: "ULU GRUNTUM" },
        { code: "0714611010", name: "JELENTOH" },
        { code: "0714611011", name: "LDG MOYNAPLY" }
      ]
    }
  ]
};
