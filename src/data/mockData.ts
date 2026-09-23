/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MBSReport, ParlimenDunData } from '../types';

export const PERAK_PARLIMEN_DUN: ParlimenDunData[] = [
  {
    parlimen: "P.071 GOPENG",
    dunList: ["N.44 SUNGAI RAPAT", "N.45 SIMPANG PULAI", "N.46 TEJA"]
  }
];

export const DUN_DM_MAPPING: Record<string, string[]> = {
  "N.44 SUNGAI RAPAT": [
    "ARA PAYONG",
    "KAMPONG PISANG",
    "SRI JAYA",
    "SRI RAHMAT",
    "DESA PELANCONGAN",
    "DESA PAKATAN",
    "RAPAT JAYA",
    "SUNGAI RAPAT",
    "SUNGAI ROKAM"
  ],
  "N.45 SIMPANG PULAI": [
    "PEKAN RAZAKI",
    "AMPANG BAHARU",
    "TAMAN AMPANG",
    "KAMPONG SERI AMPANG",
    "TAMAN IPOH JAYA",
    "RAPAT SETIA BARU",
    "RAPAT SETIA",
    "GUNONG RAPAT UTARA",
    "GUNUNG RAPAT SELATAN",
    "TAMAN TAUFIK",
    "KAMPONG SENGAT",
    "TAMAN BERSATU",
    "SIMPANG PULAI"
  ],
  "N.46 TEJA": [
    "POS RAYA",
    "KAMPONG KEPAYANG",
    "KAMPONG TEKKAH BAHARU",
    "KAMPONG BHARU KOPISAN",
    "LAWAN KUDA BARAT",
    "LAWAN KUDA TIMOR",
    "LAWAN KUDA SELATAN",
    "KAMPONG PULAI",
    "KAMPONG RAWA",
    "GOPENG",
    "KAMPONG SUNGAI ITEK"
  ]
};

export const KATEGORI_SENARAI = [
  "Pembangunan",
  "Sosial",
  "Agama dan Pendidikan",
  "Ekonomi",
  "Kepimpinan"
];

