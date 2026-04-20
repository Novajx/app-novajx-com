export const fmtNJX = (n: number | string | null | undefined, decimals = 4) => {
  const num = Number(n ?? 0);
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
};

export const fmtCountdown = (target: Date | string) => {
  const t = typeof target === "string" ? new Date(target) : target;
  const diff = Math.max(0, t.getTime() - Date.now());
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

export const maskName = (name: string) => {
  if (!name) return "Anonymous";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].slice(0, 2) + "***";
  return parts[0] + " " + parts[1][0] + "***";
};