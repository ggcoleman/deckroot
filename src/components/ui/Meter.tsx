type MeterProps = {
  label: string;
  value: number;
  max: number;
  helper?: string;
};

export function Meter({ label, value, max, helper }: MeterProps) {
  const safeMax = Math.max(max, 1);
  const percent = Math.min(100, Math.max(0, (value / safeMax) * 100));

  return (
    <div className="meter">
      <div className="meter__line">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="meter__track" aria-hidden="true">
        <span style={{ width: `${percent}%` }} />
      </div>
      {helper ? <p>{helper}</p> : null}
    </div>
  );
}
