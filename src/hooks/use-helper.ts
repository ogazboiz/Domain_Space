export const useHelper = () => {
  const parseCAIP10 = (input: string) => {
    const parts = input.split(":");

    const namespace = parts[0];
    const chainId = parts[1];
    const address = parts[2] ?? null;

    return { namespace, chainId, address };
  };

  const trimAddress = (address: string, length = 4): string => {
    if (address.length <= length * 2) return address;
    return `${address.substring(0, length)}...${address.substring(
      address.length - length,
      address.length
    )}`;
  };

  const formatLargeNumber = (num: number): string => {
    if (num === null || num === undefined || isNaN(num)) return "0";

    const formatWithCap = (val: number, suffix: string = "") => {
      return parseFloat(val.toFixed(6)).toString() + suffix;
    };

    if (num >= 1_000_000_000) {
      return formatWithCap(num / 1_000_000_000, "B");
    } else if (num >= 1_000_000) {
      return formatWithCap(num / 1_000_000, "M");
    } else if (num >= 1_000) {
      return formatWithCap(num / 1_000, "K");
    } else {
      return formatWithCap(num);
    }
  };

  return { parseCAIP10, trimAddress, formatLargeNumber };
};