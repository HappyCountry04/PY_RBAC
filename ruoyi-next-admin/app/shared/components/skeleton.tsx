export default function TableSkeleton({ cols = 5, rows = 8 }: { cols?: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} style={{ padding: "10px 12px" }}>
              <span
                style={{
                  display: "block", height: 14, borderRadius: 4,
                  background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
                  backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite",
                  width: `${j === 0 ? 50 : 75 + Math.random() * 15}%`,
                }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
