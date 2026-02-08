export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]); // returns only the Base64 part
    };

    reader.onerror = (error) => reject(error);

    reader.readAsDataURL(file);
  });
}

export function daysLeft(endDate: string | Date): number {
  const today = new Date();
  const end = new Date(endDate);

  // Normalize times to avoid timezone issues
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const diffMs = end.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function formatAedMillion(amount: number): string {
  const value = amount / 1_000_000;
  return `AED ${value.toFixed(2)} M`;
}
export function aedFormat(value: number) {
  return `د.إ ${value.toLocaleString("en-US")}`;
}
export function getFileKey(file: File): string {
  return `${file.name}|${file.size}|${file.lastModified}`;
}