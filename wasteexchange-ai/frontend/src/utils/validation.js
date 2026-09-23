export const validateSignup = (data) => {
  const errors = {};
  if (!data.name || data.name.trim().length < 2) errors.name = 'Name must be at least 2 characters';
  if (!data.email) errors.email = 'Email is required';
  else if (!/\S+@\S+\.\S+/.test(data.email)) errors.email = 'Enter a valid email';
  if (!data.password) errors.password = 'Password is required';
  else if (data.password.length < 6) errors.password = 'Password must be at least 6 characters';
  if (data.confirmPassword && data.password !== data.confirmPassword) errors.confirmPassword = 'Passwords do not match';
  return errors;
};

export const validateCompany = (data) => {
  const errors = {};
  if (!data.companyName || data.companyName.trim() === '') errors.companyName = 'Company name is required';
  if (!data.companyRegistrationNo || data.companyRegistrationNo.trim() === '') errors.companyRegistrationNo = 'Registration number is required';
  if (!data.companyAddress || data.companyAddress.trim() === '') errors.companyAddress = 'Address is required';
  if (!data.companyCity || data.companyCity.trim() === '') errors.companyCity = 'City is required';
  if (!data.companyState || data.companyState.trim() === '') errors.companyState = 'State is required';
  if (!data.companyPincode || data.companyPincode.trim() === '') errors.companyPincode = 'Pincode is required';
  else if (!/^[0-9]{6}$/.test(data.companyPincode)) errors.companyPincode = 'Enter a valid 6-digit pincode';
  return errors;
};

export const validateListing = (data) => {
  const errors = {};
  if (!data.material || data.material.trim() === '') errors.material = 'Material category is required';
  if (!data.quantity || Number(data.quantity) <= 0) errors.quantity = 'Quantity must be > 0';
  if (!data.price || Number(data.price) <= 0) errors.price = 'Price must be > 0';
  if (!data.location || data.location.trim() === '') errors.location = 'Location is required';
  return errors;
};

export const validateRequirement = (data) => {
  const errors = {};
  if (!data.material || data.material.trim() === '') errors.material = 'Material category is required';
  if (!data.minQty || Number(data.minQty) <= 0) errors.minQty = 'Min Qty must be > 0';
  if (!data.maxQty || Number(data.maxQty) <= 0) errors.maxQty = 'Max Qty must be > 0';
  if (Number(data.minQty) > Number(data.maxQty)) errors.maxQty = 'Min Qty cannot exceed Max Qty';
  if (!data.maxPrice || Number(data.maxPrice) <= 0) errors.maxPrice = 'Max Price must be > 0';
  if (!data.location || data.location.trim() === '') errors.location = 'Location is required';
  return errors;
};