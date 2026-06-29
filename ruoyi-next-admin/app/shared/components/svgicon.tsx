export default function SvgIcon({ name, size = 18, className = "" }: {
  name?: string;
  size?: number;
  className?: string;
}) {
  if (!name || name === "#") return null;
  const src = `/assets/icons/svg/${name}.svg`;
  return (
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      className={className}
      style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = "none";
      }}
    />
  );
}
