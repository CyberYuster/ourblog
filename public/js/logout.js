
async function handleLogout() {
    try {
      const { isConfirmed } = await Swal.fire({
        title: 'Log Out?',
        text: 'Are you sure you want to log out?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, log out'
      });
  
      if (!isConfirmed) return;
  
      const swalInstance = Swal.fire({
        title: 'Logging out...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });
  
      // Add cache-buster to the request
      const response = await fetch('/auth/logout', { //await fetch(`/logout?_=${Date.now()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        credentials: 'include'
      });
  console.log("logout client response is : ",response);
      if (response.ok) {
        await swalInstance.close();
        
        // Clear client-side storage
        localStorage.clear();
        sessionStorage.clear();
        
        // Force a hard refresh with cache busting
        // window.location.href = `/?logout=${Date.now()}&nocache=${Date.now()}`;
        window.location.href = `/?logout=true&nocache=${Date.now()}`;
        // window.location.href = '/';
      } else {
        throw new Error('Logout failed');
      }
    } catch (error) {
      console.error('Logout error:', error);
      Swal.fire({
        title: 'Error',
        text: 'Failed to log out completely. Please clear your browser cache or try in private mode.',
        icon: 'error'
      });
    }
  }
  try {
    document.getElementById('logout-button')?.addEventListener('click', handleLogout);
  } catch (error) {
    console.error('Error attaching logout handler:', error);
  }