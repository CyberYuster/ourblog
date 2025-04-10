document.addEventListener('DOMContentLoaded', () => {
    // Check for logout parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('logout')) {
      // Clear any residual data
      localStorage.clear();
      sessionStorage.clear();
      
      // Remove the logout parameter from URL
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
      
      // Force a check with the server
      checkAuthStatus();
    }
  });
  
  async function checkAuthStatus() {
    try {
      const response = await fetch('/api/auth/status', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache'
        },
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (!data.authenticated) {
        // Update UI to show logged out state
        document.querySelectorAll('.user-menu').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.guest-menu').forEach(el => el.style.display = 'block');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    }
  }