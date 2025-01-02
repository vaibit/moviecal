import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',  // Default MUI blue
    },
    secondary: {
      main: '#9c27b0',  // Default MUI purple
    },
  },
  typography: {
    fontFamily: ['Roboto', 'sans-serif'].join(','),
    // You can override other Typography variants as well
  },
  // Example of component default overrides:
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none', // disable uppercase transformation
        },
      },
    },
  },
});

export default theme;