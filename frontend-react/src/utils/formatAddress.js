/**
 * Safely formats any address representation (string, structured object, array, or clinic object)
 * into a single clean human-readable string for UI display.
 * Never throws or causes React child-rendering invariant violations.
 *
 * @param {string | object | Array | null | undefined} address
 * @param {string} [fallback='Address on file']
 * @returns {string}
 */
export function formatAddress(address, fallback = 'Address on file') {
  if (!address) return fallback;

  // 1. Primitive string representation
  if (typeof address === 'string') {
    const trimmed = address.trim();
    return trimmed.length > 0 ? trimmed : fallback;
  }

  // 2. Array of address lines
  if (Array.isArray(address)) {
    const parts = address
      .map((item) => (typeof item === 'string' ? item.trim() : formatAddress(item, '')))
      .filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : fallback;
  }

  // 3. Structured address or clinic entity object
  if (typeof address === 'object') {
    // Check if an explicit pre-formatted string exists
    if (typeof address.formatted === 'string' && address.formatted.trim()) {
      return address.formatted.trim();
    }

    // Check if a nested string address exists: e.g. { address: '...' }
    if (typeof address.address === 'string' && address.address.trim()) {
      const addr = address.address.trim();
      const city = typeof address.city === 'string' ? address.city.trim() : '';
      if (city && !addr.toLowerCase().includes(city.toLowerCase())) {
        return `${addr}, ${city}`;
      }
      return addr;
    }

    // Extract common street, unit/suite, city, state, postal code, and country fields
    const street = address.street || address.line1 || address.addressLine1 || '';
    const line2 = address.line2 || address.addressLine2 || address.suite || '';
    const city = address.city || '';
    const state = address.state || '';
    const postalCode = address.postalCode || address.zipCode || address.zip || address.pincode || '';
    const country = address.country || '';

    const parts = [street, line2, city, state, postalCode, country]
      .map((p) => (typeof p === 'string' ? p.trim() : ''))
      .filter(Boolean);

    return parts.length > 0 ? parts.join(', ') : fallback;
  }

  return fallback;
}

/**
 * Safely extracts the city from a clinic or address object/string.
 *
 * @param {object | string | null | undefined} clinicOrAddress
 * @param {string} [fallback='']
 * @returns {string}
 */
export function getClinicCity(clinicOrAddress, fallback = '') {
  if (!clinicOrAddress) return fallback;
  if (typeof clinicOrAddress === 'string') return clinicOrAddress.trim();

  if (typeof clinicOrAddress.city === 'string' && clinicOrAddress.city.trim()) {
    return clinicOrAddress.city.trim();
  }

  if (clinicOrAddress.address && typeof clinicOrAddress.address === 'object' && clinicOrAddress.address.city) {
    return String(clinicOrAddress.address.city).trim();
  }

  if (typeof clinicOrAddress.address === 'string' && clinicOrAddress.address.trim()) {
    const parts = clinicOrAddress.address.split(',');
    if (parts.length > 1) {
      return parts[parts.length - 1].trim();
    }
  }

  return fallback;
}

export default formatAddress;
