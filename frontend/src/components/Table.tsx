import React from "react";

interface TableProps<T> {
  data: T[] | undefined;
  headers: string[];
  renderRow: (item: T, index: number) => React.ReactNode;
  emptyMessage?: string;
}

export function Table<T>({
  data,
  headers,
  renderRow,
  emptyMessage = "No records registered.",
}: TableProps<T>) {
  if (!data || data.length === 0) {
    return <div className="empty-state">{emptyMessage}</div>;
  }

  return (
    <div className="table-container animate-fade-in">
      <table className="admin-table">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{data.map((item, index) => renderRow(item, index))}</tbody>
      </table>
    </div>
  );
}
