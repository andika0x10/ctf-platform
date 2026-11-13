export type UserRole = "participant" | "organizer";
export type NavigationLink = { label: string; href: string };
export type NavigationGroup = {
  id: string;
  label: string;
  description: string;
  columns: { title: string; links: NavigationLink[] }[];
};

export const publicNavigation: NavigationGroup[] = [
  {
    id: "practice", label: "Latihan",
    description: "Satu challenge, satu hal baru untuk dipelajari. Pilih jalurmu sendiri.",
    columns: [
      { title: "Mulai bermain", links: [
        { label: "Challenges", href: "/challenges" },
        { label: "Scoreboard", href: "/scoreboard" },
        { label: "Cara bermain", href: "/#cara-bermain" },
      ] },
      { title: "Jelajahi kategori", links: [
        { label: "Web", href: "/challenges?category=web" },
        { label: "Crypto", href: "/challenges?category=crypto" },
        { label: "Forensics", href: "/challenges?category=forensics" },
        { label: "Reverse", href: "/challenges?category=reverse" },
        { label: "Misc", href: "/challenges?category=misc" },
      ] },
    ],
  },
  {
    id: "community", label: "Komunitas",
    description: "Bertukar sudut pandang. Selesaikan challenge bersama timmu.",
    columns: [
      { title: "Bersama tim", links: [
        { label: "Tim saya", href: "/team" },
        { label: "Buat atau gabung tim", href: "/team#bergabung" },
      ] },
      { title: "Ruang pribadi", links: [
        { label: "Akun saya", href: "/account" },
        { label: "Riwayat submissions", href: "/account#riwayat" },
      ] },
    ],
  },
  {
    id: "information", label: "Informasi",
    description: "Kenali tempat bermainmu sebelum mulai mencari flag.",
    columns: [
      { title: "Tentang platform", links: [
        { label: "Tentang latihan", href: "/#tentang" },
        { label: "Cara bermain", href: "/#cara-bermain" },
      ] },
      { title: "Panduan peserta", links: [
        { label: "Aturan bermain", href: "/rules" },
        { label: "Pengumuman", href: "/announcements" },
      ] },
    ],
  },
];

export const organizerNavigation: NavigationGroup = {
  id: "organizer", label: "Panitia", description: "Siapkan challenge dan kelola ruang latihan.",
  columns: [
    { title: "Konten", links: [
      { label: "Kelola challenge", href: "/admin/challenges" },
      { label: "Pengumuman", href: "/admin/announcements" },
    ] },
    { title: "Peserta dan aktivitas", links: [
      { label: "Peserta", href: "/admin/participants" },
      { label: "Tim", href: "/admin/teams" },
      { label: "Submissions", href: "/admin/submissions" },
    ] },
    { title: "Platform", links: [
      { label: "Ringkasan", href: "/admin" },
      { label: "Pengaturan", href: "/admin/settings" },
    ] },
  ],
};
