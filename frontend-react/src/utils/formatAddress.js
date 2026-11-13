export function formatAddress(address, fallback = 'Address on file') {
  if (!address) return fallback;
  if (typeof address === 'string') return address;
  if (typeof address === 'object') {
    const parts = [address.street, address.city, address.state, address.postalCode].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : fallback;
  }
  return fallback;
}

export default formatAddress;
