/**
 * Convert array of objects to CSV string
 * @param {Array} data - array of objects
 * @param {Array} columns - [{key, label}] column definitions
 */
export const generateCSV = (data, columns) => {
  const header = columns.map(c => `"${c.label}"`).join(',');
  const rows = data.map(row => {
    return columns.map(c => {
      let val = row[c.key];
      if (val === null || val === undefined) val = '';
      if (val instanceof Date) val = val.toISOString();
      if (typeof val === 'object') val = JSON.stringify(val);
      // Escape quotes and wrap in quotes
      val = String(val).replace(/"/g, '""');
      return `"${val}"`;
    }).join(',');
  });
  return [header, ...rows].join('\n');
};
