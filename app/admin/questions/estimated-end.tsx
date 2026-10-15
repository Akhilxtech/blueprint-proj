type EstimatedEndProps = {
  durationSeconds: number;
  startTimestamp: number;
};

export default function EstimatedEnd({
  durationSeconds,
  startTimestamp,
}: EstimatedEndProps) {
  const estimatedEnd = new Date(
    startTimestamp + durationSeconds * 1000,
  );

  const formattedTime = estimatedEnd.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <p className="mt-2 text-2xl font-black text-[#BE3477]">
      {formattedTime}
    </p>
  );
}