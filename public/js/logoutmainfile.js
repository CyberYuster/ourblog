(function() {
  console.log("Auth system initializing...");

  // 1. Check for logout right away
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('logout')) {
    console.log("Performing post-logout cleanup");
    localStorage.clear();
    sessionStorage.clear();
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  // 2. Update UI based on auth state
  async function updateAuthUI() {
    try {
      const response = await fetch('/api/auth/status', {
        credentials: 'include',
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      const { authenticated } = await response.json();
      console.log(`Auth state: ${authenticated}`);
      
      document.querySelectorAll('.user-menu').forEach(el => {
        el.style.display = authenticated ? 'block' : 'none';
      });
      
      document.querySelectorAll('.guest-menu').forEach(el => {
        el.style.display = authenticated ? 'none' : 'block';
      });
    } catch (error) {
      console.error("Auth check failed:", error);
    }
  }

  // 3. Set up event listeners
  document.addEventListener('DOMContentLoaded', updateAuthUI);
  
  // For pages that load dynamically
  if (document.readyState !== 'loading') {
    updateAuthUI();
  } else {
    document.addEventListener('DOMContentLoaded', updateAuthUI);
  }

  // Expose for debugging
  window.auth = { updateAuthUI };
})();