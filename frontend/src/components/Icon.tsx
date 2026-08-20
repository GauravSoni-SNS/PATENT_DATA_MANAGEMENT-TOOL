/**
 * Material Symbols (Rounded) icon.
 * Icon font is loaded in index.html; `name` is the ligature, e.g. "event".
 */
export function Icon({
  name,
  size = 20,
  filled = false,
  weight,
  className = '',
}: {
  name: string;
  size?: number;
  filled?: boolean;
  weight?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`material-symbols-rounded ${filled ? 'icon-filled' : ''} ${className}`}
      style={{
        fontSize: size,
        width: size,
        height: size,
        ...(weight ? { fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' ${weight}, 'GRAD' 0, 'opsz' ${size}` } : {}),
      }}
    >
      {name}
    </span>
  );
}
