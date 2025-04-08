document.getElementById('image').addEventListener('change', function(e) {
    const file = e.target.files[0];
    const errorElement = document.getElementById('imageError');
    const previewElement = document.getElementById('imagePreview');
    
    // Clear previous preview and error
    previewElement.innerHTML = '';
    errorElement.textContent = '';
    
    if (!file) return;
    
    // Check file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      errorElement.textContent = 'Only JPEG, PNG, or GIF images are allowed';
      e.target.value = ''; // Clear the file input
      return;
    }
    
    // Check file size (1MB)
    if (file.size > 1024 * 1024) {
      errorElement.textContent = 'Image must be less than 1MB';
      e.target.value = '';
      return;
    }
    
    // Create preview
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = document.createElement('img');
      img.src = e.target.result;
      img.style.maxHeight = '150px';
      previewElement.appendChild(img);
    };
    reader.readAsDataURL(file);
  });