"use client";

interface PagerProps {
  pageNum: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number, size: number) => void;
}

export default function Pagination({ pageNum, pageSize, total, onPageChange }: PagerProps) {
  if (total <= 0) return null;
  const totalPages = Math.ceil(total / pageSize);
  return (
    <div className="pager">
      <span style={{ color: "var(--muted)", fontSize: 13 }}>
        第 {pageNum}/{totalPages} 页 共 {total} 条
      </span>
      <select
        value={pageSize}
        onChange={(e) => onPageChange(1, Number(e.target.value))}
        style={{ height: 32, border: "1px solid var(--line)", padding: "0 8px" }}
      >
        <option value={10}>10条/页</option>
        <option value={25}>25条/页</option>
        <option value={50}>50条/页</option>
        <option value={100}>100条/页</option>
      </select>
      <button className="ghost-button" disabled={pageNum <= 1} onClick={() => onPageChange(pageNum - 1, pageSize)}>
        上一页
      </button>
      <button className="ghost-button" disabled={pageNum >= totalPages} onClick={() => onPageChange(pageNum + 1, pageSize)}>
        下一页
      </button>
    </div>
  );
}
