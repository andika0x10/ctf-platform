export type UserRole = "participant" | "organizer";
export type NavigationLink = { label: string; href: string; roles?: UserRole[] };
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
        { label: "Challenges", href: "/challenges", roles: ["participant", "organizer"] },
        { label: "Scoreboard", href: "/scoreboard" },
        { label: "Cara bermain", href: "/#cara-bermain" },
      ] },
      { title: "Jelajahi kategori", links: [
        { label: "Web", href: "/challenges?category=web", roles: ["participant", "organizer"] },
        { label: "Crypto", href: "/challenges?category=crypto", roles: ["participant", "organizer"] },
        { label: "Forensics", href: "/challenges?category=forensics", roles: ["participant", "organizer"] },
        { label: "Reverse", href: "/challenges?category=reverse", roles: ["participant", "organizer"] },
        { label: "Misc", href: "/challenges?category=misc", roles: ["participant", "organizer"] },
      ] },
    ],
  },
  {
    id: "community", label: "Komunitas",
    description: "Bertukar sudut pandang. Selesaikan challenge bersama timmu.",
    columns: [
      { title: "Bersama tim", links: [
        { label: "Tim saya", href: "/team", roles: ["participant"] },
        { label: "Buat atau gabung tim", href: "/team#bergabung", roles: ["participant"] },
      ] },
      { title: "Ruang pribadi", links: [
        { label: "Akun saya", href: "/account", roles: ["participant", "organizer"] },
        { label: "Riwayat submissions", href: "/account#riwayat", roles: ["participant"] },
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

export function navigationForRole(role?: UserRole): NavigationGroup[] {
  const groups = role === "organizer" ? [...publicNavigation, organizerNavigation] : publicNavigation;
  return groups.map(group => ({ ...group, columns: group.columns.map(column => ({
    ...column, links: column.links.filter(link => !link.roles || Boolean(role && link.roles.includes(role))),
  })).filter(column => column.links.length > 0) })).filter(group => group.columns.length > 0);
}
