export const toMonthKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

export const clampDateKey = (key, minKey, maxKey) => {
  if (!key) return null;
  if (minKey && key < minKey) return minKey;
  if (maxKey && key > maxKey) return maxKey;
  return key;
};

export const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const fromDateKey = (key) => {
  const [y, m, d] = String(key)
    .split("-")
    .map((v) => parseInt(v, 10));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

export const diffDateKeysInDaysInclusive = (startKey, endKey) => {
  const startDate = fromDateKey(startKey);
  const endDate = fromDateKey(endKey);
  if (!startDate || !endDate) return 1;
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const diffDays = Math.round((end.getTime() - start.getTime()) / 86400000);
  return Math.max(1, diffDays + 1);
};

export const startOfMonth = (date) =>
  new Date(date.getFullYear(), date.getMonth(), 1);

export const addMonths = (date, delta) =>
  new Date(date.getFullYear(), date.getMonth() + delta, 1);

export const addDays = (date, deltaDays) => {
  const next = new Date(date);
  next.setDate(next.getDate() + deltaDays);
  return next;
};

export const formatDateButton = (date) => {
  if (!date) return "";
  const day = date.getDate();
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

