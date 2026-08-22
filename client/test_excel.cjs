const XLSX = require("xlsx");

const aoa = [
    ["LAPORAN PRESTASI KULIAH"],
    ["SUBJECT PERFORMANCE REPORT"],
    [],
    [null, null, null, null, null, null, null, null, "Kelas", `: TIK-XK41/24`],
    [null, null, null, null, null, null, null, null, "Mata Kuliah", `: ELEKTRONIKA`],
    [null, null, null, null, null, null, null, null, "Dosen  ", `: Dwi Krisnandi`],
    [null, null, null, null, null, null, null, null, "Pertemuan", `: 16 kali pertemuan`],
    [null, null, null, null, null, null, null, null, "Semester", `: Ganjil`, `Tahun : 2026`],
    [
        "NPM", "NAMA MAHASISWA", "RINCIAN NILAI", null, null, null, null, null, 
        "PROSENTASE PERHITUNGAN NILAI", null, null, null, null, "KET"
    ],
    [
        null, null, "PARTISIPASI", "TUGAS", null, "RATA-RATA TUGAS", "UJIAN", null, 
        "NHD", "TGS", "UTS", "UAS", "NILAI AKHIR"
    ],
    [
        null, null, null, 1, 2, null, "UTS", "UAS", null, null, null, null, "AM", "HM"
    ]
];

aoa.push([
    "244212005",
    "REISYA RAMADHIYANTI PUTRI",
    100, // Partisipasi (Fallback)
    100, // Tugas 1
    100, // Tugas 2
    100, // Rata-Rata Tugas
    88,
    95,
    9.5,
    20,
    26.4,
    38,
    93.9,
    "A"
]);

const ws = XLSX.utils.aoa_to_sheet(aoa);

ws["!merges"] = [
    { s: {r:0, c:0}, e: {r:0, c:13} },
    { s: {r:1, c:0}, e: {r:1, c:13} },
    { s: {r:8, c:0}, e: {r:10, c:0} },
    { s: {r:8, c:1}, e: {r:10, c:1} },
    { s: {r:8, c:2}, e: {r:8, c:7} },
    { s: {r:8, c:8}, e: {r:8, c:12} },
    { s: {r:8, c:13}, e: {r:9, c:13} },
    { s: {r:9, c:2}, e: {r:10, c:2} },
    { s: {r:9, c:3}, e: {r:9, c:4} },
    { s: {r:9, c:5}, e: {r:10, c:5} },
    { s: {r:9, c:6}, e: {r:9, c:7} },
    { s: {r:9, c:8}, e: {r:10, c:8} },
    { s: {r:9, c:9}, e: {r:10, c:9} },
    { s: {r:9, c:10}, e: {r:10, c:10} },
    { s: {r:9, c:11}, e: {r:10, c:11} },
    { s: {r:9, c:12}, e: {r:9, c:12} }
];

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Nilai");
XLSX.writeFile(wb, "test.xlsx");
console.log("Success");
