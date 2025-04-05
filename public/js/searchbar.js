const searchInput = document.getElementById('searchInput');
  const searchResults = document.getElementById('searchResults');
  
  // Debounce function to limit API calls
  let debounceTimer;
  function debounce(callback, delay) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(callback, delay);
  }
  
  searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim();
    
    if (query.length < 2) {
      searchResults.style.display = 'none';
      return;
    }
    
    debounce(() => {
      fetch(`/api/search?q=${encodeURIComponent(query)}`)
        .then(response => response.json())
        .then(posts => {
          if (posts.length === 0) {
            searchResults.innerHTML = '<div class="search-item" style="color:rgb(189, 189, 219);">No results found</div>';
          } else {
            searchResults.innerHTML = posts.map(post => `
              <div class="search-item" onclick="window.location.href='/posts/${post._id}'">
                <h4 style="color:rgb(189, 189, 219);">${post.title}</h4>
                <p>${post.body.substring(0, 100)}...</p>
              </div>
            `).join('');
          }
          searchResults.style.display = 'block';
        });
    }, 300); // 300ms delay after typing stops
  });
  
  // Hide results when clicking outside
  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target)) {
      searchResults.style.display = 'none';
    }
  });