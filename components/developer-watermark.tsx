
export function DeveloperWatermark() {
  return (
    <div className="pointer-events-none fixed bottom-2 right-3 z-50 rounded-full border border-[#E7DCE4] bg-white/90 px-3 py-1.5 text-[10px] text-[#746873] shadow-sm dark:border-[#292929] dark:bg-[#111111]/90 dark:text-[#D4D4D4]">
      Designed &amp; Developed by{" "}
      <span className="font-semibold text-[#BE3477] dark:text-[#A78BFA]">
        Akhil
      </span>{" "}
      © 2026
    </div>
  );
}