export const INITIAL_REPORTS: MBSReport[] = [
  {
    id: "mbs-official-1",
    bil: 1,
    parlimen: "P.071 GOPENG",
    dun: "N.45 SIMPANG PULAI",
    dm: "DM13 SIMPANG PULAI",
    lokaliti: "008 Bandar Pulai Jaya",
    pernyataanMbs: "KESESAKAN TRAFIK • Pertambahan penduduk dan pembangunan baru menyebabkan kesesakan terutama pada waktu kemuncak. Masalah yang dilaporkan di sekitar 008 Bandar Pulai Jaya ini memberi kesan langsung kepada pengguna jalan raya & penduduk setempat, sekali gus menyukarkan belokan simpang yang selamat pada waktu puncak harian. Sehubungan dengan itu, dipohon agar kajian semula aliran trafik oleh agensi penyelaras teknikal (JKR/MDKap) dilaksanakan dengan kadar segera.",
    kategori: "Sosial",
    pelaporNama: "ROSLINDA BT ABD HALIM",
    pelaporTel: "011-7298343",
    syor: "",
    disediakanOleh: "SITI ZURAIDAH BT TALKAH",
    penghantarJawatan: "Pendidik Masyarakat",
    status: "Baru",
    tarikhAduan: "2026-09-10"
  },
  {
    id: "mbs-official-2",
    bil: 2,
    parlimen: "P.071 GOPENG",
    dun: "N.46 TEJA",
    dm: "DM 02 KG KEPAYANG",
    lokaliti: "Kg Serdang Permai",
    pernyataanMbs: "ISU KENAIKAN HARGA MINYAK • Kenaikan harga minyak menyebabkan kos pengangkutan dan harga barangan harian meningkat dan menambah beban perbelanjaan rakyat. Golongan yang paling terkesan ialah rakyat berpendapatan rendah dan sederhana, pemandu kenderaan persendirian, dan peniaga kecil. Kesan kenaikan harga minyak dirasai apabila harga bahan api meningkat dan berlanjutan selagi harga minyak kekal tinggi. Masalah ini berlaku terutamanya di kawasan yang memerlukan penggunaan kenderaan yang tinggi untuk bekerja atau menjalankan perniagaan. Ini memberi kesan kepada rakyat melalui peningkatan kos pengangkutan, kenaikan harga makanan dan keperluan harian serta pengurangan kuasa beli kerana pendapatan yang sama perlu menampung perbelanjaan yang lebih tinggi.",
    kategori: "Ekonomi",
    pelaporNama: "NURFADZILA BINTI ZABRI",
    pelaporTel: "0175977597",
    syor: "",
    disediakanOleh: "NUR AMIRAH BINTI MOHAMAD AZMI",
    penghantarJawatan: "Pendidik Masyarakat",
    status: "Baru",
    tarikhAduan: "2026-06-10"
  },
  {
    id: "mbs-3",
    bil: 3,
    parlimen: "P.071 GOPENG",
    dun: "N.44 SUNGAI RAPAT",
    dm: "DESA PAKATAN",
    lokaliti: "Jalan Desa Pakatan 12, Fasa 2",
    pernyataanMbs: "LONGKANG TERSUMBAT • Terdapat takungan air di tepi padang permainan akibat longkang pecah, disyaki menjadi tempat pembiakan nyamuk Aedes. Masalah yang dilaporkan di sekitar Jalan Desa Pakatan 12, Fasa 2 ini memberi kesan langsung kepada penduduk setempat, sekali gus risiko limpahan banjir kilat & pembiakan vektor nyamuk. Sehubungan dengan itu, dipohon agar pembetulan fizikal oleh agensi penyelaras teknikal (JKR/PBT) disegerakan.",
    kategori: "Pembangunan",
    pelaporNama: "Ahmad Bin Razalin",
    pelaporTel: "012-3456789",
    syor: "Telah disemak oleh PKD Kampar bersama pihak berkuasa tempatan. Kerja-kerja pembersihan takungan air dan pembaikan fizikal longkang pecah telah diserahkan kepada kontraktor teknikal bersasar dan diselesaikan sepenuhnya demi menjamin kesihatan komuniti sasar.",
    syorOleh: "PKD Kampar",
    syorTarikh: "2026-03-10",
    disediakanOleh: "SITI ZURAIDAH BT TALKAH",
    penghantarJawatan: "Pendidik Masyarakat",
    status: "Selesai",
    tarikhAduan: "2026-03-05"
  },
  {
    id: "mbs-4",
    bil: 4,
    parlimen: "P.071 GOPENG",
    dun: "N.45 SIMPANG PULAI",
    dm: "TAMAN IPOH JAYA",
    lokaliti: "Jalan Ipoh Jaya 5/3, Persimpangan Utama Sekolah",
    pernyataanMbs: "LAMPU ISYARAT ROSAK • Lampu isyarat persimpangan utama berdekatan sekolah sering terpadam semasa hujan, membahayakan pelajar waktu pagi. Masalah yang dilaporkan di sekitar Jalan Ipoh Jaya 5/3, Persimpangan Utama Sekolah ini memberi kesan langsung kepada murid-murid prasekolah, guru-guru & waris keluarga, sekali gus membahayakan keselamatan pengguna jalan raya dan berisiko mencetuskan kemalangan. Sehubungan dengan itu, dipohon agar pemasangan sistem solar lampu isyarat sandaran dikoordinasikan segera bersama agensi penyelaras.",
    kategori: "Pembangunan",
    pelaporNama: "Siti Norhaliza",
    pelaporTel: "019-8765432",
    syor: "Syor pembaikan dikemukakan kepada Jabatan Kerja Raya (JKR) Daerah Kampar / Pihak Berkuasa Tempatan (PBT) untuk kelulusan peruntukan segera bagi kerja-kerja membaiki kerosakan litar kawalan, serta pemasangan sistem solar lampu isyarat sandaran demi menjamin kelancaran aliran trafik dan keselamatan optimum pengguna jalan raya di kawasan Jalan Ipoh Jaya 5/3, Persimpangan Utama Sekolah.",
    syorOleh: "PKD Kampar",
    syorTarikh: "2026-03-14",
    disediakanOleh: "NUR AMIRAH BINTI MOHAMAD AZMI",
    penghantarJawatan: "Pembantu Masyarakat",
    status: "Dalam Tindakan",
    tarikhAduan: "2026-03-12"
  },
  {
    id: "mbs-5",
    bil: 5,
    parlimen: "P.071 GOPENG",
    dun: "N.46 TEJA",
    dm: "KAMPONG SUNGAI ITEK",
    lokaliti: "Lorong Teja Ulu Geruntum, Dun Teja",
    pernyataanMbs: "LONGKANG TERSUMBAT • Isu limpahan air longkang monsun melimpah ke kawasan jalan setiap kali hujan lebat berterusan lebih sejam akibat mendapan pasir. Masalah yang dilaporkan di sekitar Lorong Teja Ulu Geruntum, Dun Teja ini memberi kesan langsung kepada penduduk setempat, sekali gus risiko limpahan banjir kilat & pembiakan vektor nyamuk. Sehubungan dengan itu, dipohon agar pembetulan fizikal oleh agensi penyelaras teknikal (JKR/PBT) disegerakan.",
    kategori: "Pembangunan",
    pelaporNama: "Tan Ah Seng",
    pelaporTel: "017-4455667",
    syor: "",
    disediakanOleh: "SITI ZURAIDAH BT TALKAH",
    penghantarJawatan: "Pendidik Masyarakat",
    status: "Baru",
    tarikhAduan: "2026-03-15"
  },
  {
    id: "mbs-6",
    bil: 6,
    parlimen: "P.071 GOPENG",
    dun: "N.45 SIMPANG PULAI",
    dm: "PEKAN RAZAKI",
    lokaliti: "Jalan Serene Ukay 2, sebelah SMK Seri Ampang",
    pernyataanMbs: "JALAN ROSAK • Kerosakan jalan yang agak serius dengan lubang diameter 1 meter dan kedalaman 15cm selepas selekoh tajam. Masalah yang dilaporkan di sekitar Jalan Serene Ukay 2, sebelah SMK Seri Ampang ini memberi kesan langsung kepada pengguna jalan raya & penduduk setempat, sekali gus membahayakan keselamatan fizikal pengguna & risiko kemalangan jalan raya. Sehubungan dengan itu, dipohon agar pembetulan fizikal oleh agensi penyelaras teknikal (JKR/PBT) disegerakan.",
    kategori: "Pembangunan",
    pelaporNama: "Kamarul Ariffin",
    pelaporTel: "013-9988776",
    syor: "Mengesyorkan aduan diajukan kepada Jabatan Kerja Raya (JKR) Daerah Kampar / Pihak Berkuasa Tempatan (PBT) untuk kelulusan peruntukan segera bagi melaksanakan kerja-kerja penampalan lubang jalan ('patching') menggunakan 'cold mix' atau 'hot mix' buat masa terdekat, serta memohon penjadualan penurapan jalan raya utama secara menyeluruh demi menjamin keselamatan komuniti dan pengguna jalan raya di kawasan Jalan Serene Ukay 2, sebelah SMK Seri Ampang.",
    syorOleh: "PKD Kampar",
    syorTarikh: "2026-03-14",
    disediakanOleh: "NUR AMIRAH BINTI MOHAMAD AZMI",
    penghantarJawatan: "Pendidik Masyarakat",
    status: "Selesai",
    tarikhAduan: "2026-03-13"
  }
];
