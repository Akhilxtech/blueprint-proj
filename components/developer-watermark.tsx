export function DeveloperWatermark() {
  return (
    <div className="pointer-events-none fixed bottom-2 right-3 z-50 text-[10px] text-[#746873]/70 dark:text-[#A3A3A3]/60">
      Built with care by{" "}
      <span className="font-semibold">Akhil</span>
    </div>
  );
}
