import countries from './countries.json';

export const COUNTRY_OPTIONS = countries.map((country) => ({
  code: country.cca2, // ISO Alpha-2 Code
  name: country.name.common, // Country Name
  flagUrl: `https://flagcdn.com/w40/${country.cca2.toLowerCase()}.png`, // Example: https://flagcdn.com/w40/us.png
}));
